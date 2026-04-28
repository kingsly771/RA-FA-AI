/**
 * RA-FA AI — Backend Server
 * Developer: RICKY (Valenhart)
 * Stack: Node.js + Express + Hugging Face Inference API
 */

const express = require("express");
const cors = require("cors");
const path = require("path");
const { callHuggingFace, buildPrompt } = require("./ai");
const { getCache, setCache } = require("./cache");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.join(__dirname, "public")));

// ──────────────────────────────────────────
//  POST /api/chat  — main AI endpoint
// ──────────────────────────────────────────
app.post("/api/chat", async (req, res) => {
  try {
    const { message, mode, language, history } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: "Message cannot be empty." });
    }

    // Build cache key from message + mode + language
    const cacheKey = `${mode}::${language}::${message.trim().toLowerCase()}`;
    const cached = getCache(cacheKey);
    if (cached) {
      return res.json({ reply: cached, cached: true });
    }

    // Build the prompt according to mode
    const prompt = buildPrompt({ message, mode, language, history: history || [] });

    // Call Hugging Face
    const reply = await callHuggingFace(prompt);

    // Cache the result
    setCache(cacheKey, reply);

    return res.json({ reply, cached: false });
  } catch (err) {
    console.error("Chat error:", err.message);
    return res.status(500).json({
      error: err.message || "AI service temporarily unavailable. Please try again.",
    });
  }
});

// Health check
app.get("/api/health", (_, res) => res.json({ status: "ok", service: "RA-FA AI" }));

// Serve frontend for all other routes
app.get("*", (_, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

app.listen(PORT, () => {
  console.log(`✅  RA-FA AI running on port ${PORT}`);
});
