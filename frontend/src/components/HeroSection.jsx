import React from "react";
import { Link } from "react-router-dom";
import logo from "../assets/images/logo.jpg"; // adjust the path if needed
import gator from "../assets/images/Florida_Gators_gator_logo.png"
import "../styles/HeroSection.css";

const HeroSection = () => {
  return (
    <section className="hero-section">
      {/* Navbar with logo and navigation buttons */}
      <nav className="navbar">
        <div className="navbar-logo">
          <img src={logo} alt="UF Peer Assist Logo" />
        </div>
        <div className="navbar-logo-right">
          <img src={gator} alt="UF Peer Assist Logo" />
        </div>
      </nav>
      
      {/* Central hero content */}
      <div className="hero-content">
        <h1 className="hero-title">Connect, Collaborate, Assist</h1>
        <p className="hero-subtitle">Exclusively for UF Students</p>
        <div className="hero-cta">
          <Link to="/register" className="hero-button signup">Sign Up</Link>
          <Link to="/login" className="hero-button login">Log In</Link>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
