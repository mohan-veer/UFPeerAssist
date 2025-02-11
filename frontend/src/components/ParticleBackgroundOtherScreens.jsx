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
          color: "transparent", 
        },
        particles: {
          number: {
            value: 90, // Slightly increased count
            density: {
              enable: true,
              value_area: 900, // Keeps spread balanced
            },
          },
          color: {
            value: "#7d7d7d", // 🟠 Slightly darker gray for visibility
          },
          shape: {
            type: "circle",
          },
          opacity: {
            value: 0.6, // 🟠 Increased opacity for better visibility
            random: true,
          },
          size: {
            value: 4, // Slightly larger particles
            random: true,
          },
          links: {
            enable: true,
            distance: 150,
            color: "#a3a3a3", // 🟠 Soft gray for smooth appearance
            opacity: 0.5, // 🟠 Made slightly more visible
            width: 1.2,
          },
          move: {
            enable: true,
            speed: 0.3, // Keeps movement slow and smooth
            direction: "none",
            random: false,
            straight: false,
            out_mode: "out",
          },
        },
        interactivity: {
          events: {
            onHover: {
              enable: true,
              mode: "repulse",
            },
            onClick: {
              enable: true,
              mode: "push",
            },
          },
          modes: {
            repulse: {
              distance: 120,
              duration: 0.4,
            },
          },
        },
        detectRetina: true,
      }}
    />
  );
};

export default ParticleBackground;
