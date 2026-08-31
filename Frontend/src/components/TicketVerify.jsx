import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import {
  FaCheckCircle,
  FaExclamationTriangle
} from "react-icons/fa";
import { toast } from "sonner";

const API_BASE = (
  import.meta.env.VITE_API_URL || "http://localhost:3000"
).replace(/\/$/, "");

function TicketVerify() {
  const { token } = useParams();

  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);

  const user = JSON.parse(localStorage.getItem("user"));

  const autoCheckInStarted = useRef(false);

  async function loadTicket() {
    try {
      setLoading(true);

      const response = await fetch(
        `${API_BASE}/tickets/token/${token}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Ticket not found");
      }

      setTicket(data);
      return data;

    } catch (err) {
      toast.error(err.message);
      setTicket(null);
      return null;

    } finally {
      setLoading(false);
    }
  }

  async function checkInTicket() {
    if (checkingIn) return;

    try {
      setCheckingIn(true);

      const response = await fetch(
        `${API_BASE}/tickets/token/${token}/check-in`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            adminUserId: user?.id
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to check in ticket"
        );
      }

      toast.success("Ticket checked in successfully");

      await loadTicket();

    } catch (err) {
      toast.error(err.message);
      await loadTicket();

    } finally {
      setCheckingIn(false);
    }
  }

  useEffect(() => {
    async function verifyAndAutoCheckIn() {
      const loadedTicket = await loadTicket();

      if (
        user?.isAdmin &&
        loadedTicket?.TicketStatus === "valid" &&
        !autoCheckInStarted.current
      ) {
        autoCheckInStarted.current = true;
        await checkInTicket();
      }
    }

    verifyAndAutoCheckIn();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (loading) {
    return (
      <div className="ticket-verify-page">
        <div className="ticket-verify-card">
          Verifying ticket...
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="ticket-verify-page">
        <div className="ticket-verify-card used">
          <FaExclamationTriangle className="ticket-verify-icon" />
          <h2>Ticket not found</h2>
        </div>
      </div>
    );
  }

  const valid = ticket.TicketStatus === "valid";
  const used = ticket.TicketStatus === "used";

  return (
    <div className="ticket-verify-page">
      <div
        className={`ticket-verify-card ${
          valid ? "valid" : "used"
        }`}
      >
        {valid ? (
          <FaCheckCircle className="ticket-verify-icon" />
        ) : (
          <FaExclamationTriangle className="ticket-verify-icon" />
        )}

        <p className="section-kicker">
          Gate verification
        </p>

        <h1>
          {checkingIn
            ? "Checking In..."
            : used
            ? "Ticket Already Used"
            : "Valid Ticket"}
        </h1>

        <h2>{ticket.Title}</h2>

        <div className="ticket-verify-details">

          <div>
            <span>Ticket</span>
            <strong>{ticket.TicketNumber}</strong>
          </div>

          <div>
            <span>Date</span>
            <strong>
              {new Date(
                ticket.EventDate
              ).toLocaleString()}
            </strong>
          </div>

          <div>
            <span>Status</span>
            <strong>{ticket.TicketStatus}</strong>
          </div>

          {ticket.CheckedInAt && (
            <div>
              <span>Checked in</span>
              <strong>
                {new Date(
                  ticket.CheckedInAt
                ).toLocaleString()}
              </strong>
            </div>
          )}

        </div>

        {!user?.isAdmin && valid && (
          <p className="ticket-gate-note">
            Ticket is valid. Gate staff must scan this QR
            while signed in with an admin account to check
            the ticket in.
          </p>
        )}

        {user?.isAdmin && valid && checkingIn && (
          <p className="ticket-gate-note">
            Checking ticket in...
          </p>
        )}

        {used && (
          <p className="ticket-gate-note">
            This ticket has already been checked in and
            cannot be used again.
          </p>
        )}
      </div>
    </div>
  );
}

export default TicketVerify;