import React from "react";

const SuggestedDropdown = ({ suggestions, onSelectSuggestion }) => {
  return (
    <ul className="suggested-dropdown">
      {suggestions.length > 0 ? (
        suggestions.map((suggestion, index) => (
          <li key={index} onClick={() => onSelectSuggestion(suggestion)}>
            <img
              src={`https://image.tmdb.org/t/p/w200${suggestion.poster_path}`}
              alt={suggestion.title}
              className="suggested-poster"
            />
            <span>{suggestion.title}</span>
          </li>
        ))
      ) : (
        <li className="no-suggestions">No suggestions available</li>
      )}
    </ul>
  );
};

export default SuggestedDropdown;
