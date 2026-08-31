/**
 * Bytes for generated images, keyed by id. The links panel only stores
 * `#image:<id>` in localStorage — putting a data-URL there blows the quota
 * and a blob: URL dies on refresh. IndexedDB holds the actual image; the
 * in-memory Map is the sync read path after hydrate.
 */
const memory = new Map();

const SESSION_PREFIX = 'rf-image-link-';
const storageKey = (id) => `${SESSION_PREFIX}${id}`;

const DB_NAME = 'rf-image-links';
const STORE = 'images';

let hydratePromise = null;
let hydrated = false;
const hydrateListeners = new Set();

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbPut(id, dataUrl) {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).put(dataUrl, id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      }),
  );
}

function idbGetAll() {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readonly');
        const req = tx.objectStore(STORE).openCursor();
        const map = new Map();
        req.onsuccess = () => {
          const cursor = req.result;
          if (cursor) {
            map.set(cursor.key, cursor.value);
            cursor.continue();
          } else {
            resolve(map);
          }
        };
        req.onerror = () => reject(req.error);
      }),
  );
}

function idbClear() {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      }),
  );
}

function notifyHydrated() {
  hydrated = true;
  hydrateListeners.forEach((fn) => fn());
}

export function hydrateImageLinks() {
  if (hydratePromise) return hydratePromise;
  hydratePromise = (async () => {
    try {
      const all = await idbGetAll();
      all.forEach((value, key) => memory.set(key, value));
    } catch {
      // Private mode / disabled IDB — sessionStorage is the fallback.
    }
    try {
      for (let i = 0; i < sessionStorage.length; i += 1) {
        const key = sessionStorage.key(i);
        if (!key || !key.startsWith(SESSION_PREFIX)) continue;
        const id = key.slice(SESSION_PREFIX.length);
        if (!memory.has(id)) memory.set(id, sessionStorage.getItem(key));
      }
    } catch {
      // sessionStorage blocked
    }
    notifyHydrated();
  })();
  return hydratePromise;
}

/** Re-render once IndexedDB has filled the sync Map. */
export function onImageLinksHydrated(fn) {
  if (hydrated) {
    fn();
    return () => {};
  }
  hydrateListeners.add(fn);
  return () => hydrateListeners.delete(fn);
}

export function storeImageLink(dataUrl) {
  const id = crypto.randomUUID();
  memory.set(id, dataUrl);
  idbPut(id, dataUrl).catch(() => {});
  try {
    sessionStorage.setItem(storageKey(id), dataUrl);
  } catch {
    // Quota — IndexedDB is the real store; this is a same-tab fast path.
  }
  return id;
}

export function getImageLinkData(id) {
  if (!id) return null;
  if (memory.has(id)) return memory.get(id);
  try {
    const stored = sessionStorage.getItem(storageKey(id));
    if (stored) {
      memory.set(id, stored);
      return stored;
    }
  } catch {
    return null;
  }
  return null;
}

export function clearImageLinkStore() {
  memory.clear();
  idbClear().catch(() => {});
  try {
    const doomed = [];
    for (let i = 0; i < sessionStorage.length; i += 1) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith(SESSION_PREFIX)) doomed.push(key);
    }
    doomed.forEach((key) => sessionStorage.removeItem(key));
  } catch {
    // ignore
  }
}

export function isImageLinkRef(url) {
  return typeof url === 'string' && url.startsWith('#image:');
}

export function imageIdFromRef(url) {
  if (!isImageLinkRef(url)) return null;
  return url.slice('#image:'.length);
}

if (typeof indexedDB !== 'undefined') {
  hydrateImageLinks();
}
