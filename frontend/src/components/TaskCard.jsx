import React, { useState } from "react";
import { getUserEmailFromToken } from "../utils/auth";
import "../styles/TaskCard.css";

const TaskCard = ({ task, isScheduled = false, isCompleted = false, hideApplyButton = false }) => {
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [error, setError] = useState("");

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

  const handleApply = async () => {
    setApplying(true);
    setError("");
    
    try {
      const userEmail = getUserEmailFromToken();
      if (!userEmail) {
        setError("You must be logged in to apply");
        setApplying(false);
        return;
      }
      
      const taskId = task.id || task._id;
      const response = await fetch(`http://localhost:8080/tasks/${taskId}/apply/${userEmail}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        }
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setApplied(true);
        console.log("Successfully applied for task");
      } else {
        console.error("Failed to apply for task:", data.error);
        setError(data.error || "Failed to apply for task");
      }
    } catch (err) {
      console.error("Error applying for task:", err);
      setError("Connection error. Please try again.");
    } finally {
      setApplying(false);
    }
  };

  // Check if the current user is the creator of this task
  const isCreator = () => {
    const userEmail = getUserEmailFromToken();
    return userEmail === task.creator_email;
  };

  // Determine if apply button should be shown
  const shouldShowApplyButton = () => {
    return !hideApplyButton && !isCreator() && !isScheduled && !isCompleted && !applied;
  };

  return (
    <div className={`task-card ${isScheduled ? 'scheduled-task' : ''} ${isCompleted ? 'completed-task' : ''}`}>
      <div className="task-header">
        <h3>{task.title}</h3>
        <span className="task-category">{task.work_type}</span>
      </div>
      
      <p className="task-description">{task.description}</p>
      
      <div className="task-details">
        <div className="detail-item">
          <span className="detail-label">Date:</span>
          <span className="detail-value">{formatDate(task.task_date)}</span>
        </div>
        
        <div className="detail-item">
          <span className="detail-label">Time:</span>
          <span className="detail-value">{task.task_time}</span>
        </div>
        
        <div className="detail-item">
          <span className="detail-label">Pay Rate:</span>
          <span className="detail-value">${task.estimated_pay_rate}/hr</span>
        </div>
        
        <div className="detail-item">
          <span className="detail-label">Location:</span>
          <span className="detail-value">{task.place_of_work}</span>
        </div>
        
        <div className="detail-item">
          <span className="detail-label">People Needed:</span>
          <span className="detail-value">{task.people_needed}</span>
        </div>
        
        <div className="detail-item">
          <span className="detail-label">Posted By:</span>
          <span className="detail-value">{task.creator_email}</span>
        </div>

        {isCompleted && (
          <div className="detail-item">
            <span className="detail-label">Status:</span>
            <span className="detail-value status-completed">Completed</span>
          </div>
        )}
      </div>
      
      {error && <div className="error-message">{error}</div>}
      
      <div className="task-footer">
        {isCompleted ? (
          <div className="completed-status">
            Task completed
          </div>
        ) : isScheduled ? (
          <div className="scheduled-badge">
            <span>✓ Scheduled</span>
          </div>
        ) : applied ? (
          <button className="applied-button" disabled>
            Applied Successfully
          </button>
        ) : shouldShowApplyButton() ? (
          <button 
            className="apply-button" 
            onClick={handleApply} 
            disabled={applying}
          >
            {applying ? "Applying..." : "Apply for Task"}
          </button>
        ) : null}
        
        <div className="task-stats">
          <span className="views-count">{task.views || 0} views</span>
          <span className="applicants-count">{task.applicants?.length || 0} applicants</span>
          {task.selected_users && task.selected_users.length > 0 && (
            <span className="selected-count">{task.selected_users.length} selected</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskCard;