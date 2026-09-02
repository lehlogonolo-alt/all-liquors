import { Link } from "react-router-dom";
import {
  FaFacebookF,
  FaWhatsapp,
  FaPhoneAlt,
  FaEnvelope,
  FaMapMarkerAlt
} from "react-icons/fa";

import sabLogo from "../assets/SAB_Logo.jpg";
import computicketLogo from "../assets/computicket-logo.png";
import shopriteLogo from "../assets/shoprite.jpeg";
import checkersLogo from "../assets/checkers.png";
import usaveLogo from "../assets/usave.jpeg";
import paystackLogo from "../assets/Paystack-Logo.jpg";
import allLiquorsLogo from "../assets/allliquors-logo.jpeg";
import ozowLogo from "../assets/ozow-logo.png";

function Footer() {

  const partners = [
    {
      logo: sabLogo,
      name: "SAB"
    },
    {
      logo: computicketLogo,
      name: "Computicket"
    },
    {
      logo: shopriteLogo,
      name: "Shoprite"
    },
    {
      logo: checkersLogo,
      name: "Checkers"
    },
    {
      logo: usaveLogo,
      name: "Usave"
    },
    {
      logo: paystackLogo,
      name: "Paystack"
    },
    {
      logo: ozowLogo,
      name: "ozow"
    }

  ];

  return (
    <>

      {/* ================= PARTNERS ================= */}

      <section className="partners-section">

        <div className="partners-container">

          <p className="partners-subtitle">
            Proudly Working With Industry Leaders
          </p>

          <h2>Trusted Partners</h2>

          <div className="partners-tape">

            <div className="partners-track">

              {/* FIRST SET */}

              {partners.map((partner, index) => (
                <div
                  className="partner-logo"
                  key={`partner-${index}`}
                >
                  <img
                    src={partner.logo}
                    alt={partner.name}
                  />
                </div>
              ))}

              {/* DUPLICATE SET FOR SEAMLESS LOOP */}

              {partners.map((partner, index) => (
                <div
                  className="partner-logo"
                  key={`partner-copy-${index}`}
                >
                  <img
                    src={partner.logo}
                    alt={partner.name}
                  />
                </div>
              ))}

            </div>

          </div>

        </div>

      </section>


      {/* ================= FOOTER ================= */}

      <footer className="footer">

        <div className="footer-container">

          {/* ABOUT */}

          <div className="footer-column">

            <div className="footer-brand"><h3>All Liquors Wholesale</h3></div>

            <p>
              Your trusted destination for quality beverages,
              competitive prices and exceptional customer
              service. We proudly serve our community with
              premium products, exclusive specials and
              convenient in-store shopping.
            </p>

          </div>


          {/* CUSTOMER SERVICES */}

          <div className="footer-column">

            <h3>Customer Services</h3>

            <Link to="/faq">
              FAQs
            </Link>

            <Link to="/privacy-policy">
              Privacy Policy
            </Link>

            <Link to="/terms">
              Terms & Conditions
            </Link>

             <Link to="/shipping-policy">
              Shipping & Collection Policy
            </Link>

            <Link to="/refund-policy">
              Refund Policy
            </Link>

            <Link to="/about">
              About Us
            </Link>

            <Link to="/contact">
              Contact Us
            </Link>

          </div>


          {/* CONTACT */}

          <div className="footer-column footer-contact-column">
            <h3>Contact</h3>

            <a href="tel:+27769387673">
              <FaPhoneAlt />
              +27 76 938 7673
            </a>

            <a href="mailto:Allliquors@gmail.com">
              <FaEnvelope />
              Allliquors@gmail.com
            </a>

            <div className="footer-address">
              <FaMapMarkerAlt />
              <span>105 Old Warmbath Rd<br />Carousel View, Hammanskraal, 0400<br />Mpumalanga, South Africa</span>
            </div>
          </div>

          {/* FOLLOW */}

          <div className="footer-column">

            <h3>Follow Us</h3>

            <a
              href="https://www.facebook.com/all.liquors/"
              target="_blank"
              rel="noreferrer"
            >
              <FaFacebookF />
              Facebook
            </a>

            <a
              href="https://wa.me/27769387673"
              target="_blank"
              rel="noreferrer"
            >
              <FaWhatsapp />
              WhatsApp
            </a>

          </div>

        </div>


        {/* FOOTER BOTTOM */}

        <div className="footer-bottom">

          <p>
            © 2026 All Liquors Wholesale.
            All Rights Reserved.
          </p>

          <p>
           Designed &amp; Developed by{" "}
          <a
          href="https://hgx-solutions.netlify.app/"
          target="_blank"
          rel="noopener noreferrer"
          >
    <strong>HGX Solutions</strong>
  </a>
</p>

        </div>

      </footer>

    </>
  );
}

export default Footer;