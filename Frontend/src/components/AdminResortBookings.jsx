import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { FaCalendarCheck, FaChevronLeft, FaChevronRight, FaSearch } from "react-icons/fa";

const PER_PAGE = 8;

function AdminResortBookings() {
  const [bookings, setBookings] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [updating, setUpdating] = useState(null);

  useEffect(() => {
    fetchBookings();
  }, []);

  async function fetchBookings() {
    try {
      const response = await fetch("http://localhost:3000/resort/bookings");
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Unable to load resort bookings");
      setBookings(data);
    } catch (error) {
      console.error(error);
      toast.error("Unable to load resort bookings");
    }
  }

  async function updateStatus(id, status) {
    setUpdating(id);

    try {
      const response = await fetch(`http://localhost:3000/resort/bookings/${id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Unable to update booking");

      toast.success(data.message);
      await fetchBookings();
    } catch (error) {
      console.error(error);
      toast.error(error.message || "Unable to update booking");
    } finally {
      setUpdating(null);
    }
  }

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();

    return bookings
      .filter((booking) => booking.PaymentStatus === "paid")
      .filter((booking) => statusFilter === "all" ? true : booking.BookingStatus === statusFilter)
      .filter((booking) => {
        if (!term) return true;
        return (
          booking.BookingNumber?.toLowerCase().includes(term) ||
          booking.EntryCode?.toLowerCase().includes(term) ||
          booking.UserEmail?.toLowerCase().includes(term)
        );
      });
  }, [bookings, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);

  return (
    <div className="admin-dashboard">
      <div className="admin-page-heading">
        <div>
          <p className="section-kicker">Resort operations</p>
          <h1>Elephant Resort Bookings</h1>
          <p>Verify paid visitors and mark guests as checked in when they arrive.</p>
        </div>
      </div>

      <section className="dashboard-section">
        <h2><FaCalendarCheck className="section-icon" /> Manage Resort Bookings</h2>

        <div className="orders-admin-filters">
          <div className="admin-search-wrap">
            <FaSearch />
            <input
              className="dashboard-input"
              type="text"
              placeholder="Search booking, entry code or customer..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>

          <select
            className="dashboard-input"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          >
            <option value="all">All booking statuses</option>
            <option value="confirmed">Confirmed</option>
            <option value="checked_in">Checked in</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div className="orders-admin-table-wrap">
          <table className="dashboard-table orders-admin-table resort-admin-table">
            <thead>
              <tr>
                <th>Booking</th>
                <th>Customer</th>
                <th>Visit</th>
                <th>Guests</th>
                <th>Total</th>
                <th>Status</th>
                <th>Update</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((booking) => (
                <tr key={booking.Id}>
                  <td><strong>{booking.BookingNumber}</strong><small>{booking.EntryCode}</small></td>
                  <td>{booking.UserEmail}</td>
                  <td>{new Date(booking.VisitDate).toLocaleDateString()}</td>
                  <td>{booking.Adults + booking.Children + booking.Infants}</td>
                  <td>R{Number(booking.TotalAmount).toFixed(2)}</td>
                  <td><span className={`pickup-badge status-${booking.BookingStatus}`}>{booking.BookingStatus.replace("_", " ")}</span></td>
                  <td>
                    <select
                      className="dashboard-input compact-select"
                      value={booking.BookingStatus}
                      disabled={updating === booking.Id}
                      onChange={(e) => updateStatus(booking.Id, e.target.value)}
                    >
                      <option value="confirmed">Confirmed</option>
                      <option value="checked_in">Checked in</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </td>
                </tr>
              ))}

              {paginated.length === 0 && (
                <tr><td colSpan="7" className="table-empty">No paid resort bookings found.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="pagination">
            <button disabled={currentPage === 1} onClick={() => setPage((p) => p - 1)}>
              <FaChevronLeft /> Previous
            </button>
            <span>Page {currentPage} of {totalPages}</span>
            <button disabled={currentPage === totalPages} onClick={() => setPage((p) => p + 1)}>
              Next <FaChevronRight />
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

export default AdminResortBookings;
