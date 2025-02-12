import React, { useState, useEffect, useCallback } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import "./App.css";
import MovieList from "./components/MovieList";
import MovieListHeading from "./components/MovieListHeading";
import SearchBox from "./components/SearchBox";
import AddFavorites from "./components/AddFavorites";
import RemoveFavorites from "./components/RemoveFavorites";
import MovieDetailsModal from "./components/MovieDetailsModal"; // Import the new component

function App() {
  const [movies, setMovies] = useState([]);
  const [favorites, setFavorites] = useState([]);
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
    const movieFavorite =
      JSON.parse(localStorage.getItem("react-movie-app-favorites")) || [];
    setFavorites(movieFavorite);
  }, [getMovieList]);

  const saveToLocalStorage = (items) => {
    localStorage.setItem("react-movie-app-favorites", JSON.stringify(items));
  };

  const addFavoriteMovie = (movie) => {
    const newFavoriteList = [...favorites, movie];
    setFavorites(newFavoriteList);
    saveToLocalStorage(newFavoriteList);
  };

  const removeFavoriteMovie = (movie) => {
    const newFavoriteList = favorites.filter(
      (favorite) => favorite.imdbID !== movie.imdbID
    );
    setFavorites(newFavoriteList);
    localStorage.setItem(
      "react-movie-app-favorites",
      JSON.stringify(newFavoriteList)
    );
  };

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
          handleFavoritesClick={addFavoriteMovie}
          favoriteComponent={AddFavorites}
          handleMovieClick={getMovieDetails} // Pass the click handler
        />
      </div>

      <div className="row d-flex align-items-center mt-4 mb-4">
        <MovieListHeading heading="Favorites" />
      </div>

      <div className="row">
        <MovieList
          movies={favorites}
          handleFavoritesClick={removeFavoriteMovie}
          favoriteComponent={RemoveFavorites}
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
