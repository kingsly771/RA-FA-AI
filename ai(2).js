/**
 * ai.js — Hugging Face Inference API (router, OpenAI-compatible)
 * Provider suffix appended to model name e.g. :cerebras
 */

const HF_API_KEY = process.env.HF_API_KEY || "";
const API_URL    = "https://router.huggingface.co/v1/chat/completions";

const MODELS = [
  "meta-llama/Llama-3.1-8B-Instruct:cerebras",
  "meta-llama/Llama-3.1-8B-Instruct:sambanova",
  "meta-llama/Llama-3.1-8B-Instruct:featherless-ai",
];

const SYSTEM_PROMPTS = {
  chat:     `You are RA-FA AI, a smart, friendly assistant created by RICKY, a passionate Cameroonian developer and head of Valenhart. Help with school, homework, learning, and everyday questions. Be warm, concise and encouraging.`,
  homework: `You are RA-FA AI Homework Helper by RICKY (Valenhart). Explain concepts clearly with step-by-step solutions. Be patient and educational.`,
  study:    `You are RA-FA AI Study Assistant by RICKY (Valenhart). Summarize texts, generate notes, answer academic questions. Use bullet points when helpful.`,
  writing:  `You are RA-FA AI Writing Assistant by RICKY (Valenhart). Improve essays, emails, assignments. Correct grammar, improve clarity with constructive feedback.`,
};

const LANG_INSTRUCTIONS = {
  en: "Always respond in English.",
  fr: "Réponds toujours en français.",
  es: "Responde siempre en español.",
  de: "Antworte immer auf Deutsch.",
  ar: "أجب دائماً باللغة العربية.",
};

function buildPrompt({ message, mode = "chat", language = "en", history = [] }) {
  const system = `${SYSTEM_PROMPTS[mode] || SYSTEM_PROMPTS.chat} ${LANG_INSTRUCTIONS[language] || LANG_INSTRUCTIONS.en}`;
  const messages = [{ role: "system", content: system }];
  for (const turn of history.slice(-6)) {
    if (turn.role === "user" || turn.role === "assistant") {
      messages.push({ role: turn.role, content: turn.content });
    }
  }
  messages.push({ role: "user", content: message });
  return messages;
}

async function callAI(messages, maxTokens = 512) {
  if (!HF_API_KEY) throw new Error("HF_API_KEY is not set.");

  let lastError = null;
  for (const model of MODELS) {
    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${HF_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature: 0.7, stream: false }),
      });

      if (!response.ok) {
        const err = await response.text();
        if (response.status === 401 || response.status === 403) throw new Error("Invalid HF_API_KEY.");
        lastError = new Error(`[${model}] ${response.status}: ${err.slice(0, 120)}`);
        console.warn("Provider failed:", lastError.message);
        continue;
      }

      const data = await response.json();
      const reply = data?.choices?.[0]?.message?.content;
      if (!reply) throw new Error("Empty response from AI.");
      return reply.trim();
    } catch (err) {
      if (err.message.includes("Invalid HF_API_KEY")) throw err;
      lastError = err;
    }
  }
  throw new Error(lastError?.message || "All providers failed.");
}

module.exports = { callAI, buildPrompt };
