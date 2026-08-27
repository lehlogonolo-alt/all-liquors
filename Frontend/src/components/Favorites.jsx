import { useEffect, useMemo, useState } from "react";
import { FaChevronLeft, FaChevronRight, FaSearch } from "react-icons/fa";
import ProductCard from "./ProductCard";

const PER_PAGE = 8;

function Favorites() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const user = JSON.parse(localStorage.getItem("user"));

  useEffect(() => {
    fetch(`http://localhost:3000/favorites/${user.id}`)
      .then(res => res.json()).then(setProducts).catch(console.error).finally(() => setLoading(false));
  }, [user.id]);

  async function toggleFavorite(productId) {
    try {
      await fetch(`http://localhost:3000/favorites/${user.id}/${productId}`, { method: "DELETE" });
      setProducts(prev => prev.filter(p => p.Id !== productId));
    } catch (err) { console.log(err); }
  }

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return products;
    return products.filter((product) => [product.Name, product.Category, product.Price].some((value) => String(value || "").toLowerCase().includes(term)));
  }, [products, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);

  if (loading) return <p className="loading-text">Loading your favorites...</p>;

  return (
    <section className="shop-page">
      <div className="shop-header"><div><p className="section-tag">Your Wishlist</p><h1>Saved Products</h1><p className="shop-count">{filtered.length} saved product{filtered.length === 1 ? "" : "s"}</p></div></div>

      {products.length > 0 && (
        <div className="history-filter-bar single-search-bar saved-products-search">
          <div className="history-search-field"><FaSearch /><input type="search" placeholder="Search saved products..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} /></div>
        </div>
      )}

      {products.length === 0 ? (
        <div className="empty-products"><h2>No saved products yet</h2><p>Tap the heart icon on any product to save it here.</p></div>
      ) : paginated.length === 0 ? (
        <div className="empty-products"><h2>No matching products</h2><p>Try another search.</p></div>
      ) : (
        <>
          <div className="product-list">
            {paginated.map(product => <ProductCard key={product.Id} id={product.Id} name={product.Name} price={product.Price} image={product.Image} category={product.Category} isAvailable={product.IsAvailable} isFavorited={true} onToggleFavorite={toggleFavorite} />)}
          </div>
          {totalPages > 1 && (
            <div className="pagination history-pagination"><button disabled={currentPage === 1} onClick={() => setPage((p) => p - 1)}><FaChevronLeft /> Previous</button><span>Page {currentPage} of {totalPages}</span><button disabled={currentPage === totalPages} onClick={() => setPage((p) => p + 1)}>Next <FaChevronRight /></button></div>
          )}
        </>
      )}
    </section>
  );
}
export default Favorites;
