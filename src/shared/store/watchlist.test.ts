import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { useWatchlistStore } from "./watchlist";

const SAMPLE_SNAPSHOT = { title: "The Matrix", year: 1999, genres: ["sci-fi"] };

beforeEach(() => {
  localStorage.clear();
  useWatchlistStore.setState({ entries: {} });
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
});
