import React, { useState, useEffect, useCallback, useMemo } from "react";
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
  const [searchValue, setSearchValue] = useState(""); // Set initial state to an empty string
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [theme, setTheme] = useState("dark");
  const [isSearching, setIsSearching] = useState(false);
  const navigate = useNavigate();
  const { imdbID } = useParams();

  useEffect(() => {
    document.body.className = theme;
  }, [theme]);

  const predefinedMovies = useMemo(
    () => [
      "Star Wars",
      "Avengers",
      "Lord of the Rings",
      "Star Trek",
      "Harry Potter",
      "The Matrix",
      "Jurassic Park",
      "Indiana Jones",
      "Back to the Future",
      "The Terminator",
      "Die Hard",
      "The Godfather",
      "Pulp Fiction",
      "The Shawshank Redemption",
      "Forrest Gump",
      "The Dark Knight",
      "Inception",
      "Interstellar",
      "The Lion King",
      "Aladdin",
      "The Little Mermaid",
    ],
    []
  );

  const fetchStreamingPlatform = useCallback(async (movieId) => {
    try {
      const apiKey = process.env.REACT_APP_TMDB_API_KEY; // Replace with your TMDb API key
      const url = `https://api.themoviedb.org/3/movie/${movieId}/watch/providers?api_key=${apiKey}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      const streamingPlatforms = data.results?.US?.flatrate
        ?.map((provider) => provider.provider_name)
        .join(", ");
      return streamingPlatforms || "Unknown";
    } catch (error) {
      console.error("Failed to fetch streaming platform:", error);
      return "Unknown";
    }
  }, []);

  const fetchMovieDetails = useCallback(async (movie) => {
    const apiKey = process.env.REACT_APP_TMDB_API_KEY; // Replace with your TMDb API key
    const detailsUrl = `https://api.themoviedb.org/3/movie/${movie.id}?api_key=${apiKey}&append_to_response=release_dates,credits`;
    const detailsResponse = await fetch(detailsUrl);
    if (!detailsResponse.ok) {
      throw new Error(`HTTP error! status: ${detailsResponse.status}`);
    }
    const detailsJson = await detailsResponse.json();

    const director = detailsJson.credits.crew.find(
      (member) => member.job === "Director"
    )?.name;
    const actors = detailsJson.credits.cast
      .slice(0, 5)
      .map((actor) => actor.name)
      .join(", ");

    return {
      ...movie,
      vote_average: movie.vote_average,
      director,
      actors,
    };
  }, []);

  const getMovieList = useCallback(async () => {
    setIsSearching(true);
    try {
      const apiKey = process.env.REACT_APP_TMDB_API_KEY; // Replace with your TMDb API key
      const url = `https://api.themoviedb.org/3/search/movie?query=${searchValue}&api_key=${apiKey}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const responseJson = await response.json();

      if (responseJson.results) {
        const moviesWithRatings = await Promise.all(
          responseJson.results.map(fetchMovieDetails)
        );
        setMovies(moviesWithRatings);
      } else {
        setMovies([]);
      }
    } catch (error) {
      console.error("Failed to fetch movie list:", error);
    } finally {
      setIsSearching(false);
    }
  }, [searchValue, fetchMovieDetails]);

  const getMovieDetails = useCallback(
    async (movieId) => {
      try {
        const apiKey = process.env.REACT_APP_TMDB_API_KEY; // Replace with your TMDb API key
        const url = `https://api.themoviedb.org/3/movie/${movieId}?api_key=${apiKey}&append_to_response=videos,credits,release_dates`;
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const responseJson = await response.json();

        if (responseJson) {
          const director = responseJson.credits.crew.find(
            (member) => member.job === "Director"
          )?.name;
          const actors = responseJson.credits.cast
            .slice(0, 5)
            .map((actor) => actor.name)
            .join(", ");
          const trailer = responseJson.videos.results.find(
            (video) => video.type === "Trailer"
          );
          const trailerUrl = trailer
            ? `https://www.youtube.com/embed/${trailer.key}`
            : null;

          const streamingPlatform = await fetchStreamingPlatform(movieId);

          setSelectedMovie({
            ...responseJson,
            director,
            actors,
            trailerUrl,
            streamingPlatform,
            vote_average: responseJson.vote_average,
          });
          setShowModal(true);
          navigate(`/movie/${movieId}`);
        }
      } catch (error) {
        console.error("Failed to fetch movie details:", error);
      }
    },
    [navigate, fetchStreamingPlatform]
  );

  useEffect(() => {
    if (searchValue) {
      getMovieList();
    } else {
      const fetchPredefinedMovies = async () => {
        const apiKey = process.env.REACT_APP_TMDB_API_KEY; // Replace with your TMDb API key
        const movies = await Promise.all(
          predefinedMovies.map(async (title) => {
            const url = `https://api.themoviedb.org/3/search/movie?query=${title}&api_key=${apiKey}`;
            const response = await fetch(url);
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }
            const responseJson = await response.json();
            const movie = responseJson.results[0];
            return fetchMovieDetails(movie);
          })
        );
        setMovies(movies);
      };
      fetchPredefinedMovies();
    }
  }, [searchValue, predefinedMovies, fetchMovieDetails, getMovieList]);

  useEffect(() => {
    if (imdbID) {
      getMovieDetails(imdbID);
    }
  }, [imdbID, getMovieDetails]);

  const handleCloseModal = () => {
    setShowModal(false);
    navigate("/");
  };

  const toggleTheme = () => {
    setTheme((prevTheme) => {
      const newTheme = prevTheme === "dark" ? "light" : "dark";
      document.body.className = newTheme;
      return newTheme;
    });
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
            isSearching={isSearching}
          />
          <button onClick={toggleTheme} className="theme-toggle-button">
            <FontAwesomeIcon icon={theme === "dark" ? faSun : faMoon} />
          </button>
        </div>
      </div>

      <div className="row">
        {movies.length > 0 ? (
          <MovieList movies={movies} handleMovieClick={getMovieDetails} />
        ) : (
          <div className="no-movies-found">No movies found</div>
        )}
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
