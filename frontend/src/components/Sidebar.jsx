// Sidebar.jsx
import React from "react";
import "../styles/Sidebar.css";

const Sidebar = () => {
  return (
    <aside className="dashboard-sidebar">
      <ul>
        <li><a href="/dashboard">Dashboard</a></li>
        <li><a href="/my-tasks">My Tasks</a></li>
        <li><a href="/notifications">Notifications</a></li>
        <li><a href="/settings">Settings</a></li>
      </ul>
    </aside>
  );
};

export default Sidebar;
