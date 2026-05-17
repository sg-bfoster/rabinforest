import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { clearLinks } from './features/assistantSlice';
import { isSelfLink } from './utils/linkUtils';
import { isInlineImageUrl, isExpiredImageLink, openImageInNewTab, resolveImageLinkUrl } from './utils/imageUrl';

function SlideOutPanel({ isPanelOpen, togglePanel, isDesktop }) {

  const dispatch = useDispatch();
  // Select persistentLinks from the Redux store
  const links = useSelector((state) => state.assistant.persistentLinks);

  const filteredLinks = Array.isArray(links) ? links.filter((l) => !isSelfLink(l?.url)) : [];

  const handleClearLinks = () => {
    dispatch(clearLinks());
  };

  const handleLinkClick = (e, link) => {
    if (link.isImage || isInlineImageUrl(link.url) || isInlineImageUrl(link.dataUrl)) {
      e.preventDefault();
      const imageUrl = resolveImageLinkUrl(link);
      openImageInNewTab(imageUrl, link.text);
    }
  };

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
            {filteredLinks.map((link, index) => {
              const imageUrl = resolveImageLinkUrl(link);
              const isImageLink = link.isImage || isInlineImageUrl(imageUrl);
              const expired = isImageLink && isExpiredImageLink(imageUrl);
              return (
                <p key={index}>
                  <a
                    href={isImageLink ? '#' : link.url}
                    target={isImageLink ? undefined : '_blank'}
                    rel={isImageLink ? undefined : 'noopener noreferrer'}
                    onClick={(e) => handleLinkClick(e, link)}
                    className={expired ? 'link-expired' : undefined}
                    title={expired ? 'This link has expired — clear links or regenerate' : undefined}
                  >
                    {link.text}
                    {expired ? ' (expired)' : ''}
                  </a>
                </p>
              );
            })}

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