import React, { useState } from "react";
import "../styles/TaskCompletionForm.css";

const TaskCompletionForm = ({ taskId, ownerEmail }) => {
  const [otp, setOtp] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleVerify = async (e) => {
    e.preventDefault();
    setVerifying(true);
    setError("");
    
    try {
      const response = await fetch(`http://localhost:8080/validate-task-completion`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({
          task_id: taskId,
          email: ownerEmail,
          otp: otp
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setSuccess(true);
      } else {
        setError(data.error || "Verification failed");
      }
    } catch (err) {
      setError("Connection error. Please try again.");
      console.error(err);
    } finally {
      setVerifying(false);
    }
  };

  if (success) {
    return (
      <div className="completion-success">
        <h3>✅ Task Completed Successfully!</h3>
        <p>This task has been marked as completed.</p>
      </div>
    );
  }

  return (
    <div className="completion-form">
      <h3>Verify Task Completion</h3>
      
      {error && <div className="completion-error">{error}</div>}
      
      <form onSubmit={handleVerify}>
        <div className="form-group">
          <label htmlFor="otp-input">Enter the verification code:</label>
          <input
            id="otp-input"
            type="text"
            placeholder="Enter verification code"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            required
          />
          <p className="completion-note">
            The task owner should have received this code via email.
          </p>
        </div>
        
        <button 
          type="submit" 
          className="verify-button"
          disabled={verifying || !otp}
        >
          {verifying ? "Verifying..." : "Complete Task"}
        </button>
      </form>
    </div>
  );
};

export default TaskCompletionForm;