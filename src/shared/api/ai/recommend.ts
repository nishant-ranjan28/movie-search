import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import type { DiscoverFilters } from "@/shared/api/tmdb/client";
import type { TmdbGenre } from "@/shared/api/tmdb/schemas";
import type { WatchlistEntry } from "@/shared/store/watchlist";

interface WatchlistSummary {
  title: string;
  genres: string[];
  year?: number;
  status: WatchlistEntry["status"];
  rating?: number;
}

export interface RecommendInput {
  domain: "movie" | "tv";
  genres: TmdbGenre[];
  watchlist: WatchlistSummary[];
  recents: string[];
}

export interface AiRecommendation {
  filters: DiscoverFilters;
  reason: string;
}

class AiRecommendError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "AiRecommendError";
    this.status = status;
  }
}

const isResponseShape = (
  data: unknown,
): data is {
  filters: {
    genres: number[];
    yearGte?: number;
    yearLte?: number;
    ratingGte?: number;
  };
  reason: string;
} => {
  if (typeof data !== "object" || data === null) return false;
  const d = data as Record<string, unknown>;
  if (typeof d["reason"] !== "string") return false;
  if (typeof d["filters"] !== "object" || d["filters"] === null) return false;
  const f = d["filters"] as Record<string, unknown>;
  return Array.isArray(f["genres"]);
};

const summarizeForServer = (input: RecommendInput): RecommendInput => ({
  ...input,
  watchlist: input.watchlist.slice(0, 20),
  recents: input.recents.slice(0, 20),
});

export const aiRecommend = async (
  input: RecommendInput,
  signal?: AbortSignal,
): Promise<AiRecommendation> => {
  const res = await fetch("/api/ai/recommend", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(summarizeForServer(input)),
    ...(signal ? { signal } : {}),
  });
  if (!res.ok) {
    let detail = "";
    try {
      detail = await res.text();
    } catch {
      /* ignore */
    }
    throw new AiRecommendError(res.status, detail || res.statusText);
  }
  const data: unknown = await res.json();
  if (!isResponseShape(data)) {
    throw new AiRecommendError(0, "invalid response shape");
  }
  const filters: DiscoverFilters = { genres: data.filters.genres };
  if (data.filters.yearGte !== undefined) filters.yearGte = data.filters.yearGte;
  if (data.filters.yearLte !== undefined) filters.yearLte = data.filters.yearLte;
  if (data.filters.ratingGte !== undefined) filters.ratingGte = data.filters.ratingGte;
  return { filters, reason: data.reason };
};

/**
 * Cache-key fingerprint of the user's profile. When the profile is the
 * same shape (titles in same order, same status/rating), we reuse the AI
 * result instead of re-prompting. localStorage cache lives across reloads;
 * TanStack Query keys it for the in-memory layer.
 */
const fingerprint = (input: RecommendInput): string => {
  const wl = input.watchlist
    .map((e) => `${e.title}|${e.status}|${e.rating ?? ""}`)
    .join("/");
  const rc = input.recents.join("/");
  return `${input.domain}::wl(${wl})::rc(${rc})`;
};

const DAY = 24 * 60 * 60 * 1000;

/**
 * Auto-runs once the input is non-empty; cached aggressively. Pass
 * `enabled: false` to suppress (e.g. while the inputs are still loading).
 */
export const useAiRecommend = (
  input: RecommendInput,
  enabled: boolean,
): UseQueryResult<AiRecommendation> =>
  useQuery({
    queryKey: ["ai", "recommend", fingerprint(input)],
    queryFn: ({ signal }) => aiRecommend(input, signal),
    staleTime: DAY,
    gcTime: 2 * DAY,
    enabled,
    retry: false,
  });
