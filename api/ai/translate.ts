/**
 * Vercel Edge Function — translates natural-language queries into a TMDB
 * domain + filter params via Groq's Llama 3 chat completions API.
 *
 * The model also picks the target domain ("movie" or "tv") from cues in
 * the query, so e.g. "feel-good 90s sitcom" routes to /tv while "feel-good
 * 90s comedy film" routes to /movies. Both genre lists are sent up so the
 * model can pick valid IDs once it's chosen a domain.
 *
 * Request:
 *   POST /api/ai/translate
 *   Body: {
 *     query: string,
 *     movieGenres: { id: number, name: string }[],
 *     tvGenres:    { id: number, name: string }[]
 *   }
 *
 * Response (200):
 *   {
 *     domain: "movie" | "tv",
 *     genres: number[],
 *     yearGte?: number, yearLte?: number, ratingGte?: number
 *   }
 *
 * Errors:
 *   400 — invalid input
 *   502 — Groq upstream / malformed output
 *   503 — GROQ_API_KEY env var missing
 *
 * Key handling: GROQ_API_KEY is a server-only env var (NOT prefixed VITE_),
 * never reaches the client bundle.
 */

import { allowedIds, callGroqJson, clampInRange, json } from "../_lib/groq";

export const config = { runtime: "edge" };

const TAG = "/api/ai/translate";

interface GenreRef {
  id: number;
  name: string;
}

interface TranslateRequest {
  query: string;
  movieGenres: GenreRef[];
  tvGenres: GenreRef[];
}

interface TranslateResponse {
  domain: "movie" | "tv";
  genres: number[];
  yearGte?: number;
  yearLte?: number;
  ratingGte?: number;
}

const isGenreList = (v: unknown): v is GenreRef[] => {
  if (!Array.isArray(v)) return false;
  for (const g of v) {
    if (typeof g !== "object" || g === null) return false;
    const gr = g as Record<string, unknown>;
    if (typeof gr["id"] !== "number" || typeof gr["name"] !== "string") {
      return false;
    }
  }
  return true;
};

const isValidBody = (data: unknown): data is TranslateRequest => {
  if (typeof data !== "object" || data === null) return false;
  const d = data as Record<string, unknown>;
  if (typeof d["query"] !== "string" || d["query"].trim().length === 0) return false;
  if (!isGenreList(d["movieGenres"]) || !isGenreList(d["tvGenres"])) return false;
  return true;
};

const SYSTEM_PROMPT = (
  movieGenres: GenreRef[],
  tvGenres: GenreRef[],
): string => `
You translate natural-language entertainment queries into a TMDB filter.
First pick the target domain ("movie" or "tv") from cues in the query, then
pick filter values using THAT domain's genre IDs.

Movie genre IDs (only use these exact IDs when domain = "movie"):
${movieGenres.map((g) => `  ${g.id}: ${g.name}`).join("\n")}

TV genre IDs (only use these exact IDs when domain = "tv"):
${tvGenres.map((g) => `  ${g.id}: ${g.name}`).join("\n")}

Domain choice rules:
- "show", "series", "season", "episode", "sitcom", "anime", "miniseries" → "tv"
- "film", "flick", "movie", "cinema" → "movie"
- An explicit title that's a well-known TV show → "tv"; well-known film → "movie"
- Ambiguous (e.g. just "90s comedy") → "movie" (the safer default)

Output ONLY a JSON object. No prose, no markdown fences:
{
  "domain": "movie" | "tv",
  "genres": [<id>, ...],
  "yearGte": <integer year or null>,
  "yearLte": <integer year or null>,
  "ratingGte": <number 0-10 or null>
}

Rules:
- 0–3 genre IDs, all from the chosen domain's list above. Never invent IDs.
- "yearGte"/"yearLte" are inclusive ("90s" → 1990 and 1999).
- "ratingGte" is the TMDB vote-average floor ("highly rated" → 7.5, "good" → 7).
- Omit (null) when not implied by the query.
- Map "feel-good"/"happy"/"cozy" → Comedy or Romance.
- Map "scary" → Horror; "mind-bending"/"sci-fi" → Science Fiction (movie) or Sci-Fi & Fantasy (tv); "thrilling" → Thriller (movie) or one of the thrillery TV genres; "epic" → Adventure or Action.
`.trim();

const sanitize = (
  raw: unknown,
  movieGenreIds: Set<number>,
  tvGenreIds: Set<number>,
): TranslateResponse => {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("non-object");
  }
  const r = raw as Record<string, unknown>;

  // Clamp domain — default to "movie" on missing/invalid.
  const rawDomain = r["domain"];
  const domain: "movie" | "tv" = rawDomain === "tv" ? "tv" : "movie";
  const genreAllowlist = domain === "tv" ? tvGenreIds : movieGenreIds;

  const out: TranslateResponse = {
    domain,
    genres: allowedIds(r["genres"], genreAllowlist, 5),
  };
  const yg = clampInRange(r["yearGte"], 1900, 2100);
  if (yg !== undefined) out.yearGte = Math.round(yg);
  const yl = clampInRange(r["yearLte"], 1900, 2100);
  if (yl !== undefined) out.yearLte = Math.round(yl);
  const rg = clampInRange(r["ratingGte"], 0, 10);
  if (rg !== undefined) out.ratingGte = rg;
  return out;
};

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid json body" }, 400);
  }

  if (!isValidBody(body)) {
    return json({ error: "invalid request shape" }, 400);
  }

  const movieGenreIds = new Set(body.movieGenres.map((g) => g.id));
  const tvGenreIds = new Set(body.tvGenres.map((g) => g.id));

  const groqResult = await callGroqJson({
    tag: TAG,
    systemPrompt: SYSTEM_PROMPT(body.movieGenres, body.tvGenres),
    userPrompt: body.query,
  });
  if (groqResult.kind === "error") return groqResult.response;

  let result: TranslateResponse;
  try {
    result = sanitize(groqResult.parsed, movieGenreIds, tvGenreIds);
  } catch (err) {
    console.error(`[${TAG}] sanitize failed:`, err);
    return json({ error: "model output invalid" }, 502);
  }

  return json(result);
}
