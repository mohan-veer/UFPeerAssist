import React from "react";
import "../styles/UserProfile.css";

const UserProfile = () => {
  return (
    <div className="user-profile">
      {/* Profile Header */}
      <div className="profile-header">
        <img
          className="avatar"
          src="https://via.placeholder.com/120"
          alt="User Avatar"
        />
        <h1>Deepika</h1>
        <p className="username">@deepika</p>
        <button className="edit-btn">Edit Profile</button>
      </div>

      {/* Profile Body */}
      <div className="profile-body">
        {/* About Section */}
        <section className="about">
          <h2>About Me</h2>
          <p>
            I'm a passionate University of Florida student with a love for
            coding, design, and community service. I enjoy collaborating on
            innovative projects and connecting with fellow students.
          </p>
        </section>

        {/* Contact Information */}
        <section className="contact">
          <h2>Contact Information</h2>
          <ul>
            <li>
              <strong>Email:</strong> deepika@example.com
            </li>
            <li>
              <strong>Phone:</strong> (555) 123-4567
            </li>
          </ul>
        </section>

        {/* Interests Section */}
        <section className="interests">
          <h2>Interests &amp; Skills</h2>
          <ul>
            <li>Coding</li>
            <li>Design</li>
            <li>Reading</li>
            <li>Project Management</li>
            <li>Community Service</li>
          </ul>
        </section>

        {/* Activity Statistics */}
        <section className="stats">
          <h2>Activity</h2>
          <div className="stats-container">
            <div className="stat">
              <span className="number">25</span>
              <span className="label">Tasks Completed</span>
            </div>
            <div className="stat">
              <span className="number">10</span>
              <span className="label">Posts</span>
            </div>
            <div className="stat">
              <span className="number">4.8</span>
              <span className="label">Rating</span>
            </div>
          </div>
        </section>
      </div>

      {/* Profile Footer */}
      <div className="profile-footer">
        <button className="message-btn">Message</button>
      </div>
    </div>
  );
};

export default UserProfile;
