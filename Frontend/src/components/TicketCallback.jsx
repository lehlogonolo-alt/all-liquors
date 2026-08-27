import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { FaCheckCircle, FaTicketAlt } from "react-icons/fa";

function TicketCallback() {
  const [params] = useSearchParams();
  const [state, setState] = useState({ loading: true, error: "", tickets: [], order: null });
  const reference = params.get("reference") || params.get("trxref");

  useEffect(() => {
    if (!reference) {
      setState({ loading: false, error: "Payment reference is missing.", tickets: [], order: null });
      return;
    }
    fetch(`http://localhost:3000/tickets/verify-payment/${encodeURIComponent(reference)}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Payment verification failed");
        return data;
      })
      .then((data) => setState({ loading: false, error: "", tickets: data.tickets || [], order: data.order }))
      .catch((err) => setState({ loading: false, error: err.message, tickets: [], order: null }));
  }, [reference]);

  return (
    <div className="ticket-callback-page">
      <div className="ticket-callback-card">
        {state.loading ? <h2>Confirming your ticket payment...</h2> : state.error ? (
          <><h2>We could not confirm the payment</h2><p>{state.error}</p><Link to="/events">Back to Events</Link></>
        ) : (
          <>
            <FaCheckCircle className="ticket-success-icon" />
            <p className="section-kicker">Payment successful</p>
            <h1>Your digital tickets are ready</h1>
            <p>{state.order?.Title}</p>
            <div className="ticket-callback-summary"><FaTicketAlt /> {state.tickets.length} ticket{state.tickets.length === 1 ? "" : "s"} issued</div>
            <p>A confirmation email has also been sent with your QR ticket{state.tickets.length === 1 ? "" : "s"}.</p>
            <Link className="ticket-primary-link" to="/tickets">View My Tickets</Link>
          </>
        )}
      </div>
    </div>
  );
}

export default TicketCallback;
