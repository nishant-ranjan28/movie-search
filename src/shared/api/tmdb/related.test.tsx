import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import type { ReactNode } from "react";
import { useRelated } from "./hooks";

const wrap = () => {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: Readonly<{ children: ReactNode }>) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
};

describe("useRelated", () => {
  test("idle when id is undefined", () => {
    const { result } = renderHook(
      () => useRelated("movie", undefined, "similar"),
      { wrapper: wrap() },
    );
    expect(result.current.fetchStatus).toBe("idle");
  });

  test("movie/similar returns MediaItems with movie domain", async () => {
    const { result } = renderHook(
      () => useRelated("movie", 603, "similar"),
      { wrapper: wrap() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.length).toBeGreaterThan(0);
    expect(result.current.data?.[0]?.domain).toBe("movie");
    expect(result.current.data?.[0]?.id.startsWith("tmdb:movie:")).toBe(true);
  });

  test("movie/recommendations returns MediaItems with movie domain", async () => {
    const { result } = renderHook(
      () => useRelated("movie", 603, "recommendations"),
      { wrapper: wrap() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.length).toBeGreaterThan(0);
    // Matrix Reloaded is the top recommendation in the fixture.
    expect(
      result.current.data?.some((m) => m.title.includes("Matrix")),
    ).toBe(true);
  });

  test("tv/similar returns MediaItems with tv domain", async () => {
    const { result } = renderHook(
      () => useRelated("tv", 1399, "similar"),
      { wrapper: wrap() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0]?.domain).toBe("tv");
  });
});
