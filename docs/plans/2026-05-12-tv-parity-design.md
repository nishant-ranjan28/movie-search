# TV-side parity — design

**Date:** 2026-05-12
**Status:** Locked, in-flight implementation.
**Branch:** `feat/tv-parity` (single PR, three commits).
**Source brainstorm:** preceding session, user confirmed all three design calls.

## Problem

Three surfaces on the home page are silently movie-only:

1. **`ForYouRail`** on `/today` — filters watchlist to `e.domain === "movie"`, calls `useGenres("movie")`, prompts AI with `domain: "movie"`, runs `useDiscover("movie", …)`. A user who watchlists 5 TV shows and 1 movie gets no personalized TV recs.
2. **Smart search** in `GlobalSearchInput` — `runSmartSearch` hardcodes `domain: "movie"` and `navigate('/movies?…')`. "Feel-good 90s sitcom" routes to /movies.
3. **Coming this week** on `/today` — `useUpcomingReleases` composes `useUpcomingMovies` twice (theatrical + digital). No TV equivalent. TV series premieres invisible.

## Goals

- Two distinct For-You rails on /today, one per domain, same architecture as Trending Movies + Trending TV.
- Smart search infers the destination domain from the user's query via the AI itself, no UI toggle.
- Coming-this-week merges TV series premieres into the existing release feed, with a small domain badge on each line.

## Non-goals

- TV episode-level releases (would need per-show next-episode-to-air lookups; too many TMDB calls for a Today rail).
- Anime/games/books — Phase 2+ domains, out of scope.
- Manual "refresh" for For-You rails — cache invalidates on profile change already.
- Domain filter chip on Coming this week — kept simple; /releases page has filters.

## 1. TV "For You" rail

**Approach:** the existing `ForYouRail` is parameterized by domain and rendered twice on `/today` — once for "movie", once for "tv".

**Implementation:**

- `ForYouRail` becomes `ForYouRail({ domain })` with `domain: "movie" | "tv"`.
- All movie-specific references inside swap to the prop value:
  - `entries.filter(e => e.domain === domain)`
  - `useGenres(domain)`
  - `recommend = useAiRecommend({ domain, … })`
  - `useDiscover(domain, …)`
  - Detail route: `/movies/:id` or `/tv/:id` based on domain
- Heading reads from a small map: `"movie" → "For you in Movies"`, `"tv" → "For you in TV"`.
- Min-signal threshold (2 entries) stays — applied to the domain-filtered subset.
- Cold-start: rail simply hides when domain has < 2 entries (no copy change needed; the AI rail isn't the right place for "add to watchlist" CTAs).

**TodayPage wiring:**

```tsx
<ErrorBoundary fallback={null}>
  <ForYouRail domain="movie" />
</ErrorBoundary>
<ErrorBoundary fallback={null}>
  <ForYouRail domain="tv" />
</ErrorBoundary>
```

Both fail-closed via empty `ErrorBoundary` fallback — if one domain's AI call errors, the other still shows.

**Tests:** existing useAiRecommend hook tests already exercise both domains. Add one snapshot test that the rail correctly filters watchlist by domain.

## 2. AI-inferred domain for Smart search

**Approach:** the `/api/ai/translate` Edge function adds a `domain: "movie" | "tv"` field to its response. The model picks based on cues in the query ("sitcom" / "series" / "show" / "season" → tv; "movie" / "film" / explicit titles → movie; ambiguous → movie default).

**Wire changes:**

- `api/ai/translate.ts`: extend the system prompt with a domain-choice rule; extend the sanitize step to read + validate the `domain` field (clamp to "movie" | "tv", default "movie" on missing/invalid).
- Response shape from `aiTranslate()` gains `domain: "movie" | "tv"` alongside the existing `DiscoverFilters`.
- `GlobalSearchInput`'s `runSmartSearch`:
  - Sends both `movieGenres` and `tvGenres` to the AI (so the model can pick IDs from the right list).
  - Receives `{ filters, domain }` and navigates to `/movies?...` or `/tv?...` based on `domain`.

**Why server-side inference, not client-side regex on the query:** the model already has the full query context plus the genre lists; adding one output field is 5 LOC. Client-side keyword matching ("sitcom" / "show") is brittle and language-specific. Falls back to "movie" if AI output is invalid.

**Tests:** MSW handler for `/api/ai/translate` returns `{ ..., domain: "tv" }` when query mentions "show"/"series"; one new component test asserts Smart search navigates to /tv when the mock returns domain: "tv".

## 3. Coming-this-week merged rail

**Approach:** rename `useUpcomingReleases` to keep its identity but extend it to also fetch upcoming TV series via TMDB's `/discover/tv` with `first_air_date.gte/lte`.

**Implementation:**

- New `tmdb.upcomingTv(from, to, signal)` client function. Same shape as `upcomingMovies` — returns `ReleaseEvent[]`. `releaseType` is `"tv"`.
- `useUpcomingTv(from, to)` hook (mirrors `useUpcomingMovies` for the TV variant).
- `useUpcomingReleases` composes all three: movie theatrical + movie digital + TV premieres. Merge + dedupe by `${itemId}@${date}` (already in place).
- UI: each row in the "Coming this week" list adds a tiny domain badge (M / TV) before the title. `releaseType` already drives label rendering via `labelForRelease`; extend it to recognize `releaseType: "tv"` → label "TV premiere" if no provider known.

**Sort:** merged list sorts by date ascending (already does). 12-item cap stays.

**Tests:** unit test that `useUpcomingReleases` merges all three sources; UI smoke that a TV entry appears with a "TV" badge.

## Ship order

| Commit | Scope |
|---|---|
| 1 | ForYouRail domain parameterization + render twice on TodayPage. |
| 2 | AI domain inference: Edge function + client wrapper + GlobalSearchInput routing. |
| 3 | TV premieres in Coming this week: new client/hook + merge into useUpcomingReleases + UI badge. |

Each commit leaves gates (typecheck, lint, test:run, build) green.

## Test coverage delta

- +1 ForYouRail/TodayPage smoke (TV rail renders only when ≥ 2 TV entries).
- +1 GlobalSearchInput smoke (Smart search navigates to /tv when AI returns domain: tv).
- +1 useUpcomingReleases unit (merges TV premieres alongside movies).
- +1 client.test (tmdb.upcomingTv URL + shape).

## Out of scope (deferred)

- Anime/games/books domains — Phase 2+.
- Real-time TV episode air alerts (would need /tv/{id}/season/{n}/episode/{n} per show).
- "Refresh recommendations" button on For You.
