import React, { useState, useEffect, useCallback } from "react";
import { Route, Routes, useNavigate, useParams } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import "./App.css";
import MovieList from "./components/MovieList";
import MovieListHeading from "./components/MovieListHeading";
import SearchBox from "./components/SearchBox";
import MovieDetailsModal from "./components/MovieDetailsModal";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSun, faMoon } from "@fortawesome/free-solid-svg-icons";

function App() {
  const [movies, setMovies] = useState([]);
  const [searchValue, setSearchValue] = useState("avengers");
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [theme, setTheme] = useState("dark");
  const navigate = useNavigate();
  const { imdbID } = useParams();

  const getMovieList = useCallback(async () => {
    try {
      const url = `https://www.omdbapi.com/?s=${searchValue}&apikey=17ceb17f`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const responseJson = await response.json();

      if (responseJson.Search) {
        const moviesWithRatings = await Promise.all(
          responseJson.Search.map(async (movie) => {
            const detailsUrl = `https://www.omdbapi.com/?i=${movie.imdbID}&apikey=17ceb17f`;
            const detailsResponse = await fetch(detailsUrl);
            if (!detailsResponse.ok) {
              throw new Error(`HTTP error! status: ${detailsResponse.status}`);
            }
            const detailsJson = await detailsResponse.json();
            const rottenTomatoesRating = detailsJson.Ratings.find(
              (rating) => rating.Source === "Rotten Tomatoes"
            );
            return {
              ...movie,
              imdbRating: detailsJson.imdbRating,
              rottenTomatoesRating: rottenTomatoesRating
                ? rottenTomatoesRating.Value
                : "N/A",
            };
          })
        );
        setMovies(moviesWithRatings);
      }
    } catch (error) {
      console.error("Failed to fetch movie list:", error);
    }
  }, [searchValue]);

  const getMovieDetails = async (imdbID) => {
    try {
      const url = `https://www.omdbapi.com/?i=${imdbID}&apikey=17ceb17f`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const responseJson = await response.json();

      if (responseJson) {
        // Fetch the trailer URL from YouTube
        const trailerUrl = await fetchTrailerUrl(responseJson.Title);
        const streamingPlatform = await fetchStreamingPlatform(
          responseJson.Title
        );
        setSelectedMovie({ ...responseJson, trailerUrl, streamingPlatform });
        setShowModal(true);
        navigate(`/movie/${imdbID}`);
      }
    } catch (error) {
      console.error("Failed to fetch movie details:", error);
    }
  };

  const fetchTrailerUrl = async (title) => {
    try {
      const apiKey = process.env.REACT_APP_YOUTUBE_API_KEY;
      if (!apiKey) {
        throw new Error("YouTube API key is not defined");
      }
      const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(
        title + " trailer"
      )}&key=${apiKey}`;
      const response = await fetch(searchUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      const videoId = data.items[0]?.id?.videoId;
      return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    } catch (error) {
      console.error("Failed to fetch trailer URL:", error);
      return null;
    }
  };

  const fetchMovieByName = useCallback(async (name) => {
    try {
      const url = `https://www.omdbapi.com/?t=${name}&apikey=17ceb17f`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const responseJson = await response.json();

      if (responseJson) {
        // Fetch the trailer URL from YouTube
        const trailerUrl = await fetchTrailerUrl(responseJson.Title);
        const streamingPlatform = await fetchStreamingPlatform(
          responseJson.Title
        );
        setSelectedMovie({ ...responseJson, trailerUrl, streamingPlatform });
        setShowModal(true);
      }
    } catch (error) {
      console.error("Failed to fetch movie details:", error);
    }
  }, []);

  const fetchStreamingPlatform = async (title) => {
    try {
      const searchUrl = `https://apis.justwatch.com/content/titles/en_US/popular?query=${encodeURIComponent(title)}`;
      const response = await fetch(searchUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      if (data.items && data.items.length > 0) {
        const offers = data.items[0].offers || [];
        const streamingPlatforms = offers
          .map((offer) => `${offer.provider_id} (${offer.monetization_type})`)
          .join(", ");
        return streamingPlatforms ? streamingPlatforms : "Unknown";
      } else {
        return "Unknown";
      }
    } catch (error) {
      console.error("Failed to fetch streaming platform:", error);
      return "Unknown";
    }
  };

  useEffect(() => {
    getMovieList();
  }, [getMovieList]);

  useEffect(() => {
    if (imdbID) {
      fetchMovieByName(imdbID);
    }
  }, [imdbID, fetchMovieByName]);

  const handleCloseModal = () => {
    setShowModal(false);
    navigate("/");
  };

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === "dark" ? "light" : "dark"));
  };

  return (
    <div className={`container-fluid movie-app ${theme}`}>
      <div className={`navbar ${theme}`}>
        <MovieListHeading heading="Movies" />
        <div className={`search-theme-container ${theme}`}>
          <SearchBox
            searchValue={searchValue}
            setSearchValue={setSearchValue}
            theme={theme}
          />
          <button onClick={toggleTheme} className="theme-toggle-button">
            <FontAwesomeIcon icon={theme === "dark" ? faSun : faMoon} />
          </button>
        </div>
      </div>

      <div className="row">
        <MovieList movies={movies} handleMovieClick={getMovieDetails} />
      </div>

      <Routes>
        <Route
          path="/movie/:imdbID"
          element={
            <MovieDetailsModal
              show={showModal}
              handleClose={handleCloseModal}
              movie={selectedMovie}
            />
          }
        />
      </Routes>
    </div>
  );
}

export default App;
