import "dotenv/config";

// ─── Server Base URLs ────────────────────────────────────────────────────────
const OLLAMA_BASE = process.env.OLLAMA_BASE;

// ─── Model & Endpoint Configuration ─────────────────────────────────────────
// Edit these entries to add or swap models/backends.
export const MODELS = {

  // Used by the router to auto-classify intent.
  // A small/fast model works best here.
  router: {
    url: `${OLLAMA_BASE}/api/chat`,
    model: "nemotron3:33b",
  },

  // General conversation
  chat: {
    url: `${OLLAMA_BASE}/api/chat`,
    model: "nemotron3:33b",
    systemPrompt: "You are Lambda, a helpful and concise AI assistant.",
  },

  // Code generation, debugging, review
  code: {
    url: `${OLLAMA_BASE}/api/chat`,
    model: "qwen2.5-coder:7b",       // swap for codellama, deepseek-coder, etc.
    systemPrompt:
      "You are an expert programmer. Provide clean, correct code with brief " +
      "explanations. Always wrap code in markdown code blocks with the language tag.",
  },

  // Image generation — expects a Stable Diffusion WebUI (AUTOMATIC1111) API.
  // Start SD with: --api flag. Swap url for ComfyUI or another backend.
  image: {
    url: "http://192.168.1.110:7860/sdapi/v1/txt2img",
    backend: "stable-diffusion",
    defaultParams: {
      steps: 30,
      cfg_scale: 7,
      width: 512,
      height: 512,
      sampler_name: "DPM++ 2M Karras",
    },
  },

};

// ─── Arr Suite Configuration ─────────────────────────────────────────────────
// Add API keys and ports to .env. Apps with no API key are skipped at runtime.
export const ARR = {
  sonarr: {
    name: "Sonarr",
    url: `http://${process.env.ARR_HOST}:${process.env.SONARR_PORT || 8989}`,
    apiKey: process.env.SONARR_API_KEY,
    apiBase: "/api/v3",
  },
  radarr: {
    name: "Radarr",
    url: `http://${process.env.ARR_HOST}:${process.env.RADARR_PORT || 7878}`,
    apiKey: process.env.RADARR_API_KEY,
    apiBase: "/api/v3",
  },
  lidarr: {
    name: "Lidarr",
    url: `http://${process.env.ARR_HOST}:${process.env.LIDARR_PORT || 8686}`,
    apiKey: process.env.LIDARR_API_KEY,
    apiBase: "/api/v3",
  },
  prowlarr: {
    name: "Prowlarr",
    url: `http://${process.env.ARR_HOST}:${process.env.PROWLARR_PORT || 9696}`,
    apiKey: process.env.PROWLARR_API_KEY,
    apiBase: "/api/v1",
  },
  sabnzbd: {
    name: "SABnzbd",
    url: `http://${process.env.ARR_HOST}:${process.env.SABNZBD_PORT || 8080}`,
    apiKey: process.env.SABNZBD_API_KEY,
  },
};

// ─── Explicit Command Prefixes ────────────────────────────────────────────────
// Messages starting with these are routed directly, bypassing LLM classification.
export const PREFIXES = {
  "!chat":  "chat",
  "!code":  "code",
  "!image": "image",
  "!img":   "image",
  "!arr":   "arr",
  "!help":  "help",
  "!reset": "reset",
};
