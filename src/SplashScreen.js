// src/components/SplashScreen.js
import React, { useEffect, useState } from 'react';
import './SplashScreen.css';

const SplashScreen = () => {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // Set a timeout to hide the splash screen after 2.5 seconds
    const timer = setTimeout(() => {
      setFadeOut(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={`splash-screen ${fadeOut ? 'fade-out' : ''}`}>
      <div className="splash-logo">
        <img src="/favicon.png" alt="Logo" />
      </div>
    </div>
  );
};

export default SplashScreen;