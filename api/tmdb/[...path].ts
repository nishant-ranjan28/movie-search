/**
 * Vercel Edge proxy for TMDB v3. Keeps `TMDB_KEY` server-side so it never
 * ships in the client bundle or appears in browser network logs.
 *
 *   GET /api/tmdb/<path>?<query> → https://api.themoviedb.org/3/<path>?<query>&api_key=…
 *
 * The proxy is restricted to a small allowlist of path prefixes (the
 * endpoints `src/shared/api/tmdb/client.ts` actually uses). This stops it
 * from being a generic open proxy that someone else could point at
 * arbitrary TMDB endpoints.
 *
 * Key handling: TMDB_KEY (no VITE_ prefix) is a server-only env var. The
 * old VITE_TMDB_KEY would compile into the bundle and leak on every
 * request — see commit replacing this layer for context.
 */

export const config = { runtime: "edge" };

const TAG = "/api/tmdb";
const TMDB_BASE = "https://api.themoviedb.org/3";

// Only forward to TMDB paths we actually call from the app. Each entry is a
// prefix match against the path *after* `/api/tmdb/`.
const ALLOWED_PREFIXES = [
  "search/movie",
  "search/tv",
  "trending/movie/",
  "trending/tv/",
  "movie/", // includes /movie/{id}, /movie/{id}/similar, /movie/{id}/watch/providers, etc.
  "tv/",
  "discover/movie",
  "discover/tv",
  "genre/movie/list",
  "genre/tv/list",
] as const;

const json = (data: unknown, status: number): Response =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });

const isAllowed = (path: string): boolean =>
  ALLOWED_PREFIXES.some((p) => path === p || path.startsWith(p));

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "GET") {
    return json({ error: "method not allowed" }, 405);
  }

  const apiKey = process.env["TMDB_KEY"];
  if (!apiKey) {
    console.error(`[${TAG}] TMDB_KEY not configured`);
    return json({ error: "TMDB_KEY not configured" }, 503);
  }

  const url = new URL(req.url);
  // Strip the `/api/tmdb/` prefix. Anything after that is the TMDB path.
  const path = url.pathname.replace(/^\/api\/tmdb\/?/, "");
  if (!isAllowed(path)) {
    return json({ error: "path not allowed" }, 404);
  }

  // Rebuild the upstream URL with the caller's query params + our api_key.
  // Strip any caller-supplied api_key so they can't override ours.
  const upstreamParams = new URLSearchParams(url.search);
  upstreamParams.delete("api_key");
  upstreamParams.set("api_key", apiKey);
  const upstreamUrl = `${TMDB_BASE}/${path}?${upstreamParams.toString()}`;

  let upstream: Response;
  try {
    upstream = await fetch(upstreamUrl);
  } catch (err) {
    console.error(`[${TAG}] tmdb fetch failed:`, err);
    return json({ error: "upstream unavailable" }, 502);
  }

  // Forward the body and status. Strip the upstream's set-cookie just in
  // case (TMDB doesn't set any, but defensive). Preserve content-type and
  // add a short shared cache TTL so Vercel's edge can collapse repeated
  // requests from different users.
  const headers = new Headers();
  const contentType = upstream.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);
  headers.set("cache-control", "public, s-maxage=60, stale-while-revalidate=300");

  return new Response(upstream.body, { status: upstream.status, headers });
}
