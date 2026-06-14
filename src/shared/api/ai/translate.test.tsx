import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import type { ReactNode } from "react";
import { useAiTranslate } from "./translate";

const wrap = () => {
  const qc = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  return ({ children }: Readonly<{ children: ReactNode }>) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
};

describe("useAiTranslate", () => {
  test("returns filters + domain (movie default)", async () => {
    const { result } = renderHook(() => useAiTranslate(), {
      wrapper: wrap(),
    });

    result.current.mutate({
      query: "feel-good 90s comedy",
      movieGenres: [{ id: 35, name: "Comedy" }],
      tvGenres: [{ id: 35, name: "Comedy" }],
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.domain).toBe("movie");
    expect(result.current.data?.filters.genres).toContain(35);
    expect(result.current.data?.filters.yearGte).toBe(1990);
    expect(result.current.data?.filters.yearLte).toBe(1999);
  });

  test("returns domain: tv when the query mentions a TV cue", async () => {
    const { result } = renderHook(() => useAiTranslate(), {
      wrapper: wrap(),
    });

    result.current.mutate({
      query: "feel-good 90s sitcom",
      movieGenres: [{ id: 35, name: "Comedy" }],
      tvGenres: [{ id: 35, name: "Comedy" }],
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.domain).toBe("tv");
  });
});
