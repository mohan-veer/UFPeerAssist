// NotificationsPanel.jsx
import React from "react";
import "../styles/NotificationsPanel.css";

const dummyNotifications = [
  { id: 1, message: 'New task posted: "Help with Calculus Homework"' },
  { id: 2, message: "Alice accepted your task." },
  { id: 3, message: 'Reminder: update task status for "Group Project Assistance".' },
];

const NotificationsPanel = () => {
  return (
    <div className="notifications-panel">
      <h2>Notifications</h2>
      <ul>
        {dummyNotifications.map((notification) => (
          <li key={notification.id}>{notification.message}</li>
        ))}
      </ul>
    </div>
  );
};

export default NotificationsPanel;
