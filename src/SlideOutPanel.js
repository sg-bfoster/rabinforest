import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { clearLinks } from './features/assistantSlice';

function SlideOutPanel({ isPanelOpen, togglePanel, isDesktop }) {

  const dispatch = useDispatch();
  // Select persistentLinks from the Redux store
  const links = useSelector((state) => state.assistant.persistentLinks);

  const isSelfLink = (url) => {
    if (!url || typeof url !== 'string') return false;

    // Filter relative links to same origin (including "/")
    if (!/^https?:\/\//i.test(url)) {
      try {
        if (typeof window !== 'undefined') {
          const resolved = new URL(url, window.location.origin);
          return resolved.hostname === window.location.hostname;
        }
      } catch {
        // ignore
      }
      return url === '/';
    }

    // Filter only Rabin Forest root domain (keep subdomains like fmp.rabinforest.com)
    try {
      const parsed = new URL(url);
      const host = (parsed.hostname || '').toLowerCase();
      return host === 'rabinforest.com' || host === 'www.rabinforest.com';
    } catch {
      return false;
    }
  };

  const filteredLinks = Array.isArray(links) ? links.filter((l) => !isSelfLink(l?.url)) : [];

  const handleClearLinks = () => {
    // Dispatch an action to clear the links
    dispatch(clearLinks());
  }

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
        {filteredLinks.length > 0 ? (
          <>
            {filteredLinks.map((link, index) => (
              <p key={index}>
                <a href={link.url} target="_blank" rel="noopener noreferrer">
                  {link.text}
                </a>
              </p>
            ))}

          </>
        ) : (
          <p>No links available</p>
        )}
      </div>
      <div className="clear-links-btn">
        {links.length > 0 && (
          <button onClick={handleClearLinks}>
            Clear Links
          </button>
        )}
      </div>
    </div>
  );
}

export default SlideOutPanel;