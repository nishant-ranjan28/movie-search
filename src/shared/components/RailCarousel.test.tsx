import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { RailCarousel } from "./RailCarousel";

beforeEach(() => {
  HTMLDivElement.prototype.scrollBy = vi.fn();
});

describe("RailCarousel", () => {
  test("renders the title as a heading linked to the section", () => {
    render(
      <RailCarousel title="Trending Now">
        <span>a</span>
      </RailCarousel>,
    );
    const heading = screen.getByRole("heading", { name: "Trending Now" });
    expect(heading).toHaveAttribute("id", "rail-trending-now");
    const section = heading.closest("section");
    expect(section).toHaveAttribute("aria-labelledby", "rail-trending-now");
  });

  test("renders prev and next scroll buttons with accessible labels", () => {
    render(
      <RailCarousel title="Top Picks">
        <span>a</span>
      </RailCarousel>,
    );
    expect(
      screen.getByRole("button", { name: "Scroll Top Picks left" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Scroll Top Picks right" }),
    ).toBeInTheDocument();
  });

  test("clicking next scrolls right and prev scrolls left", async () => {
    const user = userEvent.setup();
    render(
      <RailCarousel title="Rail">
        <span>a</span>
        <span>b</span>
      </RailCarousel>,
    );
    const scrollByMock = HTMLDivElement.prototype.scrollBy as unknown as ReturnType<
      typeof vi.fn
    >;
    await user.click(screen.getByRole("button", { name: /right$/i }));
    expect(scrollByMock).toHaveBeenLastCalledWith({ left: 320, behavior: "smooth" });
    await user.click(screen.getByRole("button", { name: /left$/i }));
    expect(scrollByMock).toHaveBeenLastCalledWith({ left: -320, behavior: "smooth" });
  });

  test("wraps each child with the itemWidthClass", () => {
    const { container } = render(
      <RailCarousel title="Rail" itemWidthClass="w-24">
        <span data-testid="item">a</span>
        <span data-testid="item">b</span>
        <span data-testid="item">c</span>
      </RailCarousel>,
    );
    const wrappers = container.querySelectorAll(".w-24");
    expect(wrappers).toHaveLength(3);
    wrappers.forEach((w) => {
      expect(w.className).toMatch(/snap-start/);
      expect(w.className).toMatch(/shrink-0/);
    });
  });
});
