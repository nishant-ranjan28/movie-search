import React from "react";

const MovieList = ({ movies, handleMovieClick }) => {
  return (
    <div className="d-flex flex-wrap justify-content-center">
      {movies.map((movie, index) => (
        <div
          className="movie-card d-flex flex-column justify-content-start m-3 position-relative"
          key={index}
          onClick={() => handleMovieClick(movie.id)}
        >
          <img
            src={`https://image.tmdb.org/t/p/w200${movie.poster_path}`}
            alt={movie.title}
            className="img-fluid movie-poster"
          />
          <div className="movie-info">
            <h5 className="movie-title">{movie.title}</h5>
            <div className="rating-badge imdb-rating">{movie.vote_average}</div>
            <div className="rating-badge rotten-tomatoes-rating">
              {movie.rottenTomatoesRating || "N/A"}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default MovieList;
