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
  test("returns the DiscoverFilters shape", async () => {
    const { result } = renderHook(() => useAiTranslate(), {
      wrapper: wrap(),
    });

    result.current.mutate({
      query: "feel-good 90s comedy",
      domain: "movie",
      genres: [{ id: 35, name: "Comedy" }],
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.genres).toContain(35);
    expect(result.current.data?.yearGte).toBe(1990);
    expect(result.current.data?.yearLte).toBe(1999);
  });
});
