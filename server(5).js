/**
 * RA-FA AI v2 — Backend Server
 * Developer: RICKY (Valenhart)
 * Features: Chat, Homework, Study, Writing, Image Gen, Translation, Quiz, File Analysis
 */

const express  = require("express");
const cors     = require("cors");
const path     = require("path");
const multer   = require("multer");

const { callAI, buildPrompt } = require("./ai");
const { generateImage }       = require("./image");
const { getCache, setCache }  = require("./cache");

const app  = express();
const PORT = process.env.PORT || 3000;

// Multer: store uploaded files in memory (no disk needed on Render)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter(_, file, cb) {
    const allowed = ["text/plain", "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    // Also allow by extension for PDFs
    if (allowed.includes(file.mimetype) || file.originalname.match(/\.(txt|pdf|docx|md)$/i)) {
      cb(null, true);
    } else {
      cb(new Error("Only .txt, .pdf, .docx, .md files are supported."));
    }
  },
});

app.use(cors());
app.use(express.json({ limit: "4mb" }));
app.use(express.static(path.join(__dirname, "public")));

// ── POST /api/chat ─────────────────────────────────────────────
app.post("/api/chat", async (req, res) => {
  try {
    const { message, mode, language, history } = req.body;
    if (!message?.trim()) return res.status(400).json({ error: "Message cannot be empty." });

    const cacheKey = `chat::${mode}::${language}::${message.trim().toLowerCase()}`;
    const cached = getCache(cacheKey);
    if (cached) return res.json({ reply: cached, cached: true });

    const messages = buildPrompt({ message, mode, language, history: history || [] });
    const reply = await callAI(messages);
    setCache(cacheKey, reply);
    res.json({ reply, cached: false });
  } catch (err) {
    console.error("Chat error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/quiz ─────────────────────────────────────────────
app.post("/api/quiz", async (req, res) => {
  try {
    const { topic, count = 5, difficulty = "medium", language = "en" } = req.body;
    if (!topic?.trim()) return res.status(400).json({ error: "Topic is required." });

    const cacheKey = `quiz::${topic}::${count}::${difficulty}::${language}`;
    const cached = getCache(cacheKey);
    if (cached) return res.json({ quiz: cached, cached: true });

    const langMap = { en: "English", fr: "French", es: "Spanish", de: "German", ar: "Arabic" };
    const lang = langMap[language] || "English";

    const messages = [
      {
        role: "system",
        content: `You are a quiz generator. Always respond ONLY with a valid JSON array. No markdown, no explanation, no extra text — just the raw JSON array.`
      },
      {
        role: "user",
        content: `Generate exactly ${count} multiple-choice quiz questions about "${topic}" at ${difficulty} difficulty level. Respond in ${lang}.

Return ONLY a JSON array like this (no markdown, no backticks):
[
  {
    "question": "Question text here?",
    "options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
    "answer": "A) Option 1",
    "explanation": "Brief explanation why this is correct."
  }
]`
      }
    ];

    const raw = await callAI(messages, 1200);

    // Strip markdown code fences if model added them
    const cleaned = raw.replace(/```json|```/gi, "").trim();
    // Extract JSON array
    const match = cleaned.match(/\[[\s\S]*\]/);
    if (!match) throw new Error("AI did not return valid quiz JSON. Please try again.");

    const quiz = JSON.parse(match[0]);
    setCache(cacheKey, quiz);
    res.json({ quiz, cached: false });
  } catch (err) {
    console.error("Quiz error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/translate ────────────────────────────────────────
app.post("/api/translate", async (req, res) => {
  try {
    const { text, targetLanguage, sourceLanguage = "auto" } = req.body;
    if (!text?.trim()) return res.status(400).json({ error: "Text is required." });
    if (!targetLanguage) return res.status(400).json({ error: "Target language is required." });

    const cacheKey = `translate::${targetLanguage}::${text.trim().toLowerCase().slice(0, 100)}`;
    const cached = getCache(cacheKey);
    if (cached) return res.json({ translation: cached, cached: true });

    const sourcePart = sourceLanguage === "auto" ? "" : ` from ${sourceLanguage}`;
    const messages = [
      { role: "system", content: `You are a professional translator. Translate the given text accurately. Return ONLY the translated text, nothing else — no labels, no explanations.` },
      { role: "user", content: `Translate the following text${sourcePart} to ${targetLanguage}:\n\n${text}` }
    ];

    const translation = await callAI(messages, 800);
    setCache(cacheKey, translation);
    res.json({ translation, cached: false });
  } catch (err) {
    console.error("Translate error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/analyze-file ─────────────────────────────────────
app.post("/api/analyze-file", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded." });

    const { action = "summarize", language = "en", question = "" } = req.body;
    const langMap = { en: "English", fr: "French", es: "Spanish", de: "German", ar: "Arabic" };
    const lang = langMap[language] || "English";

    // Extract text from buffer
    let fileText = "";
    if (req.file.mimetype === "text/plain" || req.file.originalname.match(/\.(txt|md)$/i)) {
      fileText = req.file.buffer.toString("utf-8");
    } else if (req.file.originalname.match(/\.pdf$/i)) {
      // Basic PDF text extraction — strip binary, keep readable chars
      const raw = req.file.buffer.toString("latin1");
      // Extract text between BT (Begin Text) and ET (End Text) markers
      const matches = raw.match(/BT[\s\S]*?ET/g) || [];
      fileText = matches
        .join(" ")
        .replace(/\(([^)]+)\)/g, "$1 ")
        .replace(/[^\x20-\x7E\n]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      if (!fileText || fileText.length < 50) {
        // Fallback: extract any readable ASCII sequences
        fileText = raw.replace(/[^\x20-\x7E\n]/g, " ").replace(/\s+/g, " ").trim();
      }
    } else {
      fileText = req.file.buffer.toString("utf-8");
    }

    // Truncate to 3000 chars to stay within token limits
    const truncated = fileText.slice(0, 3000);
    if (truncated.trim().length < 20) {
      return res.status(400).json({ error: "Could not extract readable text from this file." });
    }

    const actionPrompts = {
      summarize: `Summarize the following document in clear bullet points. Respond in ${lang}.`,
      keypoints: `Extract the 5 most important key points from this document. Respond in ${lang}.`,
      explain:   `Explain the content of this document in simple terms a student can understand. Respond in ${lang}.`,
      question:  `Answer the following question based on this document: "${question}". Respond in ${lang}.`,
    };

    const systemMsg = actionPrompts[action] || actionPrompts.summarize;
    const messages = [
      { role: "system", content: systemMsg },
      { role: "user", content: `Document content:\n\n${truncated}` }
    ];

    const result = await callAI(messages, 700);
    res.json({ result, filename: req.file.originalname, characters: truncated.length });
  } catch (err) {
    console.error("File analysis error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/image ────────────────────────────────────────────
app.post("/api/image", async (req, res) => {
  try {
    const { prompt, style = "realistic" } = req.body;
    if (!prompt?.trim()) return res.status(400).json({ error: "Prompt is required." });

    const cacheKey = `img::${style}::${prompt.trim().toLowerCase()}`;
    const cached = getCache(cacheKey);
    if (cached) return res.json({ imageUrl: cached, cached: true });

    const imageUrl = await generateImage(prompt, style);
    setCache(cacheKey, imageUrl);
    res.json({ imageUrl, cached: false });
  } catch (err) {
    console.error("Image error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/health ────────────────────────────────────────────
app.get("/api/health", (_, res) => res.json({ status: "ok", version: "2.0", service: "RA-FA AI" }));

// Serve frontend
app.get("*", (_, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

app.listen(PORT, () => console.log(`✅  RA-FA AI v2 running on port ${PORT}`));
