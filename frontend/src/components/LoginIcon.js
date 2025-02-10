import React from "react";

const LoginIcon = ({ onClick }) => {
  return (
    <div
      style={{
        position: "absolute",
        top: "10px",
        right: "10px",
        padding: "5px 10px",
        backgroundColor: "#f0f0f0",
        border: "1px solid #ccc",
        borderRadius: "4px",
        fontWeight: "bold",
        cursor: "pointer",
        zIndex: 1000,
      }}
      onClick={onClick}
    >
      Login
    </div>
  );
};

export default LoginIcon;
