# Watchlist polish — design

**Date:** 2026-05-12
**Status:** Locked, in-flight implementation.
**Branch:** `feat/watchlist-polish` (single PR, three commits).
**Source brainstorm:** session preceding this doc; user merged PR #274 right before kickoff.

## Goals

Three sub-features deferred from T1.15 (Phase 1) of the original design:

1. **Drag-to-reorder** — let users manually order watchlist entries; reorder is a sortable view alongside the existing sort options.
2. **Bulk actions** — select multiple entries, then bulk mark-watched / mark-want / remove.
3. **Background snapshot refresh** — when `/watchlist` is opened, refresh stale entry snapshots from TMDB so `releaseDate`, `status`, `rating` reflect current upstream data.

Pure-client work. No new server endpoints. The refresh path goes through the existing `/api/tmdb` proxy.

## Non-goals

- No bulk rating (per-title judgment, doesn't make bulk sense).
- No bulk "mark in-progress" / "mark dropped" (rare actions, kept as per-entry only).
- No long-press selection entry (bad cross-platform UX; explicit "Select" button instead).
- No polling / continuous refresh — single sweep per `/watchlist` mount.
- No collaborative ordering — single-user, local state only.

## 1. Drag-to-reorder

**Storage:** new field on `WatchlistState`:

```ts
order: string[]   // ordered array of itemIds, user-defined sequence
```

The existing `entries: Record<string, WatchlistEntry>` map stays untouched. The new `order` array is the user-defined sequence; computed sorts (Recently added / Title / Year / Rating) keep deriving from `Object.values(entries)`.

**Why an array, not an `order: number` field per entry:**
- A move touches one array (splice + insert), not N renumberings.
- Add → append. Remove → filter. Zero coupling to other entry fields.
- Persistence under `persist({ name: "watchlist" })` is a single key.

**Sort integration:** new `"custom"` value joins the existing sort options. The sort dropdown auto-switches to "Custom" the first time the user drags. When sort is anything else, drag handles are hidden — reordering only makes sense in custom-order view.

**Library:** `@dnd-kit/core` + `@dnd-kit/sortable`. Modern, hooks-based, a11y-built-in (keyboard reordering via Tab + Space + arrows), ~10 KB gzipped.

**New store method:**

```ts
reorder: (itemId: string, toIndex: number) => void
```

Maintains `order` integrity: clamps `toIndex` to `[0, order.length - 1]`; no-op if `itemId` not present.

**Migration:** on store hydrate via Zustand `persist`, if `order` is empty and `entries` is non-empty (pre-this-feature watchlist), seed `order` from `Object.values(entries).sort((a, b) => b.addedAt.localeCompare(a.addedAt)).map(e => e.itemId)`. Idempotent — no-op on subsequent loads.

**Tests:**
- `reorder` clamp + missing-id no-op.
- Migration: pre-feature state (entries set, order empty) seeds order on first read.
- Keyboard interaction: focus a card, Space to grab, ArrowDown, Space to drop → asserted new order via dnd-kit's built-in keyboard sensor.

## 2. Bulk actions

**Selection model:** page-local React state, NOT in the store (selection is ephemeral):

```ts
const [selecting, setSelecting] = useState(false);
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
```

**Selection entry / exit:**
- Enter: explicit "Select" button next to the Sort dropdown.
- Exit: "Cancel" button, Escape key, or route change (clears via `useEffect` cleanup).
- Selection clears on filter change so hidden cards don't stay selected.

**Per-card UI in selection mode:**
- `MediaCard` shows a checkbox top-left in place of the bookmark icon.
- Clicking anywhere on the card toggles selection (no detail navigation).
- Selected cards get `ring-2 ring-fg` highlight.
- "Select all visible" link above the grid selects every entry in the current filtered+sorted view.

**Action toolbar** (replaces the Sort row when `selecting === true`):

```
[ ✓ 3 selected ]  [ Mark watched ]  [ Mark want ]  [ Remove ]  [ Cancel ]
                                                     (destructive)
```

Four actions, focused:
- **Mark watched** → `setStatusMany(ids, "done")`.
- **Mark want** → `setStatusMany(ids, "want")`.
- **Remove** → confirm dialog (shadcn `Dialog`); on confirm `removeMany(ids)`.
- **Cancel** → exits selection mode.

**Two new store methods, single `set()` call each so persist writes once:**

```ts
setStatusMany: (itemIds: string[], status: WatchlistEntry["status"]) => void
removeMany: (itemIds: string[]) => void
```

**Tests:**
- `setStatusMany` updates all entries in one go, leaves untargeted entries untouched.
- `removeMany` deletes targeted entries + filters from `order`.
- Smoke test: enter Select mode → toggle two cards → Remove → confirm → both gone.

## 3. Background snapshot refresh

**Goal:** when `/watchlist` mounts, refresh stale snapshots so `status`, `releaseDate`, `rating` reflect TMDB's current state.

**Storage:** one new field on `WatchlistEntry`:

```ts
lastRefreshedAt?: string   // ISO timestamp of last successful refresh; undefined for never-refreshed
```

**Trigger:** hook `useWatchlistRefresh()` at the top of `WatchlistPage`. Fires once on mount. Filters entries where `lastRefreshedAt` is undefined OR > 24 hours ago. No setInterval, no polling.

**Concurrency:** `p-throttle` (already installed), 5 concurrent TMDB requests.

**Per-entry flow:**

```ts
const numericId = Number(entry.itemId.split(":").pop());
const detail = entry.domain === "movie"
  ? await tmdb.movieDetails(numericId)
  : await tmdb.tvDetails(numericId);
updateSnapshot(entry.itemId, {
  title: detail.item.title,
  poster: detail.item.poster,
  year: detail.item.year,
  genres: detail.item.genres,
  releaseDate: detail.item.releaseDate,
  status: detail.item.status,
});
markRefreshed(entry.itemId, new Date().toISOString());
```

**Two new store methods:**

```ts
updateSnapshot: (itemId: string, snapshot: WatchlistEntry["snapshot"]) => void
markRefreshed: (itemId: string, isoTimestamp: string) => void
```

**Failure handling:** silent — log to console, skip that entry. `lastRefreshedAt` stays unset so the next visit retries. Failed entries are NOT removed (transient TMDB errors must not destroy user data).

**UI feedback:** a small `"Syncing…"` chip next to the `Watchlist` heading while any refresh is in flight. Disappears when all queries settle. No per-card spinners.

**Local dev caveat:** every refresh goes through `/api/tmdb`, which fails locally on the user's corporate-SSL-inspection network. End-to-end verification happens on Vercel preview, not `npm run dev`. Unit tests against MSW handlers verify the orchestration logic.

**Tests:**
- `updateSnapshot` / `markRefreshed` store-level unit tests.
- Hook test: mount with 3 stale entries → MSW returns details → asserts all 3 entries have `lastRefreshedAt` set.

## Ship order

| Commit | Scope |
|---|---|
| 1 | Drag-to-reorder: store changes (`order`, `reorder`, migration), `@dnd-kit` deps, WatchlistPage drag wiring, "Custom" sort option, tests. |
| 2 | Bulk actions: store methods (`setStatusMany`, `removeMany`), selection state in WatchlistPage, action toolbar, MediaCard selection-mode prop, tests. |
| 3 | Background refresh: `lastRefreshedAt` field, store methods (`updateSnapshot`, `markRefreshed`), `useWatchlistRefresh` hook, syncing-chip UI, tests. |

Each commit leaves the gates green (`typecheck`, `lint`, `test:run`, `build`).

## Test coverage delta

+10 unit tests minimum (3 reorder, 2 bulk-action store, 2 bulk-action smoke, 3 refresh).
+1 dep (`@dnd-kit/core`, `@dnd-kit/sortable`).
0 new files in `api/` — pure client work.
