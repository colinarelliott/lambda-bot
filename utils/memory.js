// In-memory conversation history, keyed by Discord user ID.
// Resets when the bot restarts. Swap the Map for a DB/file if you want persistence.

// Max number of messages kept per user (user + assistant messages combined).
// 20 = 10 back-and-forth exchanges before the oldest are trimmed.
const MAX_HISTORY = 100;

const store = new Map();

/** Return the stored message history for a user (may be empty). */
export function getHistory(userId) {
  return store.get(userId) ?? [];
}

/** Append one message to a user's history, trimming if over the limit. */
export function appendHistory(userId, role, content) {
  const history = store.get(userId) ?? [];
  history.push({ role, content });
  if (history.length > MAX_HISTORY) {
    history.splice(0, history.length - MAX_HISTORY);
  }
  store.set(userId, history);
}

/** Wipe a user's history (used by !reset). */
export function clearHistory(userId) {
  store.delete(userId);
}
