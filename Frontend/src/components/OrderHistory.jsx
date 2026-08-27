import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  FaShoppingBag,
  FaCheckCircle,
  FaSearch,
  FaCalendarAlt,
  FaChevronLeft,
  FaChevronRight
} from "react-icons/fa";

const PER_PAGE = 6;

const STATUS_LABELS = {
  pending: "Preparing your order",
  ready: "Ready for collection",
  collected: "Collected",
  expired: "Collection window expired",
  cancelled: "Cancelled"
};

function OrderHistory() {
  const user = JSON.parse(localStorage.getItem("user"));
  const userId = user?.id;
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!userId) {
      navigate("/login");
      return;
    }
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, navigate]);

  async function fetchOrders() {
    try {
      const response = await fetch(`http://localhost:3000/orders/user/${userId}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Unable to load orders");
      setOrders(data);
    } catch (error) {
      console.error(error);
      toast.error("Unable to load your orders");
    } finally {
      setLoading(false);
    }
  }

  const filteredOrders = useMemo(() => {
    const term = search.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesSearch = !term || [
        order.OrderNumber,
        order.CollectionCode,
        order.PaymentStatus,
        order.CollectionStatus,
        ...(order.Items || []).flatMap((item) => [item.ProductName, item.Category])
      ].some((value) => String(value || "").toLowerCase().includes(term));

      const orderDate = order.CreatedAt
        ? new Date(order.CreatedAt).toLocaleDateString("en-CA")
        : "";
      const matchesDate = !dateFilter || orderDate === dateFilter;

      return matchesSearch && matchesDate;
    });
  }, [orders, search, dateFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * PER_PAGE,
    currentPage * PER_PAGE
  );

  if (loading) {
    return <section className="orders-page"><div className="orders-loading">Loading your orders...</div></section>;
  }

  return (
    <section className="orders-page">
      <div className="orders-header">
        <div>
          <p className="section-kicker">My account</p>
          <h1>Order History</h1>
          <p>Each checkout has one order number and one collection code for the complete basket.</p>
        </div>
        <Link to="/shop" className="orders-shop-link"><FaShoppingBag /> Shop products</Link>
      </div>

      {orders.length > 0 && (
        <div className="history-filter-bar">
          <div className="history-search-field">
            <FaSearch />
            <input
              type="search"
              placeholder="Search order, collection code or product..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <div className="history-date-field">
            <FaCalendarAlt />
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => { setDateFilter(e.target.value); setPage(1); }}
              aria-label="Filter orders by date"
            />
          </div>
          {(search || dateFilter) && (
            <button className="history-clear-btn" onClick={() => { setSearch(""); setDateFilter(""); setPage(1); }}>
              Clear filters
            </button>
          )}
        </div>
      )}

      {orders.length === 0 ? (
        <div className="orders-empty">
          <FaShoppingBag />
          <h2>No orders yet</h2>
          <p>When you pay for products online, your Pay &amp; Collect orders will appear here.</p>
          <Link to="/shop">Browse the shop</Link>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="orders-empty compact-empty">
          <FaSearch />
          <h2>No matching orders</h2>
          <p>Try another search term or date.</p>
        </div>
      ) : (
        <>
          <div className="order-list">
            {paginatedOrders.map((order) => {
              const status = order.CollectionStatus || "pending";
              const isPaid = order.PaymentStatus === "paid";
              const items = order.Items || [];
              const itemCount = items.reduce((sum, item) => sum + Number(item.Quantity || 0), 0);

              return (
                <article className="order-card basket-order-card" key={order.Id}>
                  <div className="order-card-main">
                    <div className="order-card-heading">
                      <div>
                        <span className="order-number">{order.OrderNumber}</span>
                        <h3>{itemCount} item{itemCount === 1 ? "" : "s"} in this order</h3>
                      </div>
                      <span className={`order-status status-${status}`}>
                        {isPaid
                          ? STATUS_LABELS[status] || status
                          : order.PaymentStatus === "failed" ? "Payment failed" : "Payment pending"}
                      </span>
                    </div>

                    <div className="order-items-summary-list">
                      {items.map((item) => (
                        <div className="order-history-item" key={item.Id || `${order.Id}-${item.ProductId}`}>
                          <img src={item.ProductImage} alt={item.ProductName} />
                          <div>
                            <strong>{item.ProductName}</strong>
                            <span>{item.Quantity} × R{Number(item.UnitPrice).toFixed(2)}</span>
                          </div>
                          <b>R{(Number(item.UnitPrice) * Number(item.Quantity)).toFixed(2)}</b>
                        </div>
                      ))}
                    </div>

                    <div className="order-details-grid">
                      <div><span>Total paid</span><strong>R{Number(order.TotalAmount).toFixed(2)}</strong></div>
                      <div><span>Total quantity</span><strong>{itemCount}</strong></div>
                      <div><span>Ordered</span><strong>{new Date(order.CreatedAt).toLocaleDateString()}</strong></div>
                      <div><span>Collection deadline</span><strong>{order.ExpiresAt ? new Date(order.ExpiresAt).toLocaleString() : "After payment"}</strong></div>
                    </div>

                    {isPaid && status !== "expired" && status !== "cancelled" && (
                      <div className="collection-code-box single-order-code">
                        <div>
                          <span>Collection code for the whole order</span>
                          <strong>{order.CollectionCode}</strong>
                        </div>
                        <p><FaCheckCircle /> Show this one code at the till to collect every item in this order.</p>
                      </div>
                    )}

                    <div className="order-actions">
                      {isPaid && status !== "expired" && status !== "cancelled" && (
                        <Link to={`/orders/${order.Id}`} className="order-primary-action">
                          View collection details
                        </Link>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="pagination history-pagination">
              <button disabled={currentPage === 1} onClick={() => setPage((p) => p - 1)}>
                <FaChevronLeft /> Previous
              </button>
              <span>Page {currentPage} of {totalPages}</span>
              <button disabled={currentPage === totalPages} onClick={() => setPage((p) => p + 1)}>
                Next <FaChevronRight />
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}

export default OrderHistory;
