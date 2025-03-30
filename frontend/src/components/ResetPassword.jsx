import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./../styles/ResetPassword.css";
import ParticleBackgroundOtherScreens from "./ParticleBackgroundOtherScreens";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1 = email entry, 2 = OTP + password
  const [formData, setFormData] = useState({
    email: "",
    otp: "",
    password: "",
    confirmPassword: ""
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRequestOTP = async (e) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);
    
    try {
      const response = await fetch("http://localhost:8080/requestPasswordReset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email }),
      });

      const data = await response.json();
      if (response.ok) {
        setStep(2);
        setSuccess("OTP sent to your email! Check spam folder if not received.");
      } else {
        setError(data.error || "Failed to send OTP. Please try again.");
      }
    } catch (err) {
      setError("Connection error. Please check your internet connection.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch("http://localhost:8080/validateOtpAndUpdatePassword", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          otp: formData.otp,
          password: formData.password
        }),
      });

      const data = await response.json();
      if (response.ok) {
        navigate("/login", {
          state: { 
            success: "Password reset successful! Please login with your new password",
            email: formData.email
          }
        });
      } else {
        setError(data.error || "Password reset failed. Please check the OTP.");
      }
    } catch (err) {
      setError("Connection error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="reset-page">
      <ParticleBackgroundOtherScreens />
      <div className="reset-container">
        <h2 className="center-heading">
          {step === 1 ? "Reset Password" : "Enter OTP & New Password"}
        </h2>

        {error && <div className="error-banner">{error}</div>}
        {success && <div className="success-banner">{success}</div>}

        <form onSubmit={step === 1 ? handleRequestOTP : handlePasswordReset}>
          {step === 1 ? (
            <>
              <div className="form-group">
                <label>Registered Email Address</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="Enter your registered email"
                  required
                  disabled={isSubmitting}
                />
              </div>
              <button 
                type="submit" 
                className="primary-button"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Sending..." : "Send OTP"}
              </button>
            </>
          ) : (
            <>
              <div className="form-group">
                <label>6-digit OTP Code</label>
                <input
                  type="text"
                  value={formData.otp}
                  onChange={(e) => setFormData({...formData, otp: e.target.value})}
                  placeholder="Enter OTP received via email"
                  pattern="\d{6}"
                  maxLength="6"
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div className="form-group">
                <label>New Password</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  placeholder="At least 6 characters"
                  minLength="6"
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div className="form-group">
                <label>Confirm New Password</label>
                <input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                  placeholder="Re-enter your new password"
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div className="button-group">
                <button 
                  type="button" 
                  className="secondary-button"
                  onClick={() => setStep(1)}
                  disabled={isSubmitting}
                >
                  Back
                </button>
                <button 
                  type="submit" 
                  className="primary-button"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Resetting..." : "Reset Password"}
                </button>
              </div>
            </>
          )}
        </form>

        <div className="login-link">
          Remembered your password? <a href="/login">Log in here</a>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
