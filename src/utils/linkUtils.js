/**
 * Returns true if the URL is a "self" link that should be hidden from the links sidebar
 * (same-origin / relative, or rabinforest.com / www.rabinforest.com; subdomains like fmp.rabinforest.com are kept).
 * Same-origin PDF docs are kept so architecture downloads still appear in Links.
 * @param {string} url
 * @returns {boolean}
 */
export function isSelfLink(url) {
  if (!url || typeof url !== 'string') return false;

  // Generated images and inline previews are never "self" site links
  if (
    url.startsWith('data:image/') ||
    url.startsWith('blob:') ||
    url.startsWith('#image:')
  ) {
    return false;
  }

  // Filter relative links to same origin (including "/")
  if (!/^https?:\/\//i.test(url)) {
    try {
      if (typeof window !== 'undefined') {
        const resolved = new URL(url, window.location.origin);
        if (resolved.hostname === window.location.hostname) {
          // Keep downloadable docs (architecture PDFs, etc.)
          return !/\.pdf(?:$|[?#])/i.test(resolved.pathname);
        }
        return false;
      }
    } catch {
      // ignore
    }
    return url === '/';
  }

  // Filter only Rabin Forest root domain (keep subdomains like fmp.rabinforest.com)
  try {
    const parsed = new URL(url);
    const host = (parsed.hostname || '').toLowerCase();
    if (host === 'rabinforest.com' || host === 'www.rabinforest.com') {
      // Keep downloadable docs so they still surface in the Links panel
      return !/\.pdf(?:$|[?#])/i.test(parsed.pathname || '');
    }
    return false;
  } catch {
    return false;
  }
}
