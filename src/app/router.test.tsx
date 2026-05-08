import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { test, expect } from "vitest";
import { routes } from "./router";
import { Providers } from "./Providers";

const renderAt = (path: string) => {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(
    <Providers>
      <RouterProvider router={router} />
    </Providers>,
  );
};

test.each([
  ["/", /today/i],
  ["/movies", /movies/i],
  ["/movies/123", /movie detail/i],
  ["/tv", /tv shows/i],
  ["/tv/456", /tv detail/i],
  ["/anime", /coming soon: anime/i],
  ["/games", /coming soon: game/i],
  ["/books", /coming soon: book/i],
  ["/watchlist", /watchlist/i],
  ["/releases", /releases/i],
  ["/search", /search/i],
  ["/settings", /settings/i],
  ["/totally-bogus-path", /not found/i],
])("route %s renders the expected page", (path, matcher) => {
  renderAt(path);
  expect(screen.getByRole("heading", { name: matcher })).toBeInTheDocument();
});
