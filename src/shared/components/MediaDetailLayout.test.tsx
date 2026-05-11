import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { MediaDetailLayout } from "./MediaDetailLayout";
import { useWatchlistStore } from "@/shared/store/watchlist";
import type { MediaItem } from "@/shared/schemas/media";

const renderWithRouter = (ui: React.ReactElement) =>
  render(<MemoryRouter>{ui}</MemoryRouter>);

const item: MediaItem = {
  id: "tmdb:movie:603",
  domain: "movie",
  title: "The Matrix",
  year: 1999,
  genres: ["sci-fi", "action"],
  rating: { score: 8.2, outOf: 10 },
  synopsis: "A computer hacker.",
  external: [],
};

beforeEach(() => {
  localStorage.clear();
  useWatchlistStore.setState({ entries: {} });
});
afterEach(() => localStorage.clear());

describe("MediaDetailLayout", () => {
  test("renders title, year, synopsis", () => {
    renderWithRouter(<MediaDetailLayout item={item} />);
    expect(
      screen.getByRole("heading", { level: 1, name: /matrix/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("1999")).toBeInTheDocument();
    expect(screen.getByText(/computer hacker/i)).toBeInTheDocument();
  });

  test("shows watchlist toggle button", () => {
    renderWithRouter(<MediaDetailLayout item={item} />);
    expect(
      screen.getByRole("button", { name: /add to watchlist/i }),
    ).toBeInTheDocument();
  });

  test("renders cast and trailer when extras provided", () => {
    renderWithRouter(
      <MediaDetailLayout
        item={item}
        extras={{
          cast: [{ name: "Keanu Reeves", character: "Neo" }],
          trailerUrl: "https://www.youtube.com/embed/test",
        }}
      />,
    );
    expect(screen.getByText(/keanu reeves/i)).toBeInTheDocument();
    expect(screen.getByText(/neo/i)).toBeInTheDocument();
    expect(screen.getByTitle(/trailer/i)).toBeInTheDocument();
  });

  test("renders watch providers", () => {
    renderWithRouter(
      <MediaDetailLayout
        item={item}
        extras={{ watchProviders: ["Netflix", "HBO Max"] }}
      />,
    );
    expect(screen.getByText(/netflix.*hbo max/i)).toBeInTheDocument();
  });

  test("loading state shows skeletons", () => {
    renderWithRouter(<MediaDetailLayout item={item} isLoading />);
    expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();
  });

  test("renders 'More like this' and 'You might also like' rails", () => {
    const a: MediaItem = {
      id: "tmdb:movie:1",
      domain: "movie",
      title: "Alpha",
      genres: [],
      external: [],
    };
    const b: MediaItem = {
      id: "tmdb:movie:2",
      domain: "movie",
      title: "Beta",
      genres: [],
      external: [],
    };
    renderWithRouter(
      <MediaDetailLayout item={item} extras={{ similar: [a], recommendations: [b] }} />,
    );
    expect(
      screen.getByRole("heading", { name: /more like this/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /you might also like/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /alpha/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /beta/i })).toBeInTheDocument();
  });

  test("omits a rail when its items array is empty", () => {
    renderWithRouter(<MediaDetailLayout item={item} extras={{ similar: [] }} />);
    expect(
      screen.queryByRole("heading", { name: /more like this/i }),
    ).not.toBeInTheDocument();
  });
});
