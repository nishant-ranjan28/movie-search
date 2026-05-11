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
 *     watchlist: { title: string; genres: string[]; year?: number;
 *                  status: "want"|"in_progress"|"done"|"dropped";
 *                  rating?: number }[],
 *     recents: string[]   // titles only
 *   }
 *
 * Response (200):
 *   { filters: { genres: number[], yearGte?: number, yearLte?: number,
 *                ratingGte?: number }, reason: string }
 */

export const config = { runtime: "edge" };

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.1-8b-instant";

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
  // Loose validation — heavy duck-typing would just be ceremony.
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
    "genres": [<id>, ...],          // 1–3 IDs from the list above
    "yearGte": <integer or null>,    // earliest year to consider
    "yearLte": <integer or null>,    // latest year to consider
    "ratingGte": <number 0-10 or null>
  },
  "reason": "<one short sentence — what about their profile drove the picks>"
}

Guidance:
- Bias toward the dominant genres / decades / rating bands in their watchlist.
- If they've rated things ≥4, the ratingGte floor should be ≥7.
- Don't repeat genres that appear in EVERY watchlist item — pick adjacent ones to broaden discovery.
- yearGte/yearLte should cover a window of 5–15 years that fits their taste; null = no constraint.
- Cold start (empty watchlist + empty recents): pick popular, broadly appealing filters
  (e.g. ratingGte: 7, sort by popularity — but you don't output sort; the client defaults it).
- The "reason" should reference specifics (a title, a genre cluster, a decade) — don't be generic.
`.trim();

const sanitize = (
  raw: unknown,
  allowedGenreIds: Set<number>,
): RecommendResponse => {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("non-object");
  }
  const r = raw as Record<string, unknown>;
  const f =
    typeof r["filters"] === "object" && r["filters"] !== null
      ? (r["filters"] as Record<string, unknown>)
      : {};

  const out: RecommendResponse = {
    filters: { genres: [] },
    reason: typeof r["reason"] === "string" ? r["reason"].slice(0, 240) : "",
  };

  if (Array.isArray(f["genres"])) {
    out.filters.genres = (f["genres"] as unknown[])
      .filter(
        (id): id is number => typeof id === "number" && allowedGenreIds.has(id),
      )
      .slice(0, 5);
  }

  const num = (v: unknown): number | undefined =>
    typeof v === "number" && Number.isFinite(v) ? v : undefined;

  const yg = num(f["yearGte"]);
  if (yg !== undefined && yg >= 1900 && yg <= 2100) {
    out.filters.yearGte = Math.round(yg);
  }
  const yl = num(f["yearLte"]);
  if (yl !== undefined && yl >= 1900 && yl <= 2100) {
    out.filters.yearLte = Math.round(yl);
  }
  const rg = num(f["ratingGte"]);
  if (rg !== undefined && rg >= 0 && rg <= 10) {
    out.filters.ratingGte = rg;
  }

  return out;
};

const json = (data: unknown, status = 200): Response =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return json({ error: "method not allowed" }, 405);
  }

  const apiKey = process.env["GROQ_API_KEY"];
  if (!apiKey) {
    return json({ error: "GROQ_API_KEY not configured" }, 503);
  }

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

  let groqRes: Response;
  try {
    groqRes = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.4,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT(body.domain, body.genres, body) },
          { role: "user", content: "Pick a filter and explain." },
        ],
      }),
    });
  } catch (err) {
    console.error("[/api/ai/recommend] groq fetch failed:", err);
    return json({ error: "upstream unavailable" }, 502);
  }

  if (!groqRes.ok) {
    const text = await groqRes.text().catch(() => "");
    console.error(
      `[/api/ai/recommend] groq returned ${groqRes.status}:`,
      text.slice(0, 500),
    );
    return json({ error: "upstream error" }, 502);
  }

  let completion: unknown;
  try {
    completion = await groqRes.json();
  } catch (err) {
    console.error("[/api/ai/recommend] groq returned non-json:", err);
    return json({ error: "upstream parse error" }, 502);
  }

  const content = (
    completion as { choices?: { message?: { content?: string } }[] }
  )?.choices?.[0]?.message?.content;

  if (typeof content !== "string") {
    console.error("[/api/ai/recommend] groq response missing content");
    return json({ error: "upstream malformed" }, 502);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch (err) {
    console.error(
      "[/api/ai/recommend] model returned invalid json:",
      err,
      content.slice(0, 500),
    );
    return json({ error: "model output invalid" }, 502);
  }

  let result: RecommendResponse;
  try {
    result = sanitize(parsed, allowedGenreIds);
  } catch (err) {
    console.error("[/api/ai/recommend] sanitize failed:", err);
    return json({ error: "model output invalid" }, 502);
  }

  return json(result);
}
