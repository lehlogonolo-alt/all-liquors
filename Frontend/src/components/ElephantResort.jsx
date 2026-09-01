import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  FaBaby,
  FaCalendarAlt,
  FaCheckCircle,
  FaChild,
  FaClock,
  FaLock,
  FaMapMarkerAlt,
  FaMinus,
  FaPlus,
  FaShieldAlt,
  FaTicketAlt,
  FaUserFriends
} from "react-icons/fa";

const ADULT_PRICE = 70;
const CHILD_PRICE = 50;
const PAYSTACK_EFT_RATE = 0.02;
const PAYSTACK_VAT_RATE = 0.15;

function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function VisitorCounter({ label, note, value, min = 0, onChange, icon }) {
  return (
    <div className="resort-counter-card">
      <div className="resort-counter-copy">
        <span className="resort-counter-icon">{icon}</span>
        <div>
          <strong>{label}</strong>
          <small>{note}</small>
        </div>
      </div>

      <div className="resort-counter-controls">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          aria-label={`Decrease ${label}`}
        >
          <FaMinus />
        </button>
        <span>{value}</span>
        <button
          type="button"
          onClick={() => onChange(Math.min(50, value + 1))}
          aria-label={`Increase ${label}`}
        >
          <FaPlus />
        </button>
      </div>
    </div>
  );
}

