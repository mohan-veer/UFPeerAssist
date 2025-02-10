import React, { useState } from "react";
import "./App.css";
import LoginIcon from "./components/LoginIcon";
import LoginPage from "./components/LoginPage";

function App() {
  const [message, setMessage] = useState("");
  const [showLogin, setShowLogin] = useState(false);

  // Function to fetch message from go backend
  const fetchMessage = async () => {
    try {
      const response = await fetch("http://localhost:8080/api/home/button");
      const data = await response.json();
      setMessage(data.message);
    } catch (error) {
      console.error("Error fetching message:", error);
    }
  };

  return (
    <div className="app-container" style={{ position: "relative" }}>
      <LoginIcon onClick={() => setShowLogin(true)} />
      <h1 className="title">UF Peer Assist</h1>
      <button className="fetch-button" onClick={fetchMessage}>
        Get Message from Backend
      </button>
      {message && <p className="message">{message}</p>}

      {showLogin && (
        <div style={modalStyles.overlay} onClick={() => setShowLogin(false)}>
          <div style={modalStyles.modal} onClick={(e) => e.stopPropagation()}>
            <LoginPage onClose={() => setShowLogin(false)} />
          </div>
        </div>
      )}
    </div>
  );
}

const modalStyles = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2000,
  },
  modal: {
    backgroundColor: "#fff",
    padding: "20px",
    borderRadius: "6px",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
  },
};

export default App;
