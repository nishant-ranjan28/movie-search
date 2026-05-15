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
 * Routing: Vercel's filesystem catch-all (`[...path].ts`) only matched a
 * single segment in this project type, so a vercel.json rewrite maps
 * `/api/tmdb/(.*)` → `/api/tmdb?_path=$1`. The handler reads `_path`
 * (preferred) and falls back to parsing the URL pathname so the dev
 * middleware (which doesn't apply rewrites) still works.
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

// Per-endpoint Vercel CDN cache TTLs. `s-maxage` is the CDN cache lifetime
// (Vercel's shared cache); `stale-while-revalidate` is how long the CDN can
// keep serving the stale response while it refreshes in the background. The
// values mirror the client-side TanStack Query `staleTime` from hooks.ts so
// the two layers don't fight.
//
// IMPORTANT: `max-age` is intentionally omitted. We want the CDN to cache
// (s-maxage) without locking the browser's private cache; TanStack Query
// owns client-side invalidation.
interface CachePolicy {
  sMaxage: number;
  staleWhileRevalidate: number;
}

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const POLICIES: { match: (p: string) => boolean; policy: CachePolicy }[] = [
  // Effectively static: genre lists rarely change.
  { match: (p) => p === "genre/movie/list" || p === "genre/tv/list", policy: { sMaxage: 7 * DAY, staleWhileRevalidate: 30 * DAY } },
  // Search depends on user input — short cache so typos roll off quickly.
  { match: (p) => p.startsWith("search/movie") || p.startsWith("search/tv"), policy: { sMaxage: 5 * MINUTE, staleWhileRevalidate: 1 * HOUR } },
  // Trending refreshes hourly.
  { match: (p) => p.startsWith("trending/movie/") || p.startsWith("trending/tv/"), policy: { sMaxage: 1 * HOUR, staleWhileRevalidate: 6 * HOUR } },
  // Discover (filter-driven lists) — same as trending.
  { match: (p) => p.startsWith("discover/"), policy: { sMaxage: 1 * HOUR, staleWhileRevalidate: 6 * HOUR } },
  // Details / similar / recommendations / watch providers — stable per title.
  { match: (p) => p.startsWith("movie/") || p.startsWith("tv/"), policy: { sMaxage: 1 * DAY, staleWhileRevalidate: 7 * DAY } },
];

// Conservative fallback for anything not explicitly mapped.
const FALLBACK_POLICY: CachePolicy = { sMaxage: 5 * MINUTE, staleWhileRevalidate: 1 * HOUR };

const cachePolicyFor = (path: string): CachePolicy =>
  POLICIES.find((p) => p.match(path))?.policy ?? FALLBACK_POLICY;

const cacheHeaderFor = (path: string): string => {
  const { sMaxage, staleWhileRevalidate } = cachePolicyFor(path);
  return `public, s-maxage=${sMaxage}, stale-while-revalidate=${staleWhileRevalidate}`;
};

const json = (data: unknown, status: number): Response =>
  new Response(JSON.stringify(data), {
    status,
    // Errors must never be cached — a transient 502 shouldn't poison the CDN.
    headers: { "content-type": "application/json", "cache-control": "no-store" },
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
  // Prefer `_path` (set by the vercel.json rewrite). Fall back to parsing
  // the pathname so the dev middleware — which serves this file directly
  // without rewrites — still resolves the TMDB path correctly.
  const upstreamParams = new URLSearchParams(url.search);
  const rewritten = upstreamParams.get("_path");
  upstreamParams.delete("_path");
  const path = rewritten ?? url.pathname.replace(/^\/api\/tmdb\/?/, "");
  if (!isAllowed(path)) {
    return json({ error: "path not allowed" }, 404);
  }

  // Rebuild the upstream URL with the caller's query params + our api_key.
  // Strip any caller-supplied api_key so they can't override ours.
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

  // Forward the body verbatim. Preserve content-type. For 2xx responses,
  // apply the per-endpoint Vercel CDN cache policy; for non-2xx, set
  // `no-store` so transient failures don't pollute the shared cache.
  const headers = new Headers();
  const contentType = upstream.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);
  headers.set(
    "cache-control",
    upstream.ok ? cacheHeaderFor(path) : "no-store",
  );

  return new Response(upstream.body, { status: upstream.status, headers });
}
