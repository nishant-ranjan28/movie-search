import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { useAiRecommend } from "@/shared/api/ai/recommend";
import { useDiscover, useGenres } from "@/shared/api/tmdb/hooks";
import type { MediaItem } from "@/shared/schemas/media";
import { useWatchlistStore } from "@/shared/store/watchlist";
import { MediaCard } from "@/shared/components/MediaCard";
import { MediaCardSkeleton } from "@/shared/components/MediaCardSkeleton";
import { RailCarousel } from "@/shared/components/RailCarousel";

const MIN_WATCHLIST_FOR_PERSONALIZATION = 2;

const DOMAIN_TITLE: Record<"movie" | "tv", string> = {
  movie: "For you in Movies",
  tv: "For you in TV",
};

const DOMAIN_ROUTE_BASE: Record<"movie" | "tv", string> = {
  movie: "/movies",
  tv: "/tv",
};

export interface ForYouRailProps {
  domain: "movie" | "tv";
}

/**
 * AI-powered "For you" rail, parameterized by domain so /today renders one
 * for movies and one for TV. Each rail filters its own watchlist subset and
 * prompts the AI with its own domain. Hidden when the user has fewer than
 * MIN_WATCHLIST_FOR_PERSONALIZATION entries in that domain — Trending +
 * Hero already cover cold-start.
 */
export function ForYouRail({ domain }: Readonly<ForYouRailProps>) {
  const navigate = useNavigate();
  // Select the stable map reference — deriving a new array inside the
  // selector returns a fresh reference each call, which under Zustand v5 +
  // React 19's useSyncExternalStore triggers a re-render loop (React #185).
  const entriesMap = useWatchlistStore((s) => s.entries);
  const entries = useMemo(
    () => Object.values(entriesMap).filter((e) => e.domain === domain),
    [entriesMap, domain],
  );

  const genres = useGenres(domain);
  const watchlistSummary = useMemo(
    () =>
      entries.slice(0, 20).map((e) => {
        const summary: {
          title: string;
          genres: string[];
          year?: number;
          status: typeof e.status;
          rating?: number;
        } = {
          title: e.snapshot.title,
          genres: e.snapshot.genres,
          status: e.status,
        };
        if (e.snapshot.year !== undefined) summary.year = e.snapshot.year;
        if (e.rating !== undefined) summary.rating = e.rating;
        return summary;
      }),
    [entries],
  );

  const hasEnoughSignal = entries.length >= MIN_WATCHLIST_FOR_PERSONALIZATION;
  const enabled = Boolean(genres.data) && hasEnoughSignal;

  const recommend = useAiRecommend(
    {
      domain,
      genres: genres.data ?? [],
      watchlist: watchlistSummary,
      recents: [],
    },
    enabled,
  );

  const discover = useDiscover(domain, recommend.data?.filters ?? {});
  const items: MediaItem[] = (discover.data ?? []).slice(0, 12);
  const isLoading = recommend.isLoading || discover.isLoading;

  if (!hasEnoughSignal) return null;
  // If the AI failed, fail closed — Trending below covers the gap.
  if (recommend.isError) return null;
  // If discover came back empty, also fail closed.
  if (!isLoading && items.length === 0) return null;

  const open = (item: MediaItem) => {
    const id = item.id.split(":").pop();
    const base = DOMAIN_ROUTE_BASE[item.domain as "movie" | "tv"];
    if (base) navigate(`${base}/${id}`);
  };

  return (
    <div className="space-y-1">
      <RailCarousel title={DOMAIN_TITLE[domain]}>
        {isLoading
          ? Array.from({ length: 6 }, (_, i) => `for-you-${domain}-skel-${i}`).map(
              (key) => <MediaCardSkeleton key={key} />,
            )
          : items.map((item) => (
              <MediaCard key={item.id} item={item} onOpen={open} />
            ))}
      </RailCarousel>
      {recommend.data?.reason ? (
        <p className="flex items-start gap-1.5 px-1 text-xs text-muted">
          <Sparkles className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
          <span>{recommend.data.reason}</span>
        </p>
      ) : null}
    </div>
  );
}
