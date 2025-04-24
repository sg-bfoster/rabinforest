import React, { useState } from 'react';
import './EmmaSplashPage.css';

const EmmaSplashPage = () => {
  const [isVisible, setIsVisible] = useState(false);

  // Add a small delay for animation
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="emma-splash-container">
      <div className={`emma-splash-content ${isVisible ? 'visible' : ''}`}>
        <div className="emma-header">
          <h1>Emma Jane's World</h1>
          <div className="emma-divider"></div>
        </div>
        
        <div className="emma-main-content">
          <div className="emma-image-container">
            <img 
              src="/cartoonEFBunny2.png" 
              alt="Emma Jane's Cartoon Bunny" 
              className="emma-bunny-image"
            />
          </div>
          
          <div className="emma-text-content">
            <h2>Welcome to Emma Jane's Special Place</h2>
            <p>
              Hi there! I'm Emma Jane, and this is my best friend, Bunny. We're excited to have you visit!
            </p>
            
            <p>
              I love creating art, stories, and exploring new ideas. Bunny helps me on all my adventures!
            </p>
          </div>
        </div>
        
        <div className="emma-footer">
          <p>© {new Date().getFullYear()} Emma Jane Foster</p>
        </div>
      </div>
    </div>
  );
};

export default EmmaSplashPage; 