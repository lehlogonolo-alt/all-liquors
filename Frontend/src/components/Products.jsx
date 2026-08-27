import ProductCard from "./ProductCard";
import { useEffect, useState } from "react";
import { FaTags } from "react-icons/fa";

function Products() {
  const [products, setProducts] = useState([]);
  const [favoritedIds, setFavoritedIds] = useState(new Set());

  const user = JSON.parse(localStorage.getItem("user"));

  useEffect(() => {
    fetch("http://localhost:3000/products/specials")
      .then(res => res.json())
      .then(data => setProducts(data))
      .catch(console.error);

    if (user) {
      fetch(`http://localhost:3000/favorites/${user.id}`)
        .then(res => res.json())
        .then(data => setFavoritedIds(new Set(data.map(p => p.Id))))
        .catch(console.error);
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

  return (
    <section className="products">

      <div className="section-header">
        <div>
          <p className="section-tag">Limited Offers</p>
          <h2 className="section-title">
          <FaTags className="section-icon" />
          Current Specials
          </h2>
        </div>

        <p className="scroll-text">
          ← Scroll to view more →
        </p>
      </div>

      {products.length === 0 ? (
        <p>No specials available.</p>
      ) : (
        <div className="specials-slider">
          {products.map(product => (
            <div
              className="special-card-wrapper"
              key={product.Id}
            >
              <ProductCard
              id={product.Id}
              name={product.Name}
              price={product.Price}
             image={product.Image}
             category={product.Category}
             isAvailable={product.IsAvailable}
             isFavorited={favoritedIds.has(product.Id)}
             onToggleFavorite={toggleFavorite}
             />
            </div>
          ))}
        </div>
      )}

    </section>
  );
}

export default Products;
