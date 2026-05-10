import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { MediaDetailLayout } from "./MediaDetailLayout";
import { useWatchlistStore } from "@/shared/store/watchlist";
import type { MediaItem } from "@/shared/schemas/media";

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
    render(<MediaDetailLayout item={item} />);
    expect(
      screen.getByRole("heading", { level: 1, name: /matrix/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("1999")).toBeInTheDocument();
    expect(screen.getByText(/computer hacker/i)).toBeInTheDocument();
  });

  test("shows watchlist toggle button", () => {
    render(<MediaDetailLayout item={item} />);
    expect(
      screen.getByRole("button", { name: /add to watchlist/i }),
    ).toBeInTheDocument();
  });

  test("renders cast and trailer when extras provided", () => {
    render(
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
    render(
      <MediaDetailLayout
        item={item}
        extras={{ watchProviders: ["Netflix", "HBO Max"] }}
      />,
    );
    expect(screen.getByText(/netflix.*hbo max/i)).toBeInTheDocument();
  });

  test("loading state shows skeletons", () => {
    render(<MediaDetailLayout item={item} isLoading />);
    expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();
  });
});
