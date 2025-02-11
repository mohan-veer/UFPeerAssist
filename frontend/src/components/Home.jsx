import React from "react";
import { Link } from "react-router-dom";
import logo from "../assets/images/logo.jpg"; // Adjust the path as necessary
import "../styles/Home.css"; // Import CSS for Home page styling

function Home() {
  return (
    <div>
      <header>
        <nav className="navbar">
          <div className="navbar-left">
            <img src={logo} alt="UF Peer Assist Logo" className="logo" />
          </div>
          <div className="navbar-right">
            <Link to="/login" className="nav-button">Login</Link>
            <Link to="/register" className="nav-button">Register</Link>
          </div>
        </nav>
      </header>
      <main className="home-content">
        <h1>Welcome to UF Peer Assist</h1>
        <p>Your go-to platform for peer assistance.</p>
      </main>
    </div>
  );
}

export default Home;
