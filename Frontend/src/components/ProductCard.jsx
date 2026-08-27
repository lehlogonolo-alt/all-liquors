import { useState } from "react";
import {
  FaHeart,
  FaRegHeart,
  FaShoppingBasket
} from "react-icons/fa";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";

function ProductCard({
  id,
  name,
  price,
  image,
  category,
  isAvailable,
  isFavorited,
  onToggleFavorite
}) {
  const navigate = useNavigate();
  const { addItem } = useCart();
  const user = JSON.parse(localStorage.getItem("user"));
  const [favLoading, setFavLoading] = useState(false);

  const unitPrice = Number(price) || 0;

  function handleFavoriteClick() {
    if (!user) {
      toast.error("Please log in to save products");
      navigate("/login");
      return;
    }

    setFavLoading(true);
    Promise.resolve(onToggleFavorite(id, isFavorited))
      .finally(() => setFavLoading(false));
  }

  function handleAddToBasket() {
    if (!isAvailable) {
      toast.error("This product is currently unavailable");
      return;
    }

    addItem({
      id,
      name,
      price: unitPrice,
      image,
      category
    }, 1);

    toast.success(`${name} added to your basket`);
  }

  return (
    <div className="product-card">
      <div className="product-image-wrap">
        <img src={image} alt={name} />
        {category && <span className="product-category-overlay">{category}</span>}
      </div>

      <div className="product-info">
        <div className="product-info-top">
          <span className="product-eyebrow">All Liquors</span>

          <button
            className={`favorite-btn ${isFavorited ? "favorited" : ""}`}
            onClick={handleFavoriteClick}
            disabled={favLoading}
            aria-label={isFavorited ? "Remove from saved products" : "Save product"}
          >
            {isFavorited ? <FaHeart /> : <FaRegHeart />}
          </button>
        </div>

        <h3>{name}</h3>
        <p className="price">R{unitPrice.toFixed(2)}</p>

        <div className={`store-availability ${isAvailable ? "available" : "unavailable"}`}>
          <span className="availability-dot"></span>
          {isAvailable ? "Available for Pay & Collect" : "Currently unavailable"}
        </div>

        <button
          className="add-basket-btn product-card-basket-btn"
          disabled={!isAvailable}
          onClick={handleAddToBasket}
        >
          <FaShoppingBasket />
          {isAvailable ? "Add to Basket" : "Unavailable"}
        </button>
      </div>
    </div>
  );
}

export default ProductCard;
