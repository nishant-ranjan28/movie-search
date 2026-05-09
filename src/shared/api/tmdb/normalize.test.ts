import { describe, expect, test } from "vitest";
import { MediaItemSchema, type MediaItem } from "@/shared/schemas/media";
import movie603 from "./fixtures/movie-603.json";
import tv1399 from "./fixtures/tv-1399.json";
import trendingMovie from "./fixtures/trending-movie-day.json";
import trendingTv from "./fixtures/trending-tv-day.json";
import {
  TmdbMovieSchema,
  TmdbTvSchema,
  TmdbTrendingMovieResponseSchema,
  TmdbTrendingTvResponseSchema,
} from "./schemas";
import {
  movieToMediaItem,
  tvToMediaItem,
  movieListItemToMediaItem,
  tvListItemToMediaItem,
} from "./normalize";

describe("movieToMediaItem", () => {
  const m = TmdbMovieSchema.parse(movie603);

  test("produces a MediaItem that parses MediaItemSchema", () => {
    const item: MediaItem = movieToMediaItem(m);
    expect(MediaItemSchema.parse(item)).toEqual(item);
  });

  test("namespaced id", () => {
    expect(movieToMediaItem(m).id).toBe("tmdb:movie:603");
  });

  test("title and domain", () => {
    const item = movieToMediaItem(m);
    expect(item.title).toBe("The Matrix");
    expect(item.domain).toBe("movie");
  });

  test("year derived from release_date", () => {
    expect(movieToMediaItem(m).year).toBe(1999);
  });

  test("poster URL points at image.tmdb.org/t/p/w500", () => {
    const item = movieToMediaItem(m);
    expect(item.poster?.src).toMatch(/^https:\/\/image\.tmdb\.org\/t\/p\/w500\//);
  });

  test("rating is { score, outOf:10, votes }", () => {
    const item = movieToMediaItem(m);
    expect(item.rating?.outOf).toBe(10);
    expect(item.rating?.score).toBeGreaterThan(0);
    expect(item.rating?.votes).toBeGreaterThan(0);
  });

  test("genres are lowercase", () => {
    const item = movieToMediaItem(m);
    expect(item.genres.length).toBeGreaterThan(0);
    expect(item.genres.every((g) => g === g.toLowerCase())).toBe(true);
  });

  test("external links to TMDB", () => {
    const item = movieToMediaItem(m);
    expect(item.external[0]?.provider).toBe("tmdb");
    expect(item.external[0]?.url).toBe("https://www.themoviedb.org/movie/603");
  });
});

describe("tvToMediaItem", () => {
  const t = TmdbTvSchema.parse(tv1399);

  test("produces a MediaItem that parses MediaItemSchema", () => {
    const item: MediaItem = tvToMediaItem(t);
    expect(MediaItemSchema.parse(item)).toEqual(item);
  });

  test("namespaced id and domain", () => {
    const item = tvToMediaItem(t);
    expect(item.id).toBe("tmdb:tv:1399");
    expect(item.domain).toBe("tv");
  });

  test("uses 'name' as title", () => {
    expect(tvToMediaItem(t).title).toBe("Game of Thrones");
  });
});

describe("list item normalizers", () => {
  test("movie list items normalize", () => {
    const trending = TmdbTrendingMovieResponseSchema.parse(trendingMovie);
    const items = trending.results.map(movieListItemToMediaItem);
    items.forEach((item) => MediaItemSchema.parse(item));
    expect(items.length).toBeGreaterThan(0);
  });

  test("tv list items normalize", () => {
    const trending = TmdbTrendingTvResponseSchema.parse(trendingTv);
    const items = trending.results.map(tvListItemToMediaItem);
    items.forEach((item) => MediaItemSchema.parse(item));
    expect(items.length).toBeGreaterThan(0);
  });
});
