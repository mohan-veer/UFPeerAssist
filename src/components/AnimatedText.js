import React, { useState, useEffect } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import "../styles/AnimatedText.css"; // Importing CSS file

const AnimatedText = ({ text }) => {
  const [words, setWords] = useState([]);
  const wordArray = text.split(" ");

  useEffect(() => {
    let index = 0;
    setWords([]); // To reset words on each page visit

    const interval = setInterval(() => {
      if (index < wordArray.length) {
        setWords((prev) => [...prev, wordArray[index]]);
        index++;
      } else {
        clearInterval(interval);
      }
    }, 400); // Speed per word

    return () => clearInterval(interval);
  }, [text]); // To restart animation when text changes or page reloads

  return (
    <div className="animated-text-container">
      <h1 className="display-4 fw-bold italian-text">
        {words.join(" ")}
      </h1>
    </div>
  );
};

export default AnimatedText;
