import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FaArrowLeft,
  FaLock,
  FaMinus,
  FaPlus,
  FaShieldAlt,
  FaShoppingBasket,
  FaTrash
} from "react-icons/fa";
import { toast } from "sonner";
import { useCart } from "../context/CartContext";

function Cart() {
  const navigate = useNavigate();
  const { items, subtotal, updateQuantity, removeItem, clearCart } = useCart();
  const user = JSON.parse(localStorage.getItem("user"));
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const serviceFee = subtotal * 0.08;
  const effectivePaystackRate = 0.02 * 1.15;
  const processingFee =
    subtotal > 0
      ? ((subtotal + serviceFee) * effectivePaystackRate) /
        (1 - effectivePaystackRate)
      : 0;
  const estimatedTotal = subtotal + serviceFee + processingFee;

  function decrease(item) {
    if (item.quantity <= 1) {
      removeItem(item.id);
      toast.success(`${item.name} removed from basket`);
      return;
    }
    updateQuantity(item.id, item.quantity - 1);
  }

  function increase(item) {
    if (item.quantity >= 99) {
      toast.error("Maximum quantity is 99 per product");
      return;
    }
    updateQuantity(item.id, item.quantity + 1);
  }

  async function checkout() {
    if (!user) {
      toast.error("Please log in before checkout");
      navigate("/login");
      return;
    }

    if (items.length === 0) {
      toast.error("Your basket is empty");
      return;
    }

    if (!agreed) {
      toast.error("Please accept the Terms & Conditions to continue");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("http://localhost:3000/orders/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          items: items.map((item) => ({
            productId: item.id,
            quantity: item.quantity
          })),
          termsAccepted: true
        })
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.message || "Unable to start payment");
        return;
      }

      // Keep the cart until Paystack has successfully accepted checkout.
      // The callback clears it after verified payment.
      sessionStorage.setItem("cartCheckoutReference", data.reference);
      toast.success("Secure checkout is opening...");
      window.location.href = data.authorizationUrl;
    } catch (err) {
      console.error(err);
      toast.error("Unable to connect to the payment service");
    } finally {
      setSubmitting(false);
    }
  }

  if (items.length === 0) {
    return (
      <main className="cart-page">
        <div className="cart-empty-card">
          <div className="cart-empty-icon"><FaShoppingBasket /></div>
          <p className="section-tag">Your basket</p>
          <h1>Your basket is empty</h1>
          <p>Add products while you shop and come back here when you are ready to pay.</p>
          <Link to="/shop" className="cart-shop-btn">Browse Products</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="cart-page">
      <div className="cart-page-heading">
        <div>
          <p className="section-tag">Pay & Collect</p>
          <h1><FaShoppingBasket /> Your Basket</h1>
          <p>Review your products, adjust quantities and pay securely when you are ready.</p>
        </div>
        <Link to="/shop" className="cart-continue-link"><FaArrowLeft /> Continue Shopping</Link>
      </div>

      <div className="cart-layout">
        <section className="cart-items-card">
          <div className="cart-card-heading">
            <div>
              <h2>Basket Items</h2>
              <span>{items.length} {items.length === 1 ? "product" : "products"}</span>
            </div>
            <button className="cart-clear-btn" type="button" onClick={() => {
              if (window.confirm("Remove all products from your basket?")) clearCart();
            }}>
              Clear basket
            </button>
          </div>

          <div className="cart-item-list">
            {items.map((item) => (
              <article className="cart-item" key={item.id}>
                <div className="cart-item-image-wrap">
                  <img src={item.image} alt={item.name} />
                </div>

                <div className="cart-item-copy">
                  {item.category && <span className="cart-item-category">{item.category}</span>}
                  <h3>{item.name}</h3>
                  <p>R{item.price.toFixed(2)} each</p>
                </div>

                <div className="cart-quantity-control" aria-label={`Quantity for ${item.name}`}>
                  <button type="button" onClick={() => decrease(item)} aria-label="Decrease quantity"><FaMinus /></button>
                  <strong>{item.quantity}</strong>
                  <button type="button" onClick={() => increase(item)} aria-label="Increase quantity"><FaPlus /></button>
                </div>

                <div className="cart-item-total">
                  <span>Item total</span>
                  <strong>R{(item.price * item.quantity).toFixed(2)}</strong>
                </div>

                <button
                  className="cart-remove-btn"
                  type="button"
                  onClick={() => {
                    removeItem(item.id);
                    toast.success(`${item.name} removed from basket`);
                  }}
                  aria-label={`Remove ${item.name}`}
                >
                  <FaTrash />
                </button>
              </article>
            ))}
          </div>
        </section>

        <aside className="cart-summary-card">
          <p className="cart-summary-kicker">Order Summary</p>
          <h2>Ready for checkout?</h2>

          <div className="cart-summary-lines">
            <div><span>Product subtotal</span><strong>R{subtotal.toFixed(2)}</strong></div>
            <div><span>Online service fee</span><strong>R{serviceFee.toFixed(2)}</strong></div>
            <div><span>Payment processing fee</span><strong>R{processingFee.toFixed(2)}</strong></div>
            <div className="cart-summary-total"><span>Total to pay</span><strong>R{estimatedTotal.toFixed(2)}</strong></div>
          </div>

          <div className="cart-trust-note">
            <FaShieldAlt />
            <p>Note you will receive a collection code after successful payment. The store will not be able to provide the product without this code.</p>
          </div>

          <label className="cart-terms-row">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              disabled={submitting}
            />
            <span>I agree to the Terms &amp; Conditions and understand that my paid order will be held for collection for 48 hours.</span>
          </label>

          <button
            className="cart-checkout-btn"
            type="button"
            onClick={checkout}
            disabled={!agreed || submitting}
          >
            <FaLock />
            {submitting ? "Opening secure checkout..." : `Pay R${estimatedTotal.toFixed(2)}`}
          </button>

          <p className="cart-secure-copy">Final prices are recalculated securely through Paystack checkout.</p>
        </aside>
      </div>
    </main>
  );
}

export default Cart;
