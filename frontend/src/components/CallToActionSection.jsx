import React from "react";
import { Link } from "react-router-dom";
import "../styles/CallToActionSection.css";

const CallToActionSection = () => {
  return (
    <section className="call-to-action">
      <h2 className="cta-title">Join the UF Peer Assist Community Today!</h2>
      <p className="cta-subtitle">
        Connect with fellow UF students, find help, or lend a hand at a moment's notice.
      </p>
      <div className="cta-buttons">
        <Link to="/register" className="cta-button register">Sign Up</Link>
        <Link to="/login" className="cta-button login">Log In</Link>
      </div>
    </section>
  );
};

export default CallToActionSection;
