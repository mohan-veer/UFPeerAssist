import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getUserEmailFromToken } from "../utils/auth";
import DashboardHeader from "./DashboardHeader";
import "../styles/TaskVerification.css";

const TaskVerification = () => {
  const navigate = useNavigate();
  const [pendingVerifications, setPendingVerifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [otp, setOtp] = useState("");
  const [verifyingTaskId, setVerifyingTaskId] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    const fetchPendingVerifications = async () => {
      setLoading(true);
      setError("");
      try {
        const userEmail = getUserEmailFromToken();
        if (!userEmail) {
          throw new Error("User email not found in token");
        }

        // Use the user's created tasks endpoint as a workaround
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
        console.log("Received user tasks:", data);

        // Filter tasks to those that might need verification
        const tasksWithApplicants = (data.tasks || []).filter(task => 
          task.selected_users && task.selected_users.length > 0 && task.status !== "Completed"
        );
        
        setPendingVerifications(tasksWithApplicants);
      } catch (err) {
        console.error("Error fetching tasks:", err);
        setError(`Failed to load tasks: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchPendingVerifications();
  }, []);

  const handleVerifyTask = async (taskId) => {
    setVerifying(true);
    setError("");
    
    try {
      const userEmail = getUserEmailFromToken();
      if (!userEmail) {
        throw new Error("User email not found");
      }
      
      const response = await fetch(`http://localhost:8080/validate-task-completion`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({
          task_id: taskId,
          email: userEmail,
          otp: otp
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setSuccessMessage(`Task verified and marked as completed!`);
        setPendingVerifications(prev => prev.filter(task => (task.id || task._id) !== taskId));
        setOtp("");
        setVerifyingTaskId("");
        
        // Set a timeout to redirect to completed tasks page
        setTimeout(() => {
          navigate("/completed-tasks");
        }, 2000);
      } else {
        setError(data.error || "Verification failed");
      }
    } catch (err) {
      setError(`Error: ${err.message}`);
    } finally {
      setVerifying(false);
    }
  };

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
    <div>
      <DashboardHeader />
      <div className="task-verification-container">
        <h2>Task Completion Verification</h2>
        
        {loading && <div className="loading">Loading pending verifications...</div>}
        {error && <div className="error-message">{error}</div>}
        {successMessage && <div className="success-message">{successMessage}</div>}
        
        {!loading && !error && (
          <>
            {pendingVerifications.length > 0 ? (
              <div className="verifications-list">
                {pendingVerifications.map(task => (
                  <div key={task.id || task._id} className="verification-card">
                    <div className="task-info">
                      <h3>{task.title}</h3>
                      <p className="task-description">{task.description}</p>
                      <div className="task-meta">
                        <div><strong>Date:</strong> {formatDate(task.task_date)}</div>
                        <div><strong>Time:</strong> {task.task_time}</div>
                        <div><strong>Location:</strong> {task.place_of_work}</div>
                        <div><strong>Worker(s):</strong> {task.selected_users?.join(', ')}</div>
                      </div>
                    </div>
                    
                    {verifyingTaskId === (task.id || task._id) ? (
                      <div className="verification-form">
                        <p>Enter the verification code sent to your email:</p>
                        <input 
                          type="text"
                          placeholder="Enter OTP code"
                          value={otp}
                          onChange={(e) => setOtp(e.target.value)}
                        />
                        <div className="verification-buttons">
                          <button 
                            className="verify-button"
                            onClick={() => handleVerifyTask(task.id || task._id)}
                            disabled={verifying || !otp}
                          >
                            {verifying ? "Verifying..." : "Verify Completion"}
                          </button>
                          <button 
                            className="cancel-button"
                            onClick={() => {
                              setVerifyingTaskId("");
                              setOtp("");
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button 
                        className="start-verification-button"
                        onClick={() => setVerifyingTaskId(task.id || task._id)}
                      >
                        Verify Task Completion
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-verifications">
                <p>You don't have any tasks pending verification.</p>
                <p>When a worker completes a task, you'll receive an email with a verification code.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default TaskVerification;