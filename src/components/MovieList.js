import React from "react";

const MovieList = (props) => {
  const FavotiteComponent = props.favotiteComponent;
  
  return (
    <>
      {
        props.movies.map((movie, index) => (
          <div
            className='image-container d-flex justify-content-start m-3'
            key={index}
          >
            <img src={movie.Poster} alt='movie' />
            <div
              onClick={() => props.handleFavoritesClick(movie)}
              className='overlay d-flex align-items-center justify-content'
            >
              <FavotiteComponent />
            </div>
          </div>
        ))
      }
    </>
  );
};
export default MovieList;
