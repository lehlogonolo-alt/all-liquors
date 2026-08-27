import { Link } from "react-router-dom";
import { FaUndoAlt, FaCheckCircle, FaClock, FaEnvelope } from "react-icons/fa";

function RefundPolicy() {
  return (
    <div className="info-page policy-page">
      <section className="info-page-hero">
        <div className="info-page-hero-content">
          <span className="info-page-label">Customer care</span>
          <h1>Refund Policy</h1>
          <p>When refunds may be requested, how to request one, and what happens next.</p>
        </div>
      </section>

      <section className="info-page-content legal-content policy-content">
        <p className="legal-updated">Last updated: August 2026</p>

        <div className="policy-summary-grid">
          <div className="policy-summary-card"><FaCheckCircle /><strong>Eligible issues</strong><span>Defective, damaged, incorrect or unfulfilled orders</span></div>
          <div className="policy-summary-card"><FaEnvelope /><strong>Contact us</strong><span>Provide your order details and reason</span></div>
          <div className="policy-summary-card"><FaClock /><strong>5–10 business days</strong><span>Typical approved-refund processing window</span></div>
        </div>

        <h2>1. When a refund may be accepted</h2>
        <p>Refunds may be considered where an item is defective or damaged, the incorrect item was supplied, an item becomes unavailable after payment, All Liquors is unable to fulfil the order, or where a refund is otherwise required by applicable South African consumer law.</p>

        <h2>2. Change-of-mind requests</h2>
        <p>For health, safety and product-integrity reasons, alcohol or other consumable products that have been opened, consumed, tampered with or are no longer in their original saleable condition are generally not eligible for a change-of-mind refund. This does not limit any rights a customer may have under applicable law.</p>

        <h2>3. How to request a refund</h2>
        <div className="policy-callout">
          <FaUndoAlt />
          <div>
            <strong>Contact All Liquors as soon as possible.</strong>
            <p>Provide your order number, the item concerned, the reason for the request and photographs or other supporting information where relevant.</p>
          </div>
        </div>
        <p>You can request assistance using the details on our <Link to="/contact">Contact page</Link>. We may request additional information so that the order and payment can be verified.</p>

        <h2>4. Assessment and approval</h2>
        <p>Each request is assessed based on the order type and circumstances. Approved refunds are returned through the appropriate/original payment method where possible.</p>

        <h2>5. Refund timeline</h2>
        <p>Once a refund is approved, All Liquors aims to initiate or process it within <strong>5–10 business days</strong>. The time for funds to appear in the customer's account may vary depending on the bank, card issuer or payment provider.</p>

        <h2>6. Event tickets and resort bookings</h2>
        <p>Event-ticket and resort-booking refunds may be subject to the specific event or booking circumstances, including cancellation, postponement, availability and services already provided. Contact All Liquors promptly for assistance.</p>

        <h2>7. Statutory rights</h2>
        <p>Nothing in this policy is intended to exclude or reduce any non-waivable consumer rights available under applicable South African law.</p>
      </section>
    </div>
  );
}

export default RefundPolicy;