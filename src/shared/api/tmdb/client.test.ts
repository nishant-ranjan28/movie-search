import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { ApiError, tmdb } from "./client";
import movieDetailsFixture from "./fixtures/movie-603.json";
import searchMovieFixture from "./fixtures/search-movie-matrix.json";
import trendingMovieFixture from "./fixtures/trending-movie-day.json";
import trendingTvFixture from "./fixtures/trending-tv-day.json";
import tvDetailsFixture from "./fixtures/tv-1399.json";
import watchProvidersFixture from "./fixtures/watch-providers-movie-603.json";

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const okJson = (data: unknown): Response =>
  new Response(JSON.stringify(data), { status: 200 });

describe("tmdb client URL composition", () => {
  test("searchMovies builds the right URL and returns MediaItems", async () => {
    fetchMock.mockResolvedValueOnce(okJson(searchMovieFixture));
    const results = await tmdb.searchMovies("matrix");
    const calledUrl = fetchMock.mock.calls[0]![0] as string;
    expect(calledUrl).toContain("/api/tmdb/search/movie");
    expect(calledUrl).toContain("query=matrix");
    // No api_key in client requests — that's attached server-side by the
    // /api/tmdb proxy.
    expect(calledUrl).not.toContain("api_key=");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]!.domain).toBe("movie");
  });

  test("searchMovies short-circuits on empty query (no fetch)", async () => {
    const results = await tmdb.searchMovies("");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(results).toEqual([]);
  });

  test("searchTv short-circuits on whitespace-only query", async () => {
    const results = await tmdb.searchTv("   ");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(results).toEqual([]);
  });

  test("trendingMovies day window", async () => {
    fetchMock.mockResolvedValueOnce(okJson(trendingMovieFixture));
    const results = await tmdb.trendingMovies("day");
    const url = fetchMock.mock.calls[0]![0] as string;
    expect(url).toContain("/api/tmdb/trending/movie/day");
    expect(results[0]!.id.startsWith("tmdb:movie:")).toBe(true);
  });

  test("movieDetails appends credits,videos,release_dates", async () => {
    fetchMock.mockResolvedValueOnce(okJson(movieDetailsFixture));
    const { item, raw } = await tmdb.movieDetails(603);
    const url = fetchMock.mock.calls[0]![0] as string;
    expect(url).toContain("/api/tmdb/movie/603");
    expect(url).toContain("append_to_response=credits%2Cvideos%2Crelease_dates");
    expect(item.id).toBe("tmdb:movie:603");
    expect(raw.id).toBe(603);
  });

  test("tvDetails appends credits,videos", async () => {
    fetchMock.mockResolvedValueOnce(okJson(tvDetailsFixture));
    const { item, raw } = await tmdb.tvDetails(1399);
    const url = fetchMock.mock.calls[0]![0] as string;
    expect(url).toContain("/api/tmdb/tv/1399");
    expect(url).toContain("append_to_response=credits%2Cvideos");
    expect(item.id).toBe("tmdb:tv:1399");
    expect(raw.id).toBe(1399);
  });

  test("watchProviders extracts flatrate provider names", async () => {
    fetchMock.mockResolvedValueOnce(okJson(watchProvidersFixture));
    const names = await tmdb.watchProviders("movie", 603, "US");
    const url = fetchMock.mock.calls[0]![0] as string;
    expect(url).toContain("/api/tmdb/movie/603/watch/providers");
    expect(Array.isArray(names)).toBe(true);
    // names may be empty if US has no flatrate, but should never throw
  });

  test("watchProviders returns [] when region missing", async () => {
    fetchMock.mockResolvedValueOnce(okJson(watchProvidersFixture));
    const names = await tmdb.watchProviders("movie", 603, "ZZ");
    expect(names).toEqual([]);
  });

  test("non-2xx throws ApiError with status", async () => {
    fetchMock.mockResolvedValueOnce(new Response("forbidden", { status: 403 }));
    try {
      await tmdb.movieDetails(603);
      expect.fail("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      expect((e as ApiError).status).toBe(403);
    }
  });

  test("schema mismatch throws ApiError with status 0", async () => {
    fetchMock.mockResolvedValueOnce(okJson({ not: "valid" }));
    try {
      await tmdb.searchMovies("matrix");
      expect.fail("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      expect((e as ApiError).status).toBe(0);
    }
  });

  test("trendingTv returns tv MediaItems", async () => {
    fetchMock.mockResolvedValueOnce(okJson(trendingTvFixture));
    const results = await tmdb.trendingTv("week");
    const url = fetchMock.mock.calls[0]![0] as string;
    expect(url).toContain("/api/tmdb/trending/tv/week");
    expect(results.every((r) => r.domain === "tv")).toBe(true);
  });

  test("upcomingTv builds discover URL with first_air_date range and maps to ReleaseEvent", async () => {
    fetchMock.mockResolvedValueOnce(okJson(trendingTvFixture));
    const from = new Date("2026-01-01T00:00:00Z");
    const to = new Date("2026-12-31T00:00:00Z");
    const events = await tmdb.upcomingTv(from, to);
    const url = fetchMock.mock.calls[0]![0] as string;
    expect(url).toContain("/api/tmdb/discover/tv");
    expect(url).toContain("first_air_date.gte=2026-01-01");
    expect(url).toContain("first_air_date.lte=2026-12-31");
    for (const ev of events) {
      expect(ev.domain).toBe("tv");
      expect(ev.kind).toBe("release");
      expect(ev.itemId.startsWith("tmdb:tv:")).toBe(true);
      expect(ev.releaseType).toBe("tv");
      expect(ev.date.length).toBeGreaterThan(0);
    }
  });

  test("upcomingMovies builds discover URL with date range and maps to ReleaseEvent", async () => {
    fetchMock.mockResolvedValueOnce(okJson(searchMovieFixture));
    const from = new Date("2026-01-01T00:00:00Z");
    const to = new Date("2026-12-31T00:00:00Z");
    const events = await tmdb.upcomingMovies(from, to);
    const url = fetchMock.mock.calls[0]![0] as string;
    expect(url).toContain("/api/tmdb/discover/movie");
    expect(url).toContain("primary_release_date.gte=2026-01-01");
    expect(url).toContain("primary_release_date.lte=2026-12-31");
    // every event has the expected shape; items with empty release_date are skipped
    for (const ev of events) {
      expect(ev.domain).toBe("movie");
      expect(ev.kind).toBe("release");
      expect(ev.itemId.startsWith("tmdb:movie:")).toBe(true);
      expect(ev.date.length).toBeGreaterThan(0);
    }
  });
});
