import { useParams } from "react-router-dom";
import {
  useRelated,
  useTvDetails,
  useWatchProviders,
} from "@/shared/api/tmdb/hooks";
import {
  MediaDetailLayout,
  type CastMember,
} from "@/shared/components/MediaDetailLayout";

const PROFILE_BASE = "https://image.tmdb.org/t/p/w185";
const BACKDROP_BASE = "https://image.tmdb.org/t/p/w1280";

export function TvDetail() {
  const { id } = useParams<{ id: string }>();
  const numericId = id ? Number(id) : undefined;
  const details = useTvDetails(numericId);
  const providers = useWatchProviders("tv", numericId, "US");
  const similar = useRelated("tv", numericId, "similar");
  const recommendations = useRelated("tv", numericId, "recommendations");

  if (details.isLoading || !details.data) {
    return (
      <>
        <h1 className="sr-only">TV detail</h1>
        <MediaDetailLayout
          item={{
            id: "tmdb:tv:0",
            domain: "tv",
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
