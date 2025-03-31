import React from "react";
import { Link, useNavigate } from "react-router-dom";
import logo from "../assets/images/logo.jpg";
import student1 from "../assets/images/student1.jpg";
import { logout } from "../utils/auth"; // Import the logout utility
import "../styles/DashboardHeader.css";

const DashboardHeader = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    // Use the logout utility function
    logout();
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
          <li><Link to="/dashboard">Home</Link></li>
          <li><Link to="/post-task">Post a Task</Link></li>
          <li><Link to="/messages">Messages</Link></li>
        </ul>
      </nav>
      <div className="profile-section">
        <Link to="/profile" className="profile-link">
          <img src={student1} alt="Profile" />
          <span>Student Name</span>
        </Link>
        <button className="logout-button" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </header>
  );
};

export default DashboardHeader;
