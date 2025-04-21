import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getUserEmailFromToken } from "../utils/auth";
import DashboardHeader from "./DashboardHeader";
import "../styles/TaskApplications.css";

const TaskApplications = () => {
  const [myTasks, setMyTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionInProgress, setActionInProgress] = useState(false);

  useEffect(() => {
    const fetchMyTasks = async () => {
      setLoading(true);
      setError("");
      try {
        const userEmail = getUserEmailFromToken();
        if (!userEmail) {
          throw new Error("User email not found in token");
        }

        const response = await fetch(`http://localhost:8080/users/${userEmail}/created-tasks`, {
          headers: {
            "Authorization": `Bearer ${localStorage.getItem("token")}`
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        setMyTasks(data.tasks || []);
      } catch (err) {
        console.error("Error fetching tasks:", err);
        setError(`Failed to load tasks: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchMyTasks();
  }, []);

  const handleAcceptApplicant = async (taskId, applicantEmail) => {
    setActionInProgress(true);
    try {
      // Find the task in the local state
      const task = myTasks.find(t => (t._id === taskId || t.id === taskId));
      
      // Check if we've already reached the people_needed limit
      if (task.selected_users && task.selected_users.length >= task.people_needed) {
        throw new Error(`Cannot accept more applicants. Maximum of ${task.people_needed} people needed for this task.`);
      }

      const response = await fetch(`http://localhost:8080/tasks/${taskId}/accept/${applicantEmail}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to accept applicant");
      }

      // Update local state to reflect the change
      setMyTasks(prevTasks => 
        prevTasks.map(task => {
          if (task._id === taskId || task.id === taskId) {
            // Create a new selected_users array if it doesn't exist
            const selectedUsers = task.selected_users || [];
            return {
              ...task,
              selected_users: [...selectedUsers, applicantEmail]
            };
          }
          return task;
        })
      );

      alert(`Successfully accepted ${applicantEmail} for this task`);
    } catch (err) {
      console.error("Error accepting applicant:", err);
      alert(`Error: ${err.message}`);
    } finally {
      setActionInProgress(false);
    }
  };

  // Determine if a task has reached its people_needed limit
  const hasReachedLimit = (task) => {
    return task.selected_users && task.selected_users.length >= task.people_needed;
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

  if (loading) {
    return (
      <div>
        <DashboardHeader />
        <div className="loading">Loading your tasks...</div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div>
        <DashboardHeader />
        <div className="error-message">{error}</div>
      </div>
    );
  }

  return (
    <div>
      <DashboardHeader />
      <div className="task-applications-container">
        <h2>Task Applications</h2>
        
        {myTasks.length === 0 ? (
          <p className="no-tasks">You haven't created any tasks yet.</p>
        ) : (
          <div className="tasks-with-applicants">
            {myTasks.map(task => {
              const limitReached = hasReachedLimit(task);
              return (
                <div key={task._id || task.id} className="task-with-applicants">
                  <div className="task-info">
                    <h3>{task.title}</h3>
                    <div className="task-details">
                      <div><strong>Date:</strong> {formatDate(task.task_date)}</div>
                      <div><strong>Time:</strong> {task.task_time}</div>
                      <div><strong>Pay Rate:</strong> ${task.estimated_pay_rate}/hr</div>
                      <div><strong>Location:</strong> {task.place_of_work}</div>
                      <div><strong>Status:</strong> {task.status}</div>
                      <div><strong>People Needed:</strong> {task.people_needed}</div>
                      <div><strong>People Selected:</strong> {task.selected_users?.length || 0} / {task.people_needed}</div>
                    </div>
                  </div>
                  
                  <div className="applicants-section">
                    <h4>Applicants ({task.applicants?.length || 0})</h4>
                    {limitReached && (
                      <div className="limit-reached-warning">
                        Maximum number of people ({task.people_needed}) already selected for this task.
                      </div>
                    )}
                    {task.applicants && task.applicants.length > 0 ? (
                      <ul className="applicants-list">
                        {task.applicants.map(applicantEmail => {
                          const isSelected = task.selected_users && task.selected_users.includes(applicantEmail);
                          return (
                            <li key={applicantEmail} className={isSelected ? 'selected-applicant' : ''}>
                              <div className="applicant-info">
                                <Link 
                                  to={`/profile?email=${encodeURIComponent(applicantEmail)}`} 
                                  className="applicant-email"
                                >
                                  {applicantEmail}
                                </Link>
                                {isSelected && <span className="selected-badge">Selected</span>}
                              </div>
                              {!isSelected && !limitReached && (
                                <button 
                                  className="accept-applicant-btn"
                                  onClick={() => handleAcceptApplicant(task._id || task.id, applicantEmail)}
                                  disabled={actionInProgress}
                                >
                                  {actionInProgress ? "Processing..." : "Accept"}
                                </button>
                              )}
                              {!isSelected && limitReached && (
                                <button 
                                  className="accept-applicant-btn disabled"
                                  disabled={true}
                                >
                                  Limit Reached
                                </button>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <p className="no-applicants">No applicants yet.</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskApplications;