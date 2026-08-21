import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { clearLinks } from '../features/assistantSlice';
import { isSelfLink } from '../utils/linkUtils';
import {
  isInlineImageUrl,
  isExpiredImageLink,
  openImageInNewTab,
  resolveImageLinkUrl,
} from '../utils/imageUrl';

// Floating panel on the right that collects links as the conversation builds.
// On narrow viewports it collapses to a "Links · n" toggle so it never
// overlaps the content column.
const LinksPanel = () => {
  const dispatch = useDispatch();
  const [isOpen, setIsOpen] = useState(false);
  const links = useSelector((state) => state.assistant.persistentLinks);
  const filteredLinks = Array.isArray(links) ? links.filter((l) => !isSelfLink(l?.url)) : [];

  if (filteredLinks.length === 0) return null;

  const handleLinkClick = (e, link) => {
    if (link.isImage || isInlineImageUrl(link.url) || isInlineImageUrl(link.dataUrl)) {
      e.preventDefault();
      openImageInNewTab(resolveImageLinkUrl(link), link.text);
    }
  };

  return (
    <>
      <button
        type="button"
        className="links-panel-toggle"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        Links · {filteredLinks.length}
      </button>
      <aside className={`links-panel${isOpen ? ' open' : ''}`} aria-label="Collected links">
        <div className="links-panel-header">
          <span className="links-panel-label">Links</span>
          <button
            type="button"
            className="links-panel-close"
            onClick={() => setIsOpen(false)}
            aria-label="Close links panel"
          >
            ×
          </button>
        </div>
        <div className="links-panel-list">
          {filteredLinks.map((link, index) => {
            const imageUrl = resolveImageLinkUrl(link);
            const isImageLink = link.isImage || isInlineImageUrl(imageUrl);
            const expired = isImageLink && isExpiredImageLink(imageUrl);
            return (
              <a
                key={index}
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
            );
          })}
        </div>
        <button type="button" className="btn btn-ghost links-panel-clear" onClick={() => dispatch(clearLinks())}>
          Clear
        </button>
      </aside>
    </>
  );
};

export default LinksPanel;
