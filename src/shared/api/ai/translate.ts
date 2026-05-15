import { useMutation, type UseMutationResult } from "@tanstack/react-query";
import type { DiscoverFilters } from "@/shared/api/tmdb/client";
import type { TmdbGenre } from "@/shared/api/tmdb/schemas";

export class AiTranslateError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "AiTranslateError";
    this.status = status;
  }
}

export interface TranslateRequest {
  query: string;
  movieGenres: TmdbGenre[];
  tvGenres: TmdbGenre[];
}

export interface TranslateResult {
  domain: "movie" | "tv";
  filters: DiscoverFilters;
}

const isTranslateResponse = (
  data: unknown,
): data is {
  domain?: unknown;
  genres: number[];
  yearGte?: number;
  yearLte?: number;
  ratingGte?: number;
} => {
  if (typeof data !== "object" || data === null) return false;
  const d = data as Record<string, unknown>;
  if (!Array.isArray(d["genres"])) return false;
  return d["genres"].every((id) => typeof id === "number");
};

/**
 * POST /api/ai/translate — server-side Groq call. Returns the structured
 * DiscoverFilters shape alongside the AI-inferred destination domain so the
 * caller can route to /movies or /tv based on cues in the query.
 */
export const aiTranslate = async (
  req: TranslateRequest,
  signal?: AbortSignal,
): Promise<TranslateResult> => {
  const res = await fetch("/api/ai/translate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(req),
    ...(signal ? { signal } : {}),
  });
  if (!res.ok) {
    let detail = "";
    try {
      detail = await res.text();
    } catch {
      /* ignore */
    }
    throw new AiTranslateError(res.status, detail || res.statusText);
  }
  const data: unknown = await res.json();
  if (!isTranslateResponse(data)) {
    throw new AiTranslateError(0, "invalid response shape");
  }
  const filters: DiscoverFilters = { genres: data.genres };
  if (data.yearGte !== undefined) filters.yearGte = data.yearGte;
  if (data.yearLte !== undefined) filters.yearLte = data.yearLte;
  if (data.ratingGte !== undefined) filters.ratingGte = data.ratingGte;
  const domain: "movie" | "tv" = data.domain === "tv" ? "tv" : "movie";
  return { domain, filters };
};

export const useAiTranslate = (): UseMutationResult<
  TranslateResult,
  AiTranslateError,
  TranslateRequest
> =>
  useMutation({
    mutationFn: (req) => aiTranslate(req),
  });
