// TaskFeed.jsx
import React from "react";
import TaskCard from "./TaskCard";
import "../styles/TaskFeed.css";

// Function to generate dummy tasks dynamically
const generateDummyTasks = (numTasks) => {
  const tasks = [];
  const names = ["Alice", "Bob", "Charlie", "David", "Eve"];
  for (let i = 1; i <= numTasks; i++) {
    // Pick a random postedBy name
    const randomName = names[Math.floor(Math.random() * names.length)];
    // Generate a random deadline between 1 and 30 days from now
    const randomDeadline = new Date();
    randomDeadline.setDate(randomDeadline.getDate() + Math.floor(Math.random() * 30) + 1);
    const deadlineStr = randomDeadline.toISOString().split("T")[0];
    
    tasks.push({
      id: i,
      title: `Task ${i}`,
      description: `This is a description for Task ${i}. Need assistance or further details provided here.`,
      postedBy: randomName,
      deadline: deadlineStr,
    });
  }
  return tasks;
};

const dummyTasks = generateDummyTasks(50);

const TaskFeed = () => {
  return (
    <div className="task-feed">
      <h2>Available Tasks</h2>
      <div className="tasks">
        {dummyTasks.map((task) => (
          <TaskCard key={task.id} task={task} />
        ))}
      </div>
    </div>
  );
};

export default TaskFeed;
