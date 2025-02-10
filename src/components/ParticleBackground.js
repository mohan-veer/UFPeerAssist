import React from "react";
import Particles from "react-tsparticles";
import { loadSlim } from "tsparticles-slim";

const ParticleBackground = () => {
  const particlesInit = async (engine) => {
    await loadSlim(engine);
  };

  return (
    <Particles
      id="tsparticles"
      init={particlesInit}
      options={{
        background: {
          color: "transparent", // ✅ Keeps original background color
        },
        particles: {
          number: {
            value: 100, // ✅ Balanced particle count
            density: {
              enable: true,
              value_area: 800, // ✅ Keeps spacing balanced
            },
          },
          color: {
            value: "#555555", // ✅ Darker gray for higher visibility
          },
          shape: {
            type: "circle",
          },
          opacity: {
            value: 0.7, // ✅ Increased opacity to make particles clearer
            random: true,
          },
          size: {
            value: 4.5, // ✅ Slightly larger particles for better visibility
            random: true,
          },
          links: {
            enable: true,
            distance: 140,
            color: "#777777", // ✅ Slightly darker link color
            opacity: 0.6, // ✅ Increased opacity for better link visibility
            width: 1.3, // ✅ Thicker links to make them clearer
          },
          move: {
            enable: true,
            speed: 0.3, // ✅ Slow and smooth movement
            direction: "none",
            random: false,
            straight: false,
            out_mode: "out",
          },
        },
        interactivity: {
          detect_on: "canvas",
          events: {
            onHover: {
              enable: false, // ❌ Disables hover movement
            },
            onClick: {
              enable: false, // ❌ Disables particle movement on click
            },
          },
        },
        detectRetina: true,
      }}
    />
  );
};

export default ParticleBackground;
