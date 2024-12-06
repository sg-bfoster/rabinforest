import React from 'react';
import { useSelector } from 'react-redux';

function SlideOutPanel({ isPanelOpen, togglePanel, isDesktop }) {
  // Select persistentLinks from the Redux store
  const links = useSelector((state) => state.assistant.persistentLinks);

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