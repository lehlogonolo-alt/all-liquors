import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { FaCalendarCheck, FaCheckCircle, FaTimesCircle } from "react-icons/fa";

function ResortCallback() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState("checking");
  const [booking, setBooking] = useState(null);

  useEffect(() => {
    const reference = searchParams.get("reference") || searchParams.get("trxref");

    if (!reference) {
      setStatus("failed");
      return;
    }

    fetch(`http://localhost:3000/resort/bookings/verify/${encodeURIComponent(reference)}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Unable to verify booking payment");
        return data;
      })
      .then((data) => {
        if (data.status === "success") {
          setBooking(data.booking);
          setStatus("success");
          toast.success("Elephant Resort booking confirmed");
        } else {
          setStatus("failed");
          toast.error(data.message || "Payment was not completed");
        }
      })
      .catch((error) => {
        console.error(error);
        setStatus("failed");
        toast.error("We could not confirm your resort payment");
      });
  }, [searchParams]);

  return (
    <div className="payment-result-page resort-result-page">
      <div className="payment-result-card resort-result-card">
        {status === "checking" && (
          <>
            <div className="payment-result-icon loading-icon"><FaCalendarCheck /></div>
            <p className="section-kicker">Elephant Resort</p>
            <h1>Confirming your booking...</h1>
            <p>Please wait while we securely verify your Paystack transaction.</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="payment-result-icon success-icon"><FaCheckCircle /></div>
            <p className="section-kicker">Payment successful</p>
            <h1>Your resort visit is confirmed</h1>
            <p>Your entry code has also been sent to your email.</p>

            {booking && (
              <div className="payment-order-summary resort-confirmation-summary">
                <div><span>Booking</span><strong>{booking.BookingNumber}</strong></div>
                <div><span>Visit date</span><strong>{new Date(booking.VisitDate).toLocaleDateString()}</strong></div>
                <div><span>Entry code</span><strong>{booking.EntryCode}</strong></div>
                <div><span>Total paid</span><strong>R{Number(booking.TotalAmount).toFixed(2)}</strong></div>
                <div><span>Adults</span><strong>{booking.Adults}</strong></div>
                <div><span>Children</span><strong>{booking.Children} + {booking.Infants} infant(s)</strong></div>
              </div>
            )}

            <div className="payment-result-actions">
              <Link to="/resort/bookings" className="auth-submit-btn">View My Resort Bookings</Link>
              <Link to="/elephant-resort" className="auth-secondary-btn">Back to Resort</Link>
            </div>
          </>
        )}

        {status === "failed" && (
          <>
            <div className="payment-result-icon failed-icon"><FaTimesCircle /></div>
            <p className="section-kicker">Payment not completed</p>
            <h1>Your resort booking was not confirmed</h1>
            <p>
              If money was deducted, keep your Paystack receipt and contact the business
              before attempting another payment.
            </p>
            <div className="payment-result-actions">
              <Link to="/elephant-resort" className="auth-submit-btn">Try Again</Link>
              <Link to="/resort/bookings" className="auth-secondary-btn">My Resort Bookings</Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default ResortCallback;
