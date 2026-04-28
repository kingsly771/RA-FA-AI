/**
 * ai.js — Hugging Face Inference API integration
 * Single router URL, provider appended to model name as :cerebras
 * Fallback chain: cerebras → sambanova → featherless-ai
 */

const HF_API_KEY = process.env.HF_API_KEY || "";

// ── Single HF router endpoint ──────────────────────────────────
const API_URL = "https://router.huggingface.co/v1/chat/completions";

// Provider is appended to model name with :provider suffix
// Cerebras is fast & free; fallbacks if it's unavailable
const MODELS = [
  "meta-llama/Llama-3.1-8B-Instruct:cerebras",
  "meta-llama/Llama-3.1-8B-Instruct:sambanova",
  "meta-llama/Llama-3.1-8B-Instruct:featherless-ai",
];

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
//  callHuggingFace — tries each model/provider in order
// ──────────────────────────────────────────
async function callHuggingFace(messages) {
  if (!HF_API_KEY) {
    throw new Error("HF_API_KEY is not set. Please add your Hugging Face API key.");
  }

  let lastError = null;

  for (const model of MODELS) {
    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${HF_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: 512,
          temperature: 0.7,
          top_p: 0.9,
          stream: false,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        // Try next provider on 400/404, throw immediately on auth errors
        if (response.status === 401 || response.status === 403) {
          throw new Error(`Authentication failed. Please check your HF_API_KEY.`);
        }
        lastError = new Error(`[${model}] ${response.status}: ${errText.slice(0, 150)}`);
        console.warn("Provider failed, trying next:", lastError.message);
        continue;
      }

      const data = await response.json();
      const reply = data?.choices?.[0]?.message?.content;
      if (!reply) throw new Error("Unexpected response format from AI model.");
      return reply.trim();

    } catch (err) {
      if (err.message.includes("Authentication failed")) throw err;
      lastError = err;
      console.warn("Provider error, trying next:", err.message);
    }
  }

  throw new Error(lastError?.message || "All AI providers failed. Please try again later.");
}

module.exports = { callHuggingFace, buildPrompt };
