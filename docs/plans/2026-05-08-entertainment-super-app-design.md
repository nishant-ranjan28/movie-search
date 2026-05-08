# Entertainment Super-App — Design

**Date:** 2026-05-08
**Status:** Design approved, ready for implementation planning
**Scope:** Full revamp of the existing `movie-search` app into an all-in-one entertainment hub covering movies, TV, anime, games, and books.

---

## 1. Goals & constraints

**Goals**
- Search, daily picks, and release-update feed across five content domains.
- Personal taste profile that improves recommendations over time.
- Installable PWA with offline read of last-viewed content.
- Polished, modern UI with per-domain identity but a coherent system.

**Constraints (locked during brainstorming)**
- **Audience:** Public product, no user accounts. All personal state in `localStorage`.
- **Stack:** Vite + React 19 + TypeScript (strict) + Tailwind + shadcn/ui.
- **Hosting:** Vercel only (Firebase configs dropped).
- **Backend:** None for v1. One Vercel Edge Function + Cron added later for opt-in push.
- **Tone:** Free APIs only. No paid tiers required.

---

## 2. Information architecture

**Top-level routes**
- `/` — **Today**: hero pick + per-domain rails + "Coming this week" + "Catch up".
- `/movies`, `/tv`, `/anime`, `/games`, `/books` — domain hubs (search, trending, filters).
- `/movies/:id` (and equivalents) — universal detail page.
- `/watchlist` — unified watchlist with domain & status filter chips.
- `/releases` — combined release calendar + list view, filterable.
- `/search` — global search across all five APIs in parallel, grouped results.
- `/settings` — theme, push opt-in, data export/import, reset taste profile.

**Persistent UI**
- Top: logo, global search, theme toggle, install-PWA button (when eligible).
- Left rail (desktop) / bottom tab bar (mobile, 5 tabs max: Today · Search · Watchlist · Releases · Settings). Domain hubs reachable via Today rails or Search.

---

## 3. Tech stack & directory layout

| Concern | Choice |
|---|---|
| Build / dev | Vite 5 |
| Language | TypeScript (strict) |
| UI lib | React 19 |
| Styling | Tailwind CSS 3 |
| Components | shadcn/ui (Radix primitives) |
| Icons | lucide-react |
| Routing | react-router 7 |
| Data fetching / cache | TanStack Query v5 |
| Client state | Zustand (with `persist` middleware → localStorage) |
| Schema validation | zod |
| PWA | vite-plugin-pwa (Workbox) |
| Animation | framer-motion (subtle only) |
| Testing | Vitest + React Testing Library + MSW + Playwright |
| Hosting | Vercel |

**Directory layout**

```
src/
  app/                  # router, providers, root layout
  features/
    today/
    movies/   tv/   anime/   games/   books/   # each: pages/, components/, hooks/, schemas/
    watchlist/
    releases/
    search/
    settings/
  shared/
    api/                # one client per provider (tmdb, anilist, rawg, openlibrary, googlebooks)
    components/ui/      # shadcn components
    components/         # MediaCard, MediaDetailLayout, RailCarousel, WatchlistButton, etc.
    hooks/              # useTasteProfile, useWatchlist, useTheme
    lib/                # utils, date, taste-scoring
    schemas/            # shared zod types: MediaItem, Person, ReleaseEvent
    store/              # zustand slices
  styles/
public/
  icons/  manifest.webmanifest
```

Adding a new domain (e.g. podcasts) later = one folder under `features/` + one client under `shared/api/`.

---

## 4. Domain model & API layer

### Unified `MediaItem`

```ts
type MediaItem = {
  id: string;              // namespaced: "tmdb:movie:603", "anilist:21", "rawg:3498", "ol:OL45804W"
  domain: "movie" | "tv" | "anime" | "game" | "book";
  title: string;
  altTitle?: string;
  year?: number;
  poster?: { src: string; blurhash?: string };
  synopsis?: string;
  rating?: { score: number; outOf: 10; votes?: number };
  genres: string[];
  releaseDate?: string;    // ISO
  status?: "released" | "upcoming" | "ongoing" | "ended";
  external: { provider: string; url?: string }[];
  raw: unknown;            // original payload, for detail pages
};
```

### Providers

