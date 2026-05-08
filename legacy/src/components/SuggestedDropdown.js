import React from "react";
import PropTypes from "prop-types";

const SuggestedDropdown = ({ suggestions, onSelectSuggestion }) => {
  return (
    <ul className="suggested-dropdown">
      {suggestions.length > 0 ? (
        suggestions.map((suggestion, index) => (
          <li key={suggestion.id}>
            <button
              onClick={() => onSelectSuggestion(suggestion)}
              onKeyPress={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  onSelectSuggestion(suggestion);
                }
              }}
              tabIndex="0"
              className="suggestion-button"
            >
              <img
                src={`https://image.tmdb.org/t/p/w200${suggestion.poster_path}`}
                alt={suggestion.title}
                className="suggested-poster"
              />
              <span>{suggestion.title}</span>
            </button>
          </li>
        ))
      ) : (
        <li className="no-suggestions">No suggestions available</li>
      )}
    </ul>
  );
};

SuggestedDropdown.propTypes = {
  suggestions: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number.isRequired,
      poster_path: PropTypes.string,
      title: PropTypes.string.isRequired,
    })
  ).isRequired,
  onSelectSuggestion: PropTypes.func.isRequired,
};

export default SuggestedDropdown;
