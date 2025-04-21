import React, { useState } from "react";
import { getUserEmailFromToken } from "../utils/auth";
import "../styles/TaskEndButton.css";

const TaskEndButton = ({ task }) => {
  const [ending, setEnding] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleEndTask = async () => {
    setEnding(true);
    setError("");
    
    try {
      const userEmail = getUserEmailFromToken();
      if (!userEmail) {
        setError("You must be logged in to end this task");
        setEnding(false);
        return;
      }
      
      // Check if user is selected for this task
      const isSelected = task.selected_users && task.selected_users.includes(userEmail);
      if (!isSelected) {
        setError("You are not authorized to end this task");
        setEnding(false);
        return;
      }
      
      const taskId = task.id || task._id;
      const response = await fetch(`http://localhost:8080/tasks/${taskId}/end/${userEmail}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        }
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setSuccess(true);
        console.log("Successfully initiated task completion");
      } else {
        console.error("Failed to end task:", data.error);
        setError(data.error || "Failed to end task");
      }
    } catch (err) {
      console.error("Error ending task:", err);
      setError("Connection error. Please try again.");
    } finally {
      setEnding(false);
    }
  };

  if (success) {
    return (
      <div className="task-end-success">
        <p>✅ Task completion initiated</p>
        <p>An OTP has been sent to the task owner for verification.</p>
      </div>
    );
  }

  return (
    <div className="task-end-container">
      {error && <div className="task-end-error">{error}</div>}
      <button 
        className="task-end-button" 
        onClick={handleEndTask} 
        disabled={ending}
      >
        {ending ? "Processing..." : "End Task"}
      </button>
      <p className="task-end-note">
        This will send a notification to the task owner to verify completion.
      </p>
    </div>
  );
};

export default TaskEndButton;