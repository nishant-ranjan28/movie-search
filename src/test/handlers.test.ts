import { expect, test } from "vitest";

const TMDB = "/api/tmdb";

test("MSW serves /movie/603", async () => {
  const res = await fetch(`${TMDB}/movie/603?api_key=anything`);
  expect(res.ok).toBe(true);
  const data = await res.json() as { id: number; title: string };
  expect(data.id).toBe(603);
});

test("MSW serves /trending/movie/day", async () => {
  const res = await fetch(`${TMDB}/trending/movie/day?api_key=x`);
  const data = await res.json() as { results: unknown[] };
  expect(data.results.length).toBeGreaterThan(0);
});

test("MSW empty search query returns empty results", async () => {
  const res = await fetch(`${TMDB}/search/movie?api_key=x`);
  const data = await res.json() as { results: unknown[] };
  expect(data.results.length).toBe(0);
});

test("MSW search matrix returns matrix results", async () => {
  const res = await fetch(`${TMDB}/search/movie?api_key=x&query=matrix`);
  const data = await res.json() as { results: unknown[] };
  expect(data.results.length).toBeGreaterThan(0);
});
