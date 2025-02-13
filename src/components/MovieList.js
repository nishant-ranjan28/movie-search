import React from "react";

const MovieList = ({ movies, handleMovieClick }) => {
  return (
    <>
      {movies.map((movie, index) => (
        <div
          className="image-container d-flex justify-content-start m-3"
          key={index}
          onClick={() => handleMovieClick(movie.imdbID)}
        >
          <div className="rating-badge">{movie.imdbRating}</div>
          <img src={movie.Poster} alt="movie"></img>
        </div>
      ))}
    </>
  );
};

export default MovieList;
