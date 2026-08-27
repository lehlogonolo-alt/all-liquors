import { FaStore, FaGlassCheers, FaTicketAlt, FaUsers, FaShieldAlt } from "react-icons/fa";

function About() {
  return (
    <div className="info-page">
      <section className="info-page-hero">
        <div className="info-page-hero-content">
          <span className="info-page-label">About All Liquors</span>
          <h1>Your Trusted Local Beverage Destination</h1>
          <p>Quality beverages, convenient shopping, entertainment and customer service in one place.</p>
        </div>
      </section>

      <section className="info-page-content">
        <div className="about-intro">
          <div>
            <span className="info-page-label">Who We Are</span>
            <h2>All Liquors Wholesale</h2>
            <p>All Liquors is a beverage retail business serving customers with a wide selection of alcoholic beverages, soft drinks and related products.</p>
            <p>Our goal is to provide competitive pricing, convenient shopping and dependable service, whether purchasing in store or using our online Pay & Collect service.</p>
            <p>All Liquors also hosts selected seasonal events and provides access to Elephant Resort bookings through our online platform.</p>
          </div>
          <div className="about-highlight-card">
            <FaStore />
            <h3>Serving Our Community</h3>
            <p>We aim to make shopping simple, reliable and convenient while delivering quality products and memorable experiences.</p>
          </div>
        </div>

        <div className="about-features">
          <div className="about-feature-card"><FaGlassCheers /><h3>Quality Beverages</h3><p>A broad selection of alcoholic beverages, soft drinks and selected related products.</p></div>
          <div className="about-feature-card"><FaTicketAlt /><h3>Events & Experiences</h3><p>Discover seasonal events and purchase selected digital tickets directly online.</p></div>
          <div className="about-feature-card"><FaUsers /><h3>Customer Focused</h3><p>Straightforward service, competitive pricing and convenient collection.</p></div>
          <div className="about-feature-card"><FaShieldAlt /><h3>Secure Payments</h3><p>Online payments are processed through trusted payment providers such as Paystack.</p></div>
        </div>

        <div className="responsible-alcohol-card">
          <h2>Responsible Alcohol Retailing</h2>
          <p>All Liquors supports the responsible sale and consumption of alcohol. Alcoholic products are not available for purchase by persons under the age of 18.</p>
        </div>
      </section>
    </div>
  );
}

export default About;
