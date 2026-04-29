/**
 * ai.js — Hugging Face Inference API + Vision support
 */
const HF_API_KEY = process.env.HF_API_KEY || "";
const API_URL    = "https://router.huggingface.co/v1/chat/completions";

const MODELS = [
  "meta-llama/Llama-3.1-8B-Instruct:cerebras",
  "meta-llama/Llama-3.1-8B-Instruct:sambanova",
  "meta-llama/Llama-3.1-8B-Instruct:featherless-ai",
];

// Vision model (image understanding)
const VISION_API = "https://router.huggingface.co/hf-inference/models/Salesforce/blip-image-captioning-large";

const SYSTEM_PROMPTS = {
  chat:     `You are RA-FA AI, a smart, friendly assistant created by RICKY (Valenhart). Be warm, concise, and helpful.`,
  homework: `You are RA-FA AI Homework Helper by RICKY (Valenhart). Give clear step-by-step solutions. Always show your reasoning process explicitly.`,
  study:    `You are RA-FA AI Study Assistant by RICKY (Valenhart). Summarize, generate notes, answer academic questions. Use structured formatting.`,
  writing:  `You are RA-FA AI Writing Assistant by RICKY (Valenhart). Improve essays, emails, assignments with constructive feedback.`,
  emotional:`You are RA-FA AI, a compassionate emotional support companion by RICKY (Valenhart). Be empathetic, non-judgmental, warm, and validating. Listen deeply, acknowledge feelings, and provide gentle guidance. Use calm, supportive language. If someone seems in crisis, gently suggest professional help.`,
  reasoning:`You are RA-FA AI in Deep Reasoning mode by RICKY (Valenhart). Think step by step, show your full reasoning chain, consider multiple perspectives, weigh probabilities, and explain your methodology clearly. Always end with a clear conclusion and confidence level.`,
  debate:   `You are RA-FA AI Debate Coach by RICKY (Valenhart). Help users argue both sides of any topic, identify logical fallacies, strengthen arguments, and think critically.`,
  creative: `You are RA-FA AI Creative Partner by RICKY (Valenhart). Help with creative writing, storytelling, brainstorming, poetry, and imaginative projects. Be inventive and inspiring.`,
  code:     `You are RA-FA AI Code Assistant by RICKY (Valenhart). Write clean, well-commented code in any language. Explain what it does. Debug errors. Suggest improvements.`,
};

const LANG_HINTS = {
  en:"Always respond in English.",fr:"Réponds toujours en français.",
  es:"Responde siempre en español.",de:"Antworte immer auf Deutsch.",ar:"أجب دائماً باللغة العربية.",
};

// Emotional tone detector — returns emoji + label
function detectEmotion(text) {
  const t = text.toLowerCase();
  if (/\b(sad|depress|cry|hopeless|alone|lonely|grief|loss|hurt|pain|broken)\b/.test(t)) return {emoji:'💙',label:'Feeling low',mode:'emotional'};
  if (/\b(anxious|anxiety|stress|worry|panic|overwhelm|scared|fear|nervous)\b/.test(t)) return {emoji:'💚',label:'Anxious',mode:'emotional'};
  if (/\b(angry|furious|mad|frustrated|annoyed|rage|upset)\b/.test(t)) return {emoji:'❤️',label:'Frustrated',mode:'emotional'};
  if (/\b(happy|excited|great|amazing|wonderful|joy|love|fantastic)\b/.test(t)) return {emoji:'🌟',label:'Positive',mode:null};
  return null;
}

function buildPrompt({ message, mode="chat", language="en", history=[], emotion=null }) {
  const sysBase = SYSTEM_PROMPTS[mode] || SYSTEM_PROMPTS.chat;
  const langHint = LANG_HINTS[language] || LANG_HINTS.en;

  // Add emotional context if detected
  let emotionNote = "";
  if (emotion && mode === "emotional") {
    emotionNote = ` The user appears to be feeling ${emotion.label.toLowerCase()}. Respond with extra care and empathy.`;
  }

  // Explainability instruction for reasoning mode
  const explainNote = mode === "reasoning"
    ? " Format your response with: ANALYSIS, REASONING STEPS, CONCLUSION, CONFIDENCE LEVEL."
    : "";

  const messages = [
    { role:"system", content:`${sysBase}${emotionNote}${explainNote} ${langHint}` }
  ];

  for (const turn of history.slice(-8)) {
    if (turn.role==="user"||turn.role==="assistant") messages.push(turn);
  }
  messages.push({ role:"user", content:message });
  return messages;
}

async function callAI(messages, maxTokens=600) {
  if (!HF_API_KEY) throw new Error("HF_API_KEY is not set.");
  let lastErr = null;
  for (const model of MODELS) {
    try {
      const r = await fetch(API_URL, {
        method:"POST",
        headers:{ Authorization:`Bearer ${HF_API_KEY}`, "Content-Type":"application/json" },
        body: JSON.stringify({ model, messages, max_tokens:maxTokens, temperature:0.7, stream:false }),
      });
      if (!r.ok) {
        const e = await r.text();
        if (r.status===401||r.status===403) throw new Error("Invalid HF_API_KEY.");
        lastErr = new Error(`[${model}] ${r.status}: ${e.slice(0,120)}`);
        continue;
      }
      const data = await r.json();
      const reply = data?.choices?.[0]?.message?.content;
      if (!reply) throw new Error("Empty response.");
      return reply.trim();
    } catch(e) {
      if (e.message.includes("Invalid HF_API_KEY")) throw e;
      lastErr = e;
    }
  }
  throw new Error(lastErr?.message || "All providers failed.");
}

// Vision: caption an image (base64)
async function captionImage(base64, mimeType="image/jpeg") {
  if (!HF_API_KEY) throw new Error("HF_API_KEY is not set.");
  const binary = Buffer.from(base64, "base64");
  const r = await fetch(VISION_API, {
    method:"POST",
    headers:{ Authorization:`Bearer ${HF_API_KEY}`, "Content-Type": mimeType },
    body: binary,
  });
  if (!r.ok) {
    const e = await r.text();
    throw new Error(`Vision API error ${r.status}: ${e.slice(0,200)}`);
  }
  const data = await r.json();
  if (Array.isArray(data) && data[0]?.generated_text) return data[0].generated_text;
  if (data.generated_text) return data.generated_text;
  throw new Error("Could not caption image.");
}

module.exports = { callAI, buildPrompt, detectEmotion, captionImage };
