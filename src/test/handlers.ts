import { http, HttpResponse, type HttpHandler } from "msw";
import movie603 from "@/shared/api/tmdb/fixtures/movie-603.json";
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

  // Discover (used by upcomingMovies)
  http.get(`${TMDB}/discover/movie`, () => {
    // Synthesize a small upcoming-discover-movie response; reuse search-movie-matrix
    // shape (same TmdbSearchMovieResponseSchema) so tests don't need a separate fixture.
    return HttpResponse.json(searchMovieMatrix);
  }),
];
