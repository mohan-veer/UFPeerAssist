import React, { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import "./../styles/Navbar.css";
import GatorsLogo from "../assets/images/Florida_Gators_gator_logo.png";
import SiteLogo from "../assets/images/logo.jpg";

const Navbar = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Handle window resize for responsiveness
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <>
      {/* 🔹 Main Navbar */}
      <nav className="navbar">
        <div className="navbar-container">
          {/* Logo Section */}
          <div className="logo">
            <img src={GatorsLogo} alt="Home" />
          </div>

          {/* Desktop Menu */}
          {!isMobile && (
            <div className="nav-links">
              <NavLink to="/home" className="nav-item">Home</NavLink>
              <NavLink to="/register" className="nav-item">Register</NavLink>
              <NavLink to="/login" className="nav-item">Login</NavLink>
              <NavLink to="/reset" className="nav-item">Reset Password</NavLink>
            </div>
          )}

          {/* Mobile Menu Button */}
          {isMobile && (
            <button className="menu-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
              ☰
            </button>
          )}

      {/* 🔹 Sidebar for Mobile View */}
      {isMobile && (
        <div className={`sidebar ${sidebarOpen ? "open" : ""}`}>
          <button className="close-btn" onClick={() => setSidebarOpen(false)}>✖</button>
          <NavLink to="/home" className="sidebar-item" onClick={() => setSidebarOpen(false)}>Home</NavLink>
          <NavLink to="/register" className="sidebar-item" onClick={() => setSidebarOpen(false)}>Register</NavLink>
          <NavLink to="/login" className="sidebar-item" onClick={() => setSidebarOpen(false)}>Login</NavLink>
          <NavLink to="/reset" className="sidebar-item" onClick={() => setSidebarOpen(false)}>Reset Password</NavLink>
        </div>
      )}
      {/* 🔹 Logo at the Top Right Corner */}
      <div className="title-logo-container">
          <h2 class="italian-title">UF Peer Assistance</h2>
          <img src={SiteLogo} alt="Site Logo" className="SiteLogo" />
      </div>
    </div>
    </nav>
    </>
  );
};

export default Navbar;
