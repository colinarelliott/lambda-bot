import fetch from 'node-fetch';
import { MODELS } from '../config.js';

/**
 * Generate an image via the Stable Diffusion WebUI (AUTOMATIC1111) REST API.
 * Returns a Buffer containing the PNG image.
 *
 * To use a different backend (ComfyUI, InvokeAI, etc.) swap this file's
 * implementation and update MODELS.image in config.js.
 */
export async function handleImage(prompt) {
  const cfg = MODELS.image;

  const res = await fetch(cfg.url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, ...cfg.defaultParams }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Image API responded ${res.status}: ${body}`);
  }

  const data = await res.json();
  const base64 = data.images?.[0];
  if (!base64) throw new Error("Image API returned no images.");

  const buffer = Buffer.from(base64, "base64");
  return { type: "image", content: buffer, filename: "generated.png" };
}
