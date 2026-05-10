import type { z } from "zod";
import type { MediaItem } from "@/shared/schemas/media";
import {
  movieListItemToMediaItem,
  movieToMediaItem,
  tvListItemToMediaItem,
  tvToMediaItem,
} from "./normalize";
import {
  TmdbMovieSchema,
  TmdbSearchMovieResponseSchema,
  TmdbSearchTvResponseSchema,
  TmdbTrendingMovieResponseSchema,
  TmdbTrendingTvResponseSchema,
  TmdbTvSchema,
  TmdbWatchProvidersResponseSchema,
  type TmdbMovie,
  type TmdbTv,
} from "./schemas";

const BASE = "https://api.themoviedb.org/3";

/**
 * Typed error for any TMDB request failure: missing key, non-2xx, network
 * blowup, or schema mismatch. Status `0` means the failure happened before/
 * after the HTTP round-trip (config or parsing).
 */
export class ApiError extends Error {
  status: number;
  endpoint: string;
  cause?: unknown;

  constructor(status: number, endpoint: string, message: string, cause?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.endpoint = endpoint;
    if (cause !== undefined) this.cause = cause;
  }
}

export interface ReleaseEvent {
  itemId: string;
  domain: "movie" | "tv";
  date: string;
  kind: "release" | "season";
  title: string;
}

async function request<T>(
  endpoint: string,
  params: Record<string, string>,
  schema: z.ZodType<T>,
  signal?: AbortSignal,
): Promise<T> {
  const key = import.meta.env.VITE_TMDB_KEY;
  if (!key) {
    throw new ApiError(0, endpoint, "VITE_TMDB_KEY missing");
  }

  const search = new URLSearchParams({ api_key: key, ...params });
  const url = `${BASE}${endpoint}?${search.toString()}`;

  let res: Response;
  try {
    res = await fetch(url, signal ? { signal } : {});
  } catch (err) {
    throw new ApiError(0, endpoint, "network error", err);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new ApiError(res.status, endpoint, body || res.statusText);
  }

  let data: unknown;
  try {
    data = await res.json();
  } catch (err) {
    throw new ApiError(0, endpoint, "invalid json", err);
  }

  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    throw new ApiError(0, endpoint, "schema mismatch", parsed.error);
  }
  return parsed.data;
}

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export const tmdb = {
  async searchMovies(query: string, signal?: AbortSignal): Promise<MediaItem[]> {
    if (query.trim() === "") return [];
    const data = await request(
      "/search/movie",
      { query },
      TmdbSearchMovieResponseSchema,
      signal,
    );
    return data.results.map(movieListItemToMediaItem);
  },

  async searchTv(query: string, signal?: AbortSignal): Promise<MediaItem[]> {
    if (query.trim() === "") return [];
    const data = await request(
      "/search/tv",
      { query },
      TmdbSearchTvResponseSchema,
      signal,
    );
    return data.results.map(tvListItemToMediaItem);
  },

  async trendingMovies(
    window: "day" | "week" = "day",
    signal?: AbortSignal,
  ): Promise<MediaItem[]> {
    const data = await request(
      `/trending/movie/${window}`,
      {},
      TmdbTrendingMovieResponseSchema,
      signal,
    );
    return data.results.map(movieListItemToMediaItem);
  },

  async trendingTv(
    window: "day" | "week" = "day",
    signal?: AbortSignal,
  ): Promise<MediaItem[]> {
    const data = await request(
      `/trending/tv/${window}`,
      {},
      TmdbTrendingTvResponseSchema,
      signal,
    );
    return data.results.map(tvListItemToMediaItem);
  },

  async movieDetails(
    id: number,
    signal?: AbortSignal,
  ): Promise<{ item: MediaItem; raw: TmdbMovie }> {
    const raw = await request(
      `/movie/${id}`,
      { append_to_response: "credits,videos,release_dates" },
      TmdbMovieSchema,
      signal,
    );
    return { item: movieToMediaItem(raw), raw };
  },

  async tvDetails(
    id: number,
    signal?: AbortSignal,
  ): Promise<{ item: MediaItem; raw: TmdbTv }> {
    const raw = await request(
      `/tv/${id}`,
      { append_to_response: "credits,videos" },
      TmdbTvSchema,
      signal,
    );
    return { item: tvToMediaItem(raw), raw };
  },

  async upcomingMovies(
    from: Date,
    to: Date,
    signal?: AbortSignal,
  ): Promise<ReleaseEvent[]> {
    const data = await request(
      "/discover/movie",
      {
        "primary_release_date.gte": toIsoDate(from),
        "primary_release_date.lte": toIsoDate(to),
      },
      TmdbSearchMovieResponseSchema,
      signal,
    );
    return data.results
      .filter((r) => r.release_date && r.release_date.length > 0)
      .map((r) => ({
        itemId: `tmdb:movie:${r.id}`,
        domain: "movie" as const,
        date: r.release_date as string,
        kind: "release" as const,
        title: r.title,
      }));
  },

  async watchProviders(
    domain: "movie" | "tv",
    id: number,
    region: string = "US",
    signal?: AbortSignal,
  ): Promise<string[]> {
    const data = await request(
      `/${domain}/${id}/watch/providers`,
      {},
      TmdbWatchProvidersResponseSchema,
      signal,
    );
    const country = data.results[region];
    return country?.flatrate?.map((p) => p.provider_name) ?? [];
  },
};
