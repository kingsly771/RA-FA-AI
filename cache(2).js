/**
 * cache.js — In-memory LRU cache to reduce API calls
 */
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ENTRIES  = 300;
const store = new Map();

function getCache(key) {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { store.delete(key); return null; }
  return entry.value;
}

function setCache(key, value) {
  if (store.size >= MAX_ENTRIES) store.delete(store.keys().next().value);
  store.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
}

module.exports = { getCache, setCache };
