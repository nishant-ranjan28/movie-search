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

/**
 * AI-powered "For you" rail. Sends a summary of the user's watchlist to the
 * Groq-backed /api/ai/recommend endpoint, gets back a TMDB discover filter
 * + a one-sentence reason, then runs the filter through useDiscover to
 * surface real items. Auto-runs on mount, cached 24h per profile signature.
 *
 * Hidden when the watchlist is too thin for meaningful personalization —
 * Trending and Hero already cover the cold-start case on /today.
 */
export function ForYouRail() {
  const navigate = useNavigate();
  const entries = useWatchlistStore((s) =>
    Object.values(s.entries).filter((e) => e.domain === "movie"),
  );

  const genres = useGenres("movie");
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
      domain: "movie",
      genres: genres.data ?? [],
      watchlist: watchlistSummary,
      recents: [],
    },
    enabled,
  );

  const discover = useDiscover("movie", recommend.data?.filters ?? {});
  const items: MediaItem[] = (discover.data ?? []).slice(0, 12);
  const isLoading = recommend.isLoading || discover.isLoading;

  if (!hasEnoughSignal) return null;
  // If the AI failed, fail closed — Trending Movies below covers the gap.
  if (recommend.isError) return null;
  // If discover came back empty, also fail closed.
  if (!isLoading && items.length === 0) return null;

  const open = (item: MediaItem) => {
    const id = item.id.split(":").pop();
    if (item.domain === "movie") navigate(`/movies/${id}`);
    else if (item.domain === "tv") navigate(`/tv/${id}`);
  };

  return (
    <div className="space-y-1">
      <RailCarousel title="For you">
        {isLoading
          ? Array.from({ length: 6 }, (_, i) => `for-you-skel-${i}`).map(
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
