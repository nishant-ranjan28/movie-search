import { useEffect, useState } from "react";
import pThrottle from "p-throttle";
import { tmdb } from "@/shared/api/tmdb/client";
import { useWatchlistStore, type WatchlistEntry } from "@/shared/store/watchlist";

const REFRESH_AFTER_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_CONCURRENT = 5;
const INTERVAL_MS = 200; // gentle throttle so we don't burst TMDB

const isStale = (e: WatchlistEntry): boolean => {
  if (!e.lastRefreshedAt) return true;
  const age = Date.now() - Date.parse(e.lastRefreshedAt);
  return Number.isFinite(age) ? age >= REFRESH_AFTER_MS : true;
};

const numericIdFor = (itemId: string): number | undefined => {
  const tail = itemId.split(":").pop();
  if (!tail) return undefined;
  const n = Number(tail);
  return Number.isFinite(n) ? n : undefined;
};

/**
 * Fires once per mount: refreshes the TMDB snapshot for every watchlist
 * entry that's either never been refreshed or was last refreshed > 24h ago.
 *
 * Returns `isSyncing: true` while any request is in flight so the page can
 * show a small chip. Failures are silent — `lastRefreshedAt` stays unset so
 * the next visit retries that entry.
 */
export function useWatchlistRefresh(): { isSyncing: boolean } {
  const entriesMap = useWatchlistStore((s) => s.entries);
  const updateSnapshot = useWatchlistStore((s) => s.updateSnapshot);
  const markRefreshed = useWatchlistStore((s) => s.markRefreshed);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const stale = Object.values(entriesMap).filter(isStale);
    if (stale.length === 0) return;

    const throttle = pThrottle({ limit: MAX_CONCURRENT, interval: INTERVAL_MS });
    const refreshOne = throttle(async (entry: WatchlistEntry) => {
      const id = numericIdFor(entry.itemId);
      if (id === undefined) return;
      try {
        const detail =
          entry.domain === "movie"
            ? await tmdb.movieDetails(id)
            : entry.domain === "tv"
              ? await tmdb.tvDetails(id)
              : undefined;
        if (!detail) return; // unsupported domain (anime/games/books — not yet)
        const item = detail.item;
        const snapshot: WatchlistEntry["snapshot"] = {
          title: item.title,
          genres: item.genres,
          ...(item.poster ? { poster: item.poster } : {}),
          ...(item.year === undefined ? {} : { year: item.year }),
          ...(item.releaseDate ? { releaseDate: item.releaseDate } : {}),
          ...(item.status ? { status: item.status } : {}),
        };
        updateSnapshot(entry.itemId, snapshot);
        markRefreshed(entry.itemId, new Date().toISOString());
      } catch (err) {
        // Silent failure — lastRefreshedAt stays unset so we retry next visit.
        // Don't poison the user's watchlist by removing entries on transient
        // TMDB blips.
        console.error("[useWatchlistRefresh]", entry.itemId, err);
      }
    });

    let cancelled = false;
    // Flipping a UI flag on/off around async work is the canonical pattern
    // for an in-flight indicator; the strict purity rule over-fires here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsSyncing(true);
    Promise.allSettled(stale.map((e) => refreshOne(e))).finally(() => {
      if (!cancelled) setIsSyncing(false);
    });
    return () => {
      cancelled = true;
    };
    // Intentionally depend only on the entries map identity — we don't want
    // to re-fire on every store mutation (status edit, reorder etc).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { isSyncing };
}
