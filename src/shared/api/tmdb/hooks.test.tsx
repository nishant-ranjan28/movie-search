import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import type { ReactNode } from "react";
import {
  useMovieTrending,
  useTvTrending,
  useMovieDetails,
  useTvDetails,
  useMovieSearch,
  useUpcomingMovies,
  useUpcomingReleases,
  useUpcomingTv,
  useWatchProviders,
} from "./hooks";

const wrap = () => {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
};

describe("TMDB query hooks (against MSW)", () => {
  test("useMovieTrending returns MediaItem[]", async () => {
    const { result } = renderHook(() => useMovieTrending("day"), { wrapper: wrap() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.length).toBeGreaterThan(0);
    expect(result.current.data?.[0]?.domain).toBe("movie");
  });

  test("useTvTrending returns MediaItem[]", async () => {
    const { result } = renderHook(() => useTvTrending(), { wrapper: wrap() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0]?.domain).toBe("tv");
  });

  test("useMovieDetails(603) returns The Matrix", async () => {
    const { result } = renderHook(() => useMovieDetails(603), { wrapper: wrap() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.item.id).toBe("tmdb:movie:603");
    expect(result.current.data?.item.title).toBe("The Matrix");
    expect(result.current.data?.raw.id).toBe(603);
  });

  test("useMovieDetails(undefined) is disabled", () => {
    const { result } = renderHook(() => useMovieDetails(undefined), { wrapper: wrap() });
    expect(result.current.fetchStatus).toBe("idle");
  });

  test("useTvDetails(1399) returns Game of Thrones", async () => {
    const { result } = renderHook(() => useTvDetails(1399), { wrapper: wrap() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.item.id).toBe("tmdb:tv:1399");
  });

  test("useMovieSearch with empty query is disabled", () => {
    const { result } = renderHook(() => useMovieSearch(""), { wrapper: wrap() });
    expect(result.current.fetchStatus).toBe("idle");
  });

  test("useMovieSearch('matrix') returns results", async () => {
    const { result } = renderHook(() => useMovieSearch("matrix"), { wrapper: wrap() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.length).toBeGreaterThan(0);
  });

  test("useUpcomingMovies returns ReleaseEvent[]", async () => {
    const from = new Date("2026-01-01");
    const to = new Date("2026-12-31");
    const { result } = renderHook(() => useUpcomingMovies(from, to), { wrapper: wrap() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(Array.isArray(result.current.data)).toBe(true);
  });

  test("useUpcomingTv returns TV ReleaseEvent[]", async () => {
    const from = new Date("2026-01-01");
    const to = new Date("2026-12-31");
    const { result } = renderHook(() => useUpcomingTv(from, to), { wrapper: wrap() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect((result.current.data ?? []).every((e) => e.domain === "tv")).toBe(true);
  });

  test("useUpcomingReleases merges movies + TV premieres", async () => {
    const from = new Date("2026-01-01");
    const to = new Date("2026-12-31");
    const { result } = renderHook(() => useUpcomingReleases(from, to), {
      wrapper: wrap(),
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const domains = new Set(result.current.data.map((e) => e.domain));
    expect(domains.has("tv")).toBe(true);
    expect(domains.has("movie")).toBe(true);
  });

  test("useWatchProviders returns string[]", async () => {
    const { result } = renderHook(() => useWatchProviders("movie", 603, "US"), {
      wrapper: wrap(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(Array.isArray(result.current.data)).toBe(true);
  });
});
