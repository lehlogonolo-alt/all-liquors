import { Link } from "react-router-dom";
import { FaTools, FaWhatsapp, FaLock } from "react-icons/fa";
import allLiquorsLogo from "../assets/allliquors-logo.jpeg";

function MaintenancePage({ message }) {
  return (
    <div className="maintenance-page">
      <div className="maintenance-card">
        <img
          src={allLiquorsLogo}
          alt="All Liquors"
          className="maintenance-logo"
        />

        <div className="maintenance-icon-wrap">
          <FaTools />
        </div>

        <p className="maintenance-eyebrow">Scheduled Maintenance</p>

        <h1>We’ll be back shortly</h1>

        <p className="maintenance-copy">
          {message ||
            "We are currently carrying out scheduled maintenance to improve your experience. Please check back shortly."}
        </p>

        <div className="maintenance-divider" />

        <p className="maintenance-help">
          Need assistance while we’re offline?
        </p>

        <a
          className="maintenance-whatsapp"
          href="https://wa.me/27767872888"
          target="_blank"
          rel="noreferrer"
        >
          <FaWhatsapp /> Contact us on WhatsApp
        </a>

        <Link className="maintenance-admin-link" to="/login">
          <FaLock /> Admin access
        </Link>
      </div>
    </div>
  );
}

export default MaintenancePage;
