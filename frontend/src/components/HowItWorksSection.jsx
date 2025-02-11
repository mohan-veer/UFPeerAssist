import React from "react";
import "../styles/HowItWorksSection.css";

const steps = [
  {
    icon: "🔑",
    title: "Sign Up",
    description: "Register using your UF email address.",
  },
  {
    icon: "📝",
    title: "Post/Accept Tasks",
    description: "Create tasks you need help with or offer assistance.",
  },
  {
    icon: "🤝",
    title: "Collaborate",
    description: "Engage with fellow UF students and get things done.",
  },
];

const HowItWorksSection = () => {
  return (
    <section className="how-it-works">
      <h2 className="section-title">How It Works</h2>
      <div className="steps-container">
        {steps.map((step, index) => (
          <div key={index} className="step-card">
            <div className="step-icon">{step.icon}</div>
            <h3 className="step-title">{step.title}</h3>
            <p className="step-description">{step.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default HowItWorksSection;
