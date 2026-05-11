import { useParams } from "react-router-dom";
import {
  useMovieDetails,
  useRelated,
  useWatchProviders,
} from "@/shared/api/tmdb/hooks";
import {
  MediaDetailLayout,
  type CastMember,
} from "@/shared/components/MediaDetailLayout";

const PROFILE_BASE = "https://image.tmdb.org/t/p/w185";
const BACKDROP_BASE = "https://image.tmdb.org/t/p/w1280";

export function MovieDetail() {
  const { id } = useParams<{ id: string }>();
  const numericId = id ? Number(id) : undefined;
  const details = useMovieDetails(numericId);
  const providers = useWatchProviders("movie", numericId, "US");
  const similar = useRelated("movie", numericId, "similar");
  const recommendations = useRelated("movie", numericId, "recommendations");

  if (details.isLoading || !details.data) {
    return (
      <>
        <h1 className="sr-only">Movie detail</h1>
        <MediaDetailLayout
          item={{
            id: "tmdb:movie:0",
            domain: "movie",
            title: "",
            genres: [],
            external: [],
          }}
          isLoading
        />
      </>
    );
  }

  const { item, raw } = details.data;
  const cast: CastMember[] = (raw.credits?.cast ?? [])
    .slice(0, 5)
    .map((c) => ({
      name: c.name,
      character: c.character,
      ...(c.profile_path
        ? { profileImage: `${PROFILE_BASE}${c.profile_path}` }
        : {}),
    }));
  const trailer = (raw.videos?.results ?? []).find(
    (v) => v.site === "YouTube" && v.type === "Trailer",
  );

  return (
    <MediaDetailLayout
      item={item}
      extras={{
        ...(raw.backdrop_path
          ? { backdrop: `${BACKDROP_BASE}${raw.backdrop_path}` }
          : {}),
        cast,
        ...(trailer
          ? { trailerUrl: `https://www.youtube.com/embed/${trailer.key}` }
          : {}),
        ...(providers.data ? { watchProviders: providers.data } : {}),
        ...(similar.data && similar.data.length > 0
          ? { similar: similar.data }
          : {}),
        ...(recommendations.data && recommendations.data.length > 0
          ? { recommendations: recommendations.data }
          : {}),
      }}
    />
  );
}