| Domain | Provider | Auth | Endpoints used |
|---|---|---|---|
| Movies / TV | TMDB | API key (`VITE_TMDB_KEY`) | `/search/{movie,tv}`, `/trending`, `/{movie,tv}/:id`, `/watch/providers`, `/discover`, `/{movie,tv}/upcoming` |
| Anime | AniList | None (GraphQL) | search, trending, `AiringSchedule`, `Media(id)` |
| Games | RAWG | API key (`VITE_RAWG_KEY`) | `/games`, `/games/:id`, `/games?dates=…` |
| Books | Open Library | None | `/search.json`, `/works/:id.json`, covers via `covers.openlibrary.org` |
| Books fallback | Google Books | None for read | richer covers + metadata |

Each client exports `search(query)`, `trending(window)`, `details(id)`, `upcoming(range)` returning normalized `MediaItem` (or `MediaItemDetails`). zod schemas validate raw payloads — mismatches throw and surface as a toast.

### Caching (TanStack Query)

| Data | staleTime | gcTime |
|---|---|---|
| Trending / discover | 1 h | 24 h |
| Detail | 24 h | 7 d |
| Search | 5 m (debounced 300 ms) | 30 m |

Workbox runtime cache mirrors these for offline read (NetworkFirst with 24 h fallback for trending/details; CacheFirst for posters, max 200 entries, 30-day expiration).

### Rate-limit handling

- AniList 90 req/min, RAWG 20k/month → TanStack Query dedupes; `p-throttle` for batch fetches (e.g. enriching watchlist on app open, 5 concurrent).
- Per-provider `ErrorBoundary` so one provider being down degrades that rail only.

### Secrets

`VITE_TMDB_KEY`, `VITE_RAWG_KEY` in `.env.local` (and Vercel env vars). These are public client keys — that is how the free tiers are designed.

---

## 5. Taste profile & daily recommendation

### Profile shape (localStorage only)

```ts
type TasteProfile = {
  genreWeights:    Record<string, number>;
  domainWeights:   Record<MediaDomain, number>;
  decadeWeights:   Record<string, number>;
  peopleWeights:   Record<string, number>;
  studioWeights:   Record<string, number>;
  recentItems:     string[];     // last 50
  dismissedItems:  string[];
  lastDecayedAt:   string;
};
```

### Signal weights

| Action | Weight |
|---|---|
| Add to watchlist | +3.0 |
| Open detail page | +1.0 (cap once per item per day) |
| Rate ≥ 4/5 | +2.0 |
| Rate ≤ 2/5 | −2.0 |
| "Not interested" / dismiss | −4.0 (id added to `dismissedItems`) |
| Mark watched / finished | +2.0 |

Each signal scales the genre/decade/people/studio weights of the item.

### Time decay

Every 7 days (checked on app open via `lastDecayedAt`), multiply all weights by 0.95.

### Daily-pick algorithm

Runs once per local calendar day; seed = `YYYY-MM-DD` so the pick is stable through the day.

1. **Candidates**: today's trending from each provider (books fall back to "popular this month").
2. **Filter out**: items in watchlist, in `dismissedItems`, or in `recentItems`.
3. **Score**: `Σ(profileWeight[attr] × itemHas[attr])` over genres / decade / people / studio + small popularity prior + deterministic noise from day-seed.
4. **Cold start** (first ~5 interactions): popularity prior dominates → curated trending.
5. **Output**: 1 hero + per-domain row of 6.

### `/today` UX

- Hero card: poster + title + **"Why this?"** chip explaining top contributing signal.
- Five domain rails: "Today in Movies", … each a `RailCarousel` of 6.
- "Coming this week" rail: next 7 days of release events, watchlist-first.
- "Catch up" rail: items opened but never watchlisted.

### Privacy controls (`/settings`)

Reset taste profile · Export profile JSON · Import profile JSON · Pause learning.

---

## 6. Watchlist & release feed

### Watchlist entry (localStorage via Zustand `persist`)

```ts
type WatchlistEntry = {
  itemId: string;
  domain: MediaDomain;
  addedAt: string;
  status: "want" | "in_progress" | "done" | "dropped";
  rating?: 1|2|3|4|5;
  notes?: string;
  progress?: {
    season?: number; episode?: number;       // tv / anime
    pageOrPercent?: number;                   // book
    hoursPlayed?: number; achievement?: string; // game
  };
  snapshot: Pick<MediaItem,"title"|"poster"|"year"|"genres"|"releaseDate"|"status">;
};
```

