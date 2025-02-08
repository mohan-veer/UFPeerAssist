import React, { useState } from "react";
import "./App.css"; // Ensure to add styles for better alignment

function App() {
  const [message, setMessage] = useState("");

  // Function to fetch message from Go backend
  const fetchMessage = async () => {
    try {
      const response = await fetch("http://localhost:8080/api/home/button");
      const data = await response.json();
      setMessage(data.message); // Set the received message in state
    } catch (error) {
      console.error("Error fetching message:", error);
    }
  };

  return (
    <div className="app-container">
      <h1 className="title">UF Peer Assist</h1>
      <button className="fetch-button" onClick={fetchMessage}>
        Get Message from Backend
      </button>
      {message && <p className="message">{message}</p>} {/* Display message */}
    </div>
  );
}

export default App;
