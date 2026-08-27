import { useEffect, useMemo, useState } from "react";
import { FaCalendarAlt, FaMapMarkerAlt, FaQrcode, FaTicketAlt, FaSearch, FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { toast } from "sonner";

const PER_PAGE = 6;

function MyTickets() {
  const user = JSON.parse(localStorage.getItem("user"));
  const [tickets, setTickets] = useState([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!user?.id) return;
    fetch(`http://localhost:3000/tickets/user/${user.id}`)
      .then(async (res) => { const data = await res.json(); if (!res.ok) throw new Error(data.message || "Unable to load tickets"); return data; })
      .then(setTickets).catch((err) => toast.error(err.message));
  }, [user?.id]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return tickets;
    return tickets.filter((ticket) => [
      ticket.TicketNumber, ticket.Title, ticket.Location, ticket.TicketTypeName, ticket.TicketStatus,
      new Date(ticket.EventDate).toLocaleDateString(), new Date(ticket.EventDate).toLocaleString()
    ].some((value) => String(value || "").toLowerCase().includes(term)));
  }, [tickets, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);

  return (
    <div className="my-tickets-page">
      <div className="my-tickets-header"><p className="section-kicker">My account</p><h1><FaTicketAlt /> My Tickets</h1><p>Present the QR code at the event entrance. Each ticket can be checked in once.</p></div>

      {tickets.length > 0 && (
        <div className="history-filter-bar single-search-bar tickets-search-bar"><div className="history-search-field"><FaSearch /><input type="search" placeholder="Search event, ticket number, category or status..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} /></div></div>
      )}

      <div className="digital-tickets-grid">
        {tickets.length === 0 ? <div className="empty-ticket-state">You do not have any digital event tickets yet.</div> : paginated.length === 0 ? <div className="empty-ticket-state">No tickets match your search.</div> : paginated.map((ticket) => (
          <article className={`digital-ticket-card status-${String(ticket.TicketStatus).toLowerCase()}`} key={ticket.Id}>
            <div className="digital-ticket-image" style={{ backgroundImage: `url(${ticket.Image || ""})` }} />
            <div className="digital-ticket-body">
              <div className="digital-ticket-topline"><span>ALL LIQUORS TICKET</span><strong>{String(ticket.TicketStatus).replace("_", " ")}</strong></div>
              <h2>{ticket.Title}</h2>
              {ticket.TicketTypeName && <p className="digital-ticket-category"><FaTicketAlt /> {ticket.TicketTypeName}</p>}
              <p><FaMapMarkerAlt /> {ticket.Location}</p>
              <p><FaCalendarAlt /> {new Date(ticket.EventDate).toLocaleString()}</p>
              <div className="ticket-qr-wrap"><img src={`http://localhost:3000/tickets/token/${ticket.TicketToken}/qr`} alt={`QR code for ${ticket.TicketNumber}`} /><div><FaQrcode /><strong>{ticket.TicketNumber}</strong><span>Scan at entrance</span></div></div>
            </div>
          </article>
        ))}
      </div>

      {totalPages > 1 && filtered.length > 0 && (
        <div className="pagination history-pagination"><button disabled={currentPage === 1} onClick={() => setPage((p) => p - 1)}><FaChevronLeft /> Previous</button><span>Page {currentPage} of {totalPages}</span><button disabled={currentPage === totalPages} onClick={() => setPage((p) => p + 1)}>Next <FaChevronRight /></button></div>
      )}
    </div>
  );
}
export default MyTickets;
