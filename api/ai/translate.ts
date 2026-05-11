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
 *   500 — Groq API failure or model returned malformed JSON
 *   503 — GROQ_API_KEY env var missing
 *
 * Key handling: GROQ_API_KEY is a server-only env var (NOT prefixed VITE_),
 * never reaches the client bundle.
 */

export const config = { runtime: "edge" };

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.1-8b-instant";

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

const isResponseShape = (data: unknown): data is {
  genres: unknown;
  yearGte?: unknown;
  yearLte?: unknown;
  ratingGte?: unknown;
} => typeof data === "object" && data !== null;

const sanitize = (
  raw: unknown,
  genreIds: Set<number>,
): TranslateResponse => {
  if (!isResponseShape(raw)) {
    throw new Error("model returned non-object");
  }
  const out: TranslateResponse = { genres: [] };

  if (Array.isArray(raw.genres)) {
    out.genres = raw.genres
      .filter((id): id is number => typeof id === "number" && genreIds.has(id))
      .slice(0, 5);
  }

  const num = (v: unknown): number | undefined => {
    if (typeof v !== "number" || !Number.isFinite(v)) return undefined;
    return v;
  };

  const yg = num(raw.yearGte);
  if (yg !== undefined && yg >= 1900 && yg <= 2100) out.yearGte = Math.round(yg);
  const yl = num(raw.yearLte);
  if (yl !== undefined && yl >= 1900 && yl <= 2100) out.yearLte = Math.round(yl);
  const rg = num(raw.ratingGte);
  if (rg !== undefined && rg >= 0 && rg <= 10) out.ratingGte = rg;

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

  const genreIds = new Set(body.genres.map((g) => g.id));

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
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT(body.domain, body.genres) },
          { role: "user", content: body.query },
        ],
      }),
    });
  } catch (err) {
    return json({ error: "groq network error", detail: String(err) }, 500);
  }

  if (!groqRes.ok) {
    const text = await groqRes.text().catch(() => "");
    return json({ error: "groq request failed", status: groqRes.status, detail: text }, 500);
  }

  let completion: unknown;
  try {
    completion = await groqRes.json();
  } catch {
    return json({ error: "groq returned non-json" }, 500);
  }

  const content = (
    completion as {
      choices?: { message?: { content?: string } }[];
    }
  )?.choices?.[0]?.message?.content;

  if (typeof content !== "string") {
    return json({ error: "groq response missing content" }, 500);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return json({ error: "model returned invalid json", content }, 500);
  }

  let result: TranslateResponse;
  try {
    result = sanitize(parsed, genreIds);
  } catch (err) {
    return json({ error: "sanitize failed", detail: String(err) }, 500);
  }

  return json(result);
}
