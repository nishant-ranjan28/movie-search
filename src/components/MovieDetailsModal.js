import React from "react";
import PropTypes from "prop-types";
import { Modal, Button } from "react-bootstrap";
import "../App.css";

const MovieDetailsModal = ({ show, handleClose, movie }) => {
  if (!movie) {
    return null; // or you can return a loading spinner or placeholder
  }

  MovieDetailsModal.propTypes = {
    show: PropTypes.bool.isRequired,
    handleClose: PropTypes.func.isRequired,
    movie: PropTypes.shape({
      title: PropTypes.string.isRequired,
      poster_path: PropTypes.string.isRequired,
      release_date: PropTypes.string.isRequired,
      genres: PropTypes.arrayOf(
        PropTypes.shape({
          name: PropTypes.string.isRequired,
        })
      ).isRequired,
      director: PropTypes.string.isRequired,
      actors: PropTypes.string.isRequired,
      overview: PropTypes.string.isRequired,
      streamingPlatform: PropTypes.string.isRequired,
      trailerUrl: PropTypes.string,
    }).isRequired,
  };

  return (
    <Modal show={show} onHide={handleClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>{movie.title}</Modal.Title>
      </Modal.Header>
      <Modal.Body className="movie-details-modal-body">
        <img
          src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
          alt="movie poster"
          style={{ width: "100%" }}
        />
        <p>
          <strong>Year:</strong> {new Date(movie.release_date).getFullYear()}
        </p>
        <p>
          <strong>Genre:</strong>{" "}
          {movie.genres.map((genre) => genre.name).join(", ")}
        </p>
        <p>
          <strong>Director:</strong> {movie.director}
        </p>
        <p>
          <strong>Actors:</strong> {movie.actors}
        </p>
        <p>
          <strong>Plot:</strong> {movie.overview}
        </p>
        <p>
          <strong>Preferred Streaming Platform:</strong>{" "}
          {movie.streamingPlatform}
        </p>
        {movie.trailerUrl && (
          <div className="trailer-container">
            <iframe
              width="100%"
              height="315"
              src={movie.trailerUrl}
              title="YouTube video player"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
          </div>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default MovieDetailsModal;
