/**
 * RA-FA AI v3 — Backend
 * Developer: RICKY (Valenhart)
 */
const express = require("express");
const cors    = require("cors");
const path    = require("path");
const multer  = require("multer");

const { callAI, buildPrompt, detectEmotion, captionImage } = require("./ai");
const { generateImage } = require("./image");
const { getCache, setCache } = require("./cache");

const app  = express();
const PORT = process.env.PORT || 3000;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
});

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.static(path.join(__dirname, "public")));

// ── POST /api/chat ─────────────────────────────────
app.post("/api/chat", async (req, res) => {
  try {
    const { message, mode, language, history, emotion } = req.body;
    if (!message?.trim()) return res.status(400).json({ error:"Message cannot be empty." });

    const cacheKey = `chat::${mode}::${language}::${message.trim().toLowerCase().slice(0,120)}`;
    const cached = getCache(cacheKey);
    if (cached) return res.json({ reply:cached, cached:true, emotion });

    const messages = buildPrompt({ message, mode, language, history:history||[], emotion });
    const reply = await callAI(messages, mode==="reasoning" ? 900 : 600);
    setCache(cacheKey, reply);
    res.json({ reply, cached:false, emotion: detectEmotion(message) });
  } catch(err) {
    console.error("Chat:", err.message);
    res.status(500).json({ error:err.message });
  }
});

// ── POST /api/image-analyze ────────────────────────
// Analyze an uploaded image: caption it then answer user question
app.post("/api/image-analyze", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error:"No image uploaded." });
    const { question="Describe this image in detail", language="en" } = req.body;

    // Step 1: caption the image
    const base64 = req.file.buffer.toString("base64");
    let caption = "";
    try {
      caption = await captionImage(base64, req.file.mimetype);
    } catch(e) {
      console.warn("Caption failed, using raw analysis:", e.message);
      caption = "an image (captioning unavailable)";
    }

    // Step 2: answer the question with context
    const langMap = { en:"English",fr:"French",es:"Spanish",de:"German",ar:"Arabic" };
    const lang = langMap[language]||"English";
    const messages = [
      { role:"system", content:`You are RA-FA AI Vision by RICKY (Valenhart). Analyze images and answer questions about them. Be detailed and accurate. Respond in ${lang}.` },
      { role:"user",   content:`I have an image. Auto-caption: "${caption}"\n\nUser's question: ${question}\n\nPlease provide a detailed, helpful answer based on the image description.` }
    ];
    const reply = await callAI(messages, 500);
    res.json({ caption, reply });
  } catch(err) {
    console.error("Image analyze:", err.message);
    res.status(500).json({ error:err.message });
  }
});

// ── POST /api/quiz ─────────────────────────────────
app.post("/api/quiz", async (req, res) => {
  try {
    const { topic, count=5, difficulty="medium", language="en", type="mcq" } = req.body;
    if (!topic?.trim()) return res.status(400).json({ error:"Topic required." });

    const cacheKey = `quiz::${topic}::${count}::${difficulty}::${language}::${type}`;
    const cached = getCache(cacheKey);
    if (cached) return res.json({ quiz:cached, cached:true });

    const langMap={en:"English",fr:"French",es:"Spanish",de:"German",ar:"Arabic"};
    const lang = langMap[language]||"English";

    const typeInstructions = type === "truefalse"
      ? `Generate ${count} True/False questions. Each item: {"question":"...","answer":"True" or "False","explanation":"..."}`
      : type === "openended"
      ? `Generate ${count} open-ended questions with model answers. Each item: {"question":"...","answer":"model answer here","explanation":"..."}`
      : `Generate ${count} MCQ questions. Each item: {"question":"...","options":["A)...","B)...","C)...","D)..."],"answer":"A)...","explanation":"..."}`;

    const messages = [
      { role:"system", content:`You are a quiz generator. Respond ONLY with a raw JSON array. No markdown, no backticks, no explanation.` },
      { role:"user",   content:`${typeInstructions} about "${topic}" at ${difficulty} difficulty in ${lang}. Return ONLY the JSON array.` }
    ];

    const raw = await callAI(messages, 1400);
    const cleaned = raw.replace(/```json|```/gi,"").trim();
    const match = cleaned.match(/\[[\s\S]*\]/);
    if (!match) throw new Error("AI did not return valid JSON. Try again.");
    const quiz = JSON.parse(match[0]);
    setCache(cacheKey, quiz);
    res.json({ quiz, cached:false });
  } catch(err) {
    console.error("Quiz:", err.message);
    res.status(500).json({ error:err.message });
  }
});

