import React from "react";
import { Link } from "react-router-dom";
import "../styles/Sidebar.css";

const Sidebar = () => {
  return (
    <aside className="dashboard-sidebar">
      <ul>
        <li><Link to="/dashboard">Dashboard</Link></li>
        <li><Link to="/my-tasks">My Tasks</Link></li>
        <li><Link to="/notifications">Notifications</Link></li>
        <li><Link to="/settings">Settings</Link></li>
      </ul>
    </aside>
  );
};

export default Sidebar;
