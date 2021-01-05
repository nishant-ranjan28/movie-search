import React from "react";

const MovieList = (props) => {
  const FavotiteComponent = props.favotiteComponent;
  return (
    <>
      {props.movies.map((movie, index) => (
        <div className='image-container d-flex justify-content-start m-3'>
          <img src={movie.Poster} alt='movie' />
          <div className='overlay d-flex align-items-center justify-content'></div>
          <FavotiteComponent />
        </div>
      ))}
    </>
  );
};
export default MovieList;
