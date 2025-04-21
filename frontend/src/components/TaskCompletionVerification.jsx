import React, { useState } from "react";
import "../styles/TaskCompletionVerification.css";

const TaskCompletionVerification = ({ task }) => {
  const [otp, setOtp] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  
  const handleVerify = async (e) => {
    e.preventDefault();
    setVerifying(true);
    setError("");
    
    try {
      const taskId = task.id || task._id;
      
      // Log verification attempt
      console.log("Verifying task completion for task ID:", taskId);
      console.log("Using OTP:", otp);
      console.log("Task owner email:", task.creator_email);
      
      const response = await fetch(`http://localhost:8080/validate-task-completion`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({
          task_id: taskId,
          email: task.creator_email,
          otp: otp
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setSuccess(true);
        console.log("Task successfully verified as complete");
      } else {
        console.error("Verification failed:", data.error);
        setError(data.error || "Verification failed");
      }
    } catch (err) {
      console.error("Error during verification:", err);
      setError("Connection error. Please try again.");
    } finally {
      setVerifying(false);
    }
  };
  
  if (success) {
    return (
      <div className="verification-success">
        <h3>✅ Task Completed Successfully!</h3>
        <p>This task has been marked as completed. Thank you!</p>
      </div>
    );
  }
  
  return (
    <div className="verification-container">
      <h3>Verify Task Completion</h3>
      
      {error && <div className="verification-error">{error}</div>}
      
      <form onSubmit={handleVerify}>
        <div className="otp-input-group">
          <label htmlFor="otp-input">Enter Verification Code:</label>
          <input
            id="otp-input"
            type="text"
            placeholder="Enter OTP from email"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            required
          />
        </div>
        
        <button 
          type="submit" 
          className="verify-button"
          disabled={verifying || !otp}
        >
          {verifying ? "Verifying..." : "Verify Completion"}
        </button>
      </form>
      
      {process.env.NODE_ENV !== 'production' && (
        <div className="dev-manual-verification">
          <button
            className="toggle-manual-mode"
            onClick={() => setManualMode(!manualMode)}
          >
            {manualMode ? "Hide Developer Tools" : "Show Developer Tools"}
          </button>
          
          {manualMode && (
            <div className="manual-verification-tools">
              <p><strong>Developer Testing Tools</strong></p>
              <p>Enter task details manually to test verification:</p>
              
              <div className="manual-verification-form">
                <p className="note">
                  Note: Since the backend is working as confirmed with Postman, 
                  this lets you test the frontend integration directly.
                </p>
                <p>Current task ID: {task.id || task._id}</p>
                <p>Current owner: {task.creator_email}</p>
              </div>
            </div>
          )}
        </div>
      )}
      
      <div className="verification-help">
        <p>
          <strong>Didn't receive the code?</strong>
        </p>
        <ul>
          <li>Check your spam/junk folder</li>
          <li>Verify your email address is correct</li>
          <li>Ask the worker to end the task again</li>
        </ul>
      </div>
    </div>
  );
};

export default TaskCompletionVerification;