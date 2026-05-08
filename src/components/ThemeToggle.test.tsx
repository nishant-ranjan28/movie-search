import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, test } from "vitest";
import { ThemeToggle } from "./ThemeToggle";

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
});
afterEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
});

test("renders Sun icon when theme is dark (so user can switch to light)", () => {
  render(<ThemeToggle />);
  // Initial theme is dark; the icon shown is the *target* (Sun = switch to light)
  expect(screen.getByLabelText(/switch to light theme/i)).toBeInTheDocument();
});

test("clicking toggles theme and updates the aria-label to the new target", async () => {
  const user = userEvent.setup();
  render(<ThemeToggle />);
  const button = screen.getByRole("button");
  await user.click(button);
  expect(document.documentElement.dataset["theme"]).toBe("light");
  expect(screen.getByLabelText(/switch to dark theme/i)).toBeInTheDocument();
});
