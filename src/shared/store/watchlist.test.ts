import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { useWatchlistStore } from "./watchlist";

const SAMPLE_SNAPSHOT = { title: "The Matrix", year: 1999, genres: ["sci-fi"] };

beforeEach(() => {
  localStorage.clear();
  useWatchlistStore.setState({ entries: {}, order: [] });
});

afterEach(() => {
  localStorage.clear();
});

describe("watchlist store", () => {
  test("starts empty", () => {
    expect(useWatchlistStore.getState().list()).toEqual([]);
  });

  test("add inserts an entry with default status 'want'", () => {
    useWatchlistStore.getState().add({ itemId: "tmdb:movie:603", domain: "movie", snapshot: SAMPLE_SNAPSHOT });
    const entry = useWatchlistStore.getState().entries["tmdb:movie:603"];
    expect(entry?.status).toBe("want");
    expect(entry?.snapshot.title).toBe("The Matrix");
    expect(entry?.addedAt).toBeTruthy();
  });

  test("has returns true after add", () => {
    const { add, has } = useWatchlistStore.getState();
    expect(has("tmdb:movie:1")).toBe(false);
    add({ itemId: "tmdb:movie:1", domain: "movie", snapshot: SAMPLE_SNAPSHOT });
    expect(useWatchlistStore.getState().has("tmdb:movie:1")).toBe(true);
  });

  test("remove deletes an entry", () => {
    const { add, remove } = useWatchlistStore.getState();
    add({ itemId: "tmdb:movie:1", domain: "movie", snapshot: SAMPLE_SNAPSHOT });
    remove("tmdb:movie:1");
    expect(useWatchlistStore.getState().has("tmdb:movie:1")).toBe(false);
  });

  test("setStatus updates only status", () => {
    const { add, setStatus } = useWatchlistStore.getState();
    add({ itemId: "tmdb:movie:1", domain: "movie", snapshot: SAMPLE_SNAPSHOT });
    setStatus("tmdb:movie:1", "done");
    expect(useWatchlistStore.getState().entries["tmdb:movie:1"]?.status).toBe("done");
  });

  test("setRating", () => {
    const { add, setRating } = useWatchlistStore.getState();
    add({ itemId: "tmdb:movie:1", domain: "movie", snapshot: SAMPLE_SNAPSHOT });
    setRating("tmdb:movie:1", 5);
    expect(useWatchlistStore.getState().entries["tmdb:movie:1"]?.rating).toBe(5);
  });

  test("list returns array of values", () => {
    const { add } = useWatchlistStore.getState();
    add({ itemId: "tmdb:movie:1", domain: "movie", snapshot: SAMPLE_SNAPSHOT });
    add({ itemId: "tmdb:tv:2", domain: "tv", snapshot: SAMPLE_SNAPSHOT });
    expect(useWatchlistStore.getState().list().length).toBe(2);
  });

  test("persists to localStorage under 'watchlist' key", () => {
    useWatchlistStore.getState().add({ itemId: "tmdb:movie:603", domain: "movie", snapshot: SAMPLE_SNAPSHOT });
    const stored = localStorage.getItem("watchlist");
    expect(stored).toBeTruthy();
    expect(stored).toContain("tmdb:movie:603");
  });

  test("setStatus on missing id is a no-op (does not create entry)", () => {
    useWatchlistStore.getState().setStatus("tmdb:movie:doesnotexist", "done");
    expect(useWatchlistStore.getState().has("tmdb:movie:doesnotexist")).toBe(false);
  });

  describe("order", () => {
    test("add appends to order in insertion sequence", () => {
      const { add } = useWatchlistStore.getState();
      add({ itemId: "tmdb:movie:1", domain: "movie", snapshot: SAMPLE_SNAPSHOT });
      add({ itemId: "tmdb:movie:2", domain: "movie", snapshot: SAMPLE_SNAPSHOT });
      add({ itemId: "tmdb:movie:3", domain: "movie", snapshot: SAMPLE_SNAPSHOT });
      expect(useWatchlistStore.getState().order).toEqual([
        "tmdb:movie:1",
        "tmdb:movie:2",
        "tmdb:movie:3",
      ]);
    });

    test("remove also drops the id from order", () => {
      const { add, remove } = useWatchlistStore.getState();
      add({ itemId: "tmdb:movie:1", domain: "movie", snapshot: SAMPLE_SNAPSHOT });
      add({ itemId: "tmdb:movie:2", domain: "movie", snapshot: SAMPLE_SNAPSHOT });
      remove("tmdb:movie:1");
      expect(useWatchlistStore.getState().order).toEqual(["tmdb:movie:2"]);
    });

    test("re-adding an existing item does not duplicate order", () => {
      const { add } = useWatchlistStore.getState();
      add({ itemId: "tmdb:movie:1", domain: "movie", snapshot: SAMPLE_SNAPSHOT });
      add({ itemId: "tmdb:movie:2", domain: "movie", snapshot: SAMPLE_SNAPSHOT });
      add({ itemId: "tmdb:movie:1", domain: "movie", snapshot: SAMPLE_SNAPSHOT, status: "done" });
      expect(useWatchlistStore.getState().order).toEqual([
        "tmdb:movie:1",
        "tmdb:movie:2",
      ]);
    });

    test("reorder moves an item to a new index", () => {
      const { add, reorder } = useWatchlistStore.getState();
      add({ itemId: "tmdb:movie:1", domain: "movie", snapshot: SAMPLE_SNAPSHOT });
      add({ itemId: "tmdb:movie:2", domain: "movie", snapshot: SAMPLE_SNAPSHOT });
      add({ itemId: "tmdb:movie:3", domain: "movie", snapshot: SAMPLE_SNAPSHOT });
      reorder("tmdb:movie:3", 0);
      expect(useWatchlistStore.getState().order).toEqual([
        "tmdb:movie:3",
        "tmdb:movie:1",
        "tmdb:movie:2",
      ]);
    });

    test("reorder clamps toIndex to valid range", () => {
      const { add, reorder } = useWatchlistStore.getState();
      add({ itemId: "tmdb:movie:1", domain: "movie", snapshot: SAMPLE_SNAPSHOT });
      add({ itemId: "tmdb:movie:2", domain: "movie", snapshot: SAMPLE_SNAPSHOT });
      // Beyond end → clamps to last position.
      reorder("tmdb:movie:1", 99);
      expect(useWatchlistStore.getState().order).toEqual([
        "tmdb:movie:2",
        "tmdb:movie:1",
      ]);
      // Negative → clamps to 0.
      reorder("tmdb:movie:1", -5);
      expect(useWatchlistStore.getState().order).toEqual([
        "tmdb:movie:1",
        "tmdb:movie:2",
      ]);
    });

    test("reorder of unknown itemId is a no-op", () => {
      const { add, reorder } = useWatchlistStore.getState();
      add({ itemId: "tmdb:movie:1", domain: "movie", snapshot: SAMPLE_SNAPSHOT });
      reorder("tmdb:movie:doesnotexist", 0);
      expect(useWatchlistStore.getState().order).toEqual(["tmdb:movie:1"]);
    });

    test("migration: pre-order persisted state seeds order from addedAt desc", async () => {
      // Simulate a watchlist persisted before this feature shipped (no order
      // field, entries with different addedAt timestamps).
      const oldShape = {
        state: {
          entries: {
            "tmdb:movie:A": {
              itemId: "tmdb:movie:A",
              domain: "movie",
              addedAt: "2024-01-01T00:00:00.000Z",
              status: "want",
              snapshot: SAMPLE_SNAPSHOT,
            },
            "tmdb:movie:B": {
              itemId: "tmdb:movie:B",
              domain: "movie",
              addedAt: "2024-03-01T00:00:00.000Z",
              status: "want",
              snapshot: SAMPLE_SNAPSHOT,
            },
            "tmdb:movie:C": {
              itemId: "tmdb:movie:C",
              domain: "movie",
              addedAt: "2024-02-01T00:00:00.000Z",
              status: "want",
              snapshot: SAMPLE_SNAPSHOT,
            },
          },
          order: [],
        },
        version: 0,
      };
      localStorage.setItem("watchlist", JSON.stringify(oldShape));
      await useWatchlistStore.persist.rehydrate();
      // Most-recently-added first: B (Mar) → C (Feb) → A (Jan).
      expect(useWatchlistStore.getState().order).toEqual([
        "tmdb:movie:B",
        "tmdb:movie:C",
        "tmdb:movie:A",
      ]);
    });
  });
});
