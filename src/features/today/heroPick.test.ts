import { describe, expect, test } from "vitest";
import type { MediaItem } from "@/shared/schemas/media";
import { heroPickIndex, pickHero, todaySeed } from "./heroPick";

const makeItem = (n: number): MediaItem => ({
  id: `tmdb:movie:${n}`,
  domain: "movie",
  title: `Item ${n}`,
  genres: [],
  external: [],
});

describe("heroPickIndex", () => {
  test("is deterministic for same seed", () => {
    expect(heroPickIndex("2026-05-08", 10)).toBe(heroPickIndex("2026-05-08", 10));
    expect(heroPickIndex("foo", 7)).toBe(heroPickIndex("foo", 7));
  });

  test("different seeds produce varied indices (probabilistic)", () => {
    const seeds = [
      "2026-05-08",
      "2026-05-09",
      "2026-05-10",
      "2026-05-11",
      "2026-05-12",
    ];
    const indices = new Set(seeds.map((s) => heroPickIndex(s, 10)));
    expect(indices.size).toBeGreaterThanOrEqual(2);
  });

  test("returns 0 for empty list (n=0)", () => {
    expect(heroPickIndex("anything", 0)).toBe(0);
  });

  test("result is always within [0, n)", () => {
    for (let n = 1; n <= 20; n++) {
      const idx = heroPickIndex("seed", n);
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThan(n);
    }
  });
});

describe("todaySeed", () => {
  test("produces YYYY-MM-DD string", () => {
    const seed = todaySeed(new Date("2026-05-08T12:34:56Z"));
    expect(seed).toBe("2026-05-08");
  });
});

describe("pickHero", () => {
  test("returns undefined for empty items", () => {
    expect(pickHero([])).toBeUndefined();
  });

  test("returns same item across calls for fixed seed", () => {
    const items = Array.from({ length: 10 }, (_, i) => makeItem(i + 1));
    const a = pickHero(items, "fixed-seed");
    const b = pickHero(items, "fixed-seed");
    expect(a).toBeDefined();
    expect(a?.id).toBe(b?.id);
  });
});
