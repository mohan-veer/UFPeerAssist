// import React, { useEffect, useState } from "react";
// import { Link } from "react-router-dom";
// import logo from "../assets/images/logo.jpg";
// import gator from "../assets/images/Florida_Gators_gator_logo.png";
// import "../styles/HeroSection.css";

// const HeroSection = () => {
//   const title = "UF Peer Assistance Platform";
//   const [animatedText, setAnimatedText] = useState("");

//   useEffect(() => {
//     let index = 0;
//     let newText = ""; 

//     const interval = setInterval(() => {
//       if (index < title.length) {
//         newText += title[index];
//         setAnimatedText(newText);
//         index++;
//       } else {
//         clearInterval(interval);
//       }
//     }, 100); // Adjust animation speed

//     return () => clearInterval(interval);
//   }, []);

//   return (
//     <section className="hero-section">
//       {/* Navbar with logos */}
//       <nav className="navbar">
//         <div className="navbar-logos">
//           <img src={gator} alt="Gator Logo" className="gator-logo" />
//           <img src={logo} alt="UPFA Logo" className="upfa-logo" />
//         </div>
//       </nav>

//       {/* Hero content */}
//       <h1 className="animated-title">{animatedText}</h1>
//       <div className="hero-content">
//         <h2 className="hero-title">Connect, Collaborate, Assist</h2>
//         <p className="hero-subtitle">Exclusively for UF Students</p>
//         <div className="hero-cta">
//           <Link to="/register" className="hero-button signup">Sign Up</Link>
//           <Link to="/login" className="hero-button login">Log In</Link>
//         </div>
//       </div>
//     </section>
//   );
// };

// export default HeroSection;


import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import logo from "../assets/images/logo.jpg";
import gator from "../assets/images/Florida_Gators_gator_logo.png";
import "../styles/HeroSection.css";

const HeroSection = () => {
  const title = "UF Peer Assistance Platform";
  const [animatedText, setAnimatedText] = useState("");

  useEffect(() => {
    let index = 0;
    let newText = "";

    const interval = setInterval(() => {
      if (index < title.length) {
        newText += title[index];
        setAnimatedText(newText);
        index++;
      } else {
        clearInterval(interval);
      }
    }, 100);

    return () => clearInterval(interval);
  }, []);

  return (
    <section className="hero-section">
      {/* UFPA logo positioned in the top-right */}
      <img src={logo} alt="UPFA Logo" className="upfa-logo" />

      {/* Title with Gator logo to the left */}
      <div className="title-container">
        <img src={gator} alt="Gator Logo" className="gator-logo" />
        <h1 className="animated-title">{animatedText}</h1>
      </div>

      {/* Hero content */}
      <div className="hero-content">
        <h2 className="hero-title">Connect, Collaborate, Assist</h2>
        <p className="hero-subtitle">Exclusively for UF Students</p>
        <div className="hero-cta">
          <Link to="/register" className="hero-button signup">Sign Up</Link>
          <Link to="/login" className="hero-button login">Log In</Link>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;

