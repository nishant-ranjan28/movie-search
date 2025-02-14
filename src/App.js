import React, { useState, useEffect, useCallback } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import "./App.css";
import MovieList from "./components/MovieList";
import MovieListHeading from "./components/MovieListHeading";
import SearchBox from "./components/SearchBox";
import MovieDetailsModal from "./components/MovieDetailsModal"; // Import the new component
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSun, faMoon } from "@fortawesome/free-solid-svg-icons";

function App() {
  const [movies, setMovies] = useState([]);
  const [searchValue, setSearchValue] = useState("avengers");
  const [selectedMovie, setSelectedMovie] = useState(null); // State for selected movie details
  const [showModal, setShowModal] = useState(false); // State for modal visibility
  const [theme, setTheme] = useState("dark"); // State for theme

  const getMovieList = useCallback(async () => {
    try {
      const url = `https://www.omdbapi.com/?s=${searchValue}&apikey=71109bf1`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const responseJson = await response.json();

      if (responseJson.Search) {
        const moviesWithRatings = await Promise.all(
          responseJson.Search.map(async (movie) => {
            const detailsUrl = `https://www.omdbapi.com/?i=${movie.imdbID}&apikey=71109bf1`;
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
      const url = `https://www.omdbapi.com/?i=${imdbID}&apikey=71109bf1`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const responseJson = await response.json();

      if (responseJson) {
        setSelectedMovie(responseJson);
        setShowModal(true); // Show the modal when movie details are fetched
      }
    } catch (error) {
      console.error("Failed to fetch movie details:", error);
    }
  };

  useEffect(() => {
    getMovieList();
  }, [getMovieList]);

  const handleCloseModal = () => setShowModal(false);

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === "dark" ? "light" : "dark"));
  };

  return (
    <div className={`container-fluid movie-app ${theme}`}>
      <div className="row d-flex align-items-center mt-4 mb-4 justify-content-between">
        <MovieListHeading heading="Movies" />
        <div className="d-flex align-items-center search-theme-container">
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
        <MovieList
          movies={movies}
          handleMovieClick={getMovieDetails} // Pass the click handler
        />
      </div>

      {selectedMovie && (
        <MovieDetailsModal
          show={showModal}
          handleClose={handleCloseModal}
          movie={selectedMovie}
        />
      )}
    </div>
  );
}

export default App;
