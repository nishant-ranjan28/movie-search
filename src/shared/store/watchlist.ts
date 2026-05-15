import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { MediaDomain, MediaItem } from "@/shared/schemas/media";

type Snapshot = Pick<MediaItem, "title" | "poster" | "year" | "genres" | "releaseDate" | "status">;

export interface WatchlistEntry {
  itemId: string;
  domain: MediaDomain;
  addedAt: string;
  status: "want" | "in_progress" | "done" | "dropped";
  rating?: 1 | 2 | 3 | 4 | 5;
  notes?: string;
  progress?: {
    season?: number;
    episode?: number;
    pageOrPercent?: number;
    hoursPlayed?: number;
    achievement?: string;
  };
  snapshot: Snapshot;
}

export interface WatchlistState {
  entries: Record<string, WatchlistEntry>;
  /**
   * User-defined ordering of itemIds. Maintained independently of the
   * entries map so reorder operations don't have to renumber per-entry
   * fields. The existing computed sorts (Recently added / Title / Year /
   * Rating) keep deriving from entries; this array is only the source for
   * the new "Custom" sort option.
   */
  order: string[];
  add: (input: {
    itemId: string;
    domain: MediaDomain;
    snapshot: Snapshot;
    status?: WatchlistEntry["status"];
  }) => void;
  remove: (itemId: string) => void;
  setStatus: (itemId: string, status: WatchlistEntry["status"]) => void;
  setRating: (itemId: string, rating: 1 | 2 | 3 | 4 | 5) => void;
  setNotes: (itemId: string, notes: string) => void;
  /** Bulk status update — single set() call so persist writes once. */
  setStatusMany: (itemIds: string[], status: WatchlistEntry["status"]) => void;
  /** Bulk remove — single set() call so persist writes once. */
  removeMany: (itemIds: string[]) => void;
  /** Move itemId to a new position in the user-defined order. Clamps to
   *  valid range and is a no-op if the itemId isn't in the order. */
  reorder: (itemId: string, toIndex: number) => void;
  has: (itemId: string) => boolean;
  list: () => WatchlistEntry[];
}

/** Seed an order array from entries when one is missing (migration from
 *  pre-order watchlist). Most-recently-added first. */
const seedOrderFromEntries = (
  entries: Record<string, WatchlistEntry>,
): string[] =>
  Object.values(entries)
    .sort((a, b) => b.addedAt.localeCompare(a.addedAt))
    .map((e) => e.itemId);

export const useWatchlistStore = create<WatchlistState>()(
  persist(
    (set, get) => ({
      entries: {},
      order: [],
      add: ({ itemId, domain, snapshot, status }) =>
        set((state) => {
          // Re-adding an existing item is treated as a status update; keep
          // its place in the order array unchanged.
          const alreadyOrdered = state.order.includes(itemId);
          return {
            entries: {
              ...state.entries,
              [itemId]: {
                itemId,
                domain,
                snapshot,
                status: status ?? "want",
                addedAt: new Date().toISOString(),
              },
            },
            order: alreadyOrdered ? state.order : [...state.order, itemId],
          };
        }),
      remove: (itemId) =>
        set((state) => {
          if (!(itemId in state.entries)) return state;
          const next = { ...state.entries };
          delete next[itemId];
          return {
            entries: next,
            order: state.order.filter((id) => id !== itemId),
          };
        }),
      setStatus: (itemId, status) =>
        set((state) => {
          const existing = state.entries[itemId];
          if (!existing) return state;
          return { entries: { ...state.entries, [itemId]: { ...existing, status } } };
        }),
      setRating: (itemId, rating) =>
        set((state) => {
          const existing = state.entries[itemId];
          if (!existing) return state;
          return { entries: { ...state.entries, [itemId]: { ...existing, rating } } };
        }),
      setNotes: (itemId, notes) =>
        set((state) => {
          const existing = state.entries[itemId];
          if (!existing) return state;
          return { entries: { ...state.entries, [itemId]: { ...existing, notes } } };
        }),
      setStatusMany: (itemIds, status) =>
        set((state) => {
          const next = { ...state.entries };
          let touched = false;
          for (const id of itemIds) {
            const existing = next[id];
            if (!existing) continue;
            next[id] = { ...existing, status };
            touched = true;
          }
          return touched ? { entries: next } : state;
        }),
      removeMany: (itemIds) =>
        set((state) => {
          const toRemove = new Set(itemIds.filter((id) => id in state.entries));
          if (toRemove.size === 0) return state;
          const nextEntries = { ...state.entries };
          for (const id of toRemove) delete nextEntries[id];
          return {
            entries: nextEntries,
            order: state.order.filter((id) => !toRemove.has(id)),
          };
        }),
      reorder: (itemId, toIndex) =>
        set((state) => {
          const from = state.order.indexOf(itemId);
          if (from === -1) return state;
          const clamped = Math.max(0, Math.min(toIndex, state.order.length - 1));
          if (clamped === from) return state;
          const next = state.order.slice();
          next.splice(from, 1);
          next.splice(clamped, 0, itemId);
          return { order: next };
        }),
      has: (itemId) => itemId in get().entries,
      list: () => Object.values(get().entries),
    }),
    {
      name: "watchlist",
      // Migration from pre-order persisted state: when a stored snapshot
      // has entries but no order, seed the order from entries.addedAt desc.
      // Idempotent — once `order` is set, subsequent rehydrations leave it
      // alone.
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        if (state.order.length === 0 && Object.keys(state.entries).length > 0) {
          state.order = seedOrderFromEntries(state.entries);
        }
      },
    },
  ),
);
