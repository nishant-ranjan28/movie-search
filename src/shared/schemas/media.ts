import { z } from "zod";

export const MediaDomainSchema = z.enum(["movie", "tv", "anime", "game", "book"]);
export type MediaDomain = z.infer<typeof MediaDomainSchema>;

export const MediaStatusSchema = z.enum(["released", "upcoming", "ongoing", "ended"]);
export type MediaStatus = z.infer<typeof MediaStatusSchema>;

export const MediaItemSchema = z.object({
  id: z.string().regex(/^[a-z]+:[a-z]+:.+$/, "namespaced id required (provider:domain:id)"),
  domain: MediaDomainSchema,
  title: z.string(),
  altTitle: z.string().optional(),
  year: z.number().int().optional(),
  poster: z
    .object({
      src: z.string().url(),
      blurhash: z.string().optional(),
    })
    .optional(),
  synopsis: z.string().optional(),
  rating: z
    .object({
      score: z.number(),
      outOf: z.literal(10),
      votes: z.number().int().optional(),
    })
    .optional(),
  genres: z.array(z.string()),
  releaseDate: z.string().optional(),
  status: MediaStatusSchema.optional(),
  external: z.array(
    z.object({
      provider: z.string(),
      url: z.string().url().optional(),
    }),
  ),
});

export type MediaItem = z.infer<typeof MediaItemSchema>;
