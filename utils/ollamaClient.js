import fetch from 'node-fetch';

/**
 * Send a chat request to an Ollama-compatible /api/chat endpoint.
 * @param {object} opts
 * @param {string}   opts.url            - Full URL to the /api/chat endpoint
 * @param {string}   opts.model          - Model name as registered in Ollama
 * @param {string}   [opts.systemPrompt] - Optional system message prepended to history
 * @param {Array}    [opts.history]       - Full message history including the latest user message
 * @param {string}   [opts.userMessage]  - Single user prompt (used when no history is provided)
 * @returns {Promise<string>}            - The assistant's reply text
 */
export async function ollamaChat({ url, model, systemPrompt, history, userMessage }) {
  const messages = [];
  if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
  if (history?.length) {
    messages.push(...history);
  } else {
    messages.push({ role: "user", content: userMessage });
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages, stream: false }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Ollama responded ${res.status}: ${body}`);
  }

  const data = await res.json();
  return data.message?.content ?? "";
}
