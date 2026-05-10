import { useState, useDeferredValue } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useMovieSearch, useTvSearch } from "@/shared/api/tmdb/hooks";
import { MediaCard } from "@/shared/components/MediaCard";
import { MediaCardSkeleton } from "@/shared/components/MediaCardSkeleton";
import { EmptyState } from "@/shared/components/EmptyState";
import type { MediaItem } from "@/shared/schemas/media";

export function SearchPage() {
  const [query, setQuery] = useState("");
  const deferred = useDeferredValue(query);
  const trimmed = deferred.trim();

  const movies = useMovieSearch(trimmed);
  const tv = useTvSearch(trimmed);

  const isLoading = trimmed.length > 0 && (movies.isLoading || tv.isLoading);
  const navigate = useNavigate();
  const open = (item: MediaItem) => {
    const id = item.id.split(":").pop();
    if (item.domain === "movie") navigate(`/movies/${id}`);
    else if (item.domain === "tv") navigate(`/tv/${id}`);
  };

  const movieResults = trimmed ? (movies.data ?? []) : [];
  const tvResults = trimmed ? (tv.data ?? []) : [];
  const totalResults = movieResults.length + tvResults.length;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Search</h1>
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
          aria-hidden
        />
        <Input
          type="search"
          aria-label="Search"
          placeholder="Search movies and TV shows..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {!trimmed ? (
        <EmptyState
          icon={Search}
          title="Type to find anything"
          description="Results across movies and TV shows."
        />
      ) : isLoading ? (
        <div className="space-y-6">
          <SectionSkeleton title="Movies" />
          <SectionSkeleton title="TV Shows" />
        </div>
      ) : totalResults === 0 ? (
        <EmptyState
          icon={Search}
          title="No results"
          description={`No matches for "${trimmed}".`}
        />
      ) : (
        <div className="space-y-6">
          {movieResults.length > 0 ? (
            <ResultSection
              title="Movies"
              count={movieResults.length}
              items={movieResults}
              onOpen={open}
            />
          ) : null}
          {tvResults.length > 0 ? (
            <ResultSection
              title="TV Shows"
              count={tvResults.length}
              items={tvResults}
              onOpen={open}
            />
          ) : null}
        </div>
      )}
    </div>
  );
}

function ResultSection({
  title,
  count,
  items,
  onOpen,
}: {
  title: string;
  count: number;
  items: MediaItem[];
  onOpen: (i: MediaItem) => void;
}) {
  return (
    <section className="space-y-2">
      <h2 className="text-base font-semibold">
        {title}{" "}
        <span className="text-sm font-normal text-muted">({count})</span>
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {items.slice(0, 12).map((item) => (
          <MediaCard key={item.id} item={item} onOpen={onOpen} />
        ))}
      </div>
    </section>
  );
}

function SectionSkeleton({ title }: { title: string }) {
  return (
    <section className="space-y-2">
      <h2 className="text-base font-semibold">{title}</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <MediaCardSkeleton key={i} />
        ))}
      </div>
    </section>
  );
}
