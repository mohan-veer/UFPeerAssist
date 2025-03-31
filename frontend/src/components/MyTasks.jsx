import React, { useEffect, useState } from "react";
import { getUserEmailFromToken } from "../utils/auth";
import TaskCard from "./TaskCard";
import "../styles/MyTasks.css";

const MyTasks = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchMyTasks = async () => {
      setLoading(true);
      setError("");
      try {
        const userEmail = getUserEmailFromToken();
        if (!userEmail) {
          throw new Error("User email not found in token");
        }

        console.log("Fetching tasks for:", userEmail);

        const response = await fetch(`http://localhost:8080/users/${userEmail}/created-tasks`, {
          headers: {
            "Authorization": `Bearer ${localStorage.getItem("token")}`
          }
        });

        console.log("Response status:", response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error("API Error:", errorText);
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log("Received data:", data);

        setTasks(data.tasks || []);
      } catch (err) {
        console.error("Error fetching tasks:", err);
        setError(`Failed to load tasks: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchMyTasks();
  }, []);

  return (
    <div className="my-tasks">
      <h2>My Tasks</h2>
      
      {loading && <div className="loading">Loading your tasks...</div>}
      {error && <div className="error-message">{error}</div>}
      
      {!loading && !error && (
        <>
          {tasks.length > 0 ? (
            <div className="tasks-list">
              {tasks.map(task => (
                <TaskCard key={task.id || task._id} task={task} />
              ))}
            </div>
          ) : (
            <p className="no-tasks">You haven't created any tasks yet.</p>
          )}
        </>
      )}
    </div>
  );
};

export default MyTasks;
