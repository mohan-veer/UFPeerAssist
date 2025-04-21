import React, { useEffect, useState } from "react";
import { getUserEmailFromToken } from "../utils/auth";
import TaskCard from "./TaskCard";
import TaskEndButton from "./TaskEndButton";
import "../styles/ScheduledTasks.css";

const ScheduledTasks = () => {
  const [scheduledTasks, setScheduledTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    // Set user email
    const email = getUserEmailFromToken();
    if (email) {
      setUserEmail(email);
    }

    const fetchScheduledTasks = async () => {
      setLoading(true);
      setError("");
      try {
        if (!email) {
          throw new Error("User email not found in token");
        }

        console.log("Fetching scheduled tasks for:", email);

        const response = await fetch(`http://localhost:8080/scheduled-tasks/${email}`, {
          headers: {
            "Authorization": `Bearer ${localStorage.getItem("token")}`
          }
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("API Error:", errorText);
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log("Received scheduled tasks:", data);

        setScheduledTasks(data.scheduled_tasks || []);
      } catch (err) {
        console.error("Error fetching scheduled tasks:", err);
        setError(`Failed to load scheduled tasks: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchScheduledTasks();
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

  return (
    <div className="scheduled-tasks">
      <h2>My Scheduled Tasks</h2>
      
      {loading && <div className="loading">Loading your scheduled tasks...</div>}
      {error && <div className="error-message">{error}</div>}
      
      {!loading && !error && (
        <>
          {scheduledTasks.length > 0 ? (
            <div className="tasks-list">
              {scheduledTasks.map(task => (
                <div key={task.id || task._id} className="scheduled-task-card">
                  <TaskCard task={task} isScheduled={true} />
                  
                  {/* Only show End Task button if task status is not Completed */}
                  {task.status !== "Completed" && (
                    <div className="task-actions">
                      <TaskEndButton task={task} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="no-tasks">You don't have any scheduled tasks yet.</p>
          )}
        </>
      )}
    </div>
  );
};

export default ScheduledTasks;