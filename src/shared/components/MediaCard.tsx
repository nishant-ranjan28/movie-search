import { motion } from "framer-motion";
import { Bookmark, BookmarkCheck } from "lucide-react";
import type { MediaItem, MediaDomain } from "@/shared/schemas/media";
import { Card } from "@/components/ui/card";
import { useWatchlistStore, type WatchlistEntry } from "@/shared/store/watchlist";
import { cn } from "@/lib/cn";

const accentByDomain: Record<MediaDomain, string> = {
  movie: "border-t-accent-movie",
  tv: "border-t-accent-tv",
  anime: "border-t-accent-anime",
  game: "border-t-accent-game",
  book: "border-t-accent-book",
};

export interface MediaCardProps {
  item: MediaItem;
  onOpen?: (item: MediaItem) => void;
  className?: string;
}

export function MediaCard({ item, onOpen, className }: Readonly<MediaCardProps>) {
  const isInWatchlist = useWatchlistStore((s) => s.has(item.id));
  const add = useWatchlistStore((s) => s.add);
  const remove = useWatchlistStore((s) => s.remove);

  const toggleWatchlist = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isInWatchlist) {
      remove(item.id);
    } else {
      const snapshot: WatchlistEntry["snapshot"] = {
        title: item.title,
        ...(item.poster ? { poster: item.poster } : {}),
        ...(item.year === undefined ? {} : { year: item.year }),
        genres: item.genres,
        ...(item.releaseDate ? { releaseDate: item.releaseDate } : {}),
        ...(item.status ? { status: item.status } : {}),
      };
      add({ itemId: item.id, domain: item.domain, snapshot });
    }
  };

  return (
    <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.15 }}>
      <Card
        role="button"
        tabIndex={0}
        onClick={() => onOpen?.(item)}
        onKeyDown={(e) => {
          // Only handle when the card itself has focus — keydown events
          // bubble, so without this guard pressing Enter/Space on the
          // nested bookmark button would also navigate to the detail
          // page (a11y bug for keyboard users).
          if (e.target !== e.currentTarget) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onOpen?.(item);
          }
        }}
        className={cn(
          "border-t-2 cursor-pointer overflow-hidden",
          accentByDomain[item.domain],
          className,
        )}
      >
        {item.poster ? (
          <div className="relative aspect-[2/3] bg-card">
            <img
              src={item.poster.src}
              alt=""
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover"
            />
            {item.rating ? (
              <span className="absolute right-2 top-2 rounded bg-black/70 px-1.5 py-0.5 text-xs font-medium text-white">
                ★ {item.rating.score.toFixed(1)}
              </span>
            ) : null}
            <button
              type="button"
              onClick={toggleWatchlist}
              aria-label={isInWatchlist ? "Remove from watchlist" : "Add to watchlist"}
              aria-pressed={isInWatchlist}
              className="absolute left-2 top-2 rounded-full bg-black/70 p-1.5 text-white"
            >
              {isInWatchlist ? (
                <BookmarkCheck className="h-4 w-4" />
              ) : (
                <Bookmark className="h-4 w-4" />
              )}
            </button>
          </div>
        ) : (
          <div className="aspect-[2/3] bg-card" />
        )}
        <div className="p-2">
          <h3 className="truncate text-sm font-medium">{item.title}</h3>
          {item.year ? <p className="text-xs text-muted">{item.year}</p> : null}
        </div>
      </Card>
    </motion.div>
  );
}
