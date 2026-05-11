import type { DiscoverFilters } from "@/shared/api/tmdb/client";

/**
 * Read/write DiscoverFilters to URL search params so filter state survives
 * reload and is bookmarkable. URL shape:
 *   ?genres=28,12&year_gte=2010&year_lte=2024&rating_gte=7&sort=date.desc
 *
 * Unknown / malformed values are ignored (we don't throw — bad URLs shouldn't
 * break the page).
 */

const SORT_KEYS = new Set<NonNullable<DiscoverFilters["sort"]>>([
  "popularity.desc",
  "vote_average.desc",
  "date.desc",
]);

const isSort = (s: string): s is NonNullable<DiscoverFilters["sort"]> =>
  (SORT_KEYS as Set<string>).has(s);

export const filtersFromParams = (
  params: URLSearchParams,
): DiscoverFilters => {
  const out: DiscoverFilters = {};

  const genres = params
    .get("genres")
    ?.split(",")
    .map((s) => Number.parseInt(s, 10))
    .filter((n) => Number.isFinite(n));
  if (genres && genres.length > 0) out.genres = genres;

  const yearGte = Number.parseInt(params.get("year_gte") ?? "", 10);
  if (Number.isFinite(yearGte)) out.yearGte = yearGte;

  const yearLte = Number.parseInt(params.get("year_lte") ?? "", 10);
  if (Number.isFinite(yearLte)) out.yearLte = yearLte;

  const ratingGte = Number.parseFloat(params.get("rating_gte") ?? "");
  if (Number.isFinite(ratingGte)) out.ratingGte = ratingGte;

  const sort = params.get("sort");
  if (sort && isSort(sort)) out.sort = sort;

  return out;
};

export const filtersToParams = (
  filters: DiscoverFilters,
  base: URLSearchParams,
): URLSearchParams => {
  const next = new URLSearchParams(base);

  if (filters.genres && filters.genres.length > 0) {
    next.set("genres", filters.genres.join(","));
  } else {
    next.delete("genres");
  }
  if (filters.yearGte !== undefined) next.set("year_gte", String(filters.yearGte));
  else next.delete("year_gte");
  if (filters.yearLte !== undefined) next.set("year_lte", String(filters.yearLte));
  else next.delete("year_lte");
  if (filters.ratingGte !== undefined) next.set("rating_gte", String(filters.ratingGte));
  else next.delete("rating_gte");
  if (filters.sort && filters.sort !== "popularity.desc") next.set("sort", filters.sort);
  else next.delete("sort");

  return next;
};
