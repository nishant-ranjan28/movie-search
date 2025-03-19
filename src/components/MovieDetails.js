import React from "react";
import PropTypes from "prop-types";

MovieDetails.propTypes = {
  movie: PropTypes.shape({
    Title: PropTypes.string,
    Poster: PropTypes.string,
    Year: PropTypes.string,
    Genre: PropTypes.string,
    Director: PropTypes.string,
    Actors: PropTypes.string,
    Plot: PropTypes.string,
  }).isRequired,
};

const MovieDetails = ({ movie }) => {
  return (
    <div className="movie-details">
      <h2>{movie.Title}</h2>
      <img src={movie.Poster} alt="movie poster" />
      <p>
        <strong>Year:</strong> {movie.Year}
      </p>
      <p>
        <strong>Genre:</strong> {movie.Genre}
      </p>
      <p>
        <strong>Director:</strong> {movie.Director}
      </p>
      <p>
        <strong>Actors:</strong> {movie.Actors}
      </p>
      <p>
        <strong>Plot:</strong> {movie.Plot}
      </p>
    </div>
  );
};

export default MovieDetails;
