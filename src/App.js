import React, { useState, useEffect, useCallback } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import "./App.css";
import MovieList from "./components/MovieList";
import MovieListHeading from "./components/MovieListHeading";
import SearchBox from "./components/SearchBox";
import MovieDetailsModal from "./components/MovieDetailsModal"; // Import the new component

function App() {
  const [movies, setMovies] = useState([]);
  const [searchValue, setSearchValue] = useState("avengers");
  const [selectedMovie, setSelectedMovie] = useState(null); // State for selected movie details
  const [showModal, setShowModal] = useState(false); // State for modal visibility

  const getMovieList = useCallback(async () => {
    const url = `http://www.omdbapi.com/?s=${searchValue}&apikey=71109bf1`;
    const response = await fetch(url);
    const responseJson = await response.json();

    if (responseJson.Search) {
      setMovies(responseJson.Search);
    }
  }, [searchValue]);

  const getMovieDetails = async (imdbID) => {
    const url = `http://www.omdbapi.com/?i=${imdbID}&apikey=71109bf1`;
    const response = await fetch(url);
    const responseJson = await response.json();

    if (responseJson) {
      setSelectedMovie(responseJson);
      setShowModal(true); // Show the modal when movie details are fetched
    }
  };

  useEffect(() => {
    getMovieList();
  }, [getMovieList]);

  const handleCloseModal = () => setShowModal(false);

  return (
    <div className="container-fluid movie-app">
      <div className="row d-flex align-items-center mt-4 mb-4">
        <MovieListHeading heading="Movies" />
        <SearchBox searchValue={searchValue} setSearchValue={setSearchValue} />
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
