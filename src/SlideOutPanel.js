import React from 'react';

function SlideOutPanel({ isPanelOpen, togglePanel, persistentLinks, isDesktop }) {
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
        {persistentLinks.length > 0 ? (
          persistentLinks.map((link, index) => (
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
