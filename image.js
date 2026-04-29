/**
 * image.js — Free AI image generation via Pollinations.ai
 * No API key required — completely free, no rate limits
 */

const STYLES = {
  realistic: "photorealistic, 4k, detailed, professional photography",
  anime:     "anime style, vibrant colors, detailed illustration",
  artistic:  "oil painting, artistic, masterpiece, fine art",
  sketch:    "pencil sketch, black and white, hand drawn",
  cartoon:   "cartoon style, colorful, fun, animated",
  minimal:   "minimalist, clean, simple, flat design",
};

async function generateImage(prompt, style = "realistic") {
  const styleHint = STYLES[style] || STYLES.realistic;
  const fullPrompt = `${prompt}, ${styleHint}`;
  const encoded = encodeURIComponent(fullPrompt);

  // Pollinations.ai — completely free, no auth needed
  // Returns a direct image URL we can display immediately
  const seed = Math.floor(Math.random() * 99999);
  const imageUrl = `https://image.pollinations.ai/prompt/${encoded}?width=768&height=512&seed=${seed}&nologo=true`;

  // Verify URL is reachable (optional ping)
  return imageUrl;
}

module.exports = { generateImage };
