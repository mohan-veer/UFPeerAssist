import React, { useEffect, useState } from "react";
import TaskCard from "./TaskCard";
import { getUserEmailFromToken } from "../utils/auth";
import "../styles/TaskFeed.css";

const TaskFeed = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState({
    category: "",
    fromDate: "",
    toDate: ""
  });

  useEffect(() => {
    const fetchTasks = async () => {
      setLoading(true);
      setError("");
      try {
        const userEmail = getUserEmailFromToken();
        if (!userEmail) {
          throw new Error("User email not found in token");
        }

        const queryParams = new URLSearchParams(filter).toString();
        const url = `http://localhost:8080/tasks/feed/${userEmail}${queryParams ? `?${queryParams}` : ''}`;
        
        console.log("Fetching tasks from:", url);

        const response = await fetch(url, {
          headers: {
            "Authorization": `Bearer ${localStorage.getItem("token")}`
          }
        });

        if (!response.ok) {
          const errorBody = await response.text();
          throw new Error(`HTTP error! status: ${response.status}, body: ${errorBody}`);
        }

        const data = await response.json();
        console.log("Received data:", data);

        setTasks(data.tasks || []);
      } catch (err) {
        console.error("Error fetching tasks:", err);
        setError(`Failed to load tasks: ${err.message}`);
        setTasks([]); // Clear tasks instead of using dummy data
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, [filter]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilter(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleClearFilters = () => {
    setFilter({
      category: "",
      fromDate: "",
      toDate: ""
    });
  };

  if (loading) return <div className="loading-container">Loading tasks...</div>;

  return (
    <div className="task-feed">
      <h2>Available Tasks</h2>
      
      {/* Filter Controls */}
      <div className="filter-controls">
        <div className="filter-group">
          <label>Category:</label>
          <select 
            name="category" 
            value={filter.category} 
            onChange={handleFilterChange}
          >
            <option value="">All Categories</option>
            <option value="Plumbing">Plumbing</option>
            <option value="HouseShifting">House Shifting</option>
            <option value="Carpentry">Carpentry</option>
            <option value="Cleaning">Cleaning</option>
            <option value="Electrical">Electrical</option>
            <option value="Painting">Painting</option>
            <option value="Gardening">Gardening</option>
            <option value="Tutoring">Tutoring</option>
            <option value="ComputerHelp">Computer Help</option>
            <option value="Other">Other</option>
          </select>
        </div>
        
        <div className="filter-group">
          <label>From Date:</label>
          <input 
            type="date" 
            name="fromDate" 
            value={filter.fromDate} 
            onChange={handleFilterChange}
          />
        </div>
        
        <div className="filter-group">
          <label>To Date:</label>
          <input 
            type="date" 
            name="toDate" 
            value={filter.toDate} 
            onChange={handleFilterChange}
          />
        </div>
        
        <button 
          className="clear-filters-btn" 
          onClick={handleClearFilters}
        >
          Clear Filters
        </button>
      </div>
      
      {error && <div className="error-message">{error}</div>}
      
      <div className="tasks-container">
        {tasks.length > 0 ? (
          tasks.map((task) => (
            <TaskCard key={task.id || task._id} task={task} />
          ))
        ) : (
          <div className="no-tasks-message">
            <p>No tasks available at the moment.</p>
            <p>Check back later or adjust your filters.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskFeed;
