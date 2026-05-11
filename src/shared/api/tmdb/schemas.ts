import { z } from "zod";

/**
 * Zod schemas for raw TMDB API responses.
 *
 * Scope: only fields consumed downstream (hubs, detail, search, watch
 * providers). TMDB returns many extra fields; we ignore them rather than
 * .passthrough() so upstream shape drift on the fields we care about is
 * caught loudly.
 *
 * Conventions:
 * - `null` (not `undefined`) is returned for missing posters/backdrops.
 * - `release_date` / `first_air_date` may be `""` for unreleased titles.
 * - List endpoints return `genre_ids: number[]`; details endpoints return
 *   `genres: { id, name }[]`.
 */

const TmdbGenreSchema = z.object({
  id: z.number(),
  name: z.string(),
});

const TmdbCastMemberSchema = z.object({
  id: z.number(),
  name: z.string(),
  character: z.string(),
  order: z.number(),
  profile_path: z.string().nullable(),
});

const TmdbCrewMemberSchema = z.object({
  id: z.number(),
  name: z.string(),
  job: z.string(),
});

const TmdbCreditsSchema = z.object({
  cast: z.array(TmdbCastMemberSchema),
  crew: z.array(TmdbCrewMemberSchema),
});

const TmdbVideoSchema = z.object({
  key: z.string(),
  type: z.string(),
  site: z.string(),
  name: z.string(),
});

const TmdbVideosSchema = z.object({
  results: z.array(TmdbVideoSchema),
});

const TmdbReleaseDateEntrySchema = z.object({
  certification: z.string(),
  type: z.number(),
  release_date: z.string(),
});

const TmdbReleaseDatesCountrySchema = z.object({
  iso_3166_1: z.string(),
  release_dates: z.array(TmdbReleaseDateEntrySchema),
});

const TmdbReleaseDatesSchema = z.object({
  results: z.array(TmdbReleaseDatesCountrySchema),
});

// ---------------------------------------------------------------------------
// Movie details
// ---------------------------------------------------------------------------

export const TmdbMovieSchema = z.object({
  id: z.number(),
  title: z.string(),
  original_title: z.string(),
  overview: z.string(),
  poster_path: z.string().nullable(),
  backdrop_path: z.string().nullable(),
  release_date: z.string(),
  vote_average: z.number(),
  vote_count: z.number(),
  genres: z.array(TmdbGenreSchema),
  runtime: z.number().nullable(),
  tagline: z.string(),
  status: z.string(),
  credits: TmdbCreditsSchema,
  videos: TmdbVideosSchema,
  release_dates: TmdbReleaseDatesSchema,
});
export type TmdbMovie = z.infer<typeof TmdbMovieSchema>;

// ---------------------------------------------------------------------------
// TV details
// ---------------------------------------------------------------------------

const TmdbNextEpisodeToAirSchema = z.object({
  air_date: z.string(),
  episode_number: z.number(),
  season_number: z.number(),
  name: z.string(),
});

export const TmdbTvSchema = z.object({
  id: z.number(),
  name: z.string(),
  original_name: z.string(),
  overview: z.string(),
  poster_path: z.string().nullable(),
  backdrop_path: z.string().nullable(),
  first_air_date: z.string(),
  vote_average: z.number(),
  vote_count: z.number(),
  genres: z.array(TmdbGenreSchema),
  episode_run_time: z.array(z.number()),
  status: z.string(),
  credits: TmdbCreditsSchema,
  videos: TmdbVideosSchema,
  next_episode_to_air: TmdbNextEpisodeToAirSchema.nullable(),
});
export type TmdbTv = z.infer<typeof TmdbTvSchema>;

// ---------------------------------------------------------------------------
// List items (search + trending)
// ---------------------------------------------------------------------------

