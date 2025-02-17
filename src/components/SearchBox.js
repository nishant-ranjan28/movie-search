import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimes } from "@fortawesome/free-solid-svg-icons";

const SearchBox = ({ searchValue, setSearchValue, theme }) => {
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
    </div>
  );
};

export default SearchBox;
