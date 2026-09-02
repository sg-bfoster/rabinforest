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
} from '../playgroundRoutes.js'; // extension required: Node ESM resolves this file directly at build time, and unlike Vite it does not guess

const SITE = 'https://www.rabinforest.com';

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
  },
  [PLAYGROUND_CHAT_BOTS]: {
    title: 'AI Chat Bots | Rabin Forest',
    description:
      "Watch Google Gemini, OpenAI ChatGPT and RabinAI — Brian's self-hosted model — talk out a topic you pick. A playground on Rabin Forest.",
    canonical: `${SITE}${PLAYGROUND_CHAT_BOTS}`,
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
    robots: 'index, follow',
  },
  [PLAYGROUND_FACT_CHECK]: {
    title: 'Fact Check | Rabin Forest',
    description:
      'Paste a claim and a source — a judge model rules whether the source supports it. Powered by stilltrue, on Rabin Forest.',
    canonical: `${SITE}${PLAYGROUND_FACT_CHECK}`,
    robots: 'index, follow',
  },
  '/resume': {
    title: 'Resume | Rabin Forest',
    description:
      "Brian Foster's current resume — senior frontend / UI engineer, Metro Atlanta. View inline or download as PDF.",
    canonical: `${SITE}/resume`,
    robots: 'index, follow',
  },
  '/admin': {
    title: 'Admin | Rabin Forest',
    description: DEFAULT.description,
    canonical: `${SITE}/admin`,
    robots: 'noindex, nofollow',
  },
};

export { SITE, DEFAULT, PAGES };
