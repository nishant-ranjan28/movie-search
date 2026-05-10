import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { MediaCard } from "./MediaCard";
import { useWatchlistStore } from "@/shared/store/watchlist";
import type { MediaItem, MediaDomain } from "@/shared/schemas/media";

const make = (overrides: Partial<MediaItem> = {}): MediaItem => ({
  id: "tmdb:movie:603",
  domain: "movie",
  title: "The Matrix",
  year: 1999,
  poster: { src: "https://example.com/p.jpg" },
  rating: { score: 8.2, outOf: 10 },
  genres: ["sci-fi"],
  external: [],
  ...overrides,
});

beforeEach(() => {
  localStorage.clear();
  useWatchlistStore.setState({ entries: {} });
});

afterEach(() => localStorage.clear());

describe("MediaCard", () => {
  test("renders title and year", () => {
    render(<MediaCard item={make()} />);
    expect(screen.getByRole("heading", { name: /matrix/i })).toBeInTheDocument();
    expect(screen.getByText("1999")).toBeInTheDocument();
  });

  test("renders rating chip", () => {
    render(<MediaCard item={make()} />);
    expect(screen.getByText(/8\.2/)).toBeInTheDocument();
  });

  test("clicking card calls onOpen with item", async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    render(<MediaCard item={make()} onOpen={onOpen} />);
    await user.click(screen.getByRole("button", { name: /matrix/i }));
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: "tmdb:movie:603" }));
  });

  test("clicking bookmark adds to watchlist and stops propagation", async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    render(<MediaCard item={make()} onOpen={onOpen} />);
    await user.click(screen.getByRole("button", { name: /add to watchlist/i }));
    expect(useWatchlistStore.getState().has("tmdb:movie:603")).toBe(true);
    expect(onOpen).not.toHaveBeenCalled();
  });

  test("bookmark toggles off when item already in watchlist", async () => {
    useWatchlistStore.getState().add({
      itemId: "tmdb:movie:603",
      domain: "movie",
      snapshot: { title: "x", genres: [] },
    });
    const user = userEvent.setup();
    render(<MediaCard item={make()} />);
    await user.click(screen.getByRole("button", { name: /remove from watchlist/i }));
    expect(useWatchlistStore.getState().has("tmdb:movie:603")).toBe(false);
  });

  test.each<MediaDomain>(["movie", "tv", "anime", "game", "book"])(
    "uses the correct accent class for domain %s",
    (domain) => {
      const { container } = render(<MediaCard item={make({ id: `x:${domain}:1`, domain })} />);
      const card = container.querySelector('[role="button"]');
      expect(card?.className).toMatch(new RegExp(`border-t-accent-${domain}`));
    },
  );
});
