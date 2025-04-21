import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import logo from "../assets/images/logo.jpg";
import { getUserEmailFromToken, logout } from "../utils/auth";
import "../styles/DashboardHeader.css";

const DashboardHeader = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const email = getUserEmailFromToken();
        if (!email) {
          return;
        }

        const response = await fetch(`http://localhost:8080/users/${email}/profileinfo`, {
          headers: {
            "Authorization": `Bearer ${localStorage.getItem("token")}`
          }
        });

        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // Generate initials for the avatar if no profile image
  const getInitials = () => {
    if (!user || !user.name) return "U";
    return user.name
      .split(" ")
      .map(name => name[0])
      .join("")
      .toUpperCase();
  };

  return (
    <header className="dashboard-header">
      <div className="logo">
        <Link to="/dashboard">
          <img src={logo} alt="UF Peer Assist Logo" className="logo" />
        </Link>
      </div>
      <nav className="header-nav">
        <ul>
          <li><Link to="/dashboard">Home</Link></li>
          <li><Link to="/post-task">Post a Task</Link></li>
          <li><Link to="/notifications">Notifications</Link></li>
        </ul>
      </nav>
      <div className="profile-section">
        <Link to="/profile" className="profile-link">
          {user && user.profileImage ? (
            <img src={user.profileImage} alt="Profile" />
          ) : (
            <div className="avatar-initials">{!loading ? getInitials() : ""}</div>
          )}
          <span>{user ? user.name : "Loading..."}</span>
        </Link>
        <button className="logout-button" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </header>
  );
};

export default DashboardHeader;