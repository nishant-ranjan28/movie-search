import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { WatchlistButton } from "./WatchlistButton";
import { useWatchlistStore } from "@/shared/store/watchlist";
import type { MediaItem } from "@/shared/schemas/media";

const item: MediaItem = {
  id: "tmdb:movie:603",
  domain: "movie",
  title: "The Matrix",
  year: 1999,
  genres: ["sci-fi"],
  external: [],
};

beforeEach(() => {
  localStorage.clear();
  useWatchlistStore.setState({ entries: {} });
});

afterEach(() => localStorage.clear());

describe("WatchlistButton (default variant)", () => {
  test("shows 'Add to watchlist' when not added", () => {
    render(<WatchlistButton item={item} />);
    expect(
      screen.getByRole("button", { name: /add to watchlist/i }),
    ).toBeInTheDocument();
  });

  test("clicking adds and updates label optimistically", async () => {
    const user = userEvent.setup();
    render(<WatchlistButton item={item} />);
    await user.click(screen.getByRole("button", { name: /add to watchlist/i }));
    expect(useWatchlistStore.getState().has(item.id)).toBe(true);
    expect(
      screen.getByRole("button", { name: /watchlist status/i }),
    ).toBeInTheDocument();
  });

  test("dropdown lets you change status", async () => {
    useWatchlistStore.getState().add({
      itemId: item.id,
      domain: "movie",
      snapshot: { title: "x", genres: [] },
    });
    const user = userEvent.setup();
    render(<WatchlistButton item={item} />);
    await user.click(screen.getByRole("button", { name: /watchlist status/i }));
    await user.click(await screen.findByRole("menuitem", { name: /done/i }));
    expect(useWatchlistStore.getState().entries[item.id]?.status).toBe("done");
  });

  test("remove from watchlist via menu", async () => {
    useWatchlistStore.getState().add({
      itemId: item.id,
      domain: "movie",
      snapshot: { title: "x", genres: [] },
    });
    const user = userEvent.setup();
    render(<WatchlistButton item={item} />);
    await user.click(screen.getByRole("button", { name: /watchlist status/i }));
    await user.click(
      await screen.findByRole("menuitem", { name: /remove from watchlist/i }),
    );
    expect(useWatchlistStore.getState().has(item.id)).toBe(false);
  });
});

describe("WatchlistButton (compact variant)", () => {
  test("toggles add/remove on click", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <WatchlistButton item={item} variant="compact" />,
    );
    expect(
      screen.getByRole("button", { name: /add to watchlist/i }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /add to watchlist/i }));
    rerender(<WatchlistButton item={item} variant="compact" />);
    expect(
      screen.getByRole("button", { name: /remove from watchlist/i }),
    ).toBeInTheDocument();
  });
});
