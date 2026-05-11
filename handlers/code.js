import { MODELS } from '../config.js';
import { ollamaChat } from '../utils/ollamaClient.js';

export async function handleCode(prompt, history = []) {
  const cfg = MODELS.code;
  const content = await ollamaChat({
    url: cfg.url,
    model: cfg.model,
    systemPrompt: cfg.systemPrompt,
    history: [...history, { role: "user", content: prompt }],
  });
  return { type: "text", content };
}
