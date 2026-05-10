import { Bookmark, BookmarkCheck, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import type { MediaItem } from "@/shared/schemas/media";
import { useWatchlistStore, type WatchlistEntry } from "@/shared/store/watchlist";

const STATUS_LABELS: Record<WatchlistEntry["status"], string> = {
  want: "Want to watch",
  in_progress: "In progress",
  done: "Done",
  dropped: "Dropped",
};

const BUTTON_LABEL: Record<WatchlistEntry["status"], string> = {
  want: "In watchlist",
  in_progress: "In progress",
  done: "Watched",
  dropped: "Dropped",
};

export interface WatchlistButtonProps {
  item: MediaItem;
  variant?: "default" | "compact";
  className?: string;
}

export function WatchlistButton({
  item,
  variant = "default",
  className,
}: WatchlistButtonProps) {
  const entry = useWatchlistStore((s) => s.entries[item.id]);
  const add = useWatchlistStore((s) => s.add);
  const remove = useWatchlistStore((s) => s.remove);
  const setStatus = useWatchlistStore((s) => s.setStatus);

  const buildSnapshot = (): WatchlistEntry["snapshot"] => ({
    title: item.title,
    ...(item.poster ? { poster: item.poster } : {}),
    ...(item.year !== undefined ? { year: item.year } : {}),
    genres: item.genres,
    ...(item.releaseDate ? { releaseDate: item.releaseDate } : {}),
    ...(item.status ? { status: item.status } : {}),
  });

  if (!entry) {
    if (variant === "compact") {
      return (
        <Button
          variant="ghost"
          size="icon"
          onClick={() =>
            add({ itemId: item.id, domain: item.domain, snapshot: buildSnapshot() })
          }
          aria-label="Add to watchlist"
          aria-pressed={false}
          className={className}
        >
          <Bookmark className="h-4 w-4" />
        </Button>
      );
    }
    return (
      <Button
        onClick={() =>
          add({ itemId: item.id, domain: item.domain, snapshot: buildSnapshot() })
        }
        aria-label="Add to watchlist"
        className={className}
      >
        <Bookmark className="mr-2 h-4 w-4" /> Add to watchlist
      </Button>
    );
  }

  if (variant === "compact") {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={() => remove(item.id)}
        aria-label="Remove from watchlist"
        aria-pressed
        className={className}
      >
        <BookmarkCheck className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="secondary"
          className={className}
          aria-label={`Watchlist status: ${BUTTON_LABEL[entry.status]}`}
        >
          <BookmarkCheck className="mr-2 h-4 w-4" /> {BUTTON_LABEL[entry.status]}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {(Object.keys(STATUS_LABELS) as WatchlistEntry["status"][]).map((s) => (
          <DropdownMenuItem key={s} onSelect={() => setStatus(item.id, s)}>
            {entry.status === s ? (
              <Check className="mr-2 h-4 w-4" />
            ) : (
              <span className="mr-2 inline-block h-4 w-4" />
            )}
            {STATUS_LABELS[s]}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => remove(item.id)}>
          <X className="mr-2 h-4 w-4" /> Remove from watchlist
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
