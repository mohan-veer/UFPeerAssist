import React from "react";
import { Link } from "react-router-dom";
import "../styles/Sidebar.css";

const Sidebar = () => {
  return (
    <aside className="dashboard-sidebar">
      <ul>
        <li><Link to="/my-tasks">My Tasks</Link></li>
        <li><Link to="/applied-tasks">Applied Tasks</Link></li>
        <li><Link to="/task-applications">Applications</Link></li>
        <li><Link to="/scheduled-tasks">Scheduled Tasks</Link></li>
      </ul>
    </aside>
  );
};

export default Sidebar;
