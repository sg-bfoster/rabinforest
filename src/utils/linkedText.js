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

const BARE_URL_RE = /https?:\/\/[^\s<>()"']+/g;

/**
 * `**this**` → a <strong>. Not a markdown renderer: the models emit this one
 * construct (and nothing else we want to honour — lists, headings, and raw
 * HTML would fight the chat layout). Unclosed markers stay visible, so a
 * streaming reply does not flicker a half-bold word into existence.
 */
const BOLD_RE = /\*\*(.+?)\*\*/g;

const renderFormatted = (value, keyPrefix) => {
  if (!value) return value;
  const nodes = [];
  const re = new RegExp(BOLD_RE.source, 'g');
  let lastIndex = 0;
  let match;
  let n = 0;
  while ((match = re.exec(value)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(value.slice(lastIndex, match.index));
    }
    nodes.push(
      <strong key={`${keyPrefix}-b${n++}`}>{match[1]}</strong>,
    );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < value.length) {
    nodes.push(value.slice(lastIndex));
  }
  if (nodes.length === 0) return value;
  return nodes;
};

/** Split a plain-text chunk into text/link chunks around bare URLs. */
const linkifyBareUrls = (value) => {
  const chunks = [];
  let lastIndex = 0;
  const re = new RegExp(BARE_URL_RE.source, 'g');
  let match;

  while ((match = re.exec(value)) !== null) {
    // Trailing punctuation belongs to the sentence, not the URL.
    let url = match[0].replace(/[.,;:!?]+$/, '');
    if (!url) continue;
    if (match.index > lastIndex) {
      chunks.push({ type: 'text', value: value.slice(lastIndex, match.index) });
    }
    chunks.push({ type: 'link', href: url, value: url });
    lastIndex = match.index + url.length;
  }

  if (lastIndex < value.length) {
    chunks.push({ type: 'text', value: value.slice(lastIndex) });
  }

  return chunks;
};

export const splitLinkedText = (text) => {
  if (!text || typeof text !== 'string') return [];

  const chunks = [];
  let lastIndex = 0;
  const re = new RegExp(ANCHOR_RE.source, 'gi');
  let match;

  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) {
      chunks.push(...linkifyBareUrls(text.slice(lastIndex, match.index)));
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
    chunks.push(...linkifyBareUrls(text.slice(lastIndex)));
  }

  return chunks;
};

export const LinkedText = ({ text }) => {
  const chunks = splitLinkedText(text);
  if (chunks.length === 0) return null;

  return chunks.map((chunk, index) =>
    chunk.type === 'link' ? (
      <a key={index} href={chunk.href} target="_blank" rel="noopener noreferrer">
        {renderFormatted(chunk.value, index)}
      </a>
    ) : (
      <React.Fragment key={index}>{renderFormatted(chunk.value, index)}</React.Fragment>
    )
  );
};
