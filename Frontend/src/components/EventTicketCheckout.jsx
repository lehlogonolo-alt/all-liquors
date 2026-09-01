import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  FaArrowLeft, FaCalendarAlt, FaInfoCircle, FaLock, FaMapMarkerAlt,
  FaMinus, FaPlus, FaShieldAlt, FaTicketAlt
} from "react-icons/fa";
import { toast } from "sonner";

const EFFECTIVE_EFT_RATE = 0.02 * 1.15;

function EventTicketCheckout() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));
  const [event, setEvent] = useState(null);
  const [quantities, setQuantities] = useState({});
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`http://localhost:3000/events/${id}/ticket-availability`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Unable to load tickets");
        return data;
      })
      .then(setEvent)
      .catch((err) => toast.error(err.message));
  }, [id]);

  const selectedItems = useMemo(() => {
    if (!event?.ticketTypes) return [];
    return event.ticketTypes
      .map((type) => ({ ...type, quantity: Number(quantities[type.Id] || 0) }))
      .filter((type) => type.quantity > 0);
  }, [event, quantities]);

  const totals = useMemo(() => {
    const admissionAmount = Number(
      selectedItems
        .reduce((sum, item) => sum + Number(item.Price) * item.quantity, 0)
        .toFixed(2)
    );

    // The 5% developer commission is deducted internally from the ticket price.
    // It is intentionally not added to the customer's checkout total.
    const processingFeeAmount = admissionAmount > 0
      ? Number(
          ((admissionAmount * EFFECTIVE_EFT_RATE) / (1 - EFFECTIVE_EFT_RATE)).toFixed(2)
        )
      : 0;

    const totalAmount = Number(
      (admissionAmount + processingFeeAmount).toFixed(2)
    );

    return { admissionAmount, processingFeeAmount, totalAmount };
  }, [selectedItems]);

  function updateQuantity(type, delta) {
    const current = Number(quantities[type.Id] || 0);
    const max = Math.min(10, Number(type.Available || 0));
    const next = Math.max(0, Math.min(max, current + delta));
    setQuantities((prev) => ({ ...prev, [type.Id]: next }));
  }

  async function startPayment() {
    if (!user) {
      toast.error("Please log in before buying tickets.");
      navigate("/login");
      return;
    }
    if (selectedItems.length === 0) {
      toast.error("Choose at least one ticket.");
      return;
    }
    if (!agreed) {
      toast.error("Please agree to the ticket Terms & Conditions.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("http://localhost:3000/tickets/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          eventId: Number(id),
          items: selectedItems.map((item) => ({ ticketTypeId: item.Id, quantity: item.quantity })),
          termsAccepted: true
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Unable to start checkout");
      window.location.href = data.authorizationUrl;
    } catch (err) {
      toast.error(err.message);
      setSubmitting(false);
    }
  }

  if (!event) {
    return <div className="event-ticket-page"><div className="event-ticket-loading">Loading ticket categories...</div></div>;
  }

  return (
    <main className="event-ticket-page">
      <button className="event-ticket-back" onClick={() => navigate("/events")}><FaArrowLeft /> Back to Events</button>

      <section className="event-ticket-top-card">
        <img src={event.Image} alt={event.Title} />
        <div className="event-ticket-event-copy">
          <p className="section-kicker">Choose your tickets</p>
          <h1>{event.Title}</h1>
          <p className="event-ticket-meta"><FaCalendarAlt /> {new Date(event.EventDate).toLocaleString([], { dateStyle: "full", timeStyle: "short" })}</p>
          <p className="event-ticket-meta"><FaMapMarkerAlt /> {event.Location}</p>
          <p className="event-ticket-event-description">{event.Description}</p>
        </div>
      </section>

      <div className="event-ticket-layout">
        <section className="ticket-category-panel">
          <div className="ticket-category-heading">
            <div>
              <p className="section-kicker">Admission</p>
              <h2>Select Your Tickets</h2>
            </div>
            <p><FaInfoCircle /> Availability is controlled per category.</p>
          </div>

          <div className="ticket-category-list">
            {event.ticketTypes.length === 0 ? (
              <div className="ticket-category-empty">Ticket categories have not been added for this event yet.</div>
            ) : event.ticketTypes.map((type) => {
              const soldOut = Number(type.Available || 0) <= 0;
              const qty = Number(quantities[type.Id] || 0);
              const lowStock = !soldOut && Number(type.Available) <= 10;
              return (
                <article className={`ticket-category-row ${soldOut ? "is-sold-out" : ""}`} key={type.Id}>
                  <div className="ticket-category-icon"><FaTicketAlt /></div>
                  <div className="ticket-category-info">
                    <div className="ticket-category-title-line">
                      <h3>{type.Name}</h3>
                      {soldOut ? <span className="ticket-status sold">Sold Out</span> : lowStock ? <span className="ticket-status low">{type.Available} left</span> : <span className="ticket-status available">Available</span>}
                    </div>
                    <p>{type.Description || "Event admission ticket"}</p>
                  </div>
                  <strong className="ticket-category-price">R{Number(type.Price).toFixed(2)}</strong>
                  <div className="ticket-category-counter">
                    <button onClick={() => updateQuantity(type, -1)} disabled={qty <= 0 || soldOut}><FaMinus /></button>
                    <strong>{qty}</strong>
                    <button onClick={() => updateQuantity(type, 1)} disabled={soldOut || qty >= Math.min(10, Number(type.Available || 0))}><FaPlus /></button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <aside className="ticket-order-card">
          <h2><FaTicketAlt /> Your Order</h2>
          <div className="ticket-order-items">
            {selectedItems.length === 0 ? (
              <p className="ticket-order-empty">Your selected tickets will appear here.</p>
            ) : selectedItems.map((item) => (
              <div className="ticket-order-item" key={item.Id}>
                <div><strong>{item.Name}</strong><span>R{Number(item.Price).toFixed(2)} × {item.quantity}</span></div>
                <strong>R{(Number(item.Price) * item.quantity).toFixed(2)}</strong>
              </div>
            ))}
          </div>

          <div className="ticket-payment-summary compact">
            <div><span>Subtotal</span><strong>R{totals.admissionAmount.toFixed(2)}</strong></div>
            <div><span>Payment processing fee</span><strong>R{totals.processingFeeAmount.toFixed(2)}</strong></div>
            <div className="ticket-total"><span>Total</span><strong>R{totals.totalAmount.toFixed(2)}</strong></div>
          </div>

          <div className="ticket-customer-fee-note"><FaShieldAlt /><span>Note you will receive a digital ticket after successful payment. The event will not be able to admit you without this ticket.</span></div>

          <label className="ticket-terms-row">
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} disabled={submitting} />
            <span>I agree to the Terms &amp; Conditions. Each digital ticket is valid for one entry.</span>
          </label>

          <button className="ticket-pay-button" onClick={startPayment} disabled={!agreed || submitting || selectedItems.length === 0}>
            <FaLock /> {submitting ? "Opening secure checkout..." : `Proceed to Checkout R${totals.totalAmount.toFixed(2)}`}
          </button>
          <p className="ticket-secure-copy">Tickets are held for 15 minutes while you complete secure Paystack checkout.</p>
        </aside>
      </div>
    </main>
  );
}

export default EventTicketCheckout;
