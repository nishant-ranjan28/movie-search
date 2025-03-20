import React from "react";
import PropTypes from "prop-types";

const MovieList = ({ movies, handleMovieClick }) => {
  return (
    <div className="d-flex flex-wrap justify-content-center">
      {movies.map((movie) => (
        <div
          className="movie-card d-flex flex-column justify-content-start m-3 position-relative"
          key={movie.id}
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
      title: PropTypes.string.isRequired,
      vote_average: PropTypes.number.isRequired,
    })
  ).isRequired,
  handleMovieClick: PropTypes.func.isRequired,
};

export default MovieList;
