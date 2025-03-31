import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardHeader from "./DashboardHeader";
import { getUserEmailFromToken, isAuthenticated } from "../utils/auth";
import "../styles/PostTask.css";

const PostTask = () => {
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState("");
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    task_time: "",
    task_date: "",
    estimated_pay_rate: "",
    place_of_work: "",
    work_type: "Other",
    people_needed: 1
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const workTypes = [
    "Plumbing", "HouseShifting", "Carpentry", "Cleaning", 
    "Electrical", "Painting", "Gardening", "Tutoring", 
    "ComputerHelp", "Other"
  ];

  // Check authentication and get user email on component mount
  useEffect(() => {
    if (!isAuthenticated()) {
      navigate("/login");
      return;
    }
    
    const email = getUserEmailFromToken();
    if (email) {
      setUserEmail(email);
    } else {
      setError("Unable to identify user. Please log in again.");
    }
  }, [navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === "estimated_pay_rate" || name === "people_needed" 
        ? parseFloat(value) 
        : value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsSubmitting(true);

    if (!userEmail) {
      setError("User email not available. Please log in again.");
      setIsSubmitting(false);
      return;
    }

    const token = localStorage.getItem("token");
    
    try {
      const response = await fetch(`http://localhost:8080/users/${userEmail}/post_task`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      
      if (response.ok) {
        setSuccess("Task posted successfully!");
        // Reset form
        setFormData({
          title: "",
          description: "",
          task_time: "",
          task_date: "",
          estimated_pay_rate: "",
          place_of_work: "",
          work_type: "Other",
          people_needed: 1
        });
      } else {
        setError(data.error || "Failed to post task");
      }
    } catch (err) {
      console.error("Error posting task:", err);
      setError("Connection error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <DashboardHeader />
      <div className="post-task-container">
        <h2>Post a New Task</h2>
        
        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}
        
        <form onSubmit={handleSubmit}>
          {/* Form fields remain the same */}
          <div className="form-group">
            <label htmlFor="title">Task Title</label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="4"
              required
            ></textarea>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="task_date">Date</label>
              <input
                type="date"
                id="task_date"
                name="task_date"
                value={formData.task_date}
                onChange={handleChange}
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="task_time">Time</label>
              <input
                type="time"
                id="task_time"
                name="task_time"
                value={formData.task_time}
                onChange={handleChange}
                required
              />
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="estimated_pay_rate">Estimated Pay Rate ($)</label>
              <input
                type="number"
                id="estimated_pay_rate"
                name="estimated_pay_rate"
                value={formData.estimated_pay_rate}
                onChange={handleChange}
                min="0"
                step="0.01"
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="people_needed">People Needed</label>
              <input
                type="number"
                id="people_needed"
                name="people_needed"
                value={formData.people_needed}
                onChange={handleChange}
                min="1"
                required
              />
            </div>
          </div>
          
          <div className="form-group">
            <label htmlFor="place_of_work">Place of Work</label>
            <input
              type="text"
              id="place_of_work"
              name="place_of_work"
              value={formData.place_of_work}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="work_type">Work Type</label>
            <select
              id="work_type"
              name="work_type"
              value={formData.work_type}
              onChange={handleChange}
              required
            >
              {workTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          
          <button 
            type="submit" 
            className="submit-button"
            disabled={isSubmitting || !userEmail}
          >
            {isSubmitting ? "Posting..." : "Post Task"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default PostTask;
