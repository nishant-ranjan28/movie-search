import {
  useDeferredValue,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useMovieSearch, useTvSearch } from "@/shared/api/tmdb/hooks";
import type { MediaItem } from "@/shared/schemas/media";
import { cn } from "@/lib/cn";

interface Props {
  className?: string;
}

const DROPDOWN_LIMIT = 5;

/**
 * Inline search box for the desktop top nav. Provides:
 *  - Typeahead: as the user types, a dropdown shows the top movie + TV
 *    matches; click navigates to the detail page.
 *  - Enter (or "See all results"): navigates to /search?q=… for the full
 *    results page.
 *  - URL sync: stays in sync with `?q=` for back/forward + deep links via
 *    the "derive during render" pattern.
 */
export function GlobalSearchInput({ className }: Readonly<Props>) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const urlQuery = params.get("q") ?? "";

  const [value, setValue] = useState(urlQuery);
  const [lastSyncedUrlQuery, setLastSyncedUrlQuery] = useState(urlQuery);
  if (urlQuery !== lastSyncedUrlQuery) {
    setLastSyncedUrlQuery(urlQuery);
    setValue(urlQuery);
  }

  const deferred = useDeferredValue(value);
  const trimmed = deferred.trim();

  const movies = useMovieSearch(trimmed);
  const tv = useTvSearch(trimmed);

  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLFormElement>(null);

  // Close the dropdown on outside click.
  useEffect(() => {
    const onPointerDown = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, []);

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const t = value.trim();
    if (t.length === 0) return;
    setOpen(false);
    navigate(`/search?q=${encodeURIComponent(t)}`);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setOpen(false);
      (e.currentTarget as HTMLInputElement).blur();
    }
  };

  const openDetail = (item: MediaItem) => {
    const id = item.id.split(":").pop();
    if (!id) return;
    setOpen(false);
    if (item.domain === "movie") navigate(`/movies/${id}`);
    else if (item.domain === "tv") navigate(`/tv/${id}`);
  };

  const movieHits = (movies.data ?? []).slice(0, DROPDOWN_LIMIT);
  const tvHits = (tv.data ?? []).slice(0, DROPDOWN_LIMIT);
  const hasQuery = trimmed.length > 0;
  const hasHits = movieHits.length + tvHits.length > 0;
  const isLoading = hasQuery && (movies.isLoading || tv.isLoading);
  const showDropdown = open && hasQuery;

  return (
    <form
      ref={containerRef}
      role="search"
      onSubmit={onSubmit}
      className={cn("relative w-full max-w-md", className)}
    >
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
        aria-hidden
      />
      <Input
        type="search"
        aria-label="Search movies and TV shows"
        placeholder="Search movies and TV..."
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        className="pl-9"
        autoComplete="off"
      />
      {showDropdown ? (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-[480px] overflow-y-auto rounded-md border border-border bg-bg shadow-lg"
        >
          {isLoading && !hasHits ? (
            <div className="px-3 py-3 text-sm text-muted">Searching…</div>
          ) : !hasHits ? (
            <div className="px-3 py-3 text-sm text-muted">
              No matches for &ldquo;{trimmed}&rdquo;
            </div>
          ) : (
            <>
              {movieHits.length > 0 ? (
                <ResultGroup
                  label="Movies"
                  items={movieHits}
                  onPick={openDetail}
                />
              ) : null}
              {tvHits.length > 0 ? (
                <ResultGroup
                  label="TV"
                  items={tvHits}
                  onPick={openDetail}
                />
              ) : null}
              <button
                type="submit"
                className="block w-full border-t border-border px-3 py-2 text-left text-sm text-fg hover:bg-card/60"
              >
                See all results for &ldquo;{trimmed}&rdquo;
              </button>
            </>
          )}
        </div>
      ) : null}
    </form>
  );
}

function ResultGroup({
  label,
  items,
  onPick,
}: Readonly<{
  label: string;
  items: MediaItem[];
  onPick: (item: MediaItem) => void;
}>) {
  return (
    <div>
      <div className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-muted">
        {label}
      </div>
      <ul>
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => onPick(item)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-card/60"
            >
              <span className="truncate">{item.title}</span>
              {item.year ? (
                <span className="shrink-0 text-xs text-muted">
                  {item.year}
                </span>
              ) : null}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
