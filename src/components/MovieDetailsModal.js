import React from "react";
import { Modal, Button } from "react-bootstrap";
import "./MovieDetailsModal.css";

const MovieDetailsModal = ({ show, handleClose, movie }) => {
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
