import { Link } from "react-router-dom";
import { FaBoxOpen, FaStore, FaTruck, FaMoneyBillWave, FaIdCard } from "react-icons/fa";

function ShippingPolicy() {
  return (
    <div className="info-page policy-page">
      <section className="info-page-hero">
        <div className="info-page-hero-content">
          <span className="info-page-label">Orders & fulfilment</span>
          <h1>Shipping & Collection Policy</h1>
          <p>How online product orders are prepared and collected from All Liquors.</p>
        </div>
      </section>

      <section className="info-page-content legal-content policy-content">
        <p className="legal-updated">Last updated: August 2026</p>

        <div className="policy-summary-grid">
          <div className="policy-summary-card"><FaStore /><strong>Pay & Collect</strong><span>Current fulfilment option</span></div>
          <div className="policy-summary-card"><FaTruck /><strong>No courier delivery</strong><span>Home delivery is not currently offered</span></div>
          <div className="policy-summary-card"><FaMoneyBillWave /><strong>No collection fee</strong><span>No shipping fee applies to Pay & Collect</span></div>
        </div>

        <h2>1. Available fulfilment option</h2>
        <p>All Liquors currently fulfils online product orders through <strong>Pay & Collect</strong>. Courier and home-delivery services are not currently offered. Because products are not shipped, a delivery-time estimate does not apply to current online product orders.</p>

        <h2>2. When your order is ready</h2>
        <p>After successful payment, the website confirms your order and issues a collection code. Please wait until your payment and order are confirmed before travelling to collect. If there is an unexpected stock or preparation issue, All Liquors will contact you using the details supplied with your order.</p>

        <h2>3. Collection process</h2>
        <div className="policy-callout">
          <FaBoxOpen />
          <div>
            <strong>Bring your collection code.</strong>
            <p>A single collection code may apply to all products in the same order. Keep the code private and present it when collecting.</p>
          </div>
        </div>
        <p>Collection takes place at the applicable All Liquors collection/store location communicated with your order. Customers should review their order details before collection and contact us if they need assistance.</p>

        <h2>4. Alcohol collection and identification</h2>
        <p>Alcohol may only be released to a person who is legally permitted to purchase alcohol and is at least 18 years old. All Liquors may request valid identification before releasing an alcohol order.</p>

        <h2>5. Shipping and collection fees</h2>
        <p>There is currently no courier/shipping charge because All Liquors does not currently offer product delivery through this website. No separate collection fee is charged for Pay & Collect. Any payment-processing or service charges applicable to the transaction are displayed before payment is completed.</p>

        <h2>6. Uncollected, unavailable or delayed orders</h2>
        <p>If an item becomes unavailable after payment, or All Liquors cannot fulfil an order, we will contact the customer and arrange an appropriate resolution, which may include a replacement, amended order or refund where applicable.</p>

        <h2>7. Need help?</h2>
        <p>For questions about collection or an existing order, please use our <Link to="/contact">Contact page</Link> and include your order number where possible.</p>
      </section>
    </div>
  );
}

export default ShippingPolicy;