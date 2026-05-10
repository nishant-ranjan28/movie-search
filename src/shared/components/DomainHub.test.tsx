import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { DomainHub } from "./DomainHub";
import { useWatchlistStore } from "@/shared/store/watchlist";

const wrap = () => {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <DomainHub domain="movie" title="Movies" />
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

beforeEach(() => {
  localStorage.clear();
  useWatchlistStore.setState({ entries: {} });
});

afterEach(() => localStorage.clear());

describe("DomainHub (movie)", () => {
  test("renders title and search input", () => {
    wrap();
    expect(
      screen.getByRole("heading", { name: /movies/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("searchbox")).toBeInTheDocument();
  });

  test("shows trending grid by default", async () => {
    wrap();
    await waitFor(() => {
      const cards = screen.getAllByRole("button", { name: /\d{4}/ });
      expect(cards.length).toBeGreaterThan(0);
    });
  });

  test("typing into search shows filtered results", async () => {
    const user = userEvent.setup();
    wrap();
    await waitFor(() => {
      expect(
        screen.getAllByRole("button", { name: /\d{4}/ }).length,
      ).toBeGreaterThan(0);
    });
    const input = screen.getByRole("searchbox");
    await user.type(input, "matrix");
    await waitFor(() => {
      const cards = screen.getAllByRole("button", { name: /\d{4}/ });
      expect(cards.length).toBeGreaterThan(0);
    });
  });
});
