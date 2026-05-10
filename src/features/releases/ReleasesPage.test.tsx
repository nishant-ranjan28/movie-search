import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, test } from "vitest";
import { ReleasesPage } from "./ReleasesPage";

const wrap = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter><ReleasesPage /></MemoryRouter>
    </QueryClientProvider>,
  );
};

describe("ReleasesPage", () => {
  test("renders header and tabs", () => {
    wrap();
    expect(screen.getByRole("heading", { level: 1, name: /releases/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /calendar/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /list/i })).toBeInTheDocument();
  });

  test("calendar view loads with month heading", async () => {
    wrap();
    await waitFor(() => {
      const heading = screen.getByRole("heading", { level: 2 });
      expect(heading.textContent).toMatch(/January|February|March|April|May|June|July|August|September|October|November|December/i);
    });
  });

  test("can switch to List view", async () => {
    wrap();
    const user = userEvent.setup();
    await user.click(screen.getByRole("tab", { name: /list/i }));
    await waitFor(() => {
      const empty = screen.queryByRole("heading", { name: /no upcoming releases/i });
      const weeks = screen.queryAllByRole("heading", { name: /week of/i });
      expect(empty || weeks.length > 0).toBeTruthy();
    });
  });
});
