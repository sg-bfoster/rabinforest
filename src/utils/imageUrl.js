export function isDataImageUrl(url) {
  return typeof url === 'string' && url.startsWith('data:image/');
}

/** File extension (no dot) for a data URL, for downloads. */
export function fileExtensionFromDataUrl(url) {
  if (typeof url !== 'string' || !url.startsWith('data:image/')) return 'png';
  const mime = url.slice('data:image/'.length).split(';')[0]?.toLowerCase() || '';
  if (mime === 'jpeg' || mime === 'jpg') return 'jpg';
  if (mime === 'webp') return 'webp';
  if (mime === 'gif') return 'gif';
  if (mime === 'png') return 'png';
  return 'png';
}

export function isBlobImageUrl(url) {
  return typeof url === 'string' && url.startsWith('blob:');
}

export function isInlineImageUrl(url) {
  return isDataImageUrl(url) || isBlobImageUrl(url);
}

export function dataUrlToBlobUrl(dataUrl) {
  const [header, base64] = dataUrl.split(',');
  const mime = header.match(/data:([^;]+)/)?.[1] || 'image/png';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return URL.createObjectURL(new Blob([bytes], { type: mime }));
}

/** Prefer blob URLs for display; safe to call on data or blob URLs. */
export function toDisplayUrl(url) {
  if (!url) return url;
  if (isDataImageUrl(url)) return dataUrlToBlobUrl(url);
  return url;
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function isExpiredImageLink(url) {
  return isBlobImageUrl(url);
}

/** Opens the image in a new browser tab (preview only — never triggers download). */
export function openImageInNewTab(url, title = 'AI Imagery') {
  if (!url) return;
  if (isBlobImageUrl(url)) {
    window.alert('This image link has expired. Clear old links or generate the image again.');
    return;
  }
  if (!isDataImageUrl(url)) {
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }
  const safeTitle = escapeHtml(title);
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${safeTitle}</title>
  <style>
    body { margin: 0; background: #111; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    img { max-width: 100%; max-height: 100vh; object-fit: contain; }
  </style>
</head>
<body>
  <img src="${url}" alt="${safeTitle}" />
</body>
</html>`;
  const pageUrl = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
  window.open(pageUrl, '_blank', 'noopener,noreferrer');
  setTimeout(() => URL.revokeObjectURL(pageUrl), 60_000);
}

import { getImageLinkData, imageIdFromRef, isImageLinkRef } from './imageLinkStore';

export function resolveImageLinkUrl(link) {
  if (!link) return null;
  if (link.imageId) {
    const stored = getImageLinkData(link.imageId);
    if (stored) return stored;
  }
  if (isImageLinkRef(link.url)) {
    const stored = getImageLinkData(imageIdFromRef(link.url));
    if (stored) return stored;
  }
  if (link.dataUrl && isDataImageUrl(link.dataUrl)) return link.dataUrl;
  if (isDataImageUrl(link.url)) return link.url;
  return link.url;
}

export function downloadImage(url, filename = 'generated-image.png') {
  if (!url) return;
  if (isBlobImageUrl(url)) {
    window.alert('This image has expired. Generate it again to download.');
    return;
  }
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}

export function revokeBlobUrl(url) {
  if (isBlobImageUrl(url)) {
    URL.revokeObjectURL(url);
  }
}
