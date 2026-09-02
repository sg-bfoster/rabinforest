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

const buildPage = (html, meta) => {
  let out = html;
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
  await writeFile(join(dir, 'index.html'), buildPage(shell, meta), 'utf8');
  written += 1;
  console.log(`  prerendered ${route}  →  ${meta.title}`);
}

// The root still needs its own metadata applied: index.html is hand-maintained
// and could drift from routeMeta, and one source of truth is the whole point.
await writeFile(join(DIST, 'index.html'), buildPage(shell, PAGES['/']), 'utf8');
console.log(`  prerendered /          →  ${PAGES['/'].title}`);
console.log(`prerender: ${written + 1} routes written`);
