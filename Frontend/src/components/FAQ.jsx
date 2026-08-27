import { useState } from "react";
import { FaChevronDown, FaChevronUp, FaQuestionCircle } from "react-icons/fa";

function FAQ() {
  const [openIndex, setOpenIndex] = useState(null);

  const faqs = [
    ["What products does All Liquors sell?", "All Liquors offers alcoholic beverages, soft drinks and selected related products. Availability may vary according to current stock."],
    ["How does Pay & Collect work?", "Add products to your basket, complete secure payment online and use the single collection code issued for your order when collecting in store."],
    ["Do I need identification when collecting alcohol?", "Yes. Customers collecting alcoholic products may be required to present valid identification confirming that they are 18 years or older."],
    ["Can anyone purchase alcohol from the website?", "No. Alcohol may only be purchased by persons who are legally permitted to purchase alcohol in South Africa and are at least 18 years old."],
    ["How do event tickets work?", "Choose an available event and ticket category, complete payment and receive a digital ticket with a unique QR code for entry."],
    ["What happens if my event QR code does not scan?", "An authorised administrator can manually verify and check in a valid ticket through the ticket management system."],
    ["How do Elephant Resort bookings work?", "Choose your visit date and guest quantities, complete payment online and keep the booking confirmation issued after successful payment."],
    ["Are online payments secure?", "Payments are processed through Paystack and supported payment partners. All Liquors does not directly store your complete banking or card credentials."],
    ["How can I contact All Liquors?", "Use the Contact page or the official Facebook and WhatsApp links displayed on the website."],
  ];

  return (
    <div className="info-page">
      <section className="info-page-hero">
        <div className="info-page-hero-content">
          <span className="info-page-label">Customer Support</span>
          <h1><FaQuestionCircle /> Frequently Asked Questions</h1>
          <p>Answers to common questions about shopping, collections, event tickets, resort bookings and payments.</p>
        </div>
      </section>

      <section className="info-page-content faq-container">
        {faqs.map(([question, answer], index) => (
          <div className={`faq-item ${openIndex === index ? "open" : ""}`} key={question}>
            <button className="faq-question" onClick={() => setOpenIndex(openIndex === index ? null : index)}>
              <span>{question}</span>
              {openIndex === index ? <FaChevronUp /> : <FaChevronDown />}
            </button>
            {openIndex === index && <div className="faq-answer"><p>{answer}</p></div>}
          </div>
        ))}
      </section>
    </div>
  );
}

export default FAQ;
