import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import type { ReactNode } from "react";
import { useDiscover, useGenres } from "./hooks";

const wrap = () => {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: Readonly<{ children: ReactNode }>) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
};

describe("useGenres", () => {
  test("returns movie genres from the live fixture", async () => {
    const { result } = renderHook(() => useGenres("movie"), {
      wrapper: wrap(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.length).toBeGreaterThan(10);
    expect(
      result.current.data?.some((g) => g.name === "Action"),
    ).toBe(true);
  });

  test("returns tv genres", async () => {
    const { result } = renderHook(() => useGenres("tv"), {
      wrapper: wrap(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.length).toBeGreaterThan(5);
  });
});

describe("useDiscover", () => {
  test("idle when no filters are set", () => {
    const { result } = renderHook(() => useDiscover("movie", {}), {
      wrapper: wrap(),
    });
    expect(result.current.fetchStatus).toBe("idle");
  });

  test("fires when at least one filter is set and returns MediaItems", async () => {
    const { result } = renderHook(
      () => useDiscover("movie", { genres: [28], ratingGte: 7 }),
      { wrapper: wrap() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect((result.current.data ?? []).length).toBeGreaterThan(0);
    expect(result.current.data?.[0]?.domain).toBe("movie");
    expect(result.current.data?.[0]?.id.startsWith("tmdb:movie:")).toBe(true);
  });

  test("tv discover returns tv MediaItems", async () => {
    const { result } = renderHook(
      () => useDiscover("tv", { sort: "vote_average.desc" }),
      { wrapper: wrap() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0]?.domain).toBe("tv");
  });
});
