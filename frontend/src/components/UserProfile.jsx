import React, { useEffect, useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import { getUserEmailFromToken } from "../utils/auth";
import DashboardHeader from "./DashboardHeader";
import "../styles/UserProfile.css";

const UserProfile = () => {
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const params = useParams();
  const location = useLocation();
  
  // Get the email from URL params or query string, or use the logged-in user's email
  const getProfileEmail = () => {
    // Check if email is in URL params
    if (params.email) {
      return params.email;
    }
    
    // Check if email is in query string
    const queryParams = new URLSearchParams(location.search);
    const emailParam = queryParams.get('email');
    if (emailParam) {
      return emailParam;
    }
    
    // Default to logged-in user
    return getUserEmailFromToken();
  };
  
  useEffect(() => {
    const fetchUserProfile = async () => {
      setLoading(true);
      setError("");
      
      try {
        const email = getProfileEmail();
        if (!email) {
          throw new Error("No email found for profile");
        }
        
        const response = await fetch(`http://localhost:8080/users/${email}/profileinfo`, {
          headers: {
            "Authorization": `Bearer ${localStorage.getItem("token")}`
          }
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch profile: ${response.status}`);
        }
        
        const data = await response.json();
        setUserProfile(data);
      } catch (err) {
        console.error("Error fetching user profile:", err);
        setError(`Failed to load user profile: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserProfile();
  }, [params.email, location.search]);
  
  const isCurrentUser = () => {
    const loggedInEmail = getUserEmailFromToken();
    return loggedInEmail === userProfile?.email;
  };

  if (loading) {
    return (
      <div>
        <DashboardHeader />
        <div className="profile-loading">Loading profile...</div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div>
        <DashboardHeader />
        <div className="profile-error">{error}</div>
      </div>
    );
  }
  
  if (!userProfile) {
    return (
      <div>
        <DashboardHeader />
        <div className="profile-not-found">User profile not found</div>
      </div>
    );
  }
  
  // Generate initials for the avatar if no profile image
  const getInitials = () => {
    if (!userProfile.name) return "?";
    return userProfile.name
      .split(" ")
      .map(name => name[0])
      .join("")
      .toUpperCase();
  };
  
  return (
    <div>
      <DashboardHeader />
      <div className="user-profile">
        {/* Profile Header */}
        <div className="profile-header">
          <div className="avatar-container">
            {userProfile.profileImage ? (
              <img
                className="avatar"
                src={userProfile.profileImage}
                alt={`${userProfile.name}'s profile`}
              />
            ) : (
              <div className="avatar avatar-initials">{getInitials()}</div>
            )}
          </div>
          <h1>{userProfile.name || "User"}</h1>
          <p className="username">{userProfile.email}</p>
          {isCurrentUser() && (
            <button className="edit-btn">Edit Profile</button>
          )}
        </div>

        {/* Profile Body */}
        <div className="profile-body">
          {/* About Section */}
          <section className="about">
            <h2>About Me</h2>
            <p>
              {userProfile.bio || "No bio information available."}
            </p>
          </section>

          {/* Contact Information */}
          <section className="contact">
            <h2>Contact Information</h2>
            <ul>
              <li>
                <strong>Email:</strong> {userProfile.email}
              </li>
              <li>
                <strong>Phone:</strong> {userProfile.mobile || "Not provided"}
              </li>
            </ul>
          </section>

          {/* User's skills section could be added if you have that data */}
          {userProfile.skills && userProfile.skills.length > 0 && (
            <section className="interests">
              <h2>Skills</h2>
              <ul>
                {userProfile.skills.map((skill, index) => (
                  <li key={index}>{skill}</li>
                ))}
              </ul>
            </section>
          )}

          {/* Activity Statistics */}
          <section className="stats">
            <h2>Activity</h2>
            <div className="stats-container">
              <div className="stat">
                <span className="number">{userProfile.completed_tasks || 0}</span>
                <span className="label">Tasks Completed</span>
              </div>
              <div className="stat">
                <span className="number">{userProfile.rating || "N/A"}</span>
                <span className="label">Rating</span>
              </div>
            </div>
          </section>
        </div>

        {/* Profile Footer - only show message button if viewing another user's profile */}
        {!isCurrentUser() && (
          <div className="profile-footer">
            <button className="message-btn">Message</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserProfile;