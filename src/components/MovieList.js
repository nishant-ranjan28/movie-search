import React from "react";

const MovieList = ({ movies, handleMovieClick }) => {
  return (
    <div className="d-flex flex-wrap justify-content-center">
      {movies.map((movie) => (
        <div
          className="image-container d-flex justify-content-start m-3 position-relative"
          key={movie.id}
          role="button"
          tabIndex="0"
          onClick={() => handleMovieClick(movie.id)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              handleMovieClick(movie.id);
            }
          }}
        >
          <div className="rating-badge imdb-rating">{movie.vote_average}</div>
          <div className="rating-badge rotten-tomatoes-rating">
            {movie.rottenTomatoesRating || "N/A"}
          </div>
          <img
            src={`https://image.tmdb.org/t/p/w200${movie.poster_path}`}
            alt={movie.title}
            className="img-fluid"
          />
        </div>
      ))}
    </div>
  );
};

export default MovieList;
