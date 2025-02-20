// DashboardHeader.jsx
import React from "react";
import logo from "../assets/images/logo.jpg";
import student1 from "../assets/images/student1.jpg";
import "../styles/DashboardHeader.css";

const DashboardHeader = () => {
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
      <div className="profile">
        <img src={student1} alt="Profile" />
        <span>Mohan Potu</span>
      </div>
    </header>
  );
};

export default DashboardHeader;
