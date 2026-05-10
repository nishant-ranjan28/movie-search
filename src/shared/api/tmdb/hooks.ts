import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import type { MediaItem } from "@/shared/schemas/media";
import { tmdb, type ReleaseEvent } from "./client";
import type { TmdbMovie, TmdbTv } from "./schemas";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const FIVE_MIN = 5 * 60 * 1000;

export const useMovieTrending = (
  window: "day" | "week" = "day",
): UseQueryResult<MediaItem[]> =>
  useQuery({
    queryKey: ["tmdb", "trending", "movie", window],
    queryFn: ({ signal }) => tmdb.trendingMovies(window, signal),
    staleTime: HOUR,
  });

export const useTvTrending = (
  window: "day" | "week" = "day",
): UseQueryResult<MediaItem[]> =>
  useQuery({
    queryKey: ["tmdb", "trending", "tv", window],
    queryFn: ({ signal }) => tmdb.trendingTv(window, signal),
    staleTime: HOUR,
  });

export const useMovieDetails = (
  id: number | undefined,
): UseQueryResult<{ item: MediaItem; raw: TmdbMovie }> =>
  useQuery({
    queryKey: ["tmdb", "details", "movie", id],
    queryFn: ({ signal }) => tmdb.movieDetails(id as number, signal),
    staleTime: DAY,
    enabled: id !== undefined,
  });

export const useTvDetails = (
  id: number | undefined,
): UseQueryResult<{ item: MediaItem; raw: TmdbTv }> =>
  useQuery({
    queryKey: ["tmdb", "details", "tv", id],
    queryFn: ({ signal }) => tmdb.tvDetails(id as number, signal),
    staleTime: DAY,
    enabled: id !== undefined,
  });

export const useMovieSearch = (query: string): UseQueryResult<MediaItem[]> =>
  useQuery({
    queryKey: ["tmdb", "search", "movie", query],
    queryFn: ({ signal }) => tmdb.searchMovies(query, signal),
    staleTime: FIVE_MIN,
    enabled: query.trim().length > 0,
  });

export const useTvSearch = (query: string): UseQueryResult<MediaItem[]> =>
  useQuery({
    queryKey: ["tmdb", "search", "tv", query],
    queryFn: ({ signal }) => tmdb.searchTv(query, signal),
    staleTime: FIVE_MIN,
    enabled: query.trim().length > 0,
  });

export const useUpcomingMovies = (
  from: Date,
  to: Date,
): UseQueryResult<ReleaseEvent[]> =>
  useQuery({
    queryKey: [
      "tmdb",
      "upcoming",
      "movie",
      from.toISOString().slice(0, 10),
      to.toISOString().slice(0, 10),
    ],
    queryFn: ({ signal }) => tmdb.upcomingMovies(from, to, signal),
    staleTime: HOUR,
  });

export const useWatchProviders = (
  domain: "movie" | "tv",
  id: number | undefined,
  region: string = "US",
): UseQueryResult<string[]> =>
  useQuery({
    queryKey: ["tmdb", "watch-providers", domain, id, region],
    queryFn: ({ signal }) => tmdb.watchProviders(domain, id as number, region, signal),
    staleTime: DAY,
    enabled: id !== undefined,
  });
