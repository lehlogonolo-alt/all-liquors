import { useEffect, useMemo, useState } from "react";
import {
  FaChartBar,
  FaClock,
  FaTicketAlt,
  FaSearch,
  FaChevronLeft,
  FaChevronRight,
  FaCheckCircle
} from "react-icons/fa";
import { toast } from "sonner";

const EVENT_PER_PAGE = 6;
const ORDER_PER_PAGE = 10;
const TICKET_PER_PAGE = 10;

function Pagination({ page, totalPages, setPage }) {
  if (totalPages <= 1) return null;
  return (
    <div className="pagination history-pagination">
      <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}><FaChevronLeft /> Previous</button>
      <span>Page {page} of {totalPages}</span>
      <button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>Next <FaChevronRight /></button>
    </div>
  );
}

function AdminTickets() {
  const user = JSON.parse(localStorage.getItem("user"));
  const [data, setData] = useState({ events: [], orders: [], tickets: [] });
  const [search, setSearch] = useState("");
  const [eventPage, setEventPage] = useState(1);
  const [orderPage, setOrderPage] = useState(1);
  const [ticketPage, setTicketPage] = useState(1);
  const [checkingIn, setCheckingIn] = useState(null);

  function load() {
    fetch("http://localhost:3000/admin/ticket-sales")
      .then(async (res) => { const body = await res.json(); if (!res.ok) throw new Error(body.message || "Unable to load ticket sales"); return body; })
      .then(setData).catch((err) => toast.error(err.message));
  }
  useEffect(load, []);

  function updateSearch(value) {
    setSearch(value); setEventPage(1); setOrderPage(1); setTicketPage(1);
  }

  const term = search.trim().toLowerCase();
  const filteredEvents = useMemo(() => data.events.filter((event) => !term || [event.Title, new Date(event.EventDate).toLocaleString(), ...(event.ticketTypes || []).map((t) => t.Name)].some((v) => String(v || "").toLowerCase().includes(term))), [data.events, term]);
  const filteredOrders = useMemo(() => data.orders.filter((order) => !term || [order.TicketOrderNumber, order.Email, order.Title, order.PaymentStatus, order.HoldStatus].some((v) => String(v || "").toLowerCase().includes(term))), [data.orders, term]);
  const filteredTickets = useMemo(() => data.tickets.filter((ticket) => !term || [ticket.TicketNumber, ticket.Email, ticket.Title, ticket.TicketTypeName, ticket.TicketStatus].some((v) => String(v || "").toLowerCase().includes(term))), [data.tickets, term]);

  const eventPages = Math.max(1, Math.ceil(filteredEvents.length / EVENT_PER_PAGE));
  const orderPages = Math.max(1, Math.ceil(filteredOrders.length / ORDER_PER_PAGE));
  const ticketPages = Math.max(1, Math.ceil(filteredTickets.length / TICKET_PER_PAGE));
  const safeEventPage = Math.min(eventPage, eventPages);
  const safeOrderPage = Math.min(orderPage, orderPages);
  const safeTicketPage = Math.min(ticketPage, ticketPages);
  const visibleEvents = filteredEvents.slice((safeEventPage - 1) * EVENT_PER_PAGE, safeEventPage * EVENT_PER_PAGE);
  const visibleOrders = filteredOrders.slice((safeOrderPage - 1) * ORDER_PER_PAGE, safeOrderPage * ORDER_PER_PAGE);
  const visibleTickets = filteredTickets.slice((safeTicketPage - 1) * TICKET_PER_PAGE, safeTicketPage * TICKET_PER_PAGE);

  async function manualCheckIn(ticket) {
    if (!window.confirm(`Check in ${ticket.TicketNumber} manually?`)) return;
    setCheckingIn(ticket.Id);
    try {
      const response = await fetch(`http://localhost:3000/tickets/token/${ticket.TicketToken}/check-in`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminUserId: user?.id })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Unable to check in ticket");
      toast.success("Customer checked in successfully");
      load();
    } catch (error) {
      toast.error(error.message || "Unable to check in ticket");
    } finally {
      setCheckingIn(null);
    }
  }

  return (
    <div className="admin-tickets-page">
      <div className="admin-ticket-header">
        <p className="section-kicker">Direct ticketing</p>
        <h1><FaChartBar /> Manage Ticket Sales</h1>
        <p>Monitor active events, search ticket activity and manually check customers in when QR scanning is unavailable.</p>
      </div>

      <div className="ticket-admin-searchbar">
        <FaSearch />
        <input type="search" placeholder="Search event, customer, order, category or ticket number..." value={search} onChange={(e) => updateSearch(e.target.value)} />
      </div>

      <section className="ticket-admin-section">
        <div className="ticket-admin-section-heading"><div><p className="section-kicker">Live monitoring</p><h2>Active Event Sales</h2></div><span>{filteredEvents.length} event{filteredEvents.length === 1 ? "" : "s"}</span></div>
        <div className="ticket-sales-event-grid">
          {visibleEvents.length === 0 ? <div className="empty-ticket-state">No active events match your search.</div> : visibleEvents.map((event) => (
            <div className="ticket-sales-event-card" key={event.Id}>
              <h3>{event.Title}</h3><p>{new Date(event.EventDate).toLocaleString()}</p>
              <div className="ticket-sales-stats">{(event.ticketTypes || []).map((type) => (
                <div className="admin-category-stat" key={type.Id}><span><b>{type.Name}</b><small>R{Number(type.Price).toFixed(2)}</small></span><strong>{type.WebsiteTicketsSold}/{type.WebsiteTicketLimit}</strong><em>{type.Available <= 0 ? "Sold Out" : `${type.Available} left`}</em></div>
              ))}</div>
            </div>
          ))}
        </div>
        <Pagination page={safeEventPage} totalPages={eventPages} setPage={setEventPage} />
      </section>

      <section className="admin-ticket-orders-card ticket-admin-section">
        <div className="ticket-admin-section-heading"><div><h2><FaTicketAlt /> Ticket Orders</h2><p>Payment and ticket-order activity for active events.</p></div><span>{filteredOrders.length} order{filteredOrders.length === 1 ? "" : "s"}</span></div>
        <div className="hours-table-wrapper"><table className="hours-table"><thead><tr><th>Order</th><th>Customer</th><th>Event</th><th>Qty</th><th>Total</th><th>Payment</th><th>Hold</th></tr></thead><tbody>
          {visibleOrders.length === 0 ? <tr><td colSpan="7" className="no-records">No ticket orders match your search.</td></tr> : visibleOrders.map((order) => <tr key={order.Id}><td>{order.TicketOrderNumber}</td><td>{order.Email}</td><td>{order.Title}</td><td>{order.Quantity}</td><td>R{Number(order.TotalAmount).toFixed(2)}</td><td>{order.PaymentStatus}</td><td><FaClock /> {order.HoldStatus}</td></tr>)}
        </tbody></table></div>
        <Pagination page={safeOrderPage} totalPages={orderPages} setPage={setOrderPage} />
      </section>

      <section className="admin-ticket-orders-card ticket-admin-section manual-ticket-checkin-card">
        <div className="ticket-admin-section-heading"><div><h2><FaCheckCircle /> Manual Gate Check-in</h2><p>Search for a customer or ticket number and check them in manually if the QR scanner cannot be used.</p></div><span>{filteredTickets.length} ticket{filteredTickets.length === 1 ? "" : "s"}</span></div>
        <div className="hours-table-wrapper"><table className="hours-table"><thead><tr><th>Ticket</th><th>Customer</th><th>Event</th><th>Category</th><th>Status</th><th>Checked In</th><th>Action</th></tr></thead><tbody>
          {visibleTickets.length === 0 ? <tr><td colSpan="7" className="no-records">No tickets match your search.</td></tr> : visibleTickets.map((ticket) => (
            <tr key={ticket.Id}><td><strong>{ticket.TicketNumber}</strong></td><td>{ticket.Email}</td><td>{ticket.Title}</td><td>{ticket.TicketTypeName || "General"}</td><td><span className={`pickup-badge status-${ticket.TicketStatus}`}>{String(ticket.TicketStatus).replace("_", " ")}</span></td><td>{ticket.CheckedInAt ? new Date(ticket.CheckedInAt).toLocaleString() : "—"}</td><td>{ticket.TicketStatus === "valid" ? <button className="manual-checkin-btn" disabled={checkingIn === ticket.Id} onClick={() => manualCheckIn(ticket)}><FaCheckCircle /> {checkingIn === ticket.Id ? "Checking in..." : "Check In"}</button> : <span className="ticket-action-complete">Completed</span>}</td></tr>
          ))}
        </tbody></table></div>
        <Pagination page={safeTicketPage} totalPages={ticketPages} setPage={setTicketPage} />
      </section>
    </div>
  );
}
export default AdminTickets;
