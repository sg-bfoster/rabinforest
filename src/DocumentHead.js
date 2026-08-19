import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { pathForView, PLAYGROUND_CHAT_BOTS, PLAYGROUND_IMAGERY } from './playgroundRoutes';

const SITE = 'https://www.rabinforest.com';

const DEFAULT = {
  title: 'Rabin Forest | Brian Foster — Senior Frontend Developer',
  description:
    "Rabin Forest is Brian Foster's AI-powered portfolio. Chat with a Gemini assistant about his frontend skills, experience, and projects — Metro Atlanta.",
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
      "Watch two AI assistants converse on a topic you pick. A playground experiment on Rabin Forest, Brian Foster's portfolio.",
    canonical: `${SITE}${PLAYGROUND_CHAT_BOTS}`,
    robots: 'index, follow',
  },
  [PLAYGROUND_IMAGERY]: {
    title: 'AI Imagery | Rabin Forest',
    description:
      "Generate images with OpenAI GPT Image and Google Imagen side by side. A playground tool on Rabin Forest, Brian Foster's portfolio.",
    canonical: `${SITE}${PLAYGROUND_IMAGERY}`,
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