### Watchlist UI (`/watchlist`)

- Domain chips + status chips.
- Sort: recently added · release date · alphabetical · rating.
- Bulk: mark watched, remove, export JSON.
- Per-entry: status / progress / rating / notes quick menu.
- Drag-to-reorder (desktop) / long-press menu (mobile).
- On app load: TanStack Query refetches each entry's status / release date in throttled batches (5 concurrent). Stale entries show a "syncing" dot.

### Release feed

```ts
type ReleaseEvent = {
  itemId: string; domain: MediaDomain;
  date: string;
  kind: "release" | "episode" | "season" | "dlc" | "book_pub";
  title: string;
  source: MediaItem;
};
```

Sources: TMDB `/discover` + `next_episode_to_air` · AniList `AiringSchedule` · RAWG `/games?dates=` · Open Library "newly published this month" (no real future-pub data).

`/releases` views: **Calendar** (default, month grid, dots colored by domain) + **List** (chronological 30-day outlook, grouped by week, filterable by domain & "watchlist only").

### Three delivery channels — phased

1. **Phase 1 (v1)**: in-app feed (above) — fully working.
2. **Phase 2**: opt-in Web Push via Vercel Edge Function + Cron + Vercel KV.
3. **Phase 3**: client-generated RSS / iCal Blob URL exports.

---

## 7. PWA, service worker & push

### PWA (v1, via vite-plugin-pwa)

- `manifest.webmanifest`: name, theme color, `display: standalone`, 192/512/maskable icons.
- Workbox precaches the app shell.
- Runtime caches:
  - Posters / cover images → CacheFirst, 30-day, max 200.
  - Trending / discover → StaleWhileRevalidate, 1 h.
  - Detail endpoints → NetworkFirst, 24 h fallback.
  - AniList GraphQL → NetworkFirst keyed by request body hash.
- Install prompt: detect `beforeinstallprompt`, show "Install" button in top bar (dismissable, 30-day cooldown).
- Update flow: new SW → toast "New version — reload" → `skipWaiting()` + reload.

**Offline behavior**: Today (last cached), Watchlist (always local), and previously opened detail pages render. Search shows offline banner.

### Push (Phase 2) — Vercel Edge Function + Cron

**Client**
1. User opts in at `/settings`.
2. Browser registers with push service → `PushSubscription` (endpoint + p256dh + auth).
3. App POSTs subscription + watchlist item ids to `/api/push/subscribe`.
4. Stored in **Vercel KV** keyed by generated subscription id.
5. SW handles `push` event → notification with deep-link.

**Server (`api/push/dispatch.ts`, cron `0 13 * * *`)**
1. Iterate KV subscriptions in batches.
2. For each, query providers for releases happening today/tomorrow matching its watchlist ids.
3. Sign with VAPID, POST to subscription endpoint via `web-push`.
4. On 410 Gone → delete from KV.

**Secrets**: `VAPID_PUBLIC_KEY` (also `VITE_VAPID_PUBLIC_KEY`), `VAPID_PRIVATE_KEY`, `KV_*`.

**Privacy copy** in `/settings`: "Subscribing sends your watchlist ids and a browser-generated push endpoint to the app's server. Nothing else is stored; deleted on unsubscribe."

---

## 8. UI system

### Tokens & themes

- Tailwind config drives all tokens.
- Two themes (`dark` default, `light`) via CSS variables; toggle `data-theme` on `<html>`.
- Neutral base (slate/zinc) + one accent per domain:

| Domain | Accent |
|---|---|
| Movies | amber |
| TV | violet |
| Anime | pink |
| Games | emerald |
| Books | sky |

Used sparingly: chips, accent borders, domain rails.

- Type: Inter for UI; optional Source Serif for long synopsis blocks.

### Shared components

`MediaCard` · `MediaCardSkeleton` · `RailCarousel` · `MediaDetailLayout` · `WatchlistButton` · `WhyThisChip` · `GlobalCommandMenu` (cmd/ctrl-K) · `EmptyState` · per-route `ErrorBoundary` + global one.

### Motion

framer-motion only. Page transitions (fade + 8 px rise), card hover scale, sheet/modal entry. `prefers-reduced-motion` respected.

