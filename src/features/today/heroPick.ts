import type { MediaItem } from "@/shared/schemas/media";

const fnv1a = (input: string): number => {
  let h = 2166136261;
  for (const ch of input) {
    h ^= ch.codePointAt(0) ?? 0;
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h;
};

export const heroPickIndex = (seed: string, n: number): number => {
  if (n <= 0) return 0;
  return fnv1a(seed) % n;
};

export const todaySeed = (date: Date = new Date()): string =>
  date.toISOString().slice(0, 10);

export const pickHero = <T extends MediaItem>(
  items: T[],
  seed?: string,
): T | undefined => {
  if (items.length === 0) return undefined;
  const s = seed ?? todaySeed();
  return items[heroPickIndex(s, items.length)];
};