export const TmdbMovieListItemSchema = z.object({
  id: z.number(),
  title: z.string(),
  original_title: z.string(),
  overview: z.string(),
  poster_path: z.string().nullable(),
  backdrop_path: z.string().nullable(),
  release_date: z.string().optional(),
  vote_average: z.number(),
  vote_count: z.number(),
  genre_ids: z.array(z.number()),
  // present on /trending, absent on /search/movie
  media_type: z.literal("movie").optional(),
});
export type TmdbMovieListItem = z.infer<typeof TmdbMovieListItemSchema>;

export const TmdbTvListItemSchema = z.object({
  id: z.number(),
  name: z.string(),
  original_name: z.string(),
  overview: z.string(),
  poster_path: z.string().nullable(),
  backdrop_path: z.string().nullable(),
  first_air_date: z.string().optional(),
  vote_average: z.number(),
  vote_count: z.number(),
  genre_ids: z.array(z.number()),
  origin_country: z.array(z.string()).optional(),
  media_type: z.literal("tv").optional(),
});
export type TmdbTvListItem = z.infer<typeof TmdbTvListItemSchema>;

const paginatedListShape = {
  page: z.number(),
  total_pages: z.number(),
  total_results: z.number(),
};

export const TmdbSearchMovieResponseSchema = z.object({
  ...paginatedListShape,
  results: z.array(TmdbMovieListItemSchema),
});
export type TmdbSearchMovieResponse = z.infer<typeof TmdbSearchMovieResponseSchema>;

export const TmdbSearchTvResponseSchema = z.object({
  ...paginatedListShape,
  results: z.array(TmdbTvListItemSchema),
});
export type TmdbSearchTvResponse = z.infer<typeof TmdbSearchTvResponseSchema>;

export const TmdbTrendingMovieResponseSchema = TmdbSearchMovieResponseSchema;
export type TmdbTrendingMovieResponse = z.infer<typeof TmdbTrendingMovieResponseSchema>;

export const TmdbTrendingTvResponseSchema = TmdbSearchTvResponseSchema;
export type TmdbTrendingTvResponse = z.infer<typeof TmdbTrendingTvResponseSchema>;

// ---------------------------------------------------------------------------
// Watch providers
// ---------------------------------------------------------------------------

const TmdbWatchProviderSchema = z.object({
  provider_id: z.number(),
  provider_name: z.string(),
  logo_path: z.string(),
});

const TmdbWatchProvidersCountrySchema = z.object({
  link: z.string().optional(),
  flatrate: z.array(TmdbWatchProviderSchema).optional(),
  rent: z.array(TmdbWatchProviderSchema).optional(),
  buy: z.array(TmdbWatchProviderSchema).optional(),
});

export const TmdbWatchProvidersResponseSchema = z.object({
  id: z.number(),
  results: z.record(z.string(), TmdbWatchProvidersCountrySchema),
});
export type TmdbWatchProvidersResponse = z.infer<typeof TmdbWatchProvidersResponseSchema>;

// ---------------------------------------------------------------------------
// Genre list (/genre/{movie,tv}/list)
// ---------------------------------------------------------------------------

export const TmdbGenreListResponseSchema = z.object({
  genres: z.array(TmdbGenreSchema),
});
export type TmdbGenreListResponse = z.infer<typeof TmdbGenreListResponseSchema>;
export type TmdbGenre = z.infer<typeof TmdbGenreSchema>;

// ---------------------------------------------------------------------------
// Discover (/discover/{movie,tv})
//
// Same response shape as search/trending paginated list endpoints. Aliased
// here so call sites read more naturally.
// ---------------------------------------------------------------------------

export const TmdbDiscoverMovieResponseSchema = TmdbSearchMovieResponseSchema;
export type TmdbDiscoverMovieResponse = z.infer<typeof TmdbDiscoverMovieResponseSchema>;

export const TmdbDiscoverTvResponseSchema = TmdbSearchTvResponseSchema;
export type TmdbDiscoverTvResponse = z.infer<typeof TmdbDiscoverTvResponseSchema>;
