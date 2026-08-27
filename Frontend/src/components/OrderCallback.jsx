import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { FaCheckCircle, FaTimesCircle } from "react-icons/fa";
import { useCart } from "../context/CartContext";

function OrderCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { clearCart } = useCart();
  const [status, setStatus] = useState("checking");
  const [order, setOrder] = useState(null);

  useEffect(() => {
    const reference = searchParams.get("reference") || searchParams.get("trxref");

    if (!reference) {
      setStatus("failed");
      return;
    }

    fetch(`http://localhost:3000/orders/verify/${encodeURIComponent(reference)}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Unable to verify payment");
        return data;
      })
      .then((data) => {
        if (data.status === "success") {
          setOrder(data.order);
          setStatus("success");
          if (sessionStorage.getItem("cartCheckoutReference") === reference) {
            clearCart();
            sessionStorage.removeItem("cartCheckoutReference");
          }
          toast.success("Payment confirmed. Your order is ready to be prepared.");
        } else {
          setStatus("failed");
          toast.error(data.message || "Payment was not completed");
        }
      })
      .catch((error) => {
        console.error(error);
        setStatus("failed");
        toast.error("We could not confirm your payment");
      });
  }, [searchParams, clearCart]);

  return (
    <div className="payment-result-page">
      <div className="payment-result-card">
        {status === "checking" && (
          <>
            <div className="payment-result-icon loading-icon"><FaCheckCircle /></div>
            <p className="section-kicker">Secure checkout</p>
            <h1>Confirming your payment...</h1>
            <p>Please wait while we securely verify your Paystack transaction.</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="payment-result-icon success-icon"><FaCheckCircle /></div>
            <p className="section-kicker">Payment successful</p>
            <h1>Order confirmed</h1>
            <p>Your full product payment has been received. Your order will be held for 48 hours for collection.</p>

            {order && (
              <div className="payment-order-summary">
                <div><span>Order</span><strong>{order.OrderNumber}</strong></div>
                <div><span>Total paid</span><strong>R{Number(order.TotalAmount).toFixed(2)}</strong></div>
                <div><span>Collection code</span><strong>{order.CollectionCode}</strong></div>
                <div><span>Collect by</span><strong>{order.ExpiresAt ? new Date(order.ExpiresAt).toLocaleString() : "Within 48 hours"}</strong></div>
              </div>
            )}

            <div className="payment-result-actions">
              <button className="auth-submit-btn" onClick={() => navigate("/orders")}>View My Orders</button>
              <Link to="/shop" className="auth-secondary-btn">Continue Shopping</Link>
            </div>
          </>
        )}

        {status === "failed" && (
          <>
            <div className="payment-result-icon failed-icon"><FaTimesCircle /></div>
            <p className="section-kicker">Payment not completed</p>
            <h1>Your order was not confirmed</h1>
            <p>No paid order was created from this transaction. If money was deducted, check your Paystack receipt and contact the store before attempting another payment.</p>
            <div className="payment-result-actions">
              <Link to="/shop" className="auth-submit-btn">Back to Shop</Link>
              <Link to="/orders" className="auth-secondary-btn">Order History</Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default OrderCallback;
