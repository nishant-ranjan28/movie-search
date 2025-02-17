import React from "react";
import { Modal, Button } from "react-bootstrap";
import "../App.css";

const MovieDetailsModal = ({ show, handleClose, movie }) => {
  if (!movie) {
    return null; // or you can return a loading spinner or placeholder
  }

  return (
    <Modal show={show} onHide={handleClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>{movie.Title}</Modal.Title>
      </Modal.Header>
      <Modal.Body className="movie-details-modal-body">
        <img src={movie.Poster} alt="movie poster" style={{ width: "100%" }} />
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
