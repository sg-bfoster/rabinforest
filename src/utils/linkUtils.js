/**
 * Returns true if the URL is a "self" link that should be hidden from the links sidebar
 * (same-origin / relative, or rabinforest.com / www.rabinforest.com; subdomains like fmp.rabinforest.com are kept).
 * @param {string} url
 * @returns {boolean}
 */
export function isSelfLink(url) {
  if (!url || typeof url !== 'string') return false;

  // Filter relative links to same origin (including "/")
  if (!/^https?:\/\//i.test(url)) {
    try {
      if (typeof window !== 'undefined') {
        const resolved = new URL(url, window.location.origin);
        return resolved.hostname === window.location.hostname;
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
    return host === 'rabinforest.com' || host === 'www.rabinforest.com';
  } catch {
    return false;
  }
}
