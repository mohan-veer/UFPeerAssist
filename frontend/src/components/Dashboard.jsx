// Dashboard.jsx
import React from "react";
import DashboardHeader from "./DashboardHeader";
import Sidebar from "./Sidebar";
import TaskFeed from "./TaskFeed";
import NotificationsPanel from "./NotificationsPanel";
import "../styles/Dashboard.css";

const Dashboard = () => {
  return (
    <div className="dashboard-container">
      <DashboardHeader />
      <div className="dashboard-main">
        <Sidebar />
        <div className="dashboard-content">
          <TaskFeed />
          <NotificationsPanel />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
