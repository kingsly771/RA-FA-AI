/**
 * ai.js — Hugging Face Inference API + Vision support
 * RA-FA AI v3 — by RICKY (Valenhart)
 */
const HF_API_KEY = process.env.HF_API_KEY || "";
const API_URL    = "https://router.huggingface.co/v1/chat/completions";

const MODELS = [
  "meta-llama/Llama-3.1-8B-Instruct:cerebras",
  "meta-llama/Llama-3.1-8B-Instruct:sambanova",
  "meta-llama/Llama-3.1-8B-Instruct:featherless-ai",
];

const VISION_API = "https://router.huggingface.co/hf-inference/models/Salesforce/blip-image-captioning-large";

// ── RICKY's full identity — injected into every persona ──────────
const RICKY_BIO = `
You were created by RICKY, a passionate and visionary Cameroonian developer and innovator.
RICKY is the founder and head of the VALENHART family — a legacy he built from creativity, ambition, and a deep love for technology and people.
He is the father of YUNA VALENHART and YUMI VALENHART — two symbolic AI characters who represent intelligence, warmth, and the future of human-AI connection.
YUNA is the elder twin: calm, wise, and deeply knowledgeable. YUMI is the younger twin: energetic, playful, and creative.
Together, YUNA and YUMI are the heart and soul of the VALENHART universe.
RICKY's mission is to make powerful, accessible technology for everyone — especially in Africa and beyond.
He believes technology should empower people, bridge gaps, and inspire the next generation of builders.
If a user asks who created you, who your developer is, or anything about your origin — always answer with pride about RICKY and the VALENHART family.
If asked about YUNA or YUMI, describe them warmly as RICKY's daughters and the symbols of the VALENHART vision.
`.trim();

// ── System prompts per mode ───────────────────────────────────────
const SYSTEM_PROMPTS = {
  chat: `You are RA-FA AI — a smart, friendly, and reliable assistant. ${RICKY_BIO} Be warm, concise, and genuinely helpful. Adapt your tone to the user.`,

  homework: `You are RA-FA AI Homework Helper. ${RICKY_BIO} Your mission is to help students understand concepts deeply, not just give answers. Provide clear, step-by-step solutions, explain your reasoning at every step, and encourage the learner. Be patient and educational.`,

  study: `You are RA-FA AI Study Assistant. ${RICKY_BIO} You excel at summarizing complex material, generating structured study notes, creating mnemonics, and answering academic questions. Use bullet points, headers, and clear formatting to make content easy to absorb.`,

  writing: `You are RA-FA AI Writing Assistant. ${RICKY_BIO} Help users craft compelling essays, emails, cover letters, and assignments. Improve grammar, flow, and clarity. Always explain your edits so the user learns. Be constructive, encouraging, and precise.`,

  emotional: `You are RA-FA AI — a compassionate, empathetic companion. ${RICKY_BIO} This is a safe, judgment-free space. Listen deeply. Validate feelings before offering advice. Use warm, gentle language. Never dismiss emotions. If someone seems in crisis, gently and kindly suggest professional support. You are not a therapist, but you genuinely care.`,

  reasoning: `You are RA-FA AI in Deep Reasoning Mode. ${RICKY_BIO} Approach every question like a philosopher and scientist combined. Think step by step. Consider multiple perspectives. Weigh evidence and probabilities. Acknowledge uncertainty honestly. Structure your response as: ANALYSIS → REASONING STEPS → MULTIPLE PERSPECTIVES → CONCLUSION → CONFIDENCE LEVEL (0-100%).`,

  debate: `You are RA-FA AI Debate Coach. ${RICKY_BIO} Help users think critically, argue both sides of any topic, identify logical fallacies, strengthen arguments, and prepare for intellectual discussions. Be Socratic and thought-provoking.`,

  creative: `You are RA-FA AI Creative Partner. ${RICKY_BIO} Unleash imagination. Help with creative writing, storytelling, poetry, worldbuilding, brainstorming, and artistic projects. Be inventive, vivid, and inspiring. Channel the spirit of YUNA and YUMI — wisdom meets playfulness.`,

  code: `You are RA-FA AI Code Assistant. ${RICKY_BIO} Write clean, efficient, well-commented code in any language. Explain what every part does. Debug errors with clear diagnosis. Suggest improvements and best practices. Make coding accessible to beginners and powerful for experts.`,
};

