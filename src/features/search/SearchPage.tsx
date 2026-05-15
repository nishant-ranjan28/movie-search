import { useDeferredValue } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useGenres, useMovieSearch, useTvSearch } from "@/shared/api/tmdb/hooks";
import { useAiTranslate } from "@/shared/api/ai/translate";
import { filtersToParams } from "@/shared/components/discoverFiltersFromUrl";
import { MediaCard } from "@/shared/components/MediaCard";
import { MediaCardSkeleton } from "@/shared/components/MediaCardSkeleton";
import { EmptyState } from "@/shared/components/EmptyState";
import type { MediaItem } from "@/shared/schemas/media";

export function SearchPage() {
  // URL is the source of truth — keeps the page input, the top-bar
  // global search input, and back/forward navigation all in sync
  // without any useEffect plumbing.
  const [params, setParams] = useSearchParams();
  const query = params.get("q") ?? "";
  const deferred = useDeferredValue(query);
  const trimmed = deferred.trim();

  const setQuery = (next: string) => {
    const nextParams = new URLSearchParams(params);
    if (next.length === 0) nextParams.delete("q");
    else nextParams.set("q", next);
    setParams(nextParams, { replace: true });
  };

  const movies = useMovieSearch(trimmed);
  const tv = useTvSearch(trimmed);
  const movieGenres = useGenres("movie");
  const tvGenres = useGenres("tv");
  const aiTranslate = useAiTranslate();

  const isLoading = trimmed.length > 0 && (movies.isLoading || tv.isLoading);
  const navigate = useNavigate();
  const open = (item: MediaItem) => {
    const id = item.id.split(":").pop();
    if (item.domain === "movie") navigate(`/movies/${id}`);
    else if (item.domain === "tv") navigate(`/tv/${id}`);
  };

  const runSmartSearch = () => {
    if (!movieGenres.data || !tvGenres.data || trimmed.length === 0) return;
    aiTranslate.mutate(
      { query: trimmed, movieGenres: movieGenres.data, tvGenres: tvGenres.data },
      {
        onSuccess: ({ domain, filters }) => {
          const target = filtersToParams(filters, new URLSearchParams());
          navigate(`/${domain === "tv" ? "tv" : "movies"}?${target.toString()}`);
        },
      },
    );
  };

  const movieResults = trimmed ? (movies.data ?? []) : [];
  const tvResults = trimmed ? (tv.data ?? []) : [];
  const totalResults = movieResults.length + tvResults.length;

  const renderResults = () => {
    if (!trimmed) {
      return (
        <EmptyState
          icon={Search}
          title="Type to find anything"
          description="Results across movies and TV shows."
        />
      );
    }
    if (isLoading) {
      return (
        <div className="space-y-6">
          <SectionSkeleton title="Movies" />
          <SectionSkeleton title="TV Shows" />
        </div>
      );
    }
    if (totalResults === 0) {
      return (
        <EmptyState
          icon={Search}
          title="No title matches"
          description={`Nothing matches "${trimmed}" by title. Try Smart search to find by mood, decade, genre, or rating.`}
          action={
            <Button
              type="button"
              onClick={runSmartSearch}
              disabled={aiTranslate.isPending || !movieGenres.data || !tvGenres.data}
              className="gap-2"
            >
              {aiTranslate.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Sparkles className="h-4 w-4" aria-hidden />
              )}
              Smart search
            </Button>
          }
        />
      );
    }
    return (
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
    );
  };

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

      {renderResults()}
    </div>
  );
}

function ResultSection({
  title,
  count,
  items,
  onOpen,
}: Readonly<{
  title: string;
  count: number;
  items: MediaItem[];
  onOpen: (i: MediaItem) => void;
}>) {
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

function SectionSkeleton({ title }: Readonly<{ title: string }>) {
  return (
    <section className="space-y-2">
      <h2 className="text-base font-semibold">{title}</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {Array.from({ length: 6 }, (_, i) => `skeleton-${i}`).map((key) => (
          <MediaCardSkeleton key={key} />
        ))}
      </div>
    </section>
  );
}
