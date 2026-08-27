import { useState } from "react";

function SearchBar({ onSearch }) {
  const [showInput, setShowInput] = useState(false);
  const [query, setQuery] = useState("");

  function handleChange(e) {
    const value = e.target.value;
    setQuery(value);
    onSearch(value); // send search to parent
  }

  return (
    <div className="search-container">

      {/* 🔍 ICON */}
      <span 
        className="search-icon"
        onClick={() => setShowInput(!showInput)}
      >
        🔍
      </span>

      {/* INPUT (ONLY SHOW WHEN CLICKED) */}
      {showInput && (
        <input
          type="text"
          placeholder="Search products..."
          value={query}
          onChange={handleChange}
        />
      )}

    </div>
  );
}

export default SearchBar;