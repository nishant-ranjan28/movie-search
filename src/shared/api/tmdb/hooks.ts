import { useQueries, useQuery, type UseQueryResult } from "@tanstack/react-query";
import type { MediaItem } from "@/shared/schemas/media";
import { tmdb, type DiscoverFilters, type ReleaseEvent } from "./client";
import type { TmdbGenre, TmdbMovie, TmdbTv } from "./schemas";

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
  kind: "theatrical" | "digital" | "all" = "all",
): UseQueryResult<ReleaseEvent[]> =>
  useQuery({
    queryKey: [
      "tmdb",
      "upcoming",
      "movie",
      kind,
      from.toISOString().slice(0, 10),
      to.toISOString().slice(0, 10),
    ],
    queryFn: ({ signal }) => tmdb.upcomingMovies(from, to, signal, kind),
    staleTime: HOUR,
  });

/**
 * Combined theatrical + digital upcoming releases. Each event carries its
 * `releaseType` so the UI can label theatrical releases ("In theaters") and
 * surface streaming-provider names when TMDB has them. Digital releases with
 * unknown providers render no label (TMDB has no reliable platform data for
 * pre-release titles, so a generic "OTT" placeholder would just be noise —
 * see labelForRelease.ts). Sorted by date ascending; deduped by
 * `${itemId}@${date}`.
 */
export const useUpcomingReleases = (
  from: Date,
  to: Date,
): { data: ReleaseEvent[]; isLoading: boolean } => {
  const theatrical = useUpcomingMovies(from, to, "theatrical");
  const digital = useUpcomingMovies(from, to, "digital");
  const merged: ReleaseEvent[] = [];
  const seen = new Set<string>();
  for (const list of [digital.data ?? [], theatrical.data ?? []]) {
    for (const e of list) {
      const key = `${e.itemId}@${e.date}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(e);
    }
  }
  merged.sort((a, b) => a.date.localeCompare(b.date));
  return {
    data: merged,
    isLoading: theatrical.isLoading || digital.isLoading,
  };
};

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

export const useReleaseProviders = (
  events: ReleaseEvent[],
  region: string = "IN",
): Record<string, string[]> => {
  const queries = useQueries({
    queries: events.map((e) => {
      const idPart = e.itemId.split(":").pop();
      const id = idPart ? Number(idPart) : undefined;
      return {
        queryKey: ["tmdb", "watch-providers", e.domain, id, region],
        queryFn: ({ signal }: { signal: AbortSignal }) =>
          tmdb.watchProviders(e.domain, id as number, region, signal),
        staleTime: DAY,
        enabled: id !== undefined && Number.isFinite(id),
      };
    }),
  });
  const map: Record<string, string[]> = {};
  events.forEach((e, i) => {
    const data = queries[i]?.data;
    if (data && data.length > 0) map[e.itemId] = data;
  });
  return map;
};

/** TMDB genre list. Effectively static — staleTime 7 days. */
export const useGenres = (
  domain: "movie" | "tv",
): UseQueryResult<TmdbGenre[]> =>
  useQuery({
    queryKey: ["tmdb", "genres", domain],
    queryFn: ({ signal }) => tmdb.genres(domain, signal),
    staleTime: 7 * DAY,
  });

/**
 * /discover/{movie,tv} with structured filter inputs. Returns normalized
 * MediaItems. Enabled only when at least one filter is set (otherwise the
 * caller should fall back to /trending).
 */
export const useDiscover = (
  domain: "movie" | "tv",
  filters: DiscoverFilters,
): UseQueryResult<MediaItem[]> => {
  const hasFilter =
    (filters.genres && filters.genres.length > 0) ||
    filters.yearGte !== undefined ||
    filters.yearLte !== undefined ||
    filters.ratingGte !== undefined ||
    filters.sort !== undefined;
  return useQuery({
    queryKey: ["tmdb", "discover", domain, filters],
    queryFn: ({ signal }) => tmdb.discover(domain, filters, signal),
    staleTime: HOUR,
    enabled: hasFilter,
  });
};
