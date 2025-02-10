import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Route, Routes, Navigate, NavLink, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import HomePage from "./components/HomePage"; // ✅ Import HomePage
import LoginPage from "./components/LoginPage";
import RegisterForm from "./components/RegisterForm";
import ResetPassword from "./components/ResetPassword";
import ParticleBackground from "./components/ParticleBackground";
import "./styles/App.css";

const App = () => {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(null); // ✅ No form shown by default

  // ✅ Ensure correct tab is set based on URL
  useEffect(() => {
    if (location.pathname === "/register") {
      setActiveTab("register");
    } else if (location.pathname === "/reset") {
      setActiveTab("reset");
    } else if (location.pathname === "/login") {
      setActiveTab("login");
    } else {
      setActiveTab("home"); // ✅ Default to home
    }
  }, [location.pathname]);

  return (
    <div className="main-container">
      <Navbar />

      {/* /* ✅ Navigation Tabs - Always Visible */}
      {/* <div className="nav-tabs">
        <NavLink to="/home" className={`tab-link ${activeTab === "home" ? "active" : ""}`}>
          Home
        </NavLink>
        <NavLink to="/register" className={`tab-link ${activeTab === "register" ? "active" : ""}`}>
          Create new account
        </NavLink>
        <NavLink to="/login" className={`tab-link ${activeTab === "login" ? "active" : ""}`}>
          Log in
        </NavLink>
        <NavLink to="/reset" className={`tab-link ${activeTab === "reset" ? "active" : ""}`}>
          Reset password
        </NavLink>
      </div>  */}

      {/* ✅ Routes - Only One Page Renders at a Time */}
      <div className="form-wrapper">
        <Routes>
          <Route path="/" element={<Navigate to="/home" replace />} /> {/* ✅ Default Route */}
          <Route path="/home" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterForm />} />
          <Route path="/reset" element={<ResetPassword />} />
        </Routes>
      </div>

      {/* ✅ Footer only on Home Page */}
      {location.pathname === "/home" && <Footer />}
    </div>
  );
};

export default App;
