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
        body: JSON.stringify(formData),
      });
      if (response.ok) {
        const data = await response.json();
        // Optionally, save token if backend returns one:
        // localStorage.setItem("token", data.token);
        navigate("/dashboard");
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Invalid credentials.");
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
    }
  };

  return (
    <div className="login-page">
      <ParticleBackgroundOtherScreens />
      <div className="login-container">
        <h2>Log in</h2>
        <form onSubmit={handleSubmit}>
          <label>Email *</label>
          <input type="email" name="email" value={formData.email} onChange={handleChange} required />
          <label>Password *</label>
          <input type="password" name="password" value={formData.password} onChange={handleChange} required />
          <button type="submit">🔑 Log in</button>
        </form>
        <div className="forgot-password">
          <a href="/reset">Forgot Password?</a>
        </div>
        {error && <p className="error">{error}</p>}
      </div>
    </div>
  );
};

export default LoginPage;
