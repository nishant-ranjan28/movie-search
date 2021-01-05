import React from "react";

const SearchBox = (props) => {
  return (
    <div className=''>
      <input
        className='form-control'
        value={props.value}
        onChange={(event) => props.setSearchValue(event.target.value)}
        placeholder='search movie'
      ></input>
    </div>
  );
};
export default SearchBox;
