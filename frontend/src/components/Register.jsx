import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./../styles/RegisterForm.css";
import ParticleBackgroundOtherScreens from "./ParticleBackgroundOtherScreens";

const RegisterForm = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    mobile: "",
    password: "",
    confirmEmail: ""
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Client-side validation
    if (formData.email !== formData.confirmEmail) {
      setError("Emails do not match");
      return;
    }

    try {
      const response = await fetch("http://localhost:8080/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          mobile: formData.mobile,
          password: formData.password
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setSuccess("Registration successful! Redirecting to login...");
        setTimeout(() => navigate("/login"), 2000);
      } else {
        setError(data.error || "Registration failed. Please try again.");
      }
    } catch (err) {
      setError("Connection to server failed. Check your internet connection.");
    }
  };

  return (
    <div className="register-page">
      <ParticleBackgroundOtherScreens/>
      <div className="register-container">
        <h2 className="center-heading">Create New Account</h2>
        {error && <p className="error">{error}</p>}
        {success && <p className="success">{success}</p>}
        
        <form onSubmit={handleSubmit}>
          <label>Full Name *</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
          />

          <label>Email Address *</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
          />

          <label>Confirm Email Address *</label>
          <input
            type="email"
            name="confirmEmail"
            value={formData.confirmEmail}
            onChange={handleChange}
            required
          />

          <label>Mobile Number *</label>
          <input
            type="tel"
            name="mobile"
            value={formData.mobile}
            onChange={handleChange}
            pattern="[+]{1}[0-9]{10,15}"
            placeholder="+1234567890"
            required
          />

          <label>Password *</label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            minLength="6"
            required
          />

          <button type="submit">Create Account</button>
        </form>
      </div>
    </div>
  );
};

export default RegisterForm;
