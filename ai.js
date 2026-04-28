/**
 * ai.js — Hugging Face Inference API integration
 * Uses the HF Router endpoint (OpenAI-compatible)
 * Model: Mistral-7B-Instruct-v0.3 (free tier)
 */

const HF_API_KEY = process.env.HF_API_KEY || "";

// ── Correct HF Router endpoint (2025) ──────────────────────────
const API_URL = "https://router.huggingface.co/hf-inference/v1/chat/completions";
const MODEL   = "mistralai/Mistral-7B-Instruct-v0.3";

// ──────────────────────────────────────────
//  System personas per mode
// ──────────────────────────────────────────
const SYSTEM_PROMPTS = {
  chat: `You are RA-FA AI, a smart, friendly and helpful assistant created by RICKY, a passionate Cameroonian developer and head of Valenhart. You help with school, homework, learning, and everyday questions. Be warm, concise and encouraging.`,

  homework: `You are RA-FA AI Homework Helper, built by RICKY (Valenhart). You explain school concepts clearly and provide step-by-step solutions. Always show your reasoning. Be patient and educational.`,

  study: `You are RA-FA AI Study Assistant, built by RICKY (Valenhart). You summarize texts, generate study notes, and answer academic questions. Be structured, use bullet points when helpful, and keep explanations clear.`,

  writing: `You are RA-FA AI Writing Assistant, built by RICKY (Valenhart). You help improve essays, emails, and assignments. Correct grammar, improve clarity, and explain your suggestions. Be constructive and encouraging.`,
};

const LANG_INSTRUCTIONS = {
  en: "Always respond in English.",
  fr: "Réponds toujours en français.",
  es: "Responde siempre en español.",
  de: "Antworte immer auf Deutsch.",
  ar: "أجب دائماً باللغة العربية.",
};

// ──────────────────────────────────────────
//  buildPrompt — returns OpenAI-style messages array
// ──────────────────────────────────────────
function buildPrompt({ message, mode = "chat", language = "en", history = [] }) {
  const systemBase = SYSTEM_PROMPTS[mode] || SYSTEM_PROMPTS.chat;
  const langHint   = LANG_INSTRUCTIONS[language] || LANG_INSTRUCTIONS.en;

  const messages = [
    { role: "system", content: `${systemBase} ${langHint}` },
  ];

  // Inject last 6 turns of history for context
  const recent = history.slice(-6);
  for (const turn of recent) {
    if (turn.role === "user" || turn.role === "assistant") {
      messages.push({ role: turn.role, content: turn.content });
    }
  }

  messages.push({ role: "user", content: message });
  return messages;
}

// ──────────────────────────────────────────
//  callHuggingFace — POST to HF chat completions
// ──────────────────────────────────────────
async function callHuggingFace(messages) {
  if (!HF_API_KEY) {
    throw new Error("HF_API_KEY is not set. Please add your Hugging Face API key.");
  }

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${HF_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      max_tokens: 512,
      temperature: 0.7,
      top_p: 0.9,
      stream: false,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    if (response.status === 503) {
      throw new Error("The AI model is loading (cold start). Please wait ~20 seconds and try again.");
    }
    throw new Error(`Hugging Face API error ${response.status}: ${errText.slice(0, 300)}`);
  }

  const data = await response.json();

  // OpenAI-compatible response shape
  const reply = data?.choices?.[0]?.message?.content;
  if (!reply) throw new Error("Unexpected response format from AI model.");

  return reply.trim();
}

module.exports = { callHuggingFace, buildPrompt };
