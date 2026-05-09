import type { MediaItem, MediaStatus } from "@/shared/schemas/media";
import type {
  TmdbMovie,
  TmdbMovieListItem,
  TmdbTv,
  TmdbTvListItem,
} from "./schemas";

const POSTER_BASE = "https://image.tmdb.org/t/p/w500";
const TMDB_WEB_BASE = "https://www.themoviedb.org";

function parseYear(date: string | undefined | null): number | undefined {
  if (!date) return undefined;
  const head = date.slice(0, 4);
  const n = Number.parseInt(head, 10);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function mapMovieStatus(status: string): MediaStatus | undefined {
  switch (status) {
    case "Released":
      return "released";
    case "Post Production":
    case "In Production":
    case "Planned":
      return "upcoming";
    default:
      return undefined;
  }
}

function mapTvStatus(status: string): MediaStatus | undefined {
  switch (status) {
    case "Returning Series":
      return "ongoing";
    case "Ended":
    case "Canceled":
      return "ended";
    case "In Production":
    case "Planned":
    case "Pilot":
      return "upcoming";
    default:
      return undefined;
  }
}

export const movieToMediaItem = (m: TmdbMovie): MediaItem => {
  const year = parseYear(m.release_date);
  const status = mapMovieStatus(m.status);
  const hasRating = m.vote_count > 0;

  return {
    id: `tmdb:movie:${m.id}`,
    domain: "movie",
    title: m.title,
    genres: m.genres.map((g) => g.name.toLowerCase()),
    external: [{ provider: "tmdb", url: `${TMDB_WEB_BASE}/movie/${m.id}` }],
    ...(m.original_title && m.original_title !== m.title
      ? { altTitle: m.original_title }
      : {}),
    ...(year !== undefined ? { year } : {}),
    ...(m.poster_path
      ? { poster: { src: `${POSTER_BASE}${m.poster_path}` } }
      : {}),
    ...(m.overview ? { synopsis: m.overview } : {}),
    ...(hasRating
      ? {
          rating: {
            score: m.vote_average,
            outOf: 10 as const,
            votes: m.vote_count,
          },
        }
      : {}),
    ...(m.release_date ? { releaseDate: m.release_date } : {}),
    ...(status !== undefined ? { status } : {}),
  };
};

export const tvToMediaItem = (t: TmdbTv): MediaItem => {
  const year = parseYear(t.first_air_date);
  const status = mapTvStatus(t.status);
  const hasRating = t.vote_count > 0;

  return {
    id: `tmdb:tv:${t.id}`,
    domain: "tv",
    title: t.name,
    genres: t.genres.map((g) => g.name.toLowerCase()),
    external: [{ provider: "tmdb", url: `${TMDB_WEB_BASE}/tv/${t.id}` }],
    ...(t.original_name && t.original_name !== t.name
      ? { altTitle: t.original_name }
      : {}),
    ...(year !== undefined ? { year } : {}),
    ...(t.poster_path
      ? { poster: { src: `${POSTER_BASE}${t.poster_path}` } }
      : {}),
    ...(t.overview ? { synopsis: t.overview } : {}),
    ...(hasRating
      ? {
          rating: {
            score: t.vote_average,
            outOf: 10 as const,
            votes: t.vote_count,
          },
        }
      : {}),
    ...(t.first_air_date ? { releaseDate: t.first_air_date } : {}),
    ...(status !== undefined ? { status } : {}),
  };
};

export const movieListItemToMediaItem = (m: TmdbMovieListItem): MediaItem => {
  const year = parseYear(m.release_date);
  const hasRating = m.vote_count > 0;

  return {
    id: `tmdb:movie:${m.id}`,
    domain: "movie",
    title: m.title,
    genres: [],
    external: [{ provider: "tmdb", url: `${TMDB_WEB_BASE}/movie/${m.id}` }],
    ...(m.original_title && m.original_title !== m.title
      ? { altTitle: m.original_title }
      : {}),
    ...(year !== undefined ? { year } : {}),
    ...(m.poster_path
      ? { poster: { src: `${POSTER_BASE}${m.poster_path}` } }
      : {}),
    ...(m.overview ? { synopsis: m.overview } : {}),
    ...(hasRating
      ? {
          rating: {
            score: m.vote_average,
            outOf: 10 as const,
            votes: m.vote_count,
          },
        }
      : {}),
    ...(m.release_date ? { releaseDate: m.release_date } : {}),
  };
};

export const tvListItemToMediaItem = (t: TmdbTvListItem): MediaItem => {
  const year = parseYear(t.first_air_date);
  const hasRating = t.vote_count > 0;

  return {
    id: `tmdb:tv:${t.id}`,
    domain: "tv",
    title: t.name,
    genres: [],
    external: [{ provider: "tmdb", url: `${TMDB_WEB_BASE}/tv/${t.id}` }],
    ...(t.original_name && t.original_name !== t.name
      ? { altTitle: t.original_name }
      : {}),
    ...(year !== undefined ? { year } : {}),
    ...(t.poster_path
      ? { poster: { src: `${POSTER_BASE}${t.poster_path}` } }
      : {}),
    ...(t.overview ? { synopsis: t.overview } : {}),
    ...(hasRating
      ? {
          rating: {
            score: t.vote_average,
            outOf: 10 as const,
            votes: t.vote_count,
          },
        }
      : {}),
    ...(t.first_air_date ? { releaseDate: t.first_air_date } : {}),
  };
};
