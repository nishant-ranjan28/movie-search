import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { MediaCardSkeleton } from "./MediaCardSkeleton";

describe("MediaCardSkeleton", () => {
  test("renders without crashing", () => {
    const { container } = render(<MediaCardSkeleton />);
    expect(container.firstChild).toBeTruthy();
  });

  test("exposes aria-busy and aria-label for screen readers", () => {
    render(<MediaCardSkeleton />);
    const card = screen.getByLabelText("Loading");
    expect(card).toHaveAttribute("aria-busy", "true");
  });

  test("renders three skeleton placeholders (poster, title, year)", () => {
    const { container } = render(<MediaCardSkeleton />);
    const skeletons = container.querySelectorAll(".animate-pulse");
    expect(skeletons).toHaveLength(3);
  });
});
