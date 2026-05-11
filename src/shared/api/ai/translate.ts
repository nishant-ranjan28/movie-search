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

interface TranslateRequest {
  query: string;
  domain: "movie" | "tv";
  genres: TmdbGenre[];
}

const isTranslateResponse = (data: unknown): data is {
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
 * DiscoverFilters shape (genres + optional year/rating bounds) that the
 * /movies and /tv hubs already consume.
 */
export const aiTranslate = async (
  req: TranslateRequest,
  signal?: AbortSignal,
): Promise<DiscoverFilters> => {
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
  const out: DiscoverFilters = { genres: data.genres };
  if (data.yearGte !== undefined) out.yearGte = data.yearGte;
  if (data.yearLte !== undefined) out.yearLte = data.yearLte;
  if (data.ratingGte !== undefined) out.ratingGte = data.ratingGte;
  return out;
};

export const useAiTranslate = (): UseMutationResult<
  DiscoverFilters,
  AiTranslateError,
  TranslateRequest
> =>
  useMutation({
    mutationFn: (req) => aiTranslate(req),
  });
