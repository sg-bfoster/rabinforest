import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { clearLinks } from '../features/assistantSlice';
import { isSelfLink } from '../utils/linkUtils';
import {
  isInlineImageUrl,
  isExpiredImageLink,
  openImageInNewTab,
  resolveImageLinkUrl,
} from '../utils/imageUrl';

// Inline links row on the Assistant screen — replaces the old SlideOutPanel.
const LinksRow = () => {
  const dispatch = useDispatch();
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
    <div className="links-row">
      <span className="links-row-label">Links</span>
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
      <button type="button" className="btn btn-ghost links-row-clear" onClick={() => dispatch(clearLinks())}>
        Clear
      </button>
    </div>
  );
};

export default LinksRow;
