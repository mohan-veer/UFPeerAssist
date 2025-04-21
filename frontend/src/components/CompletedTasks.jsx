import React, { useEffect, useState } from "react";
import { getUserEmailFromToken } from "../utils/auth";
import TaskCard from "./TaskCard";
import DashboardHeader from "./DashboardHeader";
import "../styles/CompletedTasks.css";

const CompletedTasks = () => {
  const [completedTasks, setCompletedTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchCompletedTasks = async () => {
      setLoading(true);
      setError("");
      try {
        const userEmail = getUserEmailFromToken();
        if (!userEmail) {
          throw new Error("User email not found in token");
        }

        // Since there's no dedicated endpoint yet, we'll use the created-tasks endpoint
        // and filter for completed tasks
        const response = await fetch(`http://localhost:8080/users/${userEmail}/created-tasks`, {
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

        // Filter for completed tasks
        const completed = (data.tasks || []).filter(task => 
          task.status === "Completed"
        );

        setCompletedTasks(completed);
      } catch (err) {
        console.error("Error fetching completed tasks:", err);
        setError(`Failed to load completed tasks: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchCompletedTasks();
  }, []);

  return (
    <div>
      <DashboardHeader />
      <div className="completed-tasks-container">
        <h2>Completed Tasks</h2>
        
        {loading && <div className="loading">Loading your completed tasks...</div>}
        {error && <div className="error-message">{error}</div>}
        
        {!loading && !error && (
          <>
            {completedTasks.length > 0 ? (
              <div className="tasks-grid">
                {completedTasks.map(task => (
                  <div key={task.id || task._id} className="completed-task-card">
                    <TaskCard 
                      task={task} 
                      isCompleted={true} 
                      hideApplyButton={true}
                    />
                    <div className="completed-badge">
                      <span>✓ Completed</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-tasks">
                <p>You don't have any completed tasks yet.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default CompletedTasks;