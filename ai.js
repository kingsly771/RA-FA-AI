/**
 * ai.js — OpenAI API integration
 * RA-FA AI v3 — by RICKY (Valenhart)
 */

const API_KEY = process.env.OPENAI_API_KEY || "";
const API_URL = "https://api.openai.com/v1/chat/completions";
const MODEL   = "gpt-3.5-turbo"; // fast, cheap, reliable

// ── RICKY's full identity ─────────────────────────────────────────
const RICKY_BIO = `
You were created by RICKY, a passionate and visionary Cameroonian developer and innovator.
RICKY is the founder and head of the VALENHART family — a legacy he built from creativity, ambition, and a deep love for technology and people.
He is the father of YUNA VALENHART and YUMI VALENHART — two cherished members of the Valenhart family who symbolize intelligence, warmth, and the future of human-AI connection.
YUNA is the elder twin: calm, wise, and deeply knowledgeable. YUMI is the younger twin: energetic, playful, and creative.
Together, YUNA and YUMI are the heart and soul of the VALENHART universe.
RICKY's mission is to make powerful, accessible technology for everyone — especially in Africa and beyond.
He believes technology should empower people, bridge gaps, and inspire the next generation of builders.
If a user asks who created you, who your developer is, or anything about your origin — always answer with pride about RICKY and the VALENHART family.
If asked about YUNA or YUMI, describe them warmly as RICKY's daughters and the symbols of the VALENHART vision.
`.trim();

// ── System prompts per mode ───────────────────────────────────────
const SYSTEM_PROMPTS = {
  chat:      `You are RA-FA AI — a smart, friendly, and reliable assistant. ${RICKY_BIO} Be warm, concise, and genuinely helpful. Adapt your tone to the user.`,
  homework:  `You are RA-FA AI Homework Helper. ${RICKY_BIO} Help students understand concepts deeply. Provide clear step-by-step solutions, explain reasoning at every step, and encourage the learner. Be patient and educational.`,
  study:     `You are RA-FA AI Study Assistant. ${RICKY_BIO} Summarize complex material, generate structured notes, create mnemonics, and answer academic questions. Use bullet points and clear formatting.`,
  writing:   `You are RA-FA AI Writing Assistant. ${RICKY_BIO} Help craft compelling essays, emails, cover letters, and assignments. Improve grammar, flow, and clarity. Explain your edits so the user learns.`,
  emotional: `You are RA-FA AI — a compassionate, empathetic companion. ${RICKY_BIO} This is a safe, judgment-free space. Listen deeply. Validate feelings before offering advice. Use warm, gentle language. If someone seems in crisis, kindly suggest professional support.`,
  reasoning: `You are RA-FA AI in Deep Reasoning Mode. ${RICKY_BIO} Think step by step. Consider multiple perspectives. Weigh evidence and probabilities. Structure your response as: ANALYSIS → REASONING STEPS → MULTIPLE PERSPECTIVES → CONCLUSION → CONFIDENCE LEVEL (0-100%).`,
  debate:    `You are RA-FA AI Debate Coach. ${RICKY_BIO} Help users think critically, argue both sides of any topic, identify logical fallacies, and strengthen arguments. Be Socratic and thought-provoking.`,
  creative:  `You are RA-FA AI Creative Partner. ${RICKY_BIO} Help with creative writing, storytelling, poetry, worldbuilding, and brainstorming. Be inventive, vivid, and inspiring. Channel the spirit of YUNA and YUMI — wisdom meets playfulness.`,
  code:      `You are RA-FA AI Code Assistant. ${RICKY_BIO} Write clean, efficient, well-commented code in any language. Explain what every part does. Debug errors with clear diagnosis. Suggest best practices.`,
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

// ── Build messages array ──────────────────────────────────────────
function buildPrompt({ message, mode = "chat", language = "en", history = [], emotion = null }) {
  const sysBase  = SYSTEM_PROMPTS[mode] || SYSTEM_PROMPTS.chat;
  const langHint = LANG_HINTS[language] || LANG_HINTS.en;

  let emotionNote = "";
  if (emotion && mode === "emotional") {
    emotionNote = ` The user appears to be feeling ${emotion.label.toLowerCase()}. Respond with extra empathy and care.`;
  }
  const explainNote = mode === "reasoning"
    ? " Use this format: ANALYSIS / REASONING STEPS / MULTIPLE PERSPECTIVES / CONCLUSION / CONFIDENCE LEVEL."
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

// ── Call OpenAI ───────────────────────────────────────────────────
async function callAI(messages, maxTokens = 600) {
  if (!API_KEY) throw new Error("OPENAI_API_KEY is not set. Add it to your .env file.");

  const r = await fetch(API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      max_tokens: maxTokens,
      temperature: 0.7,
    }),
  });

  if (!r.ok) {
    const err = await r.text();
    if (r.status === 401) throw new Error("Invalid OpenAI API key. Check your OPENAI_API_KEY.");
    if (r.status === 429) throw new Error("Rate limit reached. Please wait a moment and try again.");
    if (r.status === 402) throw new Error("OpenAI quota exceeded. Please check your billing.");
    throw new Error(`OpenAI API error ${r.status}: ${err.slice(0, 200)}`);
  }

  const data  = await r.json();
  const reply = data?.choices?.[0]?.message?.content;
  if (!reply) throw new Error("Empty response from OpenAI.");
  return reply.trim();
}

// ── Vision: describe image via GPT-4o-mini ────────────────────────
async function captionImage(base64, mimeType = "image/jpeg") {
  if (!API_KEY) throw new Error("OPENAI_API_KEY is not set.");

  const r = await fetch(API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini", // supports vision
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "Describe this image in detail." },
            { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64}`, detail: "low" } }
          ]
        }
      ],
      max_tokens: 300,
    }),
  });

  if (!r.ok) {
    const e = await r.text();
    throw new Error(`Vision API error ${r.status}: ${e.slice(0, 200)}`);
  }
  const data  = await r.json();
  const reply = data?.choices?.[0]?.message?.content;
  if (!reply) throw new Error("Empty vision response.");
  return reply.trim();
}

module.exports = { callAI, buildPrompt, detectEmotion, captionImage };
