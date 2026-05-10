import { create } from "zustand";
import { persist } from "zustand/middleware";

const RECENT_CAP = 50;

export interface TasteState {
  recentItems: string[];
  dismissedItems: string[];
  markOpened: (itemId: string) => void;
  dismiss: (itemId: string) => void;
  isDismissed: (itemId: string) => boolean;
  recent: () => string[];
  reset: () => void;
}

export const useTasteStore = create<TasteState>()(
  persist(
    (set, get) => ({
      recentItems: [],
      dismissedItems: [],
      markOpened: (itemId) =>
        set((state) => {
          const filtered = state.recentItems.filter((id) => id !== itemId);
          const next = [itemId, ...filtered].slice(0, RECENT_CAP);
          return { recentItems: next };
        }),
      dismiss: (itemId) =>
        set((state) => {
          if (state.dismissedItems.includes(itemId)) return state;
          return { dismissedItems: [...state.dismissedItems, itemId] };
        }),
      isDismissed: (itemId) => get().dismissedItems.includes(itemId),
      recent: () => get().recentItems,
      reset: () => set({ recentItems: [], dismissedItems: [] }),
    }),
    { name: "taste" },
  ),
);
