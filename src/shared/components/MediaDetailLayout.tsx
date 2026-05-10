import { Star } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { MediaItem } from "@/shared/schemas/media";
import { MediaCard } from "./MediaCard";
import { WatchlistButton } from "./WatchlistButton";

export interface CastMember {
  name: string;
  character?: string;
  profileImage?: string;
}

export interface MediaDetailExtras {
  /** Full backdrop URL (caller composes from TMDB path). */
  backdrop?: string;
  cast?: CastMember[];
  /** Embeddable trailer URL (e.g. https://www.youtube.com/embed/<key>). */
  trailerUrl?: string;
  watchProviders?: string[];
  related?: MediaItem[];
}

export interface MediaDetailLayoutProps {
  item: MediaItem;
  extras?: MediaDetailExtras;
  isLoading?: boolean;
}

export function MediaDetailLayout({
  item,
  extras,
  isLoading,
}: MediaDetailLayoutProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="aspect-[16/9] w-full rounded-lg" />
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <article className="space-y-6">
      {/* Hero with backdrop */}
      <div className="relative -mx-4 overflow-hidden">
        {extras?.backdrop ? (
          <img
            src={extras.backdrop}
            alt=""
            className="aspect-[16/9] w-full object-cover"
          />
        ) : (
          <div className="aspect-[16/9] w-full bg-card" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/60 to-transparent" />
      </div>

      {/* Title + facts + actions */}
      <header className="space-y-2">
        <h1 className="text-2xl font-bold sm:text-3xl">{item.title}</h1>
        {item.altTitle ? (
          <p className="text-sm text-muted">{item.altTitle}</p>
        ) : null}
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted">
          {item.year ? <span>{item.year}</span> : null}
          {item.genres.length > 0 ? (
            <span>{item.genres.slice(0, 3).join(" · ")}</span>
          ) : null}
          {item.rating ? (
            <span className="flex items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-current" aria-hidden />{" "}
              {item.rating.score.toFixed(1)}
            </span>
          ) : null}
        </div>
        <div className="flex gap-2">
          <WatchlistButton item={item} />
        </div>
      </header>

      {/* Synopsis */}
      {item.synopsis ? (
        <section>
          <h2 className="sr-only">Synopsis</h2>
          <p className="text-sm leading-relaxed sm:text-base">
            {item.synopsis}
          </p>
        </section>
      ) : null}

      {/* Cast */}
      {extras?.cast && extras.cast.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Cast</h2>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
            {extras.cast.slice(0, 5).map((c, i) => (
              <li key={`${c.name}-${i}`} className="space-y-1">
                {c.profileImage ? (
                  <img
                    src={c.profileImage}
                    alt=""
                    className="aspect-[2/3] w-full rounded object-cover"
                  />
                ) : (
                  <div className="aspect-[2/3] w-full rounded bg-card" />
                )}
                <p className="truncate text-sm font-medium">{c.name}</p>
                {c.character ? (
                  <p className="truncate text-xs text-muted">{c.character}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Watch providers */}
      {extras?.watchProviders && extras.watchProviders.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Where to watch</h2>
          <p className="text-sm text-muted">
            {extras.watchProviders.join(", ")}
          </p>
        </section>
      ) : null}

      {/* Trailer */}
      {extras?.trailerUrl ? (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Trailer</h2>
          <div className="aspect-video w-full overflow-hidden rounded-lg bg-card">
            <iframe
              src={extras.trailerUrl}
              title={`${item.title} trailer`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="h-full w-full"
            />
          </div>
        </section>
      ) : null}

      {/* Related */}
      {extras?.related && extras.related.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Related</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {extras.related.slice(0, 10).map((rel) => (
              <MediaCard key={rel.id} item={rel} />
            ))}
          </div>
        </section>
      ) : null}
    </article>
  );
}
