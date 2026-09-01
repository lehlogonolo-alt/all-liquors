import ProductCard from "./ProductCard";
import { useState, useEffect } from "react";
import { FaSearch, FaFilter, FaSortAmountDown, FaChevronLeft, FaChevronRight, FaBoxOpen } from "react-icons/fa";
import { toast } from "sonner";

function Shop() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");

  const [category, setCategory] = useState("All");
  const [sortBy, setSortBy] = useState("default");

  const [currentPage, setCurrentPage] = useState(1);
  const [favoritedIds, setFavoritedIds] = useState(new Set());

  const productsPerPage = 12;
  const user = JSON.parse(localStorage.getItem("user"));

  useEffect(() => {
    fetch("http://localhost:3000/products")
      .then(res => res.json())
      .then(data => setProducts(data))
      .catch(() => toast.error("Unable to load products"));

    if (user) {
      fetch(`http://localhost:3000/favorites/${user.id}`)
        .then(res => res.json())
        .then(data => setFavoritedIds(new Set(data.map(p => p.Id))))
        .catch(() => toast.error("Unable to load saved products"));
    }
  }, []);

  async function toggleFavorite(productId, currentlyFavorited) {
    try {
      if (currentlyFavorited) {
        await fetch(`http://localhost:3000/favorites/${user.id}/${productId}`, {
          method: "DELETE"
        });

        setFavoritedIds(prev => {
          const next = new Set(prev);
          next.delete(productId);
          return next;
        });
      } else {
        await fetch("http://localhost:3000/favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.id, productId })
        });

        setFavoritedIds(prev => new Set(prev).add(productId));
      }
    } catch (err) {
      console.log(err);
    }
  }

  /* ============================
        SEARCH + CATEGORY
  ============================= */

  let filteredProducts = products.filter(product => {

    const matchesSearch =
      product.Name.toLowerCase().includes(search.toLowerCase());

    const matchesCategory =
      category === "All"
        ? true
        : product.Category === category;

    return matchesSearch && matchesCategory;
  });

  /* ============================
            SORTING
  ============================= */

  if (sortBy === "priceLow") {
    filteredProducts.sort(
      (a, b) => Number(a.Price) - Number(b.Price)
    );
  }

  if (sortBy === "priceHigh") {
    filteredProducts.sort(
      (a, b) => Number(b.Price) - Number(a.Price)
    );
  }

  if (sortBy === "name") {
    filteredProducts.sort((a, b) =>
      a.Name.localeCompare(b.Name)
    );
  }

  /* ============================
            PAGINATION
  ============================= */

  const totalPages = Math.ceil(
    filteredProducts.length / productsPerPage
  );

  const startIndex =
    (currentPage - 1) * productsPerPage;

  const currentProducts = filteredProducts.slice(
    startIndex,
    startIndex + productsPerPage
  );

  /* ============================
          INPUT HANDLERS
  ============================= */

  function handleSearch(e) {
    setSearch(e.target.value);
    setCurrentPage(1);
  }

  function handleCategory(e) {
    setCategory(e.target.value);
    setCurrentPage(1);
  }

  function handleSort(e) {
    setSortBy(e.target.value);
    setCurrentPage(1);
  }

  /* ============================
              UI
  ============================= */

  return (
    <section className="shop-page">

      <div className="shop-header">

        <div className="shop-header-copy">
          <p className="section-tag">
            Browse Our Collection
          </p>

          <h1>Shop All Products</h1>

          <p className="shop-count">
            Showing{" "}
            {currentProducts.length === 0
              ? 0
              : startIndex + 1}
            -
            {Math.min(
              startIndex + productsPerPage,
              filteredProducts.length
            )}{" "}
            of {filteredProducts.length} products
          </p>
        </div>

        <div className="shop-header-note">
          <FaBoxOpen />
          <span>Quality products. Convenient shopping.</span>
        </div>

      </div>

      {/* SEARCH + FILTERS */}

      <div className="shop-filters">

        <div className="shop-search-wrap">
          <FaSearch className="shop-filter-icon" />
          <input
            className="shop-search"
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={handleSearch}
          />
        </div>

        <div className="shop-select-wrap">
          <FaFilter className="shop-filter-icon" />
          <select
  value={category}
  onChange={handleCategory}
>
  <option value="All">All Categories</option>
  <option value="Beer">Beer</option>
  <option value="Wine">Wine</option>
  <option value="Champagne">Champagne</option>
  <option value="Spirits">Spirits</option>
  <option value="Whisky">Whisky</option>
  <option value="Vodka">Vodka</option>
  <option value="Brandy">Brandy</option>
  <option value="Gin">Gin</option>
  <option value="Rum">Rum</option>
  <option value="Cider">Cider</option>
  <option value="Soft Drinks">Soft Drinks</option>
  <option value="Snacks">Snacks</option>
  <option value="Accessories">Accessories</option>
</select>
        </div>

        <div className="shop-select-wrap">
          <FaSortAmountDown className="shop-filter-icon" />
          <select
            value={sortBy}
            onChange={handleSort}
          >
          <option value="default">
            Sort Products
          </option>

          <option value="priceLow">
            Price: Low → High
          </option>

          <option value="priceHigh">
            Price: High → Low
          </option>

          <option value="name">
            Name A → Z
          </option>

          </select>
        </div>

      </div>

      {/* PRODUCTS */}

      {currentProducts.length === 0 ? (

        <div className="empty-products">
          <FaBoxOpen className="empty-products-icon" />
          <h2>No products found</h2>
          <p>Try adjusting your search or category filter.</p>
        </div>

      ) : (

        <div className="product-list">

          {currentProducts.map(product => (

            <ProductCard
            key={product.Id}
            id={product.Id}
            name={product.Name}
            price={product.Price}
            image={product.Image}
            category={product.Category}
            isAvailable={product.IsAvailable}
            isFavorited={favoritedIds.has(product.Id)}
            onToggleFavorite={toggleFavorite}
            />

          ))}

        </div>

      )}

      {/* PAGINATION */}

      {totalPages > 1 && (

        <div className="shop-pagination">

          <button
            disabled={currentPage === 1}
            onClick={() =>
              setCurrentPage(currentPage - 1)
            }
          >
            <FaChevronLeft />
            Previous
          </button>

          {Array.from(
            { length: totalPages },
            (_, i) => (

              <button
                key={i}
                className={
                  currentPage === i + 1
                    ? "active-page"
                    : ""
                }
                onClick={() =>
                  setCurrentPage(i + 1)
                }
              >
                {i + 1}
              </button>

            )
          )}

          <button
            disabled={currentPage === totalPages}
            onClick={() =>
              setCurrentPage(currentPage + 1)
            }
          >
            Next
            <FaChevronRight />
          </button>

        </div>

      )}

    </section>
  );
}

export default Shop;