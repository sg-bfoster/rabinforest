/**
 * Bake per-route <head> metadata into static HTML at build time.
 *
 * THE PROBLEM. vercel.json rewrites every path to /index.html, and that file
 * carries the HOMEPAGE's title, description and Open Graph tags. DocumentHead
 * corrects them in the browser — but crawlers and social scrapers read the
 * response body, and most never run the JavaScript. So sharing
 * rabinforest.com/resume anywhere produced the homepage's card, and Bing
 * indexed every route under one identical title.
 *
 * WHAT THIS DOES. For each route in src/config/routeMeta.js, write
 * dist/<route>/index.html — the same bundle, with title, description, robots,
 * canonical and the og:/twitter: tags rewritten for that page. Vercel checks
 * the filesystem BEFORE applying rewrites, so /resume now serves its own file
 * and the catch-all only handles genuinely unknown paths.
 *
 * WHAT THIS DOES NOT DO, deliberately. It does not prerender page BODIES. That
 * needs a headless browser in the build — a heavy dependency and a new way for
 * deploys to fail — and the payoff here is small: the assistant's content is
 * generated live per visitor, so there is no meaningful static body to capture.
 * Metadata is the part crawlers actually consume, and it is fully static now.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');

const { PAGES } = await import(join(ROOT, 'src/config/routeMeta.js'));

/** Replace a tag's content attribute, or leave the document untouched if absent. */
const setMeta = (html, selectorAttr, key, value) => {
  const re = new RegExp(
    `(<meta[^>]*${selectorAttr}=["']${key}["'][^>]*content=["'])[^"']*(["'])`,
    'i',
  );
  if (re.test(html)) return html.replace(re, `$1${escapeAttr(value)}$2`);
  // Some tags put content before the name attribute.
  const reAlt = new RegExp(
    `(<meta[^>]*content=["'])[^"']*(["'][^>]*${selectorAttr}=["']${key}["'])`,
    'i',
  );
  return reAlt.test(html) ? html.replace(reAlt, `$1${escapeAttr(value)}$2`) : html;
};

const escapeAttr = (s) => String(s).replace(/"/g, '&quot;');

const escapeText = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * A plain <nav> of real <a href> links, baked into every page.
 *
 * WHY. Search Console, 2026-09-24: /explore and /resume sat in "Discovered —
 * currently not indexed" with last-crawled N/A. Google knew they existed and
 * had never fetched them. They return 200 in ~120ms, so it was not errors or
 * speed. The reason was in the served HTML:
 *
 *     internal links in the homepage HTML:
 *       /apple-touch-icon.png, /assets/index-*.css, /favicon.ico,
 *       /favicon.png, /favicon.svg, /manifest.json, /safari-pinned-tab.svg
 *
 * ZERO links to any page. The nav is React-rendered, so the document Google
 * fetches contains no path to anything. The only thing announcing those pages
 * was the sitemap, and a sitemap entry with no inbound link is the weakest
 * signal there is — which is exactly the profile that sits in "Discovered"
 * indefinitely. Combined with an empty #root, Google's view of the homepage
 * was: correct metadata, no content, no way onward.
 *
 * WHY NOT PRERENDER THE BODIES INSTEAD. That is the better fix and it is
 * deliberately out of scope here — the header of this file explains that it
 * would need a headless browser in the build, a heavy dependency and a new
 * way for deploys to fail. This is the small half of the same job: the links
 * are what unblocks crawling, and they are static facts we already hold in
 * routeMeta.
 *
 * INDEXABLE PAGES ONLY. Anything marked noindex is skipped, so /admin and the
 * imagery-compare page are never linked from a crawlable document.
 *
 * It goes INSIDE #root, so React replaces it on hydration and no visitor ever
 * sees it — but it is in the response body, which is what a crawler reads. It
 * is not display:none: hiding links is a pattern search engines treat as
 * deceptive. Off-screen positioning with the content intact is the honest
 * version, and it stays reachable to a screen reader.
 */
const crawlNav = (pages, currentRoute) => {
  const links = Object.entries(pages)
    .filter(([, m]) => !/noindex/i.test(m.robots || ''))
    .filter(([route]) => route !== currentRoute)
    .map(([route, m]) => {
      // The <title> is "Page | Rabin Forest"; the page's own name is the
      // useful anchor text, not the site suffix repeated nine times.
      const label = String(m.title).split('|')[0].trim() || route;
      return `<a href="${escapeAttr(route)}">${escapeText(label)}</a>`;
    })
    .join('');
  return (
    '<nav aria-label="Site" style="position:absolute;left:-9999px;top:auto;width:1px;height:1px;overflow:hidden">' +
    links +
    '</nav>'
  );
};

const buildPage = (html, meta, route) => {
  let out = html;
  // Empty on the way in, from the built shell — so this never stacks on a
  // previous run's output.
  out = out.replace(
    /(<div id="root">)\s*(<\/div>)/i,
    `$1${crawlNav(PAGES, route)}$2`,
  );
  out = out.replace(/<title>[\s\S]*?<\/title>/i, `<title>${meta.title}</title>`);
  out = setMeta(out, 'name', 'description', meta.description);
  out = setMeta(out, 'name', 'robots', meta.robots);
  out = setMeta(out, 'property', 'og:title', meta.title);
  out = setMeta(out, 'property', 'og:description', meta.description);
  out = setMeta(out, 'property', 'og:url', meta.canonical);
  out = setMeta(out, 'name', 'twitter:title', meta.title);
  out = setMeta(out, 'name', 'twitter:description', meta.description);
  out = out.replace(
    /(<link[^>]*rel=["']canonical["'][^>]*href=["'])[^"']*(["'])/i,
    `$1${escapeAttr(meta.canonical)}$2`,
  );
  return out;
};

const shell = await readFile(join(DIST, 'index.html'), 'utf8');
let written = 0;

for (const [route, meta] of Object.entries(PAGES)) {
  if (route === '/') continue; // dist/index.html already is this page
  const dir = join(DIST, route.replace(/^\//, ''));
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, 'index.html'), buildPage(shell, meta, route), 'utf8');
  written += 1;
  console.log(`  prerendered ${route}  →  ${meta.title}`);
}

// The root still needs its own metadata applied: index.html is hand-maintained
// and could drift from routeMeta, and one source of truth is the whole point.
await writeFile(join(DIST, 'index.html'), buildPage(shell, PAGES['/'], '/'), 'utf8');
console.log(`  prerendered /          →  ${PAGES['/'].title}`);
console.log(`prerender: ${written + 1} routes written`);
