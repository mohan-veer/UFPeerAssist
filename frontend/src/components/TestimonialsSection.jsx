import React from "react";
import "../styles/TestimonialsSection.css";

const testimonialsData = [
  {
    name: "Alice Johnson",
    role: "Undergraduate Student",
    testimonial:
      "UFPeerAssist has been instrumental in connecting me with peers who can help with challenging assignments. The real-time notifications make it feel lively and trustworthy.",
    image: "https://via.placeholder.com/80",
  },
  {
    name: "Bob Smith",
    role: "Graduate Student",
    testimonial:
      "The platform's secure payment system and seamless collaboration features have made task exchange effortless. It's a lifeline for students here.",
    image: "https://via.placeholder.com/80",
  },
  {
    name: "Cathy Brown",
    role: "UF Student",
    testimonial:
      "I love how easy it is to find assistance and offer help on tasks. UFPeerAssist truly understands the student community.",
    image: "https://via.placeholder.com/80",
  },
];

const TestimonialsSection = () => {
  return (
    <section className="testimonials-section">
      <h2 className="testimonials-title">What Our Users Say</h2>
      <div className="testimonials-container">
        {testimonialsData.map((testimonial, index) => (
          <div key={index} className="testimonial-card">
            <img
              src={testimonial.image}
              alt={testimonial.name}
              className="testimonial-image"
            />
            <h3 className="testimonial-name">{testimonial.name}</h3>
            <p className="testimonial-role">{testimonial.role}</p>
            <p className="testimonial-text">"{testimonial.testimonial}"</p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default TestimonialsSection;
