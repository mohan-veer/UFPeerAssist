import React from "react";
import AnimatedText from "./AnimatedText";
import ParticleBackground from "./ParticleBackground"; // Import the particle background
import Footer from "./Footer";

const HomePage = () => {
  return (
    <div className="home-container">
      <ParticleBackground/> {/* Add this line to include the effect */}
      <h1>Welcome to Our Website</h1>
      <AnimatedText text="This is a platform exclusively designed for University of Florida students to connect, collaborate, and assist each other with tasks." />
      <h2>Features of Our Website</h2>
      <ul className="list-unstyled">
        <li>✔ Students can post and accept tasks without role restrictions.</li>
        <li>✔ Real-time notifications for task updates and communications.</li>
        <li>✔ Exclusively for UF students, ensuring a trusted user base.</li>
      </ul>
    </div>
  );
};

export default HomePage;
