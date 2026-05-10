import { describe, expect, test } from "vitest";
import { MediaDomainSchema, MediaItemSchema, type MediaItem } from "./media";

describe("MediaDomainSchema", () => {
  test("accepts the five known domains", () => {
    expect(MediaDomainSchema.parse("movie")).toBe("movie");
    expect(MediaDomainSchema.parse("tv")).toBe("tv");
    expect(MediaDomainSchema.parse("anime")).toBe("anime");
    expect(MediaDomainSchema.parse("game")).toBe("game");
    expect(MediaDomainSchema.parse("book")).toBe("book");
  });

  test("rejects unknown domains", () => {
    expect(() => MediaDomainSchema.parse("podcast")).toThrow();
  });
});

describe("MediaItemSchema", () => {
  test("parses a minimal valid item", () => {
    const item = MediaItemSchema.parse({
      id: "tmdb:movie:603",
      domain: "movie",
      title: "The Matrix",
      genres: ["sci-fi"],
      external: [],
    });
    expect(item.id).toBe("tmdb:movie:603");
    expect(item.domain).toBe("movie");
    expect(item.title).toBe("The Matrix");
  });

  test("parses a fully-populated item", () => {
    const item: MediaItem = MediaItemSchema.parse({
      id: "anilist:anime:21",
      domain: "anime",
      title: "One Piece",
      altTitle: "ワンピース",
      year: 1999,
      poster: { src: "https://example.com/op.jpg" },
      synopsis: "Pirates.",
      rating: { score: 8.7, outOf: 10, votes: 12345 },
      genres: ["action", "adventure"],
      releaseDate: "1999-10-20",
      status: "ongoing",
      external: [{ provider: "anilist", url: "https://anilist.co/anime/21" }],
    });
    expect(item.rating?.score).toBe(8.7);
    expect(item.external).toHaveLength(1);
  });

  test("rejects unknown domain", () => {
    expect(() =>
      MediaItemSchema.parse({
        id: "x:y:z",
        domain: "podcast",
        title: "x",
        genres: [],
        external: [],
      }),
    ).toThrow();
  });

  test("rejects id without namespace pattern", () => {
    expect(() =>
      MediaItemSchema.parse({
        id: "603",
        domain: "movie",
        title: "x",
        genres: [],
        external: [],
      }),
    ).toThrow();
  });

  test("rejects rating with outOf != 10", () => {
    expect(() =>
      MediaItemSchema.parse({
        id: "tmdb:movie:1",
        domain: "movie",
        title: "x",
        genres: [],
        external: [],
        rating: { score: 8, outOf: 5 },
      }),
    ).toThrow();
  });
});