// ── POST /api/translate ────────────────────────────
app.post("/api/translate", async (req, res) => {
  try {
    const { text, targetLanguage, sourceLanguage="auto", formality="neutral" } = req.body;
    if (!text?.trim()) return res.status(400).json({ error:"Text required." });

    const cacheKey = `tr::${targetLanguage}::${formality}::${text.trim().slice(0,80)}`;
    const cached = getCache(cacheKey);
    if (cached) return res.json({ translation:cached, cached:true });

    const src = sourceLanguage==="auto" ? "" : ` from ${sourceLanguage}`;
    const formalNote = formality==="formal" ? " Use formal register." : formality==="informal" ? " Use informal/casual register." : "";
    const messages = [
      { role:"system", content:`You are a professional translator.${formalNote} Return ONLY the translated text.` },
      { role:"user",   content:`Translate the following text${src} to ${targetLanguage}:\n\n${text}` }
    ];
    const translation = await callAI(messages, 800);
    setCache(cacheKey, translation);
    res.json({ translation, cached:false });
  } catch(err) {
    console.error("Translate:", err.message);
    res.status(500).json({ error:err.message });
  }
});

// ── POST /api/analyze-file ─────────────────────────
app.post("/api/analyze-file", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error:"No file uploaded." });
    const { action="summarize", language="en", question="" } = req.body;
    const langMap={en:"English",fr:"French",es:"Spanish",de:"German",ar:"Arabic"};
    const lang = langMap[language]||"English";

    let fileText = "";
    if (req.file.originalname.match(/\.(txt|md)$/i)) {
      fileText = req.file.buffer.toString("utf-8");
    } else if (req.file.originalname.match(/\.pdf$/i)) {
      const raw = req.file.buffer.toString("latin1");
      const matches = raw.match(/\(([^\)]{2,})\)/g)||[];
      fileText = matches.map(m=>m.slice(1,-1)).join(" ");
      if (fileText.trim().length < 30) fileText = raw.replace(/[^\x20-\x7E\n]/g," ").replace(/\s+/g," ").trim();
    } else {
      fileText = req.file.buffer.toString("utf-8");
    }

    const truncated = fileText.slice(0, 4000);
    if (truncated.trim().length < 10) return res.status(400).json({ error:"Cannot extract text from this file." });

    const actions = {
      summarize:`Summarize in clear bullet points in ${lang}.`,
      keypoints:`Extract the 5 most important key points in ${lang}.`,
      explain:  `Explain this in simple terms a student can understand in ${lang}.`,
      question: `Answer this question: "${question}" based on the document in ${lang}.`,
      mindmap:  `Create a structured mind map / outline of the main topics and subtopics in ${lang}. Use indented bullet points.`,
    };

    const messages = [
      { role:"system", content: actions[action]||actions.summarize },
      { role:"user",   content:`Document:\n\n${truncated}` }
    ];
    const result = await callAI(messages, 700);
    res.json({ result, filename:req.file.originalname, chars:truncated.length });
  } catch(err) {
    console.error("File:", err.message);
    res.status(500).json({ error:err.message });
  }
});

// ── POST /api/image ────────────────────────────────
app.post("/api/image", async (req, res) => {
  try {
    const { prompt, style="realistic" } = req.body;
    if (!prompt?.trim()) return res.status(400).json({ error:"Prompt required." });
    const cacheKey = `img::${style}::${prompt.trim().toLowerCase()}`;
    const cached = getCache(cacheKey);
    if (cached) return res.json({ imageUrl:cached, cached:true });
    const imageUrl = await generateImage(prompt, style);
    setCache(cacheKey, imageUrl);
    res.json({ imageUrl, cached:false });
  } catch(err) {
    console.error("Image:", err.message);
    res.status(500).json({ error:err.message });
  }
});

// ── POST /api/explain ──────────────────────────────
// Explain reasoning behind any topic (explainability feature)
app.post("/api/explain", async (req, res) => {
  try {
    const { topic, depth="simple", language="en" } = req.body;
    if (!topic?.trim()) return res.status(400).json({ error:"Topic required." });
    const langMap={en:"English",fr:"French",es:"Spanish",de:"German",ar:"Arabic"};
    const lang = langMap[language]||"English";
    const depthMap = { simple:"Explain simply like I'm 12", medium:"Explain with moderate detail", expert:"Explain with full technical depth and nuance" };
    const messages = [
      { role:"system", content:`You are an expert explainer. ${depthMap[depth]||depthMap.simple}. Show your reasoning step by step. Respond in ${lang}.` },
      { role:"user",   content:`Explain: ${topic}` }
    ];
    const reply = await callAI(messages, 800);
    res.json({ reply });
  } catch(err) {
    res.status(500).json({ error:err.message });
  }
});

// ── GET /api/health ────────────────────────────────
app.get("/api/health", (_,res) => res.json({ status:"ok", version:"3.0", service:"RA-FA AI" }));
app.get("*", (_,res) => res.sendFile(path.join(__dirname,"public","index.html")));

app.listen(PORT, () => console.log(`✅ RA-FA AI v3 on port ${PORT}`));
