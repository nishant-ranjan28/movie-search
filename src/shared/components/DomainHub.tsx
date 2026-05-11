import { useDeferredValue, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Search } from "lucide-react";
import {
  useDiscover,
  useMovieSearch,
  useMovieTrending,
  useTvSearch,
  useTvTrending,
} from "@/shared/api/tmdb/hooks";
import type { DiscoverFilters } from "@/shared/api/tmdb/client";
import { MediaCard } from "./MediaCard";
import { MediaCardSkeleton } from "./MediaCardSkeleton";
import { EmptyState } from "./EmptyState";
import { DomainFilters } from "./DomainFilters";
import {
  filtersFromParams,
  filtersToParams,
} from "./discoverFiltersFromUrl";
import { Input } from "@/components/ui/input";
import type { MediaItem } from "@/shared/schemas/media";

export interface DomainHubProps {
  domain: "movie" | "tv";
  title: string;
}

const hasAnyFilter = (f: DiscoverFilters): boolean =>
  (f.genres !== undefined && f.genres.length > 0) ||
  f.yearGte !== undefined ||
  f.yearLte !== undefined ||
  f.ratingGte !== undefined ||
  (f.sort !== undefined && f.sort !== "popularity.desc");

export function DomainHub({ domain, title }: Readonly<DomainHubProps>) {
  const [params, setParams] = useSearchParams();
  const filters = filtersFromParams(params);
  const setFilters = (next: DiscoverFilters) => {
    setParams(filtersToParams(next, params), { replace: true });
  };

  const [query, setQuery] = useState("");
  const deferred = useDeferredValue(query);
  const trimmed = deferred.trim();
  const isSearching = trimmed.length > 0;
  const filtersActive = hasAnyFilter(filters);

  // Three modes — search wins, then discover, then trending.
  const trendingMovie = useMovieTrending("day");
  const trendingTv = useTvTrending("day");
  const trending = domain === "movie" ? trendingMovie : trendingTv;

  const searchMovie = useMovieSearch(domain === "movie" ? trimmed : "");
  const searchTv = useTvSearch(domain === "tv" ? trimmed : "");
  const search = domain === "movie" ? searchMovie : searchTv;

  const discover = useDiscover(domain, filtersActive ? filters : {});

  const { items, isLoading, mode } = (() => {
    if (isSearching) {
      return {
        items: (search.data ?? []) as MediaItem[],
        isLoading: search.isLoading,
        mode: "search" as const,
      };
    }
    if (filtersActive) {
      return {
        items: (discover.data ?? []) as MediaItem[],
        isLoading: discover.isLoading,
        mode: "discover" as const,
      };
    }
    return {
      items: (trending.data ?? []) as MediaItem[],
      isLoading: trending.isLoading,
      mode: "trending" as const,
    };
  })();

  const navigate = useNavigate();
  const open = (item: MediaItem) => {
    const idPart = item.id.split(":").pop();
    if (item.domain === "movie") navigate(`/movies/${idPart}`);
    else if (item.domain === "tv") navigate(`/tv/${idPart}`);
  };

  const renderGrid = () => {
    if (isLoading) {
      return (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {Array.from({ length: 12 }, (_, i) => `skeleton-${i}`).map((key) => (
            <MediaCardSkeleton key={key} />
          ))}
        </div>
      );
    }
    if (items.length === 0) {
      const titleText =
        mode === "search"
          ? "No results"
          : mode === "discover"
            ? "No matches"
            : "Nothing yet";
      const description =
        mode === "search"
          ? `No matches for "${trimmed}"`
          : mode === "discover"
            ? "Try widening your filters."
            : "Try a search above.";
      return (
        <EmptyState
          icon={Search}
          title={titleText}
          description={description}
        />
      );
    }
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {items.map((item) => (
          <MediaCard key={item.id} item={item} onOpen={open} />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
          aria-hidden
        />
        <Input
          type="search"
          aria-label={`Search ${title.toLowerCase()}`}
          placeholder={`Search ${title.toLowerCase()}...`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
        />
      </div>
      <DomainFilters domain={domain} value={filters} onChange={setFilters} />
      {isSearching && filtersActive ? (
        <p className="text-xs text-muted">
          Filters are paused while searching. Clear the search to use filters.
        </p>
      ) : null}
      {renderGrid()}
    </div>
  );
}
