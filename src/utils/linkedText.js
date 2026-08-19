import React from 'react';

const ANCHOR_RE = /<a\s+([^>]*?)>([\s\S]*?)<\/a>/gi;

const hrefFromAttrs = (attrs) => {
  const match = attrs.match(/href\s*=\s*(?:'([^']*)'|"([^"]*)"|([^\s>]+))/i);
  if (!match) return null;
  const raw = match[1] || match[2] || match[3];
  try {
    const url = new URL(raw);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return url.href;
  } catch {
    return null;
  }
};

export const splitLinkedText = (text) => {
  if (!text || typeof text !== 'string') return [];

  const chunks = [];
  let lastIndex = 0;
  const re = new RegExp(ANCHOR_RE.source, 'gi');
  let match;

  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) {
      chunks.push({ type: 'text', value: text.slice(lastIndex, match.index) });
    }
    const href = hrefFromAttrs(match[1]);
    if (href) {
      chunks.push({ type: 'link', href, value: match[2] });
    } else {
      chunks.push({ type: 'text', value: match[0] });
    }
    lastIndex = re.lastIndex;
  }

  if (lastIndex < text.length) {
    chunks.push({ type: 'text', value: text.slice(lastIndex) });
  }

  return chunks;
};

export const LinkedText = ({ text }) => {
  const chunks = splitLinkedText(text);
  if (chunks.length === 0) return null;

  return chunks.map((chunk, index) =>
    chunk.type === 'link' ? (
      <a key={index} href={chunk.href} target="_blank" rel="noopener noreferrer">
        {chunk.value}
      </a>
    ) : (
      chunk.value
    )
  );
};
