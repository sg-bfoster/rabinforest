/**
 * Per-route <head> metadata — the single source of truth.
 *
 * Imported by TWO consumers on purpose:
 *   - DocumentHead.js, which applies it in the browser as the user navigates
 *   - scripts/prerender.mjs, which bakes it into a static HTML file per route
 *     at build time
 *
 * It lives here, free of React imports, so the build script can import it
 * directly. A duplicated copy would drift, and the failure would be silent:
 * the page would look right to a visitor while crawlers and social scrapers
 * got stale text.
 */
import {
  PLAYGROUND_CHAT_BOTS,
  PLAYGROUND_IMAGERY,
  PLAYGROUND_FACT_CHECK,
  PLAYGROUND_RABINAI_IMAGERY,
  PLAYGROUND_STILL_MOVING,
  PLAYGROUND_RABINAI_FACE,
} from '../playgroundRoutes.js'; // extension required: Node ESM resolves this file directly at build time, and unlike Vite it does not guess

const SITE = 'https://www.rabinforest.com';

/**
 * Per-page JSON-LD, alongside the Person and WebSite blocks that index.html
 * already carries on every route.
 *
 * WHY IT LIVES HERE. The sitewide pair says who owns the site; it cannot say
 * what a given page IS, and every prerendered route was otherwise identical to
 * a crawler. This file is already the one place per-route head data lives, so
 * schema belongs beside the title and canonical it has to agree with — a
 * separate table would drift, and the failure would be silent.
 *
 * REFERENCED, NOT REPEATED. Pages point at #person and #website by @id rather
 * than restating them, so the graph resolves to one author and one site
 * instead of nine copies that can disagree.
 *
 * NOINDEX ROUTES GET NONE. /admin and the unlisted imagery playground are
 * excluded deliberately: structured data on a page asking not to be indexed is
 * a contradiction, and the only thing it could do is help index it.
 */
const PERSON = { '@id': `${SITE}/#person` };
const WEBSITE = { '@id': `${SITE}/#website` };

const page = (type, url, name, description, extra = {}) => ({
  '@context': 'https://schema.org',
  '@type': type,
  '@id': `${url}#page`,
  url,
  name,
  description,
  isPartOf: WEBSITE,
  inLanguage: 'en-US',
  ...extra,
});

const app = (url, name, description, category) =>
  page('WebApplication', url, name, description, {
    applicationCategory: category,
    browserRequirements: 'Requires JavaScript',
    author: PERSON,
  });

const DEFAULT = {
  title: 'Rabin Forest | Brian Foster — Senior Frontend Developer',
  description:
    "Ask an AI about Brian Foster, senior UI engineer in Metro Atlanta. It answers from a server he built and runs at home, with Google Gemini as backup.",
  robots: 'index, follow',
};

