import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, expect, test } from "vitest";
import { TodayPage } from "./TodayPage";
import { useWatchlistStore } from "@/shared/store/watchlist";

const renderPage = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={["/"]}>
        <TodayPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

beforeEach(() => {
  localStorage.clear();
  useWatchlistStore.setState({ entries: {} });
});

afterEach(() => localStorage.clear());

test("renders Trending Movies rail (heading)", async () => {
  renderPage();
  await waitFor(() =>
    expect(
      screen.getByRole("heading", { name: /trending movies/i }),
    ).toBeInTheDocument(),
  );
});

test("renders Trending TV rail (heading)", async () => {
  renderPage();
  await waitFor(() =>
    expect(
      screen.getByRole("heading", { name: /trending tv/i }),
    ).toBeInTheDocument(),
  );
});

test("renders hero pick after data loads", async () => {
  renderPage();
  await waitFor(() =>
    expect(screen.getByText(/today's pick/i)).toBeInTheDocument(),
  );
});
