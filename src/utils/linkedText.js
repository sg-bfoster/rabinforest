import React from 'react';
import { Link } from 'react-router-dom';

const ANCHOR_RE = /<a\s+([^>]*?)>([\s\S]*?)<\/a>/gi;

/**
 * Hosts that are THIS site, so a link to one is navigation and not an exit.
 *
 * Listed rather than read from window.location because this module renders
 * during the prerender too, where there is no window — and because a visitor
 * arriving on the apex domain should still get in-app routing for a link the
 * assistant wrote with the www host.
 */
const OWN_HOSTS = new Set(['www.rabinforest.com', 'rabinforest.com']);

/**
 * The in-app path for a same-site URL, or null if the link leaves the site.
 *
 * WHY THIS EXISTS. Every link used to render as `target="_blank"`, including
 * links to our own pages. The assistant answers "you can try it at
 * https://www.rabinforest.com/playground/fact-check" and the visitor got a
 * whole new browser window, a cold boot of the app, and a landing at the top
 * of a tall hero with the content below the fold — which reads as a broken
 * page rather than a page they have not scrolled yet. For a link to another
 * room in the same house, the right behaviour is to walk there.
 *
 * Query and hash are preserved; a bare origin becomes '/'.
 */
const internalPathFor = (href) => {
  try {
    const url = new URL(href);
    if (!OWN_HOSTS.has(url.hostname)) return null;
    return `${url.pathname}${url.search}${url.hash}` || '/';
  } catch {
    return null;
  }
};

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

// Schemeless www. addresses count too. The assistant writes "you can visit
// www.rabinai.com" — no scheme, because that is how a person writes a domain in
// a sentence — and the old pattern required http(s)://, so it arrived as dead
// text sitting next to links that worked, which reads to a visitor as a bug.
//
// Restricted to a leading `www.` rather than matching bare domains generally:
// "Node.js", "3.5s" and any sentence ending in a short word plus a period are
// all domain-shaped. Requiring www. keeps the match unambiguous, at the cost of
// missing "rabinai.com" written without it — the right trade for text a model
// produced.
const BARE_URL_RE = /(?:https?:\/\/|www\.)[^\s<>()"']+/g;

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
    // Show what the model wrote; navigate somewhere valid. A schemeless match
    // needs https:// bolted on, or the browser resolves it against the current
    // page and /www.rabinai.com 404s on this site.
    const href = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    chunks.push({ type: 'link', href, value: url });
    lastIndex = match.index + url.length;
  }

  if (lastIndex < value.length) {
    chunks.push({ type: 'text', value: value.slice(lastIndex) });
  }

  return chunks;
};

/**
 * Strip inline HTML the model should never have written.
 *
 * The assistant's answers are rendered as TEXT — this module finds URLs and
 * builds real <a> elements itself, and nothing is passed through
 * dangerouslySetInnerHTML. So any tag the model emits reaches the visitor as
 * literal characters. Observed 2026-09-02: an answer displayed
 * "<em>stilltrue</em>" on screen. The system prompt now forbids HTML, but a
 * prompt rule only improves the odds — this is the guarantee. <a> is left
 * alone because splitLinkedText below deliberately parses it.
 *
 * Deliberately an allowlist of inline tags rather than /<[^>]+>/g: a blanket
 * strip would eat legitimate prose like "a < b" or a generic in "Array<T>".
 */
const STRAY_TAG_RE = /<\/?(?:em|strong|i|b|u|br|p|span|code|small|mark)\s*\/?>/gi;

export const stripStrayHtml = (text) =>
  (typeof text === 'string' ? text.replace(STRAY_TAG_RE, '') : text);

export const splitLinkedText = (text) => {
  if (!text || typeof text !== 'string') return [];
  text = stripStrayHtml(text);

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

  return chunks.map((chunk, index) => {
    if (chunk.type !== 'link') {
      return <React.Fragment key={index}>{renderFormatted(chunk.value, index)}</React.Fragment>;
    }
    const internal = internalPathFor(chunk.href);
    // Same site: route in place. No new window, no cold boot, and the
    // scroll-to-top the router already does lands the visitor on the page
    // rather than on the hero above it.
    return internal ? (
      <Link key={index} to={internal}>
        {renderFormatted(chunk.value, index)}
      </Link>
    ) : (
      <a key={index} href={chunk.href} target="_blank" rel="noopener noreferrer">
        {renderFormatted(chunk.value, index)}
      </a>
    );
  });
};