const PAGES = {
  '/': {
    ...DEFAULT,
    canonical: `${SITE}/`,
    schema: page('WebPage', `${SITE}/`, 'Rabin Forest', DEFAULT.description, {
      about: PERSON,
      mainEntity: PERSON,
    }),
  },
  [PLAYGROUND_CHAT_BOTS]: {
    title: 'AI Chat Bots | Rabin Forest',
    description:
      "Watch Google Gemini, OpenAI ChatGPT and RabinAI — Brian's self-hosted model — talk out a topic you pick. A playground on Rabin Forest.",
    canonical: `${SITE}${PLAYGROUND_CHAT_BOTS}`,
    schema: app(
      `${SITE}${PLAYGROUND_CHAT_BOTS}`,
      'AI Chat Bots',
      'Watch Google Gemini, OpenAI ChatGPT and RabinAI talk out a topic you pick.',
      'DeveloperApplication',
    ),
    robots: 'index, follow',
  },
  [PLAYGROUND_IMAGERY]: {
    title: 'Imagery Compare | Rabin Forest',
    description: 'Unlisted playground. Not indexed.',
    canonical: `${SITE}${PLAYGROUND_IMAGERY}`,
    robots: 'noindex, nofollow',
  },
  [PLAYGROUND_RABINAI_IMAGERY]: {
    title: 'RabinAI Images | Rabin Forest',
    description:
      "Brian's home GPU draws your prompt live, step by step — self-hosted, no cloud fallback. A playground on Rabin Forest.",
    canonical: `${SITE}${PLAYGROUND_RABINAI_IMAGERY}`,
    schema: app(
      `${SITE}${PLAYGROUND_RABINAI_IMAGERY}`,
      'RabinAI Images',
      "Brian's home GPU draws your prompt live, step by step — self-hosted, no cloud fallback.",
      'MultimediaApplication',
    ),
    robots: 'index, follow',
  },
  [PLAYGROUND_STILL_MOVING]: {
    title: 'Still Moving | Rabin Forest',
    description:
      "Four scenes drawn on Brian's home GPU as eight stills each, then crossfaded and drifted by your browser. No video, no animated file — the motion is composited on your machine.",
    canonical: `${SITE}${PLAYGROUND_STILL_MOVING}`,
    schema: app(
      `${SITE}${PLAYGROUND_STILL_MOVING}`,
      'Still Moving',
      'Four scenes drawn on a home GPU as eight stills each, crossfaded by your browser.',
      'MultimediaApplication',
    ),
    robots: 'index, follow',
  },
  [PLAYGROUND_FACT_CHECK]: {
    title: 'Fact Check | Rabin Forest',
    description:
      'Paste a claim and a source — a judge model rules whether the source supports it. Powered by stilltrue, on Rabin Forest.',
    canonical: `${SITE}${PLAYGROUND_FACT_CHECK}`,
    schema: app(
      `${SITE}${PLAYGROUND_FACT_CHECK}`,
      'Fact Check',
      'Paste a claim and a source — a judge model rules whether the source supports it.',
      'DeveloperApplication',
    ),
    robots: 'index, follow',
  },
  '/explore': {
    title: 'Explore | Rabin Forest',
    description:
      "Every live site, screenshot, and document Brian Foster's assistant can point at — AskGWINnett, stilltrue, Callmata, Lost Corridors, and the Safe-Guard brand platforms.",
    canonical: `${SITE}/explore`,
    schema: page(
      'CollectionPage',
      `${SITE}/explore`,
      'Explore',
      "Every live site, screenshot and document Brian Foster's assistant can point at.",
      { about: PERSON },
    ),
    robots: 'index, follow',
  },
  '/resume': {
    title: 'Resume | Rabin Forest',
    description:
      "Brian Foster's current resume — senior frontend / UI engineer, Metro Atlanta. View inline or download as PDF.",
    canonical: `${SITE}/resume`,
    // ProfilePage is the type built for exactly this — a page ABOUT a person,
    // with mainEntity naming who. The Person itself stays sitewide.
    schema: page(
      'ProfilePage',
      `${SITE}/resume`,
      'Resume — Brian Todd Foster',
      "Brian Foster's current resume — senior frontend / UI engineer, Metro Atlanta.",
      { mainEntity: PERSON },
    ),
    robots: 'index, follow',
  },
  '/contact': {
    title: 'Contact | Rabin Forest',
    description:
      'Leave Brian Foster a comment or question. Name and email are optional if you want a reply.',
    canonical: `${SITE}/contact`,
    schema: page(
      'ContactPage',
      `${SITE}/contact`,
      'Contact',
      'Leave Brian Foster a comment or question.',
      { about: PERSON },
    ),
    robots: 'index, follow',
  },
  // Unlisted until Brian has looked at it: noindex and, per the rule above, no
  // schema. Flip robots and add schema when it goes in the nav.
  [PLAYGROUND_RABINAI_FACE]: {
    title: 'It Looks Back | Rabin Forest',
    description:
      'A small RabinAI presence that keeps eye contact and answers your expressions. Face tracking runs in your browser; no video leaves the page.',
    canonical: `${SITE}${PLAYGROUND_RABINAI_FACE}`,
    robots: 'noindex, nofollow',
  },
  '/admin': {
    title: 'Admin | Rabin Forest',
    description: DEFAULT.description,
    canonical: `${SITE}/admin`,
    robots: 'noindex, nofollow',
  },
};

export { SITE, DEFAULT, PAGES };
