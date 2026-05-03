/**
 * ai.js — Multi-provider AI with fallback chain
 * Providers: Groq → Together AI → Hugging Face
 * All free tier, no credit card needed
 * RA-FA AI v3 — by RICKY (Valenhart)
 */

// ── API Keys (set in .env / Render environment) ───────────────────
const GROQ_KEY     = process.env.GROQ_API_KEY     || "";
const CEREBRAS_KEY = process.env.CEREBRAS_API_KEY  || "";
const HF_KEY       = process.env.HF_API_KEY        || "";

// ── RICKY's identity ──────────────────────────────────────────────
const RICKY_BIO = `
You were created by RICKY, a passionate and visionary Cameroonian developer and innovator.
RICKY is the founder and head of the VALENHART family — a legacy built from creativity, ambition, and a deep love for technology and people.
He is the father of YUNA VALENHART and YUMI VALENHART — two cherished members of the Valenhart family who symbolize intelligence, warmth, and creativity.
YUNA is the elder twin: calm, wise, and deeply knowledgeable. YUMI is the younger twin: energetic, playful, and creative.
Together, YUNA and YUMI are the heart and soul of the VALENHART universe.
RICKY's mission is to make powerful, accessible technology for everyone — especially in Africa and beyond.
He believes technology should empower people, bridge gaps, and inspire the next generation of builders.
If asked who created you or about your origin — answer with pride about RICKY and the VALENHART family.
If asked about YUNA or YUMI, describe them warmly as RICKY's daughters and symbols of the VALENHART vision.
`.trim();

// ── System prompts ────────────────────────────────────────────────
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

