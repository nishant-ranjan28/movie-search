import { createBrowserRouter, type RouteObject } from "react-router-dom";
import { RootLayout } from "./RootLayout";
import { ComingSoon } from "./ComingSoon";
import { NotFound } from "./NotFound";
import { RouteErrorFallback } from "./RouteErrorFallback";
import { TodayPage } from "@/features/today/TodayPage";
import { MoviesHub } from "@/features/movies/MoviesHub";
import { MovieDetail } from "@/features/movies/MovieDetail";
import { TvHub } from "@/features/tv/TvHub";
import { TvDetail } from "@/features/tv/TvDetail";
import { WatchlistPage } from "@/features/watchlist/WatchlistPage";
import { ReleasesPage } from "@/features/releases/ReleasesPage";
import { SearchPage } from "@/features/search/SearchPage";
import { SettingsPage } from "@/features/settings/SettingsPage";

export const routes: RouteObject[] = [
  {
    path: "/",
    element: <RootLayout />,
    errorElement: <RouteErrorFallback />,
    children: [
      { index: true, element: <TodayPage /> },
      { path: "movies", element: <MoviesHub /> },
      { path: "movies/:id", element: <MovieDetail /> },
      { path: "tv", element: <TvHub /> },
      { path: "tv/:id", element: <TvDetail /> },
      { path: "anime", element: <ComingSoon domain="anime" /> },
      { path: "games", element: <ComingSoon domain="game" /> },
      { path: "books", element: <ComingSoon domain="book" /> },
      { path: "watchlist", element: <WatchlistPage /> },
      { path: "releases", element: <ReleasesPage /> },
      { path: "search", element: <SearchPage /> },
      { path: "settings", element: <SettingsPage /> },
      { path: "*", element: <NotFound /> },
    ],
  },
];

export const router = createBrowserRouter(routes);
