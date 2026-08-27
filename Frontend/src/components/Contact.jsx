import { useState } from "react";
import { toast } from "sonner";
import {
  FaEnvelope,
  FaPhoneAlt,
  FaWhatsapp,
  FaClock,
  FaMapMarkerAlt
} from "react-icons/fa";

function Contact() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();

    if (!name || !email || !message) {
      toast.error("Please fill in all fields before submitting");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch("http://localhost:3000/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ name, email, message })
      });

      const msg = await res.text();

      toast.success(msg);

      setName("");
      setEmail("");
      setMessage("");

    } catch (err) {
      console.log(err);
      toast.error("Error sending message ");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="contact-page">

      {/* HERO */}
      <section className="contact-hero">
        <div className="contact-hero-content">

          <p className="hero-tag">Get in touch</p>

          <h1>
          <FaEnvelope className="section-icon" />
          Contact All Liquors
          </h1>

          <p>
            Have a question about a product, store availability,
            trading hours, or an upcoming event? Our team is ready to help.
          </p>

        </div>
      </section>

      {/* CONTENT */}
      <section className="contact-content">

        {/* LEFT: CONTACT INFO */}
        <div className="contact-info">

          <div className="info-card">
            <>
            <FaMapMarkerAlt />         
            Visit Store
            </>

            <p>
              1293 Mametlhake Road
              <br />
              PHAKE, Phake, 0492
            </p>

            <a
              href="https://www.google.com/maps/dir//All+Liquors+Wholesale,+1293+Mametlhake+Road,+PHAKE,+Phake,+0492/"
              target="_blank"
              rel="noreferrer"
              className="contact-link"
            >
              Get directions →
            </a>
          </div>

          <div className="info-card">
            <h3>
            <FaPhoneAlt className="section-icon" />
             Call Us
            </h3>
            <p>063 890 0066</p>
          </div>

          <div className="info-card">
            <h3>
              <FaWhatsapp className="section-icon" />
               WhatsApp
            </h3>

            <a
              href="https://wa.me/27767872888"
              target="_blank"
              rel="noreferrer"
              className="contact-link whatsapp-link"
            >
              Chat with us on WhatsApp
            </a>
          </div>

          <div className="info-card">
            <h3>
            <FaClock className="section-icon" />
            Trading Hours
            </h3>

            <p>Mon – Sat: 08:00 – 18:00</p>
            <p>Sunday: 10:00 – 17:00</p>
          </div>

        </div>

        {/* RIGHT: FORM */}
        <div className="contact-form-card">

          <h2>Send us a message</h2>

          <p>
            Fill in the form below and we’ll get back to you as soon as possible.
          </p>

          <form onSubmit={handleSubmit} className="contact-form">

            <div className="form-group">
              <label>Full Name</label>

              <input
                type="text"
                placeholder="Enter your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Email Address</label>

              <input
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Message</label>

              <textarea
                rows="6"
                placeholder="How can we help you?"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className="contact-submit-btn"
              disabled={loading}
            >
              {loading ? "Sending..." : "Send Message"}
            </button>

          </form>

        </div>

      </section>

    </div>
  );
}

export default Contact;