import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import type { ReactNode } from "react";
import { useAiRecommend } from "./recommend";

const wrap = () => {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: Readonly<{ children: ReactNode }>) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
};

describe("useAiRecommend", () => {
  test("idle when enabled is false", () => {
    const { result } = renderHook(
      () =>
        useAiRecommend(
          { domain: "movie", genres: [], watchlist: [], recents: [] },
          false,
        ),
      { wrapper: wrap() },
    );
    expect(result.current.fetchStatus).toBe("idle");
  });

  test("returns filters + reason when enabled", async () => {
    const { result } = renderHook(
      () =>
        useAiRecommend(
          {
            domain: "movie",
            genres: [{ id: 878, name: "Science Fiction" }],
            watchlist: [
              {
                title: "The Matrix",
                genres: ["sci-fi", "action"],
                year: 1999,
                status: "done",
                rating: 5,
              },
              {
                title: "Arcane",
                genres: ["animation", "action"],
                year: 2021,
                status: "in_progress",
                rating: 5,
              },
            ],
            recents: [],
          },
          true,
        ),
      { wrapper: wrap() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.filters.genres).toContain(878);
    expect(typeof result.current.data?.reason).toBe("string");
    expect((result.current.data?.reason ?? "").length).toBeGreaterThan(0);
  });
});
