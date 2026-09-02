import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { pathForView, PLAYGROUND_CHAT_BOTS, PLAYGROUND_IMAGERY, PLAYGROUND_FACT_CHECK, PLAYGROUND_RABINAI_IMAGERY } from './playgroundRoutes';

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

const setNamedMeta = (attr, key, value) => {
  let el = document.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', value);
};

const DocumentHead = () => {
  const { pathname, search } = useLocation();
  const view = new URLSearchParams(search).get('view');
  const effectivePath = view ? pathForView(view) : pathname;
  const page = PAGES[effectivePath] || {
    ...DEFAULT,
    canonical: `${SITE}${effectivePath}`,
    robots: 'noindex, follow',
  };

  useEffect(() => {
    document.title = page.title;
    setNamedMeta('name', 'description', page.description);
    setNamedMeta('name', 'robots', page.robots);
    setNamedMeta('property', 'og:url', page.canonical);
    setNamedMeta('property', 'og:title', page.title);
    setNamedMeta('property', 'og:description', page.description);

    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', page.canonical);
  }, [pathname, page.title, page.description, page.canonical, page.robots]);

  return null;
};

export default DocumentHead;