### Accessibility — WCAG 2.2 AA target

Keyboard navigable everywhere · focus rings preserved · contrast checked on both themes · alt text on every poster · Radix primitives via shadcn handle most ARIA.

### Mobile

Bottom tab bar (5 tabs: Today · Search · Watchlist · Releases · Settings). Sheets instead of modals. Pull-to-refresh on Today / Watchlist / Releases.

---

## 9. Phasing

| # | Scope | Size |
|---|---|---|
| 0 | Vite+TS+Tailwind+shadcn skeleton; routing shell; providers; theme; CI; Vercel deploy; drop CRA & Firebase | ~1 wk |
| 1 | Movies + TV: TMDB client, MediaItem schema, Today, hubs, detail, watchlist, releases calendar, global search, PWA install + offline shell. **Strict upgrade over current app.** | ~2 wks |
| 2 | Anime: AniList client, hub, detail, Today + releases (airing schedule) + search | ~1 wk |
| 3 | Games: RAWG client, hub, detail, Today + releases + search | ~1 wk |
| 4 | Books: Open Library + Google Books, hub, detail, Today + search; releases simplified | ~1 wk |
| 5 | Recommendations v2: taste signals, scoring, "Why this?" chip, "Not interested" / dismissals | ~1 wk |
| 6 | Push (opt-in): Vercel Edge Function + Cron + KV; client subscription flow; SW push handler | ~1 wk |
| 7 | RSS / iCal export | 2–3 d |
| 8 | Polish: a11y audit, perf budgets (Lighthouse ≥ 90), empty/error pass, command-K, motion polish | ~1 wk |

After Phase 1 the live site is already a strict upgrade.

---

## 10. Testing strategy

Proportional, not exhaustive — single-developer, no-accounts app.

- **Unit (Vitest):** zod schemas hit with real fixture JSON; taste-scoring math; date / release-window helpers; watchlist reducer; "Why this?" attribution.
- **Component (RTL + MSW):** `MediaCard` for all five domains; `WatchlistButton` optimistic update + rollback; `MediaDetailLayout` per domain; offline empty states.
- **Integration (RTL + MSW):** Today page assembles rails from mocked providers; global search aggregates and groups; release calendar mixes events from providers.
- **E2E (Playwright, ~6 flows):** install → search movie → add to watchlist → see on Today's "Coming this week"; theme toggle persists; offline reload of `/today`; push subscribe (Phase 6 only).
- **Skip:** snapshots of generated lists from real APIs, layout pixels, third-party components.

---

## 11. Migration plan

1. New Vite project initialized in repo root (or current sources moved to `legacy/` first).
2. Existing components are **rewritten**, not ported — different stack, different shape. The `App.js` TMDB fetch patterns serve as reference for `tmdb.ts`.
3. **Delete:** `.firebase/`, `.firebaserc`, `firebase.json`, `src/App.css`, `src/index.css`, `src/logo.svg`, `src/reportWebVitals.js`; remove `react-bootstrap`, `bootstrap`, `@fortawesome/*` from `package.json`.
4. **Keep:** `LICENSE`, `SECURITY.md`, GitHub workflows (update for Vite build), `vercel.json` (replace contents), `.gitignore` (extend).
5. README rewritten for the new app.
6. Each phase is its own PR against `master`. Phases 0 + 1 land together so the live deploy switches to the new app on merge.

---

## 12. Risks

- **Five APIs = five rate-limit + outage surfaces.** Mitigation: aggressive caching, per-rail `ErrorBoundary`, graceful degradation.
- **Recommendation cold start** for first ~5 interactions → trending only. By design; surface a one-line UI hint.
- **Push permission UX** — request only after explicit user click in Settings; never on first load.
- **Books data quality** — Open Library covers/metadata are inconsistent; Google Books fallback handles ~80%. Some books will be ugly. Acceptable.

---

## 13. Open / deferred

- **Periodic Background Sync** for backend-free push: Chrome-only, unreliable. Not used.
- **Trakt** for cross-domain tracking: deferred; revisit if TMDB+AniList trending feels thin.
- **IGDB** (Twitch OAuth): deferred; RAWG is sufficient for v1.
- **i18n**: not in v1.
- **Accounts / cross-device sync**: explicitly out of scope.
