/**
 * cache.js — Simple in-memory LRU-style cache
 * Reduces redundant Hugging Face API calls on Render free tier
 */

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_ENTRIES = 200;

const store = new Map();

function getCache(key) {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.value;
}

function setCache(key, value) {
  // Evict oldest if full
  if (store.size >= MAX_ENTRIES) {
    const firstKey = store.keys().next().value;
    store.delete(firstKey);
  }
  store.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
}

module.exports = { getCache, setCache };
