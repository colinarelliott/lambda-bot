import { PREFIXES, MODELS } from './config.js';
import { ollamaChat } from './utils/ollamaClient.js';

const VALID_TYPES = ["chat", "code", "image"];

// One-shot classification prompt — keep it tight so any model handles it well.
const ROUTER_SYSTEM =
  "You are a task classifier. Given a user message, reply with ONLY one of these " +
  "exact labels and nothing else:\n" +
  "  chat   — general conversation, Q&A, summaries, writing\n" +
  "  code   — programming, debugging, code review, scripts, shell commands\n" +
  "  image  — image generation, art, visual descriptions meant to be drawn\n" +
  "  arr    — queries about Sonarr/Radarr/Lidarr/Prowlarr/SABnzbd status, queues, etc.\n" +
  "Respond with only the label word.";

/**
 * Determine the task type and cleaned prompt for a Discord message.
 * Prefix commands take priority; otherwise the router LLM classifies intent.
 *
 * @param {string} content - Raw message content
 * @returns {Promise<{ type: string, prompt: string }>}
 */
export async function route(content) {
  const lower = content.toLowerCase();

  // 1. Explicit prefix — fast path, no LLM call needed.
  for (const [prefix, type] of Object.entries(PREFIXES)) {
    if (lower.startsWith(prefix + " ") || lower === prefix) {
      const prompt = content.slice(prefix.length).trim();
      return { type, prompt };
    }
  }

  // 2. Arr app keyword — if the message names a specific arr app, route directly.
  const ARR_APPS = ['sonarr', 'radarr', 'lidarr', 'prowlarr', 'sabnzbd'];
  const mentionedApp = ARR_APPS.find(app => lower.includes(app));
  if (mentionedApp) {
    return { type: 'arr', prompt: mentionedApp };
  }

  // 3. Auto-classify with the router model.
  let type = "chat";
  try {
    const label = await ollamaChat({
      url: MODELS.router.url,
      model: MODELS.router.model,
      systemPrompt: ROUTER_SYSTEM,
      userMessage: content,
    });
    const normalized = label.trim().toLowerCase().split(/\s/)[0];
    if (VALID_TYPES.includes(normalized)) type = normalized;
  } catch (err) {
    console.warn("[Router] Classification failed, defaulting to chat:", err.message);
  }

  return { type, prompt: content };
}
