import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./../styles/LoginPage.css";
import ParticleBackgroundOtherScreens from "./ParticleBackgroundOtherScreens";

const LoginPage = () => {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    
    console.log("Submitting login with:", formData);

    try {
      console.log("Sending request to:", "http://localhost:8080/login");
      const response = await fetch("http://localhost:8080/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password
        }),
      });

      console.log("Response status:", response.status);
      const data = await response.json();
      console.log("Response data:", data);
      
      if (response.ok) {
        console.log("Login successful, checking for token...");
        if (data.token) {
          console.log("Token received:", data.token);
          localStorage.setItem("token", data.token);
          console.log("Token stored in localStorage");
        } else {
          console.warn("No token found in response:", data);
        }
        navigate("/dashboard");
      } else {
        console.error("Login failed:", data.error);
        setError(data.error || "Invalid email or password");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("Connection error. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      <ParticleBackgroundOtherScreens />
      <div className="login-container">
        <h2>Log in</h2>
        <form onSubmit={handleSubmit}>
          <label>Email *</label>
          <input 
            type="email" 
            name="email" 
            value={formData.email} 
            onChange={handleChange} 
            required 
            disabled={isLoading}
          />
          <label>Password *</label>
          <input 
            type="password" 
            name="password" 
            value={formData.password} 
            onChange={handleChange} 
            required 
            disabled={isLoading}
          />
          <button type="submit" disabled={isLoading}>
            {isLoading ? "Logging in..." : "🔑 Log in"}
          </button>
        </form>
        <div className="forgot-password">
          <a href="/reset">Forgot Password?</a>
        </div>
        <div className="register">
          <a href="/register">Don't have an account?</a>
        </div>
        {error && <p className="error">{error}</p>}
      </div>
    </div>
  );
};

export default LoginPage;
