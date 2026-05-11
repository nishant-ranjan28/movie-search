/**
 * Vercel Edge Function — generates a personalized TMDB discover filter
 * based on a user's watchlist + recently-viewed signals, via Groq.
 *
 * The client sends the user's local profile (titles, genres, years,
 * statuses, ratings) — never IDs that could be reused for tracking, never
 * anything stored server-side. The server forwards a summarized version to
 * Groq, gets back a structured filter + a one-line reason, sanitizes it,
 * and returns. The client then runs that filter through TMDB discover
 * (existing hooks) to surface real items.
 *
 * Request:
 *   POST /api/ai/recommend
 *   Body: {
 *     domain: "movie" | "tv",
 *     genres: { id: number, name: string }[],
 *     watchlist: { title, genres, year?, status, rating? }[],
 *     recents: string[]
 *   }
 *
 * Response (200):
 *   { filters: { genres, yearGte?, yearLte?, ratingGte? }, reason: string }
 */

import { allowedIds, callGroqJson, clampInRange, json } from "../_lib/groq";

export const config = { runtime: "edge" };

const TAG = "/api/ai/recommend";

interface GenreRef {
  id: number;
  name: string;
}

interface WatchlistEntry {
  title: string;
  genres: string[];
  year?: number;
  status: "want" | "in_progress" | "done" | "dropped";
  rating?: number;
}

interface RecommendRequest {
  domain: "movie" | "tv";
  genres: GenreRef[];
  watchlist: WatchlistEntry[];
  recents: string[];
}

interface RecommendResponse {
  filters: {
    genres: number[];
    yearGte?: number;
    yearLte?: number;
    ratingGte?: number;
  };
  reason: string;
}

const isValidBody = (data: unknown): data is RecommendRequest => {
  if (typeof data !== "object" || data === null) return false;
  const d = data as Record<string, unknown>;
  if (d["domain"] !== "movie" && d["domain"] !== "tv") return false;
  if (!Array.isArray(d["genres"]) || !Array.isArray(d["watchlist"])) return false;
  if (!Array.isArray(d["recents"])) return false;
  return true;
};

const formatWatchlist = (entries: WatchlistEntry[]): string => {
  if (entries.length === 0) return "(empty)";
  return entries
    .slice(0, 20)
    .map((e) => {
      const facets: string[] = [];
      if (e.year !== undefined) facets.push(`${e.year}`);
      if (e.genres.length > 0) facets.push(e.genres.slice(0, 3).join("/"));
      facets.push(e.status);
      if (e.rating !== undefined) facets.push(`rated ${e.rating}/5`);
      return `  - ${e.title} (${facets.join(", ")})`;
    })
    .join("\n");
};

const SYSTEM_PROMPT = (
  domain: "movie" | "tv",
  genres: GenreRef[],
  req: RecommendRequest,
): string => `
You translate a user's entertainment taste profile into a TMDB discover
filter that will surface NEW ${domain === "movie" ? "movies" : "TV shows"}
they will likely enjoy.

Available genres (use ONLY these exact IDs):
${genres.map((g) => `  ${g.id}: ${g.name}`).join("\n")}

User's watchlist:
${formatWatchlist(req.watchlist)}

Recently viewed titles:
${req.recents.length === 0 ? "  (none)" : req.recents.slice(0, 20).map((t) => `  - ${t}`).join("\n")}

Output ONLY a JSON object. No prose, no markdown fences:
{
  "filters": {
    "genres": [<id>, ...],
    "yearGte": <integer or null>,
    "yearLte": <integer or null>,
    "ratingGte": <number 0-10 or null>
  },
  "reason": "<one short sentence — what about their profile drove the picks>"
}

Guidance:
- Bias toward the dominant genres / decades / rating bands in their watchlist.
- If they've rated things >=4, the ratingGte floor should be >=7.
- Don't repeat genres that appear in EVERY watchlist item — pick adjacent ones to broaden discovery.
- yearGte/yearLte should cover a window of 5–15 years that fits their taste; null = no constraint.
- Cold start (empty watchlist + empty recents): pick popular, broadly appealing filters.
- The "reason" should reference specifics (a title, a genre cluster, a decade) — don't be generic.
`.trim();

const sanitize = (
  raw: unknown,
  allowedGenreIds: Set<number>,
): RecommendResponse => {
  if (typeof raw !== "object" || raw === null) throw new Error("non-object");
  const r = raw as Record<string, unknown>;
  const f =
    typeof r["filters"] === "object" && r["filters"] !== null
      ? (r["filters"] as Record<string, unknown>)
      : {};
  const out: RecommendResponse = {
    filters: { genres: allowedIds(f["genres"], allowedGenreIds, 5) },
    reason: typeof r["reason"] === "string" ? r["reason"].slice(0, 240) : "",
  };
  const yg = clampInRange(f["yearGte"], 1900, 2100);
  if (yg !== undefined) out.filters.yearGte = Math.round(yg);
  const yl = clampInRange(f["yearLte"], 1900, 2100);
  if (yl !== undefined) out.filters.yearLte = Math.round(yl);
  const rg = clampInRange(f["ratingGte"], 0, 10);
  if (rg !== undefined) out.filters.ratingGte = rg;
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

  const allowedGenreIds = new Set(body.genres.map((g) => g.id));

  const groqResult = await callGroqJson({
    tag: TAG,
    systemPrompt: SYSTEM_PROMPT(body.domain, body.genres, body),
    userPrompt: "Pick a filter and explain.",
    temperature: 0.4,
  });
  if (groqResult.kind === "error") return groqResult.response;

  let result: RecommendResponse;
  try {
    result = sanitize(groqResult.parsed, allowedGenreIds);
  } catch (err) {
    console.error(`[${TAG}] sanitize failed:`, err);
    return json({ error: "model output invalid" }, 502);
  }

  return json(result);
}
