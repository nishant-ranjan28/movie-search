/**
 * Vercel Edge Function — translates natural-language queries into TMDB
 * filter params via Groq's Llama 3 chat completions API.
 *
 * Request:
 *   POST /api/ai/translate
 *   Body: { query: string, domain: "movie" | "tv", genres: { id: number, name: string }[] }
 *
 * Response (200):
 *   { genres: number[], yearGte?: number, yearLte?: number, ratingGte?: number }
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
  domain: "movie" | "tv";
  genres: GenreRef[];
}

interface TranslateResponse {
  genres: number[];
  yearGte?: number;
  yearLte?: number;
  ratingGte?: number;
}

const isValidBody = (data: unknown): data is TranslateRequest => {
  if (typeof data !== "object" || data === null) return false;
  const d = data as Record<string, unknown>;
  if (typeof d["query"] !== "string" || d["query"].trim().length === 0) return false;
  if (d["domain"] !== "movie" && d["domain"] !== "tv") return false;
  if (!Array.isArray(d["genres"])) return false;
  for (const g of d["genres"]) {
    if (typeof g !== "object" || g === null) return false;
    const gr = g as Record<string, unknown>;
    if (typeof gr["id"] !== "number" || typeof gr["name"] !== "string") return false;
  }
  return true;
};

const SYSTEM_PROMPT = (domain: "movie" | "tv", genres: GenreRef[]): string => `
You translate natural-language entertainment queries into structured TMDB
filter JSON. The user is searching for ${domain === "movie" ? "movies" : "TV shows"}.

Available genres (only use these exact IDs — never invent IDs):
${genres.map((g) => `  ${g.id}: ${g.name}`).join("\n")}

Rules:
- Output ONLY a JSON object. No prose, no markdown fences.
- Schema:
  {
    "genres": [<id>, ...],
    "yearGte": <integer year or null>,
    "yearLte": <integer year or null>,
    "ratingGte": <number 0-10 or null>
  }
- Pick 0–3 genre IDs from the list above. Use only IDs that actually appear in the list.
- "yearGte" and "yearLte" are inclusive years (e.g. "90s" → 1990 and 1999).
- "ratingGte" is a TMDB vote-average minimum (e.g. "highly rated" → 7.5; "good" → 7).
- Omit a field (use null) when the query doesn't imply it.
- Map "feel-good"/"happy"/"cozy" to Comedy or Romance genres.
- Map "scary" to Horror; "mind-bending"/"sci-fi" to Science Fiction; "thrilling" to Thriller; "epic" → Adventure or Action.
`.trim();

const sanitize = (
  raw: unknown,
  genreIds: Set<number>,
): TranslateResponse => {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("non-object");
  }
  const r = raw as Record<string, unknown>;
  const out: TranslateResponse = {
    genres: allowedIds(r["genres"], genreIds, 5),
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

  const genreIds = new Set(body.genres.map((g) => g.id));

  const groqResult = await callGroqJson({
    tag: TAG,
    systemPrompt: SYSTEM_PROMPT(body.domain, body.genres),
    userPrompt: body.query,
  });
  if (groqResult.kind === "error") return groqResult.response;

  let result: TranslateResponse;
  try {
    result = sanitize(groqResult.parsed, genreIds);
  } catch (err) {
    console.error(`[${TAG}] sanitize failed:`, err);
    return json({ error: "model output invalid" }, 502);
  }

  return json(result);
}
