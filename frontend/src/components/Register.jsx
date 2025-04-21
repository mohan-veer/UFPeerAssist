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
    password: ""
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

    try {
      const response = await fetch("http://localhost:8080/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      if (response.ok) {
        setSuccess("Registration successful! Redirecting to login...");
        setTimeout(() => navigate("/login"), 2000);
      } else {
        setError(data.error || "Registration failed.");
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
    }
  };

  return (
    <div className="register-page">
      <ParticleBackgroundOtherScreens />
      <div className="register-container">
        <h2 className="center-heading">Create New Account</h2>
        {error && <p className="error">{error}</p>}
        {success && <p className="success">{success}</p>}
        <form onSubmit={handleSubmit}>
          <label>Name *</label>
          <input type="text" name="name" value={formData.name} onChange={handleChange} required />
          <label>Email Address *</label>
          <input type="email" name="email" value={formData.email} onChange={handleChange} required />
          <label>Mobile Number *</label>
          <input type="text" name="mobile" value={formData.mobile} onChange={handleChange} required />
          <label>Password *</label>
          <input type="password" name="password" value={formData.password} onChange={handleChange} required />
          <button type="submit">Create Account</button>
        </form>
      </div>
    </div>
  );
};

export default RegisterForm;
