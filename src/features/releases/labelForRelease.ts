import type { ReleaseEvent } from "@/shared/api/tmdb/client";

/**
 * Render label for a release. Only emits a label when we have *real* info:
 *   - theatrical → "In theaters"
 *   - any release with known watch providers → provider names
 * Generic "OTT" / "TV" / "Coming soon" placeholders are intentionally NOT
 * emitted because TMDB has no reliable platform data for pre-release titles
 * and a constant placeholder adds clutter without information.
 */
export const labelForRelease = (
  releaseType: ReleaseEvent["releaseType"],
  providerLabel: string | undefined,
): string | undefined => {
  if (releaseType === "theatrical") return "In theaters";
  if (providerLabel) return providerLabel;
  return undefined;
};
