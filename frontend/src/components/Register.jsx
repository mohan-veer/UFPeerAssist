import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./../styles/RegisterForm.css";
import ParticleBackgroundOtherScreens from "./ParticleBackgroundOtherScreens";

const RegisterForm = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    confirmEmail: "",
    password: "",
    first_name: "",
    last_name: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Handle input changes
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
  
    try {
      const response = await fetch("http://localhost:8080/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
          confirmEmail: formData.confirmEmail,
          password: formData.password,
          first_name: formData.first_name,
          last_name: formData.last_name,
        }),
      });
  
      const data = await response.json();
      if (response.ok) {
        setSuccess("Registration successful! Redirecting to login...");
        setTimeout(() => navigate("/login"), 2000);
      } else {
        if (data.username) {
          setError(data.username[0]); 
        } else if (data.email) {
          setError(data.email[0]); 
        } else {
          setError(data.message || "Registration failed.");
        }
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
    }
  };
  
  

  return (
    <div className="register-page">
      <ParticleBackgroundOtherScreens/>
    <div className="register-container">
      <h2 class="center-heading">Create New Account</h2>
      {error && <p className="error">{error}</p>}
      {success && <p className="success">{success}</p>}
      <form onSubmit={handleSubmit}>
      <label>First Name *</label>
        <input type="text" name="first_name" value={formData.first_name} onChange={handleChange} required />

        <label>Last Name *</label>
        <input type="text" name="last_name" value={formData.last_name} onChange={handleChange} required />

        <label>Username *</label>
        <input type="text" name="username" value={formData.username} onChange={handleChange} required />

        <label>Email Address *</label>
        <input type="email" name="email" value={formData.email} onChange={handleChange} required />

        <label>Confirm Email Address *</label>
        <input type="email" name="confirmEmail" value={formData.confirmEmail} onChange={handleChange} required />

        <label>Password *</label>
        <input type="password" name="password" value={formData.password} onChange={handleChange} required />

        <button type="submit">Create Account</button>
      </form>
    </div>
    </div>
  );
};

export default RegisterForm;
