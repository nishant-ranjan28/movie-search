import { describe, expect, test } from "vitest";
import movie603 from "./fixtures/movie-603.json";
import tv1399 from "./fixtures/tv-1399.json";
import trendingMovie from "./fixtures/trending-movie-day.json";
import trendingTv from "./fixtures/trending-tv-day.json";
import searchMovie from "./fixtures/search-movie-matrix.json";
import watchProviders from "./fixtures/watch-providers-movie-603.json";
import {
  TmdbMovieSchema,
  TmdbSearchMovieResponseSchema,
  TmdbTrendingMovieResponseSchema,
  TmdbTrendingTvResponseSchema,
  TmdbTvSchema,
  TmdbWatchProvidersResponseSchema,
} from "./schemas";

describe("TMDB schemas", () => {
  test("parses movie details fixture (603)", () => {
    const parsed = TmdbMovieSchema.parse(movie603);
    expect(parsed.id).toBe(603);
    expect(parsed.title).toBe("The Matrix");
  });

  test("parses tv details fixture (1399)", () => {
    const parsed = TmdbTvSchema.parse(tv1399);
    expect(parsed.id).toBe(1399);
  });

  test("parses trending movie response", () => {
    const parsed = TmdbTrendingMovieResponseSchema.parse(trendingMovie);
    expect(parsed.results.length).toBeGreaterThan(0);
  });

  test("parses trending tv response", () => {
    const parsed = TmdbTrendingTvResponseSchema.parse(trendingTv);
    expect(parsed.results.length).toBeGreaterThan(0);
  });

  test("parses search movie response", () => {
    const parsed = TmdbSearchMovieResponseSchema.parse(searchMovie);
    expect(parsed.results.length).toBeGreaterThan(0);
  });

  test("parses watch providers response", () => {
    const parsed = TmdbWatchProvidersResponseSchema.parse(watchProviders);
    expect(parsed.id).toBe(603);
  });
});
