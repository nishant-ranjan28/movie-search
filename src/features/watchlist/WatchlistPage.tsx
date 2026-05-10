import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Bookmark } from "lucide-react";
import { useWatchlistStore, type WatchlistEntry } from "@/shared/store/watchlist";
import type { MediaItem, MediaDomain } from "@/shared/schemas/media";
import { MediaCard } from "@/shared/components/MediaCard";
import { EmptyState } from "@/shared/components/EmptyState";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/cn";

type SortKey = "recent" | "title" | "year" | "rating";

const DOMAIN_LABELS: Record<MediaDomain, string> = {
  movie: "Movies",
  tv: "TV",
  anime: "Anime",
  game: "Games",
  book: "Books",
};

const STATUS_LABELS: Record<WatchlistEntry["status"], string> = {
  want: "Want",
  in_progress: "In progress",
  done: "Done",
  dropped: "Dropped",
};

const SORT_LABELS: Record<SortKey, string> = {
  recent: "Recently added",
  title: "Title",
  year: "Year",
  rating: "Rating",
};

const itemFromEntry = (e: WatchlistEntry): MediaItem => ({
  id: e.itemId,
  domain: e.domain,
  title: e.snapshot.title,
  ...(e.snapshot.poster ? { poster: e.snapshot.poster } : {}),
  ...(e.snapshot.year !== undefined ? { year: e.snapshot.year } : {}),
  genres: e.snapshot.genres,
  ...(e.snapshot.releaseDate ? { releaseDate: e.snapshot.releaseDate } : {}),
  ...(e.snapshot.status ? { status: e.snapshot.status } : {}),
  external: [],
});

export function WatchlistPage() {
  const navigate = useNavigate();
  const entriesMap = useWatchlistStore((s) => s.entries);
  const entries = useMemo(() => Object.values(entriesMap), [entriesMap]);
  const [domainFilter, setDomainFilter] = useState<MediaDomain | "all">("all");
  const [statusFilter, setStatusFilter] = useState<WatchlistEntry["status"] | "all">("all");
  const [sortKey, setSortKey] = useState<SortKey>("recent");

  const presentDomains = useMemo(() => {
    const set = new Set<MediaDomain>();
    for (const e of entries) set.add(e.domain);
    return set;
  }, [entries]);

  const filtered = useMemo(() => {
    return entries
      .filter((e) => domainFilter === "all" || e.domain === domainFilter)
      .filter((e) => statusFilter === "all" || e.status === statusFilter);
  }, [entries, domainFilter, statusFilter]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    switch (sortKey) {
      case "recent":
        arr.sort((a, b) => (a.addedAt < b.addedAt ? 1 : -1));
        break;
      case "title":
        arr.sort((a, b) => a.snapshot.title.localeCompare(b.snapshot.title));
        break;
      case "year":
        arr.sort((a, b) => (b.snapshot.year ?? 0) - (a.snapshot.year ?? 0));
        break;
      case "rating":
        arr.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
        break;
    }
    return arr;
  }, [filtered, sortKey]);

  if (entries.length === 0) {
    return (
      <EmptyState
        icon={Bookmark}
        title="Your watchlist is empty"
        description="Add movies, shows, anime, games, or books to track them here."
        action={<Button onClick={() => navigate("/")}>Discover Today</Button>}
      />
    );
  }

  const open = (item: MediaItem) => {
    const numericId = item.id.split(":").pop();
    if (item.domain === "movie") navigate(`/movies/${numericId}`);
    else if (item.domain === "tv") navigate(`/tv/${numericId}`);
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Watchlist</h1>

      <div
        className="flex flex-wrap items-center gap-2"
        role="group"
        aria-label="Domain filter"
      >
        <Chip active={domainFilter === "all"} onClick={() => setDomainFilter("all")}>
          All
        </Chip>
        {(Object.keys(DOMAIN_LABELS) as MediaDomain[])
          .filter((d) => presentDomains.has(d))
          .map((d) => (
            <Chip
              key={d}
              active={domainFilter === d}
              onClick={() => setDomainFilter(d)}
            >
              {DOMAIN_LABELS[d]}
            </Chip>
          ))}
      </div>

      <div
        className="flex flex-wrap items-center gap-2"
        role="group"
        aria-label="Status filter"
      >
        <Chip active={statusFilter === "all"} onClick={() => setStatusFilter("all")}>
          All
        </Chip>
        {(Object.keys(STATUS_LABELS) as WatchlistEntry["status"][]).map((s) => (
          <Chip
            key={s}
            active={statusFilter === s}
            onClick={() => setStatusFilter(s)}
          >
            {STATUS_LABELS[s]}
          </Chip>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">
          {sorted.length} item{sorted.length === 1 ? "" : "s"}
        </p>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              Sort: {SORT_LABELS[sortKey]}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
              <DropdownMenuItem key={k} onSelect={() => setSortKey(k)}>
                {SORT_LABELS[k]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {sorted.length === 0 ? (
        <EmptyState title="No matches" description="Try a different filter." />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {sorted.map((entry) => (
            <MediaCard
              key={entry.itemId}
              item={itemFromEntry(entry)}
              onOpen={open}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full px-3 py-1 text-xs font-medium transition",
        active ? "bg-fg text-bg" : "bg-card text-fg hover:bg-card/80",
      )}
    >
      {children}
    </button>
  );
}
