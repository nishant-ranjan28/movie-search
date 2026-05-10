import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  useMovieTrending,
  useReleaseProviders,
  useTvTrending,
  useUpcomingReleases,
} from "@/shared/api/tmdb/hooks";
import { MediaCard } from "@/shared/components/MediaCard";
import { MediaCardSkeleton } from "@/shared/components/MediaCardSkeleton";
import { RailCarousel } from "@/shared/components/RailCarousel";
import { EmptyState } from "@/shared/components/EmptyState";
import { ErrorBoundary } from "@/shared/components/ErrorBoundary";
import { labelForRelease } from "@/features/releases/labelForRelease";
import { releaseRoute } from "@/features/releases/releaseRoute";
import { pickHero } from "./heroPick";
import type { MediaItem } from "@/shared/schemas/media";
import { AlertCircle } from "lucide-react";

function TrendingMoviesRail({ onOpen }: { onOpen: (item: MediaItem) => void }) {
  const { data, isLoading } = useMovieTrending("day");
  return (
    <RailCarousel title="Trending Movies">
      {isLoading
        ? Array.from({ length: 6 }).map((_, i) => <MediaCardSkeleton key={i} />)
        : (data ?? []).slice(0, 12).map((item) => (
            <MediaCard key={item.id} item={item} onOpen={onOpen} />
          ))}
    </RailCarousel>
  );
}

function TrendingTvRail({ onOpen }: { onOpen: (item: MediaItem) => void }) {
  const { data, isLoading } = useTvTrending("day");
  return (
    <RailCarousel title="Trending TV">
      {isLoading
        ? Array.from({ length: 6 }).map((_, i) => <MediaCardSkeleton key={i} />)
        : (data ?? []).slice(0, 12).map((item) => (
            <MediaCard key={item.id} item={item} onOpen={onOpen} />
          ))}
    </RailCarousel>
  );
}

function HeroBlock({ onOpen }: { onOpen: (item: MediaItem) => void }) {
  const { data, isLoading } = useMovieTrending("day");
  if (isLoading) return <div className="h-64 animate-pulse rounded-lg bg-card" />;
  const hero = pickHero(data ?? []);
  if (!hero) return null;
  return (
    <button
      type="button"
      onClick={() => onOpen(hero)}
      className="group relative block w-full overflow-hidden rounded-lg bg-card text-left"
    >
      {hero.poster ? (
        <img
          src={hero.poster.src.replace("/w500", "/w780")}
          alt=""
          className="aspect-[16/9] w-full object-cover transition group-hover:scale-[1.01]"
        />
      ) : (
        <div className="aspect-[16/9] w-full" />
      )}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4 text-white">
        <p className="text-xs uppercase tracking-wide opacity-80">Today's pick</p>
        <h2 className="text-xl font-semibold">{hero.title}</h2>
        {hero.year ? <p className="text-sm opacity-80">{hero.year}</p> : null}
      </div>
    </button>
  );
}

function ComingThisWeekRail() {
  const { from, to } = useMemo(() => {
    const f = new Date();
    const t = new Date(f.getTime() + 7 * 24 * 60 * 60 * 1000);
    return { from: f, to: t };
  }, []);
  const { data, isLoading } = useUpcomingReleases(from, to);
  const visible = data.slice(0, 12);
  const providers = useReleaseProviders(visible);
  if (isLoading) return null;
  if (visible.length === 0) return null;
  return (
    <section className="space-y-2">
      <h2 className="text-base font-semibold">Coming this week</h2>
      <ul className="space-y-1 text-sm">
        {visible.map((evt) => {
          const where = providers[evt.itemId]?.slice(0, 2).join(", ");
          const label = labelForRelease(evt.releaseType, where);
          const route = releaseRoute(evt);
          return (
            <li key={`${evt.itemId}@${evt.date}`}>
              <span className="text-muted">{evt.date}</span>
              {" — "}
              {route ? (
                <Link
                  to={route}
                  className="rounded hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg"
                >
                  {evt.title}
                </Link>
              ) : (
                <span>{evt.title}</span>
              )}
              {label ? <span className="text-muted"> · {label}</span> : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}


export function TodayPage() {
  const navigate = useNavigate();
  const open = (item: MediaItem) => {
    const numericId = item.id.split(":").pop();
    if (item.domain === "movie") navigate(`/movies/${numericId}`);
    else if (item.domain === "tv") navigate(`/tv/${numericId}`);
  };
  return (
    <div className="space-y-6">
      <h1 className="sr-only">Today</h1>
      <ErrorBoundary
        fallback={
          <EmptyState
            icon={AlertCircle}
            title="Couldn't load hero"
            description="We'll try again on next visit."
          />
        }
      >
        <HeroBlock onOpen={open} />
      </ErrorBoundary>
      <ErrorBoundary
        fallback={
          <EmptyState
            icon={AlertCircle}
            title="Couldn't load trending movies"
            description="We'll try again on next visit."
          />
        }
      >
        <TrendingMoviesRail onOpen={open} />
      </ErrorBoundary>
      <ErrorBoundary
        fallback={
          <EmptyState
            icon={AlertCircle}
            title="Couldn't load trending TV"
            description="We'll try again on next visit."
          />
        }
      >
        <TrendingTvRail onOpen={open} />
      </ErrorBoundary>
      <ErrorBoundary
        fallback={
          <EmptyState
            icon={AlertCircle}
            title="Couldn't load upcoming"
            description="We'll try again on next visit."
          />
        }
      >
        <ComingThisWeekRail />
      </ErrorBoundary>
    </div>
  );
}
