import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { useTasteStore } from "./taste";

beforeEach(() => {
  localStorage.clear();
  useTasteStore.setState({ recentItems: [], dismissedItems: [] });
});

afterEach(() => {
  localStorage.clear();
});

describe("taste store", () => {
  test("starts empty", () => {
    expect(useTasteStore.getState().recent()).toEqual([]);
    expect(useTasteStore.getState().isDismissed("anything")).toBe(false);
  });

  test("markOpened adds to front", () => {
    useTasteStore.getState().markOpened("a");
    useTasteStore.getState().markOpened("b");
    expect(useTasteStore.getState().recent()).toEqual(["b", "a"]);
  });

  test("markOpened dedupes and moves to front", () => {
    useTasteStore.getState().markOpened("a");
    useTasteStore.getState().markOpened("b");
    useTasteStore.getState().markOpened("a");
    expect(useTasteStore.getState().recent()).toEqual(["a", "b"]);
  });

  test("recent caps at 50", () => {
    for (let i = 0; i < 60; i++) useTasteStore.getState().markOpened(`id${i}`);
    expect(useTasteStore.getState().recent().length).toBe(50);
    expect(useTasteStore.getState().recent()[0]).toBe("id59"); // most recent at front
  });

  test("dismiss adds and isDismissed reads", () => {
    useTasteStore.getState().dismiss("x");
    expect(useTasteStore.getState().isDismissed("x")).toBe(true);
  });

  test("dismiss dedupes", () => {
    useTasteStore.getState().dismiss("x");
    useTasteStore.getState().dismiss("x");
    expect(useTasteStore.getState().dismissedItems.length).toBe(1);
  });

  test("reset clears both", () => {
    useTasteStore.getState().markOpened("a");
    useTasteStore.getState().dismiss("b");
    useTasteStore.getState().reset();
    expect(useTasteStore.getState().recent()).toEqual([]);
    expect(useTasteStore.getState().isDismissed("b")).toBe(false);
  });

  test("persists to localStorage under 'taste'", () => {
    useTasteStore.getState().markOpened("p1");
    expect(localStorage.getItem("taste")).toContain("p1");
  });
});
