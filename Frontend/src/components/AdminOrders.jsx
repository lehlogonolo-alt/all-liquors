import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { FaBoxOpen, FaSearch, FaChevronLeft, FaChevronRight } from "react-icons/fa";

const ORDERS_PER_PAGE = 8;

function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [updating, setUpdating] = useState(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  async function fetchOrders() {
    try {
      const response = await fetch("http://localhost:3000/orders");
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Unable to load orders");
      setOrders(data);
    } catch (error) {
      console.error(error);
      toast.error("Unable to load orders");
    }
  }

  async function updateStatus(id, status) {
    setUpdating(id);

    try {
      const response = await fetch(`http://localhost:3000/orders/${id}/collection-status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Unable to update order");

      toast.success(data.message);
      await fetchOrders();
    } catch (error) {
      console.error(error);
      toast.error(error.message || "Failed to update order");
    } finally {
      setUpdating(null);
    }
  }

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();

    return orders
      .filter((order) => order.PaymentStatus === "paid")
      .filter((order) => statusFilter === "all" ? true : order.CollectionStatus === statusFilter)
      .filter((order) => {
        if (!term) return true;
        return (
          order.OrderNumber?.toLowerCase().includes(term) ||
          order.CollectionCode?.toLowerCase().includes(term) ||
          order.ProductName?.toLowerCase().includes(term) ||
          order.UserEmail?.toLowerCase().includes(term)
        );
      });
  }, [orders, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ORDERS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * ORDERS_PER_PAGE, currentPage * ORDERS_PER_PAGE);

  return (
    <div className="admin-dashboard">
      <div className="admin-page-heading">
        <div>
          <p className="section-kicker">Operations</p>
          <h1>Pay &amp; Collect Orders</h1>
          <p>Manage paid orders and move them from preparation to collection.</p>
        </div>
      </div>

      <section className="dashboard-section">
        <h2><FaBoxOpen className="section-icon" /> Manage Orders</h2>

        <div className="orders-admin-filters">
          <div className="admin-search-wrap">
            <FaSearch />
            <input
              className="dashboard-input"
              type="text"
              placeholder="Search order, customer or product..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>

          <select
            className="dashboard-input"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          >
            <option value="all">All collection statuses</option>
            <option value="pending">Pending</option>
            <option value="ready">Ready for collection</option>
            <option value="collected">Collected</option>
            <option value="expired">Expired</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div className="orders-admin-table-wrap">
          <table className="dashboard-table orders-admin-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Product</th>
                <th>Total</th>
                <th>Collection</th>
                <th>Update</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((order) => (
                <tr key={order.Id}>
                  <td>
                    <strong>{order.OrderNumber}</strong>
                    <small>{order.CollectionCode}</small>
                  </td>
                  <td>{order.UserEmail}</td>
                  <td>{order.ProductName} × {order.Quantity}</td>
                  <td>R{Number(order.TotalAmount).toFixed(2)}</td>
                  <td>
                    <span className={`pickup-badge status-${order.CollectionStatus}`}>
                      {order.CollectionStatus}
                    </span>
                  </td>
                  <td>
                    <select
                      className="dashboard-input compact-select"
                      value={order.CollectionStatus}
                      disabled={updating === order.Id}
                      onChange={(e) => updateStatus(order.Id, e.target.value)}
                    >
                      <option value="pending">Pending</option>
                      <option value="ready">Ready</option>
                      <option value="collected">Collected</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </td>
                </tr>
              ))}

              {paginated.length === 0 && (
                <tr><td colSpan="6" className="table-empty">No paid orders found.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="pagination">
            <button disabled={currentPage === 1} onClick={() => setPage(p => p - 1)}>
              <FaChevronLeft /> Previous
            </button>
            <span>Page {currentPage} of {totalPages}</span>
            <button disabled={currentPage === totalPages} onClick={() => setPage(p => p + 1)}>
              Next <FaChevronRight />
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

export default AdminOrders;