function ElephantResort() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));

  const [visitDate, setVisitDate] = useState(localDateString());
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [infants, setInfants] = useState(0);
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const totals = useMemo(() => {
    const admissionAmount = (adults * ADULT_PRICE) + (children * CHILD_PRICE);
    const effectiveRate = PAYSTACK_EFT_RATE * (1 + PAYSTACK_VAT_RATE);

    // Resort admission uses an internal 8% split. Customers only see and pay
    // the advertised admission price plus the payment-processing fee.
    const processingFeeAmount = (admissionAmount * effectiveRate) / (1 - effectiveRate);
    const totalAmount = admissionAmount + processingFeeAmount;

    return {
      admissionAmount,
      processingFeeAmount,
      totalAmount
    };
  }, [adults, children]);

  function scrollToBooking() {
    document.getElementById("resort-booking")?.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }

  async function startBookingPayment() {
    if (!user) {
      toast.error("Please log in before booking your resort visit");
      navigate("/login");
      return;
    }

    if (!visitDate) {
      toast.error("Please choose your visit date");
      return;
    }

    if (!agreed) {
      toast.error("Please accept the Terms & Conditions to continue");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("http://localhost:3000/resort/bookings/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          visitDate,
          adults,
          children,
          infants,
          termsAccepted: true
        })
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.message || "Unable to start resort payment");
        return;
      }

      toast.success("Secure resort checkout is opening...");
      window.location.href = data.authorizationUrl;
    } catch (error) {
      console.error(error);
      toast.error("Unable to connect to the payment service");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="resort-page">
      <section className="resort-hero">
        <div className="resort-hero-overlay" />
        <div className="resort-hero-content">
          <p className="resort-kicker">Elephant Resort • Family Day Experience</p>
          <h1>A day out worth remembering.</h1>
          <p>
            Plan an easy family outing, secure your admission online and arrive with
            your booking ready. Elephant Resort is open seven days a week.
          </p>

          <div className="resort-hero-actions">
            <button onClick={scrollToBooking} className="resort-primary-btn">
              <FaTicketAlt /> Book Your Visit
            </button>
            <button
              onClick={() => document.getElementById("resort-pricing")?.scrollIntoView({ behavior: "smooth" })}
              className="resort-secondary-btn"
            >
              View Admission
            </button>
          </div>

          <div className="resort-hero-points">
            <span><FaClock /> Monday – Sunday</span>
            <span><FaShieldAlt /> Secure EFT checkout</span>
            <span><FaMapMarkerAlt /> Family-friendly admission</span>
          </div>
        </div>
      </section>

      <section className="resort-intro-section">
        <div className="resort-section-heading">
          <p className="section-kicker">Plan your day</p>
          <h2>Simple admission for the whole family</h2>
          <p>
            Choose your visit date and number of guests, pay securely online and
            receive an entry code to show when you arrive.
          </p>
        </div>

        <div className="resort-benefits-grid">
          <article>
            <FaCalendarAlt />
            <h3>Pick your date</h3>
            <p>Book any day from Monday through Sunday.</p>
          </article>
          <article>
            <FaLock />
            <h3>Pay securely</h3>
            <p>Your admission and online fees are clearly shown before checkout.</p>
          </article>
          <article>
            <FaCheckCircle />
            <h3>Arrive ready</h3>
            <p>Receive a booking number and entry code after successful payment.</p>
          </article>
        </div>
      </section>

      <section id="resort-pricing" className="resort-pricing-section">
        <div className="resort-section-heading light">
          <p className="section-kicker">Admission</p>
          <h2>Affordable family pricing</h2>
          <p>Transparent pricing with children aged 0–2 visiting free.</p>
        </div>

        <div className="resort-price-grid">
          <article className="resort-price-card featured">
            <FaUserFriends />
            <span>Adults</span>
            <strong>R70</strong>
            <small>per person</small>
          </article>

          <article className="resort-price-card">
            <FaChild />
            <span>Children 3+</span>
            <strong>R50</strong>
            <small>per child</small>
          </article>

          <article className="resort-price-card">
            <FaBaby />
            <span>Children 0–2</span>
            <strong>Free</strong>
            <small>include them in your booking</small>
          </article>
        </div>
      </section>

      <section className="resort-experience-section">
        <div className="resort-experience-image">
          <img src="/images/resort.jpg" alt="Family day at Elephant Resort" />
        </div>
        <div className="resort-experience-copy">
          <p className="section-kicker">Family time, made easier</p>
          <h2>Book before you arrive</h2>
          <p>
            Skip the payment step when you get there. Your online booking keeps the
            admission amount separate from the online service and payment-processing
            fees, so the resort receives the full admission value.
          </p>
          <ul>
            <li><FaCheckCircle /> Secure Paystack EFT checkout</li>
            <li><FaCheckCircle /> Instant booking confirmation</li>
            <li><FaCheckCircle /> Entry code sent to your email</li>
            <li><FaCheckCircle /> Booking history saved to your account</li>
          </ul>
          <button onClick={scrollToBooking} className="resort-dark-btn">
            Reserve Your Day
          </button>
        </div>
      </section>

      <section id="resort-booking" className="resort-booking-section">

  <div className="resort-booking-shell">

    {/* ================= LEFT SIDE ================= */}

    <div className="resort-booking-copy">

      <p className="section-kicker">
        Secure your visit
      </p>

      <h2>
        Book Elephant Resort
      </h2>

      <p>
        Select your visit date and guests. At least one adult is required for
        each online booking.
      </p>


      {/* OPENING HOURS */}

      <div className="resort-opening-card">

        <FaClock />

        <div>
          <strong>
            Open Monday – Sunday
          </strong>

          <span>
            Choose any available date below.
          </span>
        </div>

      </div>


      {/* ELEPHANT RESORT LOGO */}

      <div className="resort-logo-card">

        <img
          src="/images/elephant-resort.jpeg"
          alt="Elephant Resort"
          className="resort-booking-logo"
        />

      </div>

    </div>


    {/* ================= RIGHT SIDE ================= */}

    <div className="resort-booking-form">

      {/* VISIT DATE */}

      <div className="resort-date-field">

        <label htmlFor="resortVisitDate">
          Visit date
        </label>

        <div>

          <FaCalendarAlt />

          <input
            id="resortVisitDate"
            type="date"
            min={localDateString()}
            value={visitDate}
            onChange={(e) =>
              setVisitDate(e.target.value)
            }
          />

        </div>

      </div>


      {/* VISITOR COUNTERS */}

      <div className="resort-counters">

        <VisitorCounter
          label="Adults"
          note="R70 per person"
          value={adults}
          min={1}
          onChange={setAdults}
          icon={<FaUserFriends />}
        />

        <VisitorCounter
          label="Children 3+"
          note="R50 per child"
          value={children}
          onChange={setChildren}
          icon={<FaChild />}
        />

        <VisitorCounter
          label="Children 0–2"
          note="Free admission"
          value={infants}
          onChange={setInfants}
          icon={<FaBaby />}
        />

      </div>


      {/* PAYMENT SUMMARY */}

      <div className="resort-payment-summary">

        <div>
          <span>
            Admission
          </span>

          <strong>
            R{totals.admissionAmount.toFixed(2)}
          </strong>
        </div>


        <div>
          <span>
            Payment processing fee
          </span>

          <strong>
            R{totals.processingFeeAmount.toFixed(2)}
          </strong>
        </div>


        <div className="resort-total-row">

          <span>
            Total to pay
          </span>

          <strong>
            R{totals.totalAmount.toFixed(2)}
          </strong>

        </div>

      </div>


      {/* BUSINESS PROTECTION NOTE */}

      <div className="resort-business-note">

        <FaShieldAlt />

        <p>
          Note you will receive a booking confirmation and entry code after successful payment. The resort will not be able to admit you without this code.
        </p>

      </div>


      {/* TERMS */}

      <label className="resort-terms-row">

        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) =>
            setAgreed(e.target.checked)
          }
          disabled={submitting}
        />

        <span>
          I agree to the Terms &amp; Conditions and confirm the selected visit
          date and visitor numbers for this booking.
        </span>

      </label>


      {/* PAY BUTTON */}

      <button
        className="resort-pay-btn"
        disabled={!agreed || submitting}
        onClick={startBookingPayment}
      >

        <FaLock />

        {submitting
          ? "Opening secure checkout..."
          : `Pay & Book R${totals.totalAmount.toFixed(2)}`
        }

      </button>


      <p className="resort-secure-note">
        Final prices are recalculated securely and processed securely through Paystack checkout.
      </p>

    </div>

  </div>

</section>
    </main>
  );
}

export default ElephantResort;
