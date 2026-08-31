import { useState } from "react";
import {
  useNavigate,
  Link
} from "react-router-dom";
import { toast } from "sonner";
import allLiquorsLogo from "../assets/allliquors-logo.jpeg";

const API_BASE = (
  import.meta.env.VITE_API_URL ||
  "http://localhost:3000"
).replace(/\/$/, "");

function Login({ setUser }) {
  const navigate = useNavigate();

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  async function handleLogin(e) {
    e.preventDefault();

    if (!email || !password) {
      toast.error(
        "Please enter your email and password"
      );
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `${API_BASE}/login`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json"
          },
          body: JSON.stringify({
            email,
            password
          })
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        toast.error(
          data.message ||
            "Unable to sign in"
        );
        return;
      }

      if (data.user) {
        localStorage.setItem(
          "user",
          JSON.stringify(data.user)
        );

        localStorage.setItem(
          "accessToken",
          data.token
        );

        setUser(data.user);

        toast.success(
          data.message ||
            "Login successful"
        );

        if (data.user.isAdmin) {
          navigate("/admin");
        } else {
          navigate("/");
        }
      }
    } catch (error) {
      console.error(error);

      toast.error(
        "Unable to connect to server"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <img
            className="auth-brand-logo"
            src={allLiquorsLogo}
            alt="All Liquors"
          />

          <h1>Welcome Back</h1>

          <p>
            Sign in to your All Liquors
            account.
          </p>
        </div>

        <form
          className="auth-form"
          onSubmit={handleLogin}
        >
          <div className="auth-form-group">
            <label>
              Email Address
            </label>

            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) =>
                setEmail(
                  e.target.value
                )
              }
            />
          </div>

          <div className="auth-form-group">
            <label>
              Password
            </label>

            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) =>
                setPassword(
                  e.target.value
                )
              }
            />
          </div>

          <div className="forgot-password">
            <Link to="/forgot-password">
              Forgot your password?
            </Link>
          </div>

          <button
            type="submit"
            className="auth-submit-btn"
            disabled={loading}
          >
            {loading
              ? "Signing In..."
              : "Sign In"}
          </button>
        </form>

        <div className="auth-divider">
          <span>
            New to All Liquors?
          </span>
        </div>

        <Link
          to="/register"
          className="auth-secondary-btn"
        >
          Create an Account
        </Link>
      </div>
    </div>
  );
}

export default Login;
