/**
 * Purpose: Lightweight IndexedDB wrapper for the normalized players dataset.
 * Why: Caching lowers API pressure and keeps the list usable during intermittent network failures.
 */

const DB_NAME = 'cricket-player-directory-cache';
const DB_VERSION = 1;
const STORE_NAME = 'cacheEntries';
const CACHE_KEY = 'players-dataset-v1';
const CACHE_TTL_MS = 1000 * 60 * 60 * 12;

/**
 * Checks browser support before attempting IndexedDB operations.
 *
 * @returns {boolean}
 */
function isIndexedDbAvailable() {
  return typeof window !== 'undefined' && 'indexedDB' in window;
}

/**
 * Opens the cache database and ensures the object store exists.
 *
 * @returns {Promise<IDBDatabase | null>}
 */
function openDatabase() {
  if (!isIndexedDbAvailable()) {
    return Promise.resolve(null);
  }

  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Unable to open cache database.'));
  });
}

/**
 * Reads one cache entry by key.
 *
 * @param {IDBDatabase} db
 * @param {string} key
 * @returns {Promise<any>}
 */
function getEntry(db, key) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(key);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error || new Error('Unable to read cache entry.'));
  });
}

/**
 * Upserts one cache entry.
 *
 * @param {IDBDatabase} db
 * @param {{key: string, players: Array<object>, updatedAt: number}} entry
 * @returns {Promise<void>}
 */
function putEntry(db, entry) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(entry);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error || new Error('Unable to write cache entry.'));
  });
}

/**
 * Reads the cached player dataset and freshness metadata.
 *
 * @returns {Promise<{players: Array<object>, isFresh: boolean, updatedAt: number | null} | null>}
 */
export async function readPlayersDatasetCache() {
  try {
    const db = await openDatabase();

    if (!db) {
      return null;
    }

    const entry = await getEntry(db, CACHE_KEY);
    db.close();

    if (!entry || !Array.isArray(entry.players)) {
      return null;
    }

    const ageMs = Date.now() - Number(entry.updatedAt || 0);

    return {
      players: entry.players,
      isFresh: ageMs >= 0 && ageMs < CACHE_TTL_MS,
      updatedAt: entry.updatedAt || null,
    };
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('Unable to read player cache.', error);
    }
    return null;
  }
}

/**
 * Persists the normalized player dataset in IndexedDB.
 *
 * @param {Array<object>} players
 * @returns {Promise<void>}
 */
export async function writePlayersDatasetCache(players) {
  if (!Array.isArray(players) || players.length === 0) {
    return;
  }

  try {
    const db = await openDatabase();

    if (!db) {
      return;
    }

    await putEntry(db, {
      key: CACHE_KEY,
      players,
      updatedAt: Date.now(),
    });

    db.close();
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('Unable to write player cache.', error);
    }
  }
}
