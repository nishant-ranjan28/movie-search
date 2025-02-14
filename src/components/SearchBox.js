import React from "react";

const SearchBox = ({ searchValue, setSearchValue, theme }) => {
  return (
    <div className="col col-sm-4">
      <input
        className={`form-control ${theme}`}
        value={searchValue}
        onChange={(event) => setSearchValue(event.target.value)}
        placeholder="Search for a movie..."
      ></input>
    </div>
  );
};

export default SearchBox;
