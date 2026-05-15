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

  describe("refresh fields", () => {
    test("updateSnapshot replaces an entry's snapshot", () => {
      const { add, updateSnapshot } = useWatchlistStore.getState();
      add({ itemId: "tmdb:movie:1", domain: "movie", snapshot: SAMPLE_SNAPSHOT });
      updateSnapshot("tmdb:movie:1", {
        title: "The Matrix (4K Restoration)",
        year: 1999,
        genres: ["sci-fi", "action"],
        status: "released",
      });
      const entry = useWatchlistStore.getState().entries["tmdb:movie:1"];
      expect(entry?.snapshot.title).toBe("The Matrix (4K Restoration)");
      expect(entry?.snapshot.genres).toContain("action");
      expect(entry?.snapshot.status).toBe("released");
    });

    test("markRefreshed sets lastRefreshedAt", () => {
      const { add, markRefreshed } = useWatchlistStore.getState();
      add({ itemId: "tmdb:movie:1", domain: "movie", snapshot: SAMPLE_SNAPSHOT });
      const ts = "2026-05-12T10:00:00.000Z";
      markRefreshed("tmdb:movie:1", ts);
      expect(
        useWatchlistStore.getState().entries["tmdb:movie:1"]?.lastRefreshedAt,
      ).toBe(ts);
    });

    test("updateSnapshot / markRefreshed on missing id are no-ops", () => {
      const { updateSnapshot, markRefreshed } = useWatchlistStore.getState();
      updateSnapshot("tmdb:movie:doesnotexist", {
        title: "x", genres: [],
      });
      markRefreshed("tmdb:movie:doesnotexist", "2026-01-01T00:00:00Z");
      expect(useWatchlistStore.getState().has("tmdb:movie:doesnotexist")).toBe(false);
    });
  });

  describe("bulk", () => {
    test("setStatusMany updates all matching ids and leaves others untouched", () => {
      const { add, setStatusMany } = useWatchlistStore.getState();
      add({ itemId: "tmdb:movie:1", domain: "movie", snapshot: SAMPLE_SNAPSHOT });
      add({ itemId: "tmdb:movie:2", domain: "movie", snapshot: SAMPLE_SNAPSHOT });
      add({ itemId: "tmdb:movie:3", domain: "movie", snapshot: SAMPLE_SNAPSHOT });
      setStatusMany(["tmdb:movie:1", "tmdb:movie:2"], "done");
      expect(useWatchlistStore.getState().entries["tmdb:movie:1"]?.status).toBe("done");
      expect(useWatchlistStore.getState().entries["tmdb:movie:2"]?.status).toBe("done");
      expect(useWatchlistStore.getState().entries["tmdb:movie:3"]?.status).toBe("want");
    });

    test("setStatusMany silently ignores unknown ids", () => {
      const { add, setStatusMany } = useWatchlistStore.getState();
      add({ itemId: "tmdb:movie:1", domain: "movie", snapshot: SAMPLE_SNAPSHOT });
      setStatusMany(["tmdb:movie:1", "tmdb:movie:doesnotexist"], "done");
      expect(useWatchlistStore.getState().entries["tmdb:movie:1"]?.status).toBe("done");
      expect(useWatchlistStore.getState().has("tmdb:movie:doesnotexist")).toBe(false);
    });

    test("removeMany deletes targeted entries and prunes order", () => {
      const { add, removeMany } = useWatchlistStore.getState();
      add({ itemId: "tmdb:movie:1", domain: "movie", snapshot: SAMPLE_SNAPSHOT });
      add({ itemId: "tmdb:movie:2", domain: "movie", snapshot: SAMPLE_SNAPSHOT });
      add({ itemId: "tmdb:movie:3", domain: "movie", snapshot: SAMPLE_SNAPSHOT });
      removeMany(["tmdb:movie:1", "tmdb:movie:3"]);
      expect(useWatchlistStore.getState().has("tmdb:movie:1")).toBe(false);
      expect(useWatchlistStore.getState().has("tmdb:movie:2")).toBe(true);
      expect(useWatchlistStore.getState().has("tmdb:movie:3")).toBe(false);
      expect(useWatchlistStore.getState().order).toEqual(["tmdb:movie:2"]);
    });
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
