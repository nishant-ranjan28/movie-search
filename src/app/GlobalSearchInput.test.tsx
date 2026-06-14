import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, test } from "vitest";
import { GlobalSearchInput } from "./GlobalSearchInput";

function LocationProbe() {
  const loc = useLocation();
  return <div data-testid="location">{loc.pathname + loc.search}</div>;
}

const wrap = () => {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <Routes>
          <Route path="*" element={<GlobalSearchInput />} />
        </Routes>
        <LocationProbe />
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

beforeEach(() => {
  localStorage.clear();
});

describe("GlobalSearchInput Smart search routing", () => {
  test("navigates to /tv when the AI infers a TV query", async () => {
    const user = userEvent.setup();
    wrap();

    await user.type(screen.getByRole("searchbox"), "feel-good 90s sitcom");

    // Wait for Smart search CTA to enable (genres loaded).
    const smart = await screen.findByRole("button", {
      name: /Smart search/i,
    });
    await waitFor(() => expect(smart).not.toBeDisabled());
    await user.click(smart);

    await waitFor(() => {
      expect(screen.getByTestId("location")).toHaveTextContent(/^\/tv\?/);
    });
  });

  test("navigates to /movies when the AI infers a movie query", async () => {
    const user = userEvent.setup();
    wrap();

    await user.type(screen.getByRole("searchbox"), "feel-good 90s comedy");

    const smart = await screen.findByRole("button", {
      name: /Smart search/i,
    });
    await waitFor(() => expect(smart).not.toBeDisabled());
    await user.click(smart);

    await waitFor(() => {
      expect(screen.getByTestId("location")).toHaveTextContent(/^\/movies\?/);
    });
  });
});