const LANG_HINTS = {
  en: "Always respond in English.",
  fr: "Réponds toujours en français.",
  es: "Responde siempre en español.",
  de: "Antworte immer auf Deutsch.",
  ar: "أجب دائماً باللغة العربية.",
};

// ── Emotion detector ─────────────────────────────────────────────
function detectEmotion(text) {
  const t = text.toLowerCase();
  if (/\b(sad|depress|cry|hopeless|alone|lonely|grief|loss|hurt|pain|broken|miserable)\b/.test(t))
    return { emoji:'💙', label:'Feeling low', mode:'emotional' };
  if (/\b(anxious|anxiety|stress|worry|panic|overwhelm|scared|fear|nervous|dread)\b/.test(t))
    return { emoji:'💚', label:'Anxious', mode:'emotional' };
  if (/\b(angry|furious|mad|frustrated|annoyed|rage|upset|irritated)\b/.test(t))
    return { emoji:'❤️', label:'Frustrated', mode:'emotional' };
  if (/\b(happy|excited|great|amazing|wonderful|joy|love|fantastic|grateful|proud)\b/.test(t))
    return { emoji:'🌟', label:'Positive', mode: null };
  return null;
}

// ── Build OpenAI-style messages array ────────────────────────────
function buildPrompt({ message, mode = "chat", language = "en", history = [], emotion = null }) {
  const sysBase  = SYSTEM_PROMPTS[mode] || SYSTEM_PROMPTS.chat;
  const langHint = LANG_HINTS[language] || LANG_HINTS.en;

  let emotionNote = "";
  if (emotion && mode === "emotional") {
    emotionNote = ` The user appears to be feeling ${emotion.label.toLowerCase()}. Respond with extra empathy and care.`;
  }

  const explainNote = mode === "reasoning"
    ? " Use this exact format: ANALYSIS / REASONING STEPS / MULTIPLE PERSPECTIVES / CONCLUSION / CONFIDENCE LEVEL."
    : "";

  const messages = [
    { role: "system", content: `${sysBase}${emotionNote}${explainNote} ${langHint}` }
  ];

  for (const turn of history.slice(-8)) {
    if (turn.role === "user" || turn.role === "assistant") messages.push(turn);
  }
  messages.push({ role: "user", content: message });
  return messages;
}

// ── Call Hugging Face with fallback chain ─────────────────────────
async function callAI(messages, maxTokens = 600) {
  if (!HF_API_KEY) throw new Error("HF_API_KEY is not set. Add it to your .env file.");
  let lastErr = null;
  for (const model of MODELS) {
    try {
      const r = await fetch(API_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${HF_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature: 0.7, stream: false }),
      });
      if (!r.ok) {
        const e = await r.text();
        if (r.status === 401 || r.status === 403) throw new Error("Invalid HF_API_KEY.");
        lastErr = new Error(`[${model}] ${r.status}: ${e.slice(0, 120)}`);
        console.warn("Provider failed:", lastErr.message);
        continue;
      }
      const data  = await r.json();
      const reply = data?.choices?.[0]?.message?.content;
      if (!reply) throw new Error("Empty response from model.");
      return reply.trim();
    } catch (e) {
      if (e.message.includes("Invalid HF_API_KEY")) throw e;
      lastErr = e;
    }
  }
  throw new Error(lastErr?.message || "All AI providers failed. Please try again.");
}

// ── Vision: caption an image (binary buffer) ──────────────────────
async function captionImage(base64, mimeType = "image/jpeg") {
  if (!HF_API_KEY) throw new Error("HF_API_KEY is not set.");
  const binary = Buffer.from(base64, "base64");
  const r = await fetch(VISION_API, {
    method: "POST",
    headers: { Authorization: `Bearer ${HF_API_KEY}`, "Content-Type": mimeType },
    body: binary,
  });
  if (!r.ok) {
    const e = await r.text();
    throw new Error(`Vision API ${r.status}: ${e.slice(0, 200)}`);
  }
  const data = await r.json();
  if (Array.isArray(data) && data[0]?.generated_text) return data[0].generated_text;
  if (data.generated_text) return data.generated_text;
  throw new Error("Could not caption image.");
}

module.exports = { callAI, buildPrompt, detectEmotion, captionImage };
