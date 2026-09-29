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

    // Keep the page's JSON-LD in step with the rest of the head on a
    // client-side navigation. The prerendered file is what a crawler reads and
    // it is already correct; this is for the case where someone (or a renderer
    // that executes JS) arrives on one route and walks to another, which would
    // otherwise leave the FIRST page's schema describing the second.
    //
    // Only the per-page block is touched. The Person and WebSite blocks in
    // index.html are sitewide and true on every route — removing and rebuilding
    // them on every navigation would be churn for no gain.
    const PER_PAGE_ID = 'route-jsonld';
    document.getElementById(PER_PAGE_ID)?.remove();
    if (page.schema) {
      const el = document.createElement('script');
      el.id = PER_PAGE_ID;
      el.type = 'application/ld+json';
      el.textContent = JSON.stringify(page.schema);
      document.head.appendChild(el);
    }
  }, [pathname, page.title, page.description, page.canonical, page.robots, page.schema]);

  return null;
};

export default DocumentHead;
