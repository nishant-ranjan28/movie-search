import { http, HttpResponse, type HttpHandler } from "msw";
import discoverMovieSample from "@/shared/api/tmdb/fixtures/discover-movie-sample.json";
import genreMovieList from "@/shared/api/tmdb/fixtures/genre-movie-list.json";
import genreTvList from "@/shared/api/tmdb/fixtures/genre-tv-list.json";
import movie603 from "@/shared/api/tmdb/fixtures/movie-603.json";
import recommendationsMovie603 from "@/shared/api/tmdb/fixtures/recommendations-movie-603.json";
import similarMovie603 from "@/shared/api/tmdb/fixtures/similar-movie-603.json";
import tv1399 from "@/shared/api/tmdb/fixtures/tv-1399.json";
import trendingMovieDay from "@/shared/api/tmdb/fixtures/trending-movie-day.json";
import trendingTvDay from "@/shared/api/tmdb/fixtures/trending-tv-day.json";
import searchMovieMatrix from "@/shared/api/tmdb/fixtures/search-movie-matrix.json";
import watchProvidersMovie603 from "@/shared/api/tmdb/fixtures/watch-providers-movie-603.json";

const TMDB = "https://api.themoviedb.org/3";

export const handlers: HttpHandler[] = [
  // Movie details
  http.get(`${TMDB}/movie/603`, () => HttpResponse.json(movie603)),

  // TV details
  http.get(`${TMDB}/tv/1399`, () => HttpResponse.json(tv1399)),

  // Trending
  http.get(`${TMDB}/trending/movie/:window`, () => HttpResponse.json(trendingMovieDay)),
  http.get(`${TMDB}/trending/tv/:window`, () => HttpResponse.json(trendingTvDay)),

  // Search
  http.get(`${TMDB}/search/movie`, ({ request }) => {
    const url = new URL(request.url);
    const query = url.searchParams.get("query") ?? "";
    if (!query) {
      return HttpResponse.json({ page: 1, results: [], total_pages: 0, total_results: 0 });
    }
    return HttpResponse.json(searchMovieMatrix);
  }),
  http.get(`${TMDB}/search/tv`, ({ request }) => {
    const url = new URL(request.url);
    const query = url.searchParams.get("query") ?? "";
    if (!query) {
      return HttpResponse.json({ page: 1, results: [], total_pages: 0, total_results: 0 });
    }
    // Reuse trending TV as a stand-in for search results in tests
    return HttpResponse.json(trendingTvDay);
  }),

  // Watch providers
  http.get(`${TMDB}/movie/:id/watch/providers`, () => HttpResponse.json(watchProvidersMovie603)),
  http.get(`${TMDB}/tv/:id/watch/providers`, () => HttpResponse.json(watchProvidersMovie603)),

  // Similar / recommendations — share movie 603 fixture across any id in tests.
  http.get(`${TMDB}/movie/:id/similar`, () => HttpResponse.json(similarMovie603)),
  http.get(`${TMDB}/movie/:id/recommendations`, () => HttpResponse.json(recommendationsMovie603)),
  http.get(`${TMDB}/tv/:id/similar`, () => HttpResponse.json(trendingTvDay)),
  http.get(`${TMDB}/tv/:id/recommendations`, () => HttpResponse.json(trendingTvDay)),

  // Discover — used by both upcomingMovies (date-window) and the filter-driven
  // hub queries. Returns the real filtered-discover fixture when filter params
  // are present; otherwise falls back to the search-movie-matrix shape so
  // upcomingMovies tests keep their previous behavior.
  http.get(`${TMDB}/discover/movie`, ({ request }) => {
    const url = new URL(request.url);
    if (
      url.searchParams.has("with_genres") ||
      url.searchParams.has("vote_average.gte")
    ) {
      return HttpResponse.json(discoverMovieSample);
    }
    return HttpResponse.json(searchMovieMatrix);
  }),
  http.get(`${TMDB}/discover/tv`, () => HttpResponse.json(trendingTvDay)),

  // Genre lists
  http.get(`${TMDB}/genre/movie/list`, () => HttpResponse.json(genreMovieList)),
  http.get(`${TMDB}/genre/tv/list`, () => HttpResponse.json(genreTvList)),

  // AI natural-language translate (Vercel Edge function) — synthesize a
  // deterministic response so tests don't depend on Groq.
  http.post("/api/ai/translate", () =>
    HttpResponse.json({
      genres: [35],
      yearGte: 1990,
      yearLte: 1999,
    }),
  ),

  // AI personalized recommend — deterministic stub mirroring translate's
  // shape (filters + reason).
  http.post("/api/ai/recommend", () =>
    HttpResponse.json({
      filters: { genres: [878, 28], yearGte: 2015, ratingGte: 7 },
      reason: "Lean into the cerebral sci-fi action vibe from your watchlist.",
    }),
  ),
];
