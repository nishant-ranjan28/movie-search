import React from "react";

const MovieList = ({
  movies,
  handleFavoritesClick,
  favoriteComponent,
  handleMovieClick,
}) => {
  const FavoriteComponent = favoriteComponent;

  return (
    <>
      {movies.map((movie, index) => (
        <div
          className="image-container d-flex justify-content-start m-3"
          key={index}
        >
          <img src={movie.Poster} alt="movie"></img>
          <button
            className="favorite-button"
            onClick={(e) => {
              e.stopPropagation();
              handleFavoritesClick(movie);
            }}
          >
            <FavoriteComponent />
          </button>
          <button
            className="btn btn-primary show-details-button"
            onClick={(e) => {
              e.stopPropagation();
              handleMovieClick(movie.imdbID);
            }}
          >
            Show Details
          </button>
        </div>
      ))}
    </>
  );
};

export default MovieList;
