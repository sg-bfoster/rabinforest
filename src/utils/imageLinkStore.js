const memory = new Map();

const storageKey = (id) => `rf-image-link-${id}`;

export function storeImageLink(dataUrl) {
  const id = crypto.randomUUID();
  memory.set(id, dataUrl);
  try {
    sessionStorage.setItem(storageKey(id), dataUrl);
  } catch {
    // Session storage full — in-memory only for this page load
  }
  return id;
}

export function getImageLinkData(id) {
  if (!id) return null;
  if (memory.has(id)) return memory.get(id);
  try {
    const stored = sessionStorage.getItem(storageKey(id));
    if (stored) memory.set(id, stored);
    return stored;
  } catch {
    return null;
  }
}

export function isImageLinkRef(url) {
  return typeof url === 'string' && url.startsWith('#image:');
}

export function imageIdFromRef(url) {
  if (!isImageLinkRef(url)) return null;
  return url.slice('#image:'.length);
}
