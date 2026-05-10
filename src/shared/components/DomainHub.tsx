import { useDeferredValue, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import {
  useMovieTrending,
  useTvTrending,
  useMovieSearch,
  useTvSearch,
} from "@/shared/api/tmdb/hooks";
import { MediaCard } from "./MediaCard";
import { MediaCardSkeleton } from "./MediaCardSkeleton";
import { EmptyState } from "./EmptyState";
import { Input } from "@/components/ui/input";
import type { MediaItem } from "@/shared/schemas/media";

export interface DomainHubProps {
  domain: "movie" | "tv";
  title: string;
}

export function DomainHub({ domain, title }: Readonly<DomainHubProps>) {
  const [query, setQuery] = useState("");
  const deferred = useDeferredValue(query);
  const trimmed = deferred.trim();
  const isSearching = trimmed.length > 0;

  const trendingMovie = useMovieTrending("day");
  const trendingTv = useTvTrending("day");
  const trending = domain === "movie" ? trendingMovie : trendingTv;

  const searchMovie = useMovieSearch(domain === "movie" ? trimmed : "");
  const searchTv = useTvSearch(domain === "tv" ? trimmed : "");
  const search = domain === "movie" ? searchMovie : searchTv;

  const isLoading = isSearching ? search.isLoading : trending.isLoading;
  const items: MediaItem[] = isSearching
    ? (search.data ?? [])
    : (trending.data ?? []);

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
      return (
        <EmptyState
          icon={Search}
          title={isSearching ? "No results" : "Nothing yet"}
          description={
            isSearching ? `No matches for "${trimmed}"` : "Try a search above."
          }
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
      {renderGrid()}
    </div>
  );
}
