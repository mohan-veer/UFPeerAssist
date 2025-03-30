import React from "react";
import { Link, useNavigate } from "react-router-dom"; // Added useNavigate
import logo from "../assets/images/logo.jpg";
import student1 from "../assets/images/student1.jpg";
import "../styles/DashboardHeader.css";

const DashboardHeader = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    // Clear token from localStorage
    localStorage.removeItem("token");
    // Redirect to login page
    navigate("/login");
    
  };

  return (
    <header className="dashboard-header">
      <div className="logo">
        <img src={logo} alt="UF Peer Assist Logo" className="logo" />
      </div>
      <nav className="header-nav">
        <ul>
          <li><a href="/dashboard">Home</a></li>
          <li><a href="/post-task">Post a Task</a></li>
          <li><a href="/messages">Messages</a></li>
        </ul>
      </nav>
      <div className="profile-section">
        <Link to="/profile" className="profile-link">
          <img src={student1} alt="Profile" />
          <span>Student Name</span>
        </Link>
        {/* Add Logout Button */}
        <button className="logout-button" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </header>
  );
};

export default DashboardHeader;
