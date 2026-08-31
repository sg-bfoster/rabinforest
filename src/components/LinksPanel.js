import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { clearLinks } from '../features/assistantSlice';
import { isSelfLink } from '../utils/linkUtils';
import { isImageLinkRef, onImageLinksHydrated } from '../utils/imageLinkStore';
import {
  isInlineImageUrl,
  isExpiredImageLink,
  openImageInNewTab,
  resolveImageLinkUrl,
} from '../utils/imageUrl';

// Floating panel on the right that collects links as the conversation builds.
// On narrow viewports it collapses to a "Links · n" toggle so it never
// overlaps the content column. On mobile the toggle sits in the header's
// top-right; the open panel drops below it.
const LinksPanel = () => {
  const dispatch = useDispatch();
  const [isOpen, setIsOpen] = useState(false);
  const [, setHydrated] = useState(0);
  const links = useSelector((state) => state.assistant.persistentLinks);
  const filteredLinks = Array.isArray(links) ? links.filter((l) => !isSelfLink(l?.url)) : [];

  useEffect(() => onImageLinksHydrated(() => setHydrated((n) => n + 1)), []);

  if (filteredLinks.length === 0) return null;

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
            const isImageLink =
              link.isImage || isImageLinkRef(link.url) || isInlineImageUrl(imageUrl);
            const expired = isImageLink && isExpiredImageLink(imageUrl);
            const className = [
              'links-panel-item',
              expired ? 'link-expired' : '',
            ].filter(Boolean).join(' ');
            const label = `${link.text}${expired ? ' (expired)' : ''}`;
            const title = expired
              ? 'This link has expired — clear links or regenerate'
              : undefined;

            if (isImageLink) {
              return (
                <button
                  key={index}
                  type="button"
                  className={className}
                  title={title}
                  onClick={() => openImageInNewTab(imageUrl, link.text)}
                >
                  {label}
                </button>
              );
            }

            return (
              <a
                key={index}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className={className}
                title={title}
              >
                {label}
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
