import type { ReleaseEvent } from "@/shared/api/tmdb/client";

/**
 * Detail-page route for a release event. Returns undefined when the id
 * isn't routable (defensive — shouldn't happen for TMDB-sourced events).
 */
export const releaseRoute = (event: ReleaseEvent): string | undefined => {
  const idPart = event.itemId.split(":").pop();
  if (!idPart) return undefined;
  if (event.domain === "movie") return `/movies/${idPart}`;
  if (event.domain === "tv") return `/tv/${idPart}`;
  return undefined;
};
