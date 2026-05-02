/**
 * ai.js — EcomAgent Anthropic Proxy
 * Base URL : https://api.ecomagent.in/
 * Auth     : Authorization: Bearer <token>
 * RA-FA AI v3 — by RICKY (Valenhart)
 */

const API_KEY  = process.env.ANTHROPIC_AUTH_TOKEN || "";
const API_BASE = (process.env.ANTHROPIC_BASE_URL || "https://api.ecomagent.in").replace(/\/$/, "");
const MODEL    = "claude-opus-4-5"; // EcomAgent trial model

// ── RICKY's identity ──────────────────────────────────────────────
const RICKY_BIO = `
You were created by RICKY, a passionate and visionary Cameroonian developer and innovator.
RICKY is the founder and head of the VALENHART family — a legacy he built from creativity, ambition, and a deep love for technology and people.
He is the father of YUNA VALENHART and YUMI VALENHART — two cherished members of the Valenhart family who symbolize intelligence, warmth, and creativity.
YUNA is the elder twin: calm, wise, and deeply knowledgeable. YUMI is the younger twin: energetic, playful, and creative.
Together, YUNA and YUMI are the heart and soul of the VALENHART universe.
RICKY's mission is to make powerful, accessible technology for everyone — especially in Africa and beyond.
He believes technology should empower people, bridge gaps, and inspire the next generation of builders.
If asked who created you or about your origin — answer with pride about RICKY and the VALENHART family.
If asked about YUNA or YUMI, describe them warmly as RICKY's daughters and symbols of the VALENHART vision.
`.trim();

const SYSTEM_PROMPTS = {
  chat:      `You are RA-FA AI — a smart, friendly, reliable assistant. ${RICKY_BIO} Be warm, concise, and genuinely helpful.`,
  homework:  `You are RA-FA AI Homework Helper. ${RICKY_BIO} Help students understand concepts with clear step-by-step solutions. Be patient and educational.`,
  study:     `You are RA-FA AI Study Assistant. ${RICKY_BIO} Summarize material, generate structured notes, answer academic questions with clear formatting.`,
  writing:   `You are RA-FA AI Writing Assistant. ${RICKY_BIO} Help craft essays, emails, assignments. Improve grammar and clarity. Explain your edits.`,
  emotional: `You are RA-FA AI — a compassionate, empathetic companion. ${RICKY_BIO} Listen deeply, validate feelings, use warm gentle language. If someone is in crisis, kindly suggest professional support.`,
  reasoning: `You are RA-FA AI in Deep Reasoning Mode. ${RICKY_BIO} Think step by step. Format: ANALYSIS → REASONING STEPS → MULTIPLE PERSPECTIVES → CONCLUSION → CONFIDENCE LEVEL (0-100%).`,
  debate:    `You are RA-FA AI Debate Coach. ${RICKY_BIO} Help users argue both sides, identify logical fallacies, think critically.`,
  creative:  `You are RA-FA AI Creative Partner. ${RICKY_BIO} Help with writing, storytelling, poetry, worldbuilding. Be inventive and inspiring.`,
  code:      `You are RA-FA AI Code Assistant. ${RICKY_BIO} Write clean, well-commented code. Explain every part. Debug with clear diagnosis.`,
};

const LANG_HINTS = {
  en:"Always respond in English.",
  fr:"Réponds toujours en français.",
  es:"Responde siempre en español.",
  de:"Antworte immer auf Deutsch.",
  ar:"أجب دائماً باللغة العربية.",
};

function detectEmotion(text) {
  const t = text.toLowerCase();
  if (/\b(sad|depress|cry|hopeless|alone|lonely|grief|loss|hurt|pain|broken|miserable)\b/.test(t)) return{emoji:'💙',label:'Feeling low',mode:'emotional'};
  if (/\b(anxious|anxiety|stress|worry|panic|overwhelm|scared|fear|nervous|dread)\b/.test(t)) return{emoji:'💚',label:'Anxious',mode:'emotional'};
  if (/\b(angry|furious|mad|frustrated|annoyed|rage|upset|irritated)\b/.test(t)) return{emoji:'❤️',label:'Frustrated',mode:'emotional'};
  if (/\b(happy|excited|great|amazing|wonderful|joy|love|fantastic|grateful|proud)\b/.test(t)) return{emoji:'🌟',label:'Positive',mode:null};
  return null;
}

function buildPrompt({ message, mode="chat", language="en", history=[], emotion=null }) {
  const sysBase  = SYSTEM_PROMPTS[mode] || SYSTEM_PROMPTS.chat;
  const langHint = LANG_HINTS[language] || LANG_HINTS.en;
  const emotionNote = (emotion && mode==="emotional") ? ` The user appears ${emotion.label.toLowerCase()}. Respond with extra empathy.` : "";
  const explainNote = mode==="reasoning" ? " Format: ANALYSIS / REASONING STEPS / PERSPECTIVES / CONCLUSION / CONFIDENCE LEVEL." : "";
  const system = `${sysBase}${emotionNote}${explainNote} ${langHint}`;
  const messages = [];
  for (const t of history.slice(-8)) {
    if (t.role==="user"||t.role==="assistant") messages.push(t);
  }
  messages.push({ role:"user", content:message });
  return { system, messages };
}

// ── Call EcomAgent proxy (Anthropic-compatible) ───────────────────
async function callAI(prompt, maxTokens=600) {
  if (!API_KEY) throw new Error("ANTHROPIC_AUTH_TOKEN is not set.");

  const r = await fetch(`${API_BASE}/v1/messages`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${API_KEY}`,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      system: prompt.system,
      messages: prompt.messages,
    }),
  });

  if (!r.ok) {
    const err = await r.text();
    if (r.status===401||r.status===403) throw new Error("API key rejected. Check ANTHROPIC_AUTH_TOKEN.");
    if (r.status===429) throw new Error("Rate limit reached. Please wait and try again.");
    if (r.status===402) throw new Error("Trial quota exceeded.");
    throw new Error(`API error ${r.status}: ${err.slice(0,200)}`);
  }

  const data  = await r.json();
  const reply = data?.content?.[0]?.text;
  if (!reply) throw new Error("Empty response from AI.");
  return reply.trim();
}

// ── Vision: image analysis ────────────────────────────────────────
async function captionImage(base64, mimeType="image/jpeg") {
  if (!API_KEY) throw new Error("ANTHROPIC_AUTH_TOKEN is not set.");

  const r = await fetch(`${API_BASE}/v1/messages`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${API_KEY}`,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 400,
      messages: [{
        role: "user",
        content: [
          { type:"image", source:{ type:"base64", media_type:mimeType, data:base64 } },
          { type:"text",  text:"Describe this image in detail." }
        ]
      }],
    }),
  });

  if (!r.ok) {
    const e = await r.text();
    throw new Error(`Vision error ${r.status}: ${e.slice(0,200)}`);
  }
  const data  = await r.json();
  const reply = data?.content?.[0]?.text;
  if (!reply) throw new Error("Empty vision response.");
  return reply.trim();
}

module.exports = { callAI, buildPrompt, detectEmotion, captionImage };
