import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { WatchlistPage } from "./WatchlistPage";
import { useWatchlistStore } from "@/shared/store/watchlist";

const seedSample = () => {
  const { add } = useWatchlistStore.getState();
  add({
    itemId: "tmdb:movie:1",
    domain: "movie",
    snapshot: { title: "Alpha", year: 2020, genres: ["sci-fi"] },
  });
  add({
    itemId: "tmdb:movie:2",
    domain: "movie",
    snapshot: { title: "Beta", year: 2010, genres: ["drama"] },
  });
  add({
    itemId: "tmdb:tv:3",
    domain: "tv",
    snapshot: { title: "Charlie", year: 2024, genres: ["thriller"] },
  });
};

const wrap = () =>
  render(
    <MemoryRouter>
      <WatchlistPage />
    </MemoryRouter>,
  );

beforeEach(() => {
  localStorage.clear();
  useWatchlistStore.setState({ entries: {}, order: [] });
});
afterEach(() => localStorage.clear());

describe("WatchlistPage", () => {
  test("empty state with CTA", () => {
    wrap();
    expect(
      screen.getByRole("heading", { name: /your watchlist is empty/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /discover today/i }),
    ).toBeInTheDocument();
  });

  test("renders all entries by default", () => {
    seedSample();
    wrap();
    expect(
      screen.getByRole("heading", { level: 1, name: /watchlist/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/3 items/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /alpha/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /beta/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /charlie/i })).toBeInTheDocument();
  });

  test("domain filter narrows to TV", async () => {
    seedSample();
    const user = userEvent.setup();
    wrap();
    await user.click(screen.getByRole("button", { name: /^tv$/i, pressed: false }));
    expect(screen.getByText(/1 item/)).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: /alpha/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /charlie/i })).toBeInTheDocument();
  });

  test("status filter narrows to Done", async () => {
    seedSample();
    useWatchlistStore.getState().setStatus("tmdb:movie:1", "done");
    const user = userEvent.setup();
    wrap();
    await user.click(screen.getByRole("button", { name: /^done$/i, pressed: false }));
    expect(screen.getByText(/1 item/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /alpha/i })).toBeInTheDocument();
  });

  test("sort by title", async () => {
    seedSample();
    const user = userEvent.setup();
    wrap();
    await user.click(screen.getByRole("button", { name: /sort:/i }));
    await user.click(await screen.findByRole("menuitem", { name: /title/i }));
    const headings = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(headings).toEqual(["Alpha", "Beta", "Charlie"]);
  });

  test("bulk remove: select two entries, confirm, both gone", async () => {
    seedSample();
    const user = userEvent.setup();
    wrap();

    // Enter selection mode.
    await user.click(screen.getByRole("button", { name: /^select$/i }));

    // Check Alpha and Beta. SelectableCard renders role="checkbox".
    await user.click(
      screen.getByRole("checkbox", { name: /select alpha/i }),
    );
    await user.click(
      screen.getByRole("checkbox", { name: /select beta/i }),
    );
    expect(screen.getByText(/2 selected/i)).toBeInTheDocument();

    // Click Remove → confirm dialog → confirm.
    await user.click(screen.getByRole("button", { name: /^remove$/i }));
    await user.click(
      await screen.findByRole("button", { name: /^remove$/i }),
    );

    // Charlie remains; Alpha and Beta are gone.
    expect(useWatchlistStore.getState().has("tmdb:movie:1")).toBe(false);
    expect(useWatchlistStore.getState().has("tmdb:movie:2")).toBe(false);
    expect(useWatchlistStore.getState().has("tmdb:tv:3")).toBe(true);
  });

  test("bulk mark watched: select one, click Mark watched, status becomes done", async () => {
    seedSample();
    const user = userEvent.setup();
    wrap();

    await user.click(screen.getByRole("button", { name: /^select$/i }));
    await user.click(
      screen.getByRole("checkbox", { name: /select alpha/i }),
    );
    await user.click(screen.getByRole("button", { name: /mark watched/i }));

    expect(useWatchlistStore.getState().entries["tmdb:movie:1"]?.status).toBe(
      "done",
    );
    // Other entries untouched.
    expect(useWatchlistStore.getState().entries["tmdb:movie:2"]?.status).toBe(
      "want",
    );
  });
});
