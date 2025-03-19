import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimes, faSpinner } from "@fortawesome/free-solid-svg-icons";
import SuggestedDropdown from "./SuggestedDropdown";

const SearchBox = ({ searchValue, setSearchValue, theme, isSearching }) => {
  const [suggestions, setSuggestions] = useState([]);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (searchValue) {
        const apiKey = process.env.REACT_APP_TMDB_API_KEY; // Replace with your TMDb API key
        const url = `https://api.themoviedb.org/3/search/movie?query=${searchValue}&api_key=${apiKey}`;
        const response = await fetch(url);
        const responseJson = await response.json();
        if (responseJson.results) {
          setSuggestions(responseJson.results);
        } else {
          setSuggestions([]);
        }
      } else {
        setSuggestions([]);
      }
    };

    fetchSuggestions();
  }, [searchValue]);

  const handleSelectSuggestion = (suggestion) => {
    setSearchValue(suggestion.title);
    setSuggestions([]); // Clear suggestions to close the dropdown
  };

  return (
    <div className={`search-box ${theme}`}>
      <input
        className={`form-control ${theme}`}
        value={searchValue}
        onChange={(event) => setSearchValue(event.target.value)}
        placeholder="Search for a movie..."
      />
      {searchValue && (
        <FontAwesomeIcon
          icon={faTimes}
          className="clear-icon"
          onClick={() => setSearchValue("")}
        />
      )}
      {isSearching && (
        <FontAwesomeIcon icon={faSpinner} className="loading-icon" spin />
      )}
      {suggestions.length > 0 ? (
        <SuggestedDropdown
          suggestions={suggestions}
          onSelectSuggestion={handleSelectSuggestion}
        />
      ) : null}
    </div>
  );
};
SearchBox.propTypes = {
  searchValue: PropTypes.string.isRequired,
  setSearchValue: PropTypes.func.isRequired,
  theme: PropTypes.string,
  isSearching: PropTypes.bool,
};

export default SearchBox;
