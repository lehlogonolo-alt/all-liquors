import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { FaCalendarAlt, FaTicketAlt, FaUsers, FaSearch, FaChevronLeft, FaChevronRight } from "react-icons/fa";

const PER_PAGE = 6;
const STATUS_LABELS = { pending: "Payment pending", confirmed: "Confirmed", checked_in: "Checked in", cancelled: "Cancelled" };

function ResortBookings() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!user?.id) { navigate("/login"); return; }
    fetch(`http://localhost:3000/resort/bookings/user/${user.id}`)
      .then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.message || "Unable to load resort bookings"); return data; })
      .then(setBookings)
      .catch((error) => { console.error(error); toast.error("Unable to load your resort bookings"); })
      .finally(() => setLoading(false));
  }, [navigate, user?.id]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return bookings;
    return bookings.filter((booking) => [
      booking.BookingNumber,
      booking.EntryCode,
      booking.BookingStatus,
      booking.PaymentStatus,
      new Date(booking.VisitDate).toLocaleDateString(),
      new Date(booking.VisitDate).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })
    ].some((value) => String(value || "").toLowerCase().includes(term)));
  }, [bookings, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);

  if (loading) return <section className="resort-history-page"><div className="orders-loading">Loading your resort bookings...</div></section>;

  return (
    <section className="resort-history-page">
      <div className="orders-header">
        <div><p className="section-kicker">My account</p><h1>Elephant Resort Bookings</h1><p>Keep your booking number, entry code and visit details in one place.</p></div>
        <Link to="/elephant-resort" className="orders-shop-link"><FaTicketAlt /> Book another visit</Link>
      </div>

      {bookings.length > 0 && (
        <div className="history-filter-bar single-search-bar">
          <div className="history-search-field">
            <FaSearch />
            <input type="search" placeholder="Search booking, entry code, date or status..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
        </div>
      )}

      {bookings.length === 0 ? (
        <div className="orders-empty"><FaCalendarAlt /><h2>No resort bookings yet</h2><p>Your paid Elephant Resort visits will appear here.</p><Link to="/elephant-resort">Plan a visit</Link></div>
      ) : paginated.length === 0 ? (
        <div className="orders-empty compact-empty"><FaSearch /><h2>No matching bookings</h2><p>Try another search.</p></div>
      ) : (
        <>
          <div className="resort-history-list">
            {paginated.map((booking) => (
              <article className="resort-history-card" key={booking.Id}>
                <div className="resort-history-top">
                  <div><span className="order-number">{booking.BookingNumber}</span><h3>{new Date(booking.VisitDate).toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</h3></div>
                  <span className={`resort-booking-status status-${booking.BookingStatus}`}>
                    {booking.PaymentStatus === "paid" ? STATUS_LABELS[booking.BookingStatus] || booking.BookingStatus : booking.PaymentStatus === "failed" ? "Payment failed" : "Payment pending"}
                  </span>
                </div>
                <div className="resort-history-grid">
                  <div><span>Total paid</span><strong>R{Number(booking.TotalAmount).toFixed(2)}</strong></div>
                  <div><span>Guests</span><strong><FaUsers /> {booking.Adults + booking.Children + booking.Infants}</strong></div>
                  <div><span>Adults / Children / Infants</span><strong>{booking.Adults} / {booking.Children} / {booking.Infants}</strong></div>
                  <div><span>Payment</span><strong>{booking.PaymentStatus}</strong></div>
                </div>
                {booking.PaymentStatus === "paid" && booking.BookingStatus !== "cancelled" && (
                  <div className="resort-entry-code-box"><span>Entry code</span><strong>{booking.EntryCode}</strong><p>Show this code when you arrive at Elephant Resort.</p></div>
                )}
              </article>
            ))}
          </div>
          {totalPages > 1 && (
            <div className="pagination history-pagination">
              <button disabled={currentPage === 1} onClick={() => setPage((p) => p - 1)}><FaChevronLeft /> Previous</button>
              <span>Page {currentPage} of {totalPages}</span>
              <button disabled={currentPage === totalPages} onClick={() => setPage((p) => p + 1)}>Next <FaChevronRight /></button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
export default ResortBookings;
