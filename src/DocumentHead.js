import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { pathForView } from './playgroundRoutes';
import { SITE, DEFAULT, PAGES } from './config/routeMeta';

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
