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
  has: (itemId: string) => boolean;
  list: () => WatchlistEntry[];
}

export const useWatchlistStore = create<WatchlistState>()(
  persist(
    (set, get) => ({
      entries: {},
      add: ({ itemId, domain, snapshot, status }) =>
        set((state) => ({
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
        })),
      remove: (itemId) =>
        set((state) => {
          if (!(itemId in state.entries)) return state;
          const next = { ...state.entries };
          delete next[itemId];
          return { entries: next };
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
      has: (itemId) => itemId in get().entries,
      list: () => Object.values(get().entries),
    }),
    { name: "watchlist" },
  ),
);
