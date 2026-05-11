import { describe, expect, test } from "vitest";
import {
  filtersFromParams,
  filtersToParams,
} from "./discoverFiltersFromUrl";

describe("filtersFromParams", () => {
  test("returns empty for no params", () => {
    expect(filtersFromParams(new URLSearchParams())).toEqual({});
  });

  test("parses genres CSV", () => {
    expect(
      filtersFromParams(new URLSearchParams("genres=28,12")),
    ).toEqual({ genres: [28, 12] });
  });

  test("ignores malformed genres", () => {
    expect(
      filtersFromParams(new URLSearchParams("genres=abc,12")),
    ).toEqual({ genres: [12] });
  });

  test("parses year_gte / year_lte / rating_gte", () => {
    expect(
      filtersFromParams(
        new URLSearchParams("year_gte=1990&year_lte=2000&rating_gte=7.5"),
      ),
    ).toEqual({ yearGte: 1990, yearLte: 2000, ratingGte: 7.5 });
  });

  test("parses known sort values", () => {
    expect(
      filtersFromParams(new URLSearchParams("sort=date.desc")),
    ).toEqual({ sort: "date.desc" });
  });

  test("ignores unknown sort", () => {
    expect(
      filtersFromParams(new URLSearchParams("sort=nope")),
    ).toEqual({});
  });
});

describe("filtersToParams", () => {
  test("round-trips a populated filter set", () => {
    const params = filtersToParams(
      { genres: [28, 12], yearGte: 2010, ratingGte: 7, sort: "date.desc" },
      new URLSearchParams(),
    );
    expect(params.get("genres")).toBe("28,12");
    expect(params.get("year_gte")).toBe("2010");
    expect(params.get("rating_gte")).toBe("7");
    expect(params.get("sort")).toBe("date.desc");
  });

  test("does not emit default sort", () => {
    const params = filtersToParams(
      { sort: "popularity.desc" },
      new URLSearchParams(),
    );
    expect(params.has("sort")).toBe(false);
  });

  test("clears prior keys when value is unset", () => {
    const base = new URLSearchParams(
      "genres=28&year_gte=2000&rating_gte=7&sort=date.desc",
    );
    const next = filtersToParams({}, base);
    expect(next.has("genres")).toBe(false);
    expect(next.has("year_gte")).toBe(false);
    expect(next.has("rating_gte")).toBe(false);
    expect(next.has("sort")).toBe(false);
  });

  test("preserves unrelated params", () => {
    const next = filtersToParams(
      { ratingGte: 7 },
      new URLSearchParams("q=matrix"),
    );
    expect(next.get("q")).toBe("matrix");
    expect(next.get("rating_gte")).toBe("7");
  });
});
