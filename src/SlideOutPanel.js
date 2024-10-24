import React from 'react';

function SlideOutPanel({ isPanelOpen, togglePanel, persistentLinks, isDesktop }) {
  return (
    <div className={`slideout-panel ${isPanelOpen ? 'open' : ''}`}>
      <div>
      {!isDesktop && <button className="toggle-panel-btn" onClick={togglePanel}>
          Close
        </button> }
        <h2>Links</h2>
        <hr />
        {persistentLinks.length > 0 ? (
          <div>
            {persistentLinks.map((link, index) => (
              <p key={index}>
                <a href={link} target="_blank" rel="noopener noreferrer">{link}</a>
              </p>
            ))}
          </div>
        ) : (
          <p>No links available</p>
        )}
        <hr />
      </div>
    </div>
  );
}

export default SlideOutPanel;
