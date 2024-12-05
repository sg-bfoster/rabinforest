import React, { useEffect, useState } from 'react';

function SlideOutPanel({ isPanelOpen, togglePanel, persistentLinks, isDesktop }) {

  const [links, setLinks] = useState([]);

  useEffect(() => {
    // Function to load persistent links from localStorage
    const loadPersistentLinks = () => {
      const storedLinks = localStorage.getItem('persistentLinks');
      return storedLinks ? JSON.parse(storedLinks) : [];
    };
  
    // Initial load of persistent links
    setLinks(loadPersistentLinks());
  
    // Set up interval to check for changes in persistent links
    const intervalId = setInterval(() => {
      setLinks(loadPersistentLinks());
      console.log('Checking for new links...', loadPersistentLinks());
    }, 4000); // Check every 4 seconds -- going to clean this up and use redux
  
    // Cleanup interval on component unmount
    return () => {
      clearInterval(intervalId);
    };
  }, []);

  return (
    <div className={`slideout-panel ${isPanelOpen ? 'open' : ''}`}>
      <div className="slideout-header">
        {!isDesktop && (
          <button className="toggle-panel-btn" onClick={togglePanel}>
            Close
          </button>
        )}
        <h2>Links</h2>
      </div>
      <div className="slideout-links">
        {links.length > 0 ? (
          links.map((link, index) => (
            <p key={index}>
              <a href={link.url} target="_blank" rel="noopener noreferrer">
                {link.text}
              </a>
            </p>
          ))
        ) : (
          <p>No links available</p>
        )}
      </div>
    </div>
  );
}

export default SlideOutPanel;
