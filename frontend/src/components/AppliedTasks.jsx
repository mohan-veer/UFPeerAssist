import React, { useEffect, useState } from "react";
import { getUserEmailFromToken } from "../utils/auth";
import "../styles/AppliedTasks.css";

const AppliedTasks = () => {
  const [appliedTasks, setAppliedTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchAppliedTasks = async () => {
      setLoading(true);
      setError("");
      try {
        const userEmail = getUserEmailFromToken();
        if (!userEmail) {
          throw new Error("User email not found in token");
        }

        const response = await fetch(`http://localhost:8080/appliedtasks/${userEmail}`, {
          headers: {
            "Authorization": `Bearer ${localStorage.getItem("token")}`
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        setAppliedTasks(data.applied_tasks || []);
      } catch (err) {
        console.error("Error fetching applied tasks:", err);
        setError(`Failed to load applied tasks: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchAppliedTasks();
  }, []);

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) return <div className="loading">Loading your applied tasks...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="applied-tasks">
      <h2>Tasks I've Applied For</h2>
      
      {appliedTasks.length === 0 ? (
        <p className="no-tasks">You haven't applied for any tasks yet.</p>
      ) : (
        <div className="applied-tasks-list">
          {appliedTasks.map(({ task, creator, selected }) => (
            <div key={task.id} className={`applied-task-card ${selected ? 'selected' : ''}`}>
              <div className="task-info">
                <h3>{task.title}</h3>
                <p className="task-description">{task.description}</p>
                <div className="task-details">
                  <div><strong>Date:</strong> {formatDate(task.task_date)}</div>
                  <div><strong>Time:</strong> {task.task_time}</div>
                  <div><strong>Pay Rate:</strong> ${task.estimated_pay_rate}/hr</div>
                  <div><strong>Location:</strong> {task.place_of_work}</div>
                </div>
              </div>
              
              <div className="task-creator">
                <h4>Posted by:</h4>
                <div><strong>Name:</strong> {creator.name}</div>
                <div><strong>Email:</strong> {creator.email}</div>
                <div><strong>Contact:</strong> {creator.mobile}</div>
              </div>
              
              <div className="application-status">
                {selected ? (
                  <div className="selected-status">
                    <span className="status-badge">✓ Selected</span>
                    <p>You have been selected for this task!</p>
                  </div>
                ) : (
                  <div className="pending-status">
                    <span className="status-badge">Pending</span>
                    <p>Your application is awaiting review.</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AppliedTasks;