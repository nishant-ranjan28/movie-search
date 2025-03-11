import React, { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimes, faSpinner } from "@fortawesome/free-solid-svg-icons";
import SuggestedDropdown from "./SuggestedDropdown";

const SearchBox = ({ searchValue, setSearchValue, theme, isSearching }) => {
  const [suggestions, setSuggestions] = useState([]);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (searchValue) {
        const url = `https://www.omdbapi.com/?s=${searchValue}&apikey=17ceb17f`;
        const response = await fetch(url);
        const responseJson = await response.json();
        if (responseJson.Search) {
          setSuggestions(responseJson.Search);
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
    setSearchValue(suggestion.Title);
    setSuggestions([]);
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
      {suggestions.length > 0 && (
        <SuggestedDropdown
          suggestions={suggestions}
          onSelectSuggestion={handleSelectSuggestion}
        />
      )}
    </div>
  );
};

export default SearchBox;
