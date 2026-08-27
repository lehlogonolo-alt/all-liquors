import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

function ForgotPassword() {

  const navigate = useNavigate();

  const [step, setStep] = useState(1);

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);

  /* ================= SEND OTP ================= */

  async function handleSendOTP(e) {

    e.preventDefault();

    if (!email) {
      toast.error("Please enter your email address");
      return;
    }

    setLoading(true);

    try {

      const response = await fetch(
        "http://localhost:3000/forgot-password",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            email
          })
        }
      );

      const data = await response.json();

      toast.success(data.message);

      setStep(2);

    } catch (error) {

      console.log(error);
      toast.error("Unable to send verification code");

    } finally {

      setLoading(false);

    }
  }

  /* ================= VERIFY OTP ================= */

  async function handleVerifyOTP(e) {

  e.preventDefault();

  const cleanOTP = otp.trim();

  if (!cleanOTP) {
    toast.error("Please enter the OTP");
    return;
  }

  setLoading(true);

  try {

    const response = await fetch(
      "http://localhost:3000/verify-reset-otp",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: email.trim(),
          otp: cleanOTP
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      toast.error(data.message);
      return;
    }

    toast.success("OTP verified successfully");

    setStep(3);

  } catch (error) {

    console.log(error);

    toast.error("Unable to verify OTP");

  } finally {

    setLoading(false);
  }
}

  /* ================= RESET PASSWORD ================= */

  async function handleResetPassword(e) {

    e.preventDefault();

    if (!newPassword || !confirmPassword) {
      toast.error("Please complete all fields");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    if (!/[a-z]/.test(newPassword) || !/[A-Z]/.test(newPassword)) {
      toast.error("Password must include uppercase and lowercase letters");
      return;
    }

    if (!/\d/.test(newPassword)) {
      toast.error("Password must include at least one number");
      return;
    }

    if (!/[^A-Za-z0-9]/.test(newPassword)) {
      toast.error("Password must include at least one special character");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);

    try {

      const response = await fetch(
        "http://localhost:3000/reset-password",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            email,
            otp,
            newPassword
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
      }, 1200);

    } catch (error) {

      console.log(error);
      toast.error("Unable to reset password");

    } finally {

      setLoading(false);

    }
  }

  return (

    <div className="auth-page">

      <div className="auth-card">

        {/* ================= STEP 1 ================= */}

        {step === 1 && (

          <>
            <div className="auth-header">

              <h1>Forgot Password</h1>

              <p>
                Enter your email address and we'll
                send you a verification code.
              </p>

            </div>

            <form
              className="auth-form"
              onSubmit={handleSendOTP}
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

              <button
                type="submit"
                className="auth-submit-btn"
                disabled={loading}
              >
                {loading
                  ? "Sending Code..."
                  : "Send Verification Code"}
              </button>

            </form>
          </>

        )}

        {/* ================= STEP 2 ================= */}

        {step === 2 && (

          <>
            <div className="auth-header">

              <h1>Verify Your Email</h1>

              <p>
                Enter the 6-digit verification code
                sent to your email address.
              </p>

            </div>

            <form
              className="auth-form"
              onSubmit={handleVerifyOTP}
            >

              <div className="auth-form-group">

                <label>Verification Code</label>

                <input
                  type="text"
                  inputMode="numeric"
                  maxLength="6"
                  placeholder="000000"
                  value={otp}
                  onChange={(e) =>
                    setOtp(
                      e.target.value.replace(/\D/g, "")
                    )
                  }
                />

              </div>

              <button
                type="submit"
                className="auth-submit-btn"
                disabled={loading}
              >
                {loading
                  ? "Verifying..."
                  : "Verify Code"}
              </button>

            </form>

            <div className="auth-footer">

              <button
                className="auth-link-btn"
                onClick={() => setStep(1)}
              >
                Use a different email
              </button>

            </div>
          </>

        )}

        {/* ================= STEP 3 ================= */}

        {step === 3 && (

          <>
            <div className="auth-header">

              <h1>Create New Password</h1>

              <p>
                Your email has been verified.
                Create a new password for your account.
              </p>

            </div>

            <form
              className="auth-form"
              onSubmit={handleResetPassword}
            >

              <div className="auth-form-group">

                <label>New Password</label>

                <input
                  type="password"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) =>
                    setNewPassword(e.target.value)
                  }
                />

              </div>

              <div className="auth-form-group">

                <label>Confirm Password</label>

                <input
                  type="password"
                  placeholder="Confirm new password"
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
                {loading
                  ? "Updating Password..."
                  : "Update Password"}
              </button>

            </form>

          </>
        )}

        <div className="auth-footer">

          <button
            className="auth-link-btn"
            onClick={() => navigate("/login")}
          >
            Back to Login
          </button>

        </div>

      </div>

    </div>

  );
}

export default ForgotPassword;