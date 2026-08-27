import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { FaCheckCircle, FaExclamationTriangle, FaTicketAlt } from "react-icons/fa";
import { toast } from "sonner";

function TicketVerify() {
  const { token } = useParams();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const user = JSON.parse(localStorage.getItem("user"));

  function loadTicket() {
    setLoading(true);
    fetch(`http://localhost:3000/tickets/token/${token}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Ticket not found");
        return data;
      })
      .then(setTicket)
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(loadTicket, [token]);

  async function checkIn() {
    const response = await fetch(`http://localhost:3000/tickets/token/${token}/check-in`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adminUserId: user?.id })
    });
    const data = await response.json();
    if (!response.ok) {
      toast.error(data.message || "Unable to check in ticket");
      loadTicket();
      return;
    }
    toast.success("Ticket checked in successfully");
    loadTicket();
  }

  if (loading) return <div className="ticket-verify-page"><div className="ticket-verify-card">Verifying ticket...</div></div>;
  if (!ticket) return <div className="ticket-verify-page"><div className="ticket-verify-card"><FaExclamationTriangle /><h2>Ticket not found</h2></div></div>;

  const valid = ticket.TicketStatus === "valid";
  return (
    <div className="ticket-verify-page">
      <div className={`ticket-verify-card ${valid ? "valid" : "used"}`}>
        {valid ? <FaCheckCircle className="ticket-verify-icon" /> : <FaExclamationTriangle className="ticket-verify-icon" />}
        <p className="section-kicker">Gate verification</p>
        <h1>{valid ? "Valid Ticket" : "Ticket Already Used"}</h1>
        <h2>{ticket.Title}</h2>
        <div className="ticket-verify-details">
          <div><span>Ticket</span><strong>{ticket.TicketNumber}</strong></div>
          <div><span>Date</span><strong>{new Date(ticket.EventDate).toLocaleString()}</strong></div>
          <div><span>Status</span><strong>{ticket.TicketStatus}</strong></div>
          {ticket.CheckedInAt && <div><span>Checked in</span><strong>{new Date(ticket.CheckedInAt).toLocaleString()}</strong></div>}
        </div>
        {user?.isAdmin && valid && <button className="ticket-checkin-btn" onClick={checkIn}><FaTicketAlt /> Check In Ticket</button>}
        {!user?.isAdmin && <p className="ticket-gate-note">Gate staff should sign in with an admin account to check this ticket in.</p>}
      </div>
    </div>
  );
}

export default TicketVerify;