// ── Provider definitions ──────────────────────────────────────────
// Each provider: { name, url, model, authHeader, buildBody, parseReply }
function getProviders(messages, maxTokens) {
  const providers = [];

  // 1. GROQ — fastest, free, generous limits, OpenAI-compatible
  // Get key: https://console.groq.com (free, instant)
  // Models: llama-3.3-70b-versatile (best), llama-3.1-8b-instant (fast)
  if (GROQ_KEY) {
    providers.push({
      name: "Groq (Llama-3.3-70B)",
      call: async () => {
        const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { "Authorization": `Bearer ${GROQ_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages,
            max_tokens: maxTokens,
            temperature: 0.7,
          }),
        });
        if (!r.ok) throw new Error(`Groq ${r.status}: ${(await r.text()).slice(0,120)}`);
        const d = await r.json();
        return d.choices?.[0]?.message?.content?.trim();
      }
    });

    // Groq fallback model — faster, still good
    providers.push({
      name: "Groq (Llama-3.1-8B)",
      call: async () => {
        const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { "Authorization": `Bearer ${GROQ_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "llama-3.1-8b-instant",
            messages,
            max_tokens: maxTokens,
            temperature: 0.7,
          }),
        });
        if (!r.ok) throw new Error(`Groq-8B ${r.status}: ${(await r.text()).slice(0,120)}`);
        const d = await r.json();
        return d.choices?.[0]?.message?.content?.trim();
      }
    });
  }

  // 2. CEREBRAS — free forever, blazing fast, runs Llama-3.3-70B
  // Get key FREE: https://cloud.cerebras.ai (no credit card needed)
  // Fastest inference on the planet — 2000+ tokens/sec
  if (CEREBRAS_KEY) {
    providers.push({
      name: "Cerebras (Llama-3.3-70B)",
      call: async () => {
        const r = await fetch("https://api.cerebras.ai/v1/chat/completions", {
          method: "POST",
          headers: { "Authorization": `Bearer ${CEREBRAS_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "llama-3.3-70b",
            messages,
            max_tokens: maxTokens,
            temperature: 0.7,
          }),
        });
        if (!r.ok) throw new Error(`Cerebras-70B ${r.status}: ${(await r.text()).slice(0,120)}`);
        const d = await r.json();
        return d.choices?.[0]?.message?.content?.trim();
      }
    });

    providers.push({
      name: "Cerebras (Llama-3.1-8B)",
      call: async () => {
        const r = await fetch("https://api.cerebras.ai/v1/chat/completions", {
          method: "POST",
          headers: { "Authorization": `Bearer ${CEREBRAS_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "llama3.1-8b",
            messages,
            max_tokens: maxTokens,
            temperature: 0.7,
          }),
        });
        if (!r.ok) throw new Error(`Cerebras-8B ${r.status}: ${(await r.text()).slice(0,120)}`);
        const d = await r.json();
        return d.choices?.[0]?.message?.content?.trim();
      }
    });
  }

  // 3. HUGGING FACE — always free, no expiry
  // Get key: https://huggingface.co/settings/tokens
  if (HF_KEY) {
    const HF_MODELS = [
      "meta-llama/Llama-3.1-8B-Instruct:cerebras",
      "meta-llama/Llama-3.1-8B-Instruct:sambanova",
      "meta-llama/Llama-3.1-8B-Instruct:featherless-ai",
    ];
    for (const model of HF_MODELS) {
      const m = model; // closure
      providers.push({
        name: `HuggingFace (${m.split(":")[1]})`,
        call: async () => {
          const r = await fetch("https://router.huggingface.co/v1/chat/completions", {
            method: "POST",
            headers: { "Authorization": `Bearer ${HF_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({ model: m, messages, max_tokens: maxTokens, temperature: 0.7, stream: false }),
          });
          if (!r.ok) throw new Error(`HF ${m} ${r.status}: ${(await r.text()).slice(0,120)}`);
          const d = await r.json();
          return d.choices?.[0]?.message?.content?.trim();
        }
      });
    }
  }

  return providers;
}

// ── Emotion detector ──────────────────────────────────────────────
function detectEmotion(text) {
  const t = text.toLowerCase();
  if (/\b(sad|depress|cry|hopeless|alone|lonely|grief|loss|hurt|pain|broken|miserable)\b/.test(t)) return{emoji:'💙',label:'Feeling low',mode:'emotional'};
  if (/\b(anxious|anxiety|stress|worry|panic|overwhelm|scared|fear|nervous|dread)\b/.test(t)) return{emoji:'💚',label:'Anxious',mode:'emotional'};
  if (/\b(angry|furious|mad|frustrated|annoyed|rage|upset|irritated)\b/.test(t)) return{emoji:'❤️',label:'Frustrated',mode:'emotional'};
  if (/\b(happy|excited|great|amazing|wonderful|joy|love|fantastic|grateful|proud)\b/.test(t)) return{emoji:'🌟',label:'Positive',mode:null};
  return null;
}

// ── Build messages (OpenAI format — works for all 3 providers) ────
function buildPrompt({ message, mode="chat", language="en", history=[], emotion=null }) {
  const sysBase   = SYSTEM_PROMPTS[mode] || SYSTEM_PROMPTS.chat;
  const langHint  = LANG_HINTS[language] || LANG_HINTS.en;
  const emoNote   = (emotion && mode==="emotional") ? ` User appears ${emotion.label.toLowerCase()}. Respond with extra empathy.` : "";
  const reasNote  = mode==="reasoning" ? " Format: ANALYSIS / REASONING STEPS / PERSPECTIVES / CONCLUSION / CONFIDENCE LEVEL." : "";

  const messages = [
    { role:"system", content:`${sysBase}${emoNote}${reasNote} ${langHint}` }
  ];
  for (const t of history.slice(-8)) {
    if (t.role==="user"||t.role==="assistant") messages.push(t);
  }
  messages.push({ role:"user", content:message });
  return messages;
}

// ── Main caller — tries providers in order ────────────────────────
async function callAI(messages, maxTokens=600) {
  const hasKey = GROQ_KEY || TOGETHER_KEY || HF_KEY;
  if (!hasKey) throw new Error("No API keys set. Add GROQ_API_KEY, TOGETHER_API_KEY, or HF_API_KEY.");

  const providers = getProviders(messages, maxTokens);
  if (!providers.length) throw new Error("No providers available. Check your API keys.");

  let lastErr = null;
  for (const provider of providers) {
    try {
      console.log(`Trying ${provider.name}…`);
      const reply = await provider.call();
      if (reply) {
        console.log(`✅ Success via ${provider.name}`);
        return reply;
      }
    } catch(e) {
      console.warn(`❌ ${provider.name} failed:`, e.message);
      lastErr = e;
    }
  }
  throw new Error(lastErr?.message || "All AI providers failed. Please try again.");
}

// ── Vision: image captioning via HF ──────────────────────────────
async function captionImage(base64, mimeType="image/jpeg") {
  if (!HF_KEY) throw new Error("HF_API_KEY required for image analysis.");
  const binary = Buffer.from(base64, "base64");
  const r = await fetch("https://router.huggingface.co/hf-inference/models/Salesforce/blip-image-captioning-large", {
    method: "POST",
    headers: { "Authorization": `Bearer ${HF_KEY}`, "Content-Type": mimeType },
    body: binary,
  });
  if (!r.ok) throw new Error(`Vision error ${r.status}: ${(await r.text()).slice(0,200)}`);
  const data = await r.json();
  if (Array.isArray(data) && data[0]?.generated_text) return data[0].generated_text;
  if (data.generated_text) return data.generated_text;
  throw new Error("Could not caption image.");
}

module.exports = { callAI, buildPrompt, detectEmotion, captionImage };
