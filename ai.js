/**
 * ai.js — Hugging Face Inference API integration
 * Uses Mistral-7B-Instruct (free tier, no credit card needed)
 */

const HF_API_KEY = process.env.HF_API_KEY || "";
const MODEL = "mistralai/Mistral-7B-Instruct-v0.3";
const API_URL = `https://api-inference.huggingface.co/models/${MODEL}`;

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
//  buildPrompt — format for Mistral instruct
// ──────────────────────────────────────────
function buildPrompt({ message, mode = "chat", language = "en", history = [] }) {
  const systemBase = SYSTEM_PROMPTS[mode] || SYSTEM_PROMPTS.chat;
  const langHint = LANG_INSTRUCTIONS[language] || LANG_INSTRUCTIONS.en;
  const system = `${systemBase} ${langHint}`;

  // Mistral instruct format: <s>[INST] ... [/INST]
  let prompt = `<s>[INST] ${system}\n\n`;

  // Inject last 4 turns of history for context
  const recent = history.slice(-4);
  for (const turn of recent) {
    if (turn.role === "user") prompt += `User: ${turn.content}\n`;
    if (turn.role === "assistant") prompt += `Assistant: ${turn.content}\n`;
  }

  prompt += `User: ${message} [/INST]`;
  return prompt;
}

// ──────────────────────────────────────────
//  callHuggingFace — POST to inference API
// ──────────────────────────────────────────
async function callHuggingFace(prompt) {
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
      inputs: prompt,
      parameters: {
        max_new_tokens: 512,
        temperature: 0.7,
        top_p: 0.9,
        do_sample: true,
        return_full_text: false,
      },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    // Model loading (503) — tell user to wait
    if (response.status === 503) {
      throw new Error("The AI model is loading (cold start). Please wait ~20 seconds and try again.");
    }
    throw new Error(`Hugging Face API error ${response.status}: ${errText.slice(0, 200)}`);
  }

  const data = await response.json();

  // HF returns array of generated texts
  if (Array.isArray(data) && data[0]?.generated_text) {
    return cleanResponse(data[0].generated_text);
  }

  // Some models return object directly
  if (data.generated_text) return cleanResponse(data.generated_text);

  throw new Error("Unexpected response format from AI model.");
}

// Strip any leftover prompt artifacts
function cleanResponse(text) {
  return text
    .replace(/\[INST\].*?\[\/INST\]/gs, "")
    .replace(/^Assistant:\s*/i, "")
    .trim();
}

module.exports = { callHuggingFace, buildPrompt };
