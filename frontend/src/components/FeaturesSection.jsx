import React from "react";
import "../styles/FeaturesSection.css";

const featuresData = [
  {
    icon: "📝",
    title: "Post Tasks Easily",
    description: "Share tasks you need help with quickly and effortlessly.",
  },
  {
    icon: "✅",
    title: "Accept Tasks Freely",
    description: "Browse tasks from fellow UF students and offer your assistance.",
  },
  {
    icon: "🔔",
    title: "Real-Time Notifications",
    description: "Receive instant updates about task activities and communications.",
  },
  {
    icon: "🔒",
    title: "Secure Payments",
    description: "Enjoy secure, hassle-free payment processing for every transaction.",
  },
];

const FeaturesSection = () => {
  return (
    <section className="features-section">
      <h2 className="features-title">Platform Features</h2>
      <div className="features-container">
        {featuresData.map((feature, index) => (
          <div key={index} className="feature-card">
            <div className="feature-icon">{feature.icon}</div>
            <h3 className="feature-card-title">{feature.title}</h3>
            <p className="feature-card-description">{feature.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default FeaturesSection;
