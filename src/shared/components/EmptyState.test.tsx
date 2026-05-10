import { render, screen } from "@testing-library/react";
import { Inbox } from "lucide-react";
import { describe, expect, test } from "vitest";
import { EmptyState } from "./EmptyState";

describe("EmptyState", () => {
  test("renders the title only with minimal props", () => {
    render(<EmptyState title="Nothing here" />);
    expect(
      screen.getByRole("heading", { name: "Nothing here" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("img", { hidden: true })).not.toBeInTheDocument();
  });

  test("renders icon, title, and description", () => {
    const { container } = render(
      <EmptyState
        icon={Inbox}
        title="No results"
        description="Try a different search."
      />,
    );
    expect(screen.getByRole("heading", { name: "No results" })).toBeInTheDocument();
    expect(screen.getByText("Try a different search.")).toBeInTheDocument();
    // icon rendered as svg with aria-hidden
    const svg = container.querySelector("svg[aria-hidden]");
    expect(svg).toBeTruthy();
  });

  test("renders the action node", () => {
    render(
      <EmptyState
        title="Watchlist empty"
        action={<button type="button">Browse</button>}
      />,
    );
    expect(screen.getByRole("button", { name: "Browse" })).toBeInTheDocument();
  });
});
