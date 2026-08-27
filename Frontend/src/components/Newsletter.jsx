import { useState } from "react";
import { toast } from "sonner";
import { FaBell } from "react-icons/fa";

function Newsletter() {
  const [email, setEmail] = useState("");

  function handleSubscribe() {
    fetch("http://localhost:3000/subscribe", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email })
    })
      .then(res => res.text())
      .then(msg => {
        toast.success(msg);
        setEmail("");
      });
  }

  return (
    <section className="newsletter">
      <h2 >
  <FaBell className="section-icon" />
  Stay Updated
</h2>
      <p>Get the latest deals & events</p>

      <input
        type="email"
        placeholder="Enter your email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <button onClick={handleSubscribe}>Subscribe</button>
    </section>
  );
}

export default Newsletter;