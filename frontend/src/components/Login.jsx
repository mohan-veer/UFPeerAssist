import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./../styles/LoginPage.css";
import ParticleBackgroundOtherScreens from "./ParticleBackgroundOtherScreens";

const LoginPage = () => {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const response = await fetch("http://localhost:8080/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        // Handle successful login
        // Note: Add token handling when you implement JWT
        navigate("/dashboard");
      } else {
        setError(data.error || "Invalid email or password");
      }
    } catch (err) {
      setError("Connection error. Please try again later.");
    }
  };

  return (
    <div className="login-page">
      <ParticleBackgroundOtherScreens/>
      <div className="login-container">
        <h2>Log In to Your Account</h2>
        <form onSubmit={handleSubmit}>
          <label>Email Address *</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            placeholder="name@example.com"
          />

          <label>Password *</label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
            minLength="6"
          />

          <button type="submit" className="login-button">
            🔑 Log In
          </button>
        </form>

        <div className="forgot-password">
          <a href="/reset">Forgot Password?</a>
        </div>

        {error && <p className="error-message">{error}</p>}
      </div>
    </div>
  );
};

export default LoginPage;
