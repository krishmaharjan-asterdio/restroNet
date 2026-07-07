/**
 * Tiny TTL cache for the venue list used by the recommendation engine.
 * Invalidated on every Venue write (see hooks in models/Venue.js) so
 * newly created or updated venues appear immediately.
 */
const TTL_MS = 60 * 1000;
const cache = new Map(); // key → { venues, expiresAt }

function get(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.venues;
}

function set(key, venues) {
  cache.set(key, { venues, expiresAt: Date.now() + TTL_MS });
}

function clear() {
  cache.clear();
}

module.exports = { get, set, clear };
