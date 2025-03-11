import React from "react";

const SuggestedDropdown = ({ suggestions, onSelectSuggestion }) => {
  return (
    <ul className="suggested-dropdown">
      {suggestions.length > 0 ? (
        suggestions.map((suggestion, index) => (
          <li key={index} onClick={() => onSelectSuggestion(suggestion)}>
            <img
              src={suggestion.Poster}
              alt={suggestion.Title}
              className="suggested-poster"
            />
            <span>{suggestion.Title}</span>
          </li>
        ))
      ) : (
        <li className="no-suggestions">No suggestions available</li>
      )}
    </ul>
  );
};

export default SuggestedDropdown;
