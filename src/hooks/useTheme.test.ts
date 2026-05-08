import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, test } from "vitest";
import { useTheme } from "./useTheme";

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
});

afterEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
});

test("defaults to dark and writes data-theme", () => {
  const { result } = renderHook(() => useTheme());
  expect(result.current.theme).toBe("dark");
  expect(document.documentElement.dataset["theme"]).toBe("dark");
  expect(localStorage.getItem("theme")).toBe("dark");
});

test("reads stored theme from localStorage", () => {
  localStorage.setItem("theme", "light");
  const { result } = renderHook(() => useTheme());
  expect(result.current.theme).toBe("light");
  expect(document.documentElement.dataset["theme"]).toBe("light");
});

test("ignores garbage in localStorage", () => {
  localStorage.setItem("theme", "neon");
  const { result } = renderHook(() => useTheme());
  expect(result.current.theme).toBe("dark");
});

test("toggles dark <-> light and persists", () => {
  const { result } = renderHook(() => useTheme());
  act(() => result.current.toggle());
  expect(result.current.theme).toBe("light");
  expect(document.documentElement.dataset["theme"]).toBe("light");
  expect(localStorage.getItem("theme")).toBe("light");
  act(() => result.current.toggle());
  expect(result.current.theme).toBe("dark");
});
