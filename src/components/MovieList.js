import React from "react";
import PropTypes from "prop-types";

const MovieList = ({ movies, handleMovieClick }) => {
  PropTypes.checkPropTypes(
    MovieList.propTypes,
    { movies, handleMovieClick },
    "prop",
    "MovieList"
  );
  return (
    <div className="d-flex flex-wrap justify-content-center">
      {movies.map((movie, index) => (
        <div
          className="movie-card d-flex flex-column justify-content-start m-3 position-relative"
          key={index}
          role="button"
          tabIndex={0}
          onClick={() => handleMovieClick(movie.id)}
          onKeyPress={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              handleMovieClick(movie.id);
            }
          }}
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
MovieList.propTypes = {
  movies: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number.isRequired,
      poster_path: PropTypes.string,
      title: PropTypes.string,
      vote_average: PropTypes.number,
      rottenTomatoesRating: PropTypes.number,
    })
  ).isRequired,
  handleMovieClick: PropTypes.func.isRequired,
};

export default MovieList;
