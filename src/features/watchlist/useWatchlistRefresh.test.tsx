import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import type { ReactNode } from "react";
import { useWatchlistRefresh } from "./useWatchlistRefresh";
import { useWatchlistStore } from "@/shared/store/watchlist";

const SAMPLE_SNAPSHOT = { title: "old title", genres: [] };

const wrap = () => {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: Readonly<{ children: ReactNode }>) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
};

beforeEach(() => {
  localStorage.clear();
  useWatchlistStore.setState({ entries: {}, order: [] });
});

afterEach(() => {
  localStorage.clear();
});

describe("useWatchlistRefresh", () => {
  test("refreshes never-refreshed entries and stamps lastRefreshedAt", async () => {
    const { add } = useWatchlistStore.getState();
    // 603 → The Matrix. 1399 → Game of Thrones. Both fixtures served by MSW.
    add({
      itemId: "tmdb:movie:603",
      domain: "movie",
      snapshot: SAMPLE_SNAPSHOT,
    });
    add({
      itemId: "tmdb:tv:1399",
      domain: "tv",
      snapshot: SAMPLE_SNAPSHOT,
    });

    renderHook(() => useWatchlistRefresh(), { wrapper: wrap() });

    await waitFor(() => {
      const movie = useWatchlistStore.getState().entries["tmdb:movie:603"];
      const tv = useWatchlistStore.getState().entries["tmdb:tv:1399"];
      expect(movie?.lastRefreshedAt).toBeTruthy();
      expect(tv?.lastRefreshedAt).toBeTruthy();
    });

    // Snapshots got replaced with real fixture data.
    const movie = useWatchlistStore.getState().entries["tmdb:movie:603"];
    expect(movie?.snapshot.title).toBe("The Matrix");
  });

  test("skips entries refreshed within the last 24h", async () => {
    const { add, markRefreshed } = useWatchlistStore.getState();
    add({
      itemId: "tmdb:movie:603",
      domain: "movie",
      snapshot: SAMPLE_SNAPSHOT,
    });
    // Mark as freshly refreshed.
    const recent = new Date(Date.now() - 60 * 60 * 1000).toISOString(); // 1h ago
    markRefreshed("tmdb:movie:603", recent);

    renderHook(() => useWatchlistRefresh(), { wrapper: wrap() });

    // Give the effect a tick — should NOT change the snapshot.
    await new Promise((r) => setTimeout(r, 50));
    const after = useWatchlistStore.getState().entries["tmdb:movie:603"];
    expect(after?.snapshot.title).toBe("old title"); // unchanged
    expect(after?.lastRefreshedAt).toBe(recent); // unchanged
  });

  test("no-op when watchlist is empty", () => {
    const { result } = renderHook(() => useWatchlistRefresh(), {
      wrapper: wrap(),
    });
    expect(result.current.isSyncing).toBe(false);
  });
});
