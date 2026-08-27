import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { FaMapMarkerAlt, FaCheckCircle, FaClock, FaShoppingBag } from "react-icons/fa";

const MAP_URL = "https://www.google.com/maps/dir//All+Liquors+Wholesale,+1293+Mametlhake+Road,+PHAKE,+Phake,+0492/";

function OrderCollection() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));
  const userId = user?.id;
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      navigate("/login");
      return;
    }

    fetch(`http://localhost:3000/orders/user/${userId}/${id}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Unable to load order");
        return data;
      })
      .then(setOrder)
      .catch((error) => {
        console.error(error);
        toast.error("Unable to load collection details");
      })
      .finally(() => setLoading(false));
  }, [id, navigate, userId]);

  if (loading) return <section className="collection-page"><div className="orders-loading">Loading collection details...</div></section>;

  if (!order) {
    return <section className="collection-page"><div className="orders-empty"><h2>Order not found</h2><Link to="/orders">Back to Order History</Link></div></section>;
  }

  const items = order.Items || [];
  const active = order.PaymentStatus === "paid" && !["expired", "cancelled", "collected"].includes(order.CollectionStatus);

  return (
    <section className="collection-page">
      <div className="collection-hero">
        <div>
          <p className="section-kicker">Pay &amp; Collect</p>
          <h1>{order.CollectionStatus === "collected" ? "Order collected" : "Your collection details"}</h1>
          <p>Order {order.OrderNumber}</p>
        </div>
        <span className={`order-status status-${order.CollectionStatus}`}>
          {order.CollectionStatus === "ready" ? "Ready for collection" : order.CollectionStatus}
        </span>
      </div>

      {active && (
        <div className="collection-store-banner">
          <div>
            <span className="collection-banner-kicker">Collection instructions</span>
            <h2>One code collects your complete order</h2>
            <p>Your basket was paid as one order. Show the collection code once at the till.</p>
          </div>
          <a href={MAP_URL} target="_blank" rel="noreferrer" className="visit-store-action"><FaMapMarkerAlt /> Visit Store</a>
        </div>
      )}

      <div className="collection-layout">
        <div className="collection-main-card">
          <div className="collection-code-large">
            <span>Collection code for this order</span>
            <strong>{order.CollectionCode}</strong>
            <p><FaCheckCircle /> This single code covers every product listed below.</p>
          </div>

          <div className="collection-order-items">
            {items.map((item) => (
              <div className="collection-product-row" key={item.Id || item.ProductId}>
                <img src={item.ProductImage} alt={item.ProductName} />
                <div>
                  <span className="product-eyebrow">Paid item</span>
                  <h3>{item.ProductName}</h3>
                  <p>{item.Quantity} × R{Number(item.UnitPrice).toFixed(2)}</p>
                </div>
                <strong>R{(Number(item.UnitPrice) * Number(item.Quantity)).toFixed(2)}</strong>
              </div>
            ))}
          </div>

          <div className="collection-order-total-row">
            <span>Order total paid</span>
            <strong>R{Number(order.TotalAmount).toFixed(2)}</strong>
          </div>

          <div className="collection-info-grid">
            <div><span>Payment</span><strong>{order.PaymentStatus === "paid" ? "Successful" : order.PaymentStatus}</strong></div>
            <div><span>Collection status</span><strong>{order.CollectionStatus}</strong></div>
            <div><span>Paid on</span><strong>{order.PaidAt ? new Date(order.PaidAt).toLocaleString() : "—"}</strong></div>
            <div><span>Collect by</span><strong>{order.ExpiresAt ? new Date(order.ExpiresAt).toLocaleString() : "—"}</strong></div>
          </div>
        </div>

        <aside className="collection-side-card">
          <div className="collection-side-icon"><FaClock /></div>
          <h3>48-hour collection window</h3>
          <p>Your complete paid order is held for collection for 48 hours from payment confirmation.</p>
          <div className="collection-side-divider"></div>
          <p className="collection-side-note">Keep the one collection code available and show it at the till.</p>
        </aside>
      </div>

      <div className="collection-footer-actions">
        <Link to="/orders" className="auth-secondary-btn"><FaShoppingBag /> Order History</Link>
        <Link to="/shop" className="auth-submit-btn">Continue Shopping</Link>
      </div>
    </section>
  );
}

export default OrderCollection;
