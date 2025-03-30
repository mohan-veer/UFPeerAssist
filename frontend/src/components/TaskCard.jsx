// TaskCard.jsx
import React from "react";
import "../styles/TaskCard.css";

const TaskCard = ({ task }) => {
  return (
    <div className="task-card">
      <h3>{task.title}</h3>
      <p>{task.description}</p>
      <p><strong>Posted By:</strong> {task.postedBy}</p>
      <p><strong>Deadline:</strong> {task.deadline}</p>
      <button>Accept Task</button>
    </div>
  );
};

export default TaskCard;
