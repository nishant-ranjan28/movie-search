import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { SearchPage } from "./SearchPage";
import { useWatchlistStore } from "@/shared/store/watchlist";

const wrap = () => {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <SearchPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

beforeEach(() => {
  localStorage.clear();
  useWatchlistStore.setState({ entries: {} });
});

afterEach(() => localStorage.clear());

describe("SearchPage", () => {
  test("renders title and search input", () => {
    wrap();
    expect(
      screen.getByRole("heading", { level: 1, name: /search/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("searchbox")).toBeInTheDocument();
  });

  test("shows empty 'Type to find anything' state by default", () => {
    wrap();
    expect(
      screen.getByRole("heading", { name: /type to find anything/i }),
    ).toBeInTheDocument();
  });

  test("typing query shows Movies section", async () => {
    const user = userEvent.setup();
    wrap();
    await user.type(screen.getByRole("searchbox"), "matrix");
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /^Movies/i }),
      ).toBeInTheDocument();
    });
  });

  test("typing query shows TV Shows section (MSW returns trending TV for any tv search)", async () => {
    const user = userEvent.setup();
    wrap();
    await user.type(screen.getByRole("searchbox"), "matrix");
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /tv shows/i }),
      ).toBeInTheDocument();
    });
  });
});
