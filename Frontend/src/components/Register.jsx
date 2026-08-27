import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import allLiquorsLogo from "../assets/allliquors-logo.jpeg";

function Register() {

  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);

  async function handleRegister(e) {

    e.preventDefault();

    if (!email || !password || !confirmPassword) {
      toast.error("Please complete all fields");
      return;
    }

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    if (!/[a-z]/.test(password)) {
      toast.error("Password must include a lowercase letter");
      return;
    }

    if (!/[A-Z]/.test(password)) {
      toast.error("Password must include an uppercase letter");
      return;
    }

    if (!/\d/.test(password)) {
      toast.error("Password must include a number");
      return;
    }

    if (!/[^A-Za-z0-9]/.test(password)) {
      toast.error("Password must include a special character");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);

    try {

      const response = await fetch(
        "http://localhost:3000/register",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            email,
            password
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.message);
        return;
      }

      toast.success(data.message);

      setTimeout(() => {
        navigate("/login");
      }, 1000);

    } catch (error) {

      console.log(error);
      toast.error("Unable to connect to server");

    } finally {

      setLoading(false);

    }
  }

  return (

    <div className="auth-page">

      <div className="auth-card">

        <div className="auth-header">

          <img className="auth-brand-logo" src={allLiquorsLogo} alt="All Liquors" />

          <h1>Create Account</h1>

          <p>
            Create your All Liquors account.
          </p>

        </div>

        <form
          className="auth-form"
          onSubmit={handleRegister}
        >

          <div className="auth-form-group">

            <label>Email Address</label>

            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
            />

          </div>

          <div className="auth-form-group">

            <label>Password</label>

            <input
              type="password"
              placeholder="8+ chars, upper/lowercase, number & symbol"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
            />

          </div>

          <div className="auth-form-group">

            <label>Confirm Password</label>

            <input
              type="password"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(e) =>
                setConfirmPassword(e.target.value)
              }
            />

          </div>

          <button
            type="submit"
            className="auth-submit-btn"
            disabled={loading}
          >
            {loading ? "Creating Account..." : "Create Account"}
          </button>

        </form>

        <div className="auth-divider">
          <span>Already have an account?</span>
        </div>

        <Link
          to="/login"
          className="auth-secondary-btn"
        >
          Sign In
        </Link>

      </div>

    </div>

  );
}

export default Register;