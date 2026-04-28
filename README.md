# ✦ RA-FA AI

> **A smart, multi-functional AI assistant for school, homework, learning, and everyday tasks.**
> Built with Node.js · Hugging Face · Mistral-7B

---

## 👨‍💻 About the Developer

**RA-FA AI** is created by **RICKY** — a passionate and creative Cameroonian developer.

RICKY is the head of **Valenhart**, a visionary initiative focused on innovation, technology, and digital creativity. He is driven by the mission to make powerful AI tools accessible to everyone, especially in Africa and beyond.

He is also the creator of **YUMI-YUNA**, a symbolic project representing the future of AI-human interaction.

---

## 🚀 Features

| Feature | Description |
|---|---|
| 💬 **Chat Assistant** | Context-aware conversational AI |
| 📚 **Homework Helper** | Step-by-step explanations for school questions |
| 🧠 **Study Tools** | Summarize text, generate notes, answer academic questions |
| ✍️ **Writing Assistant** | Improve essays, emails, assignments |
| 🌍 **Multi-language** | English, French, Spanish, German, Arabic |
| ⚡ **Caching** | Reduces API calls, speeds up repeated questions |

---

## 🛠️ Tech Stack

- **Backend:** Node.js + Express
- **AI:** Hugging Face Inference API (Mistral-7B-Instruct — free tier)
- **Frontend:** Vanilla HTML/CSS/JS (no framework, fast loading)
- **Hosting:** Render free tier

---

## 📦 Project Structure

```
rafa-ai/
├── server.js        # Express server + API routes
├── ai.js            # Hugging Face integration + prompt builder
├── cache.js         # In-memory cache (reduces API calls)
├── package.json
├── .env.example     # Environment variable template
└── public/
    └── index.html   # Full frontend (single file)
```

---

## ⚙️ Local Setup

### 1. Get a free Hugging Face API key

1. Go to [huggingface.co](https://huggingface.co) and create a free account
2. Visit **Settings → Access Tokens**
3. Click **New token** → choose **Read** access → copy the token (starts with `hf_`)

### 2. Clone and install

```bash
git clone https://github.com/YOUR_USERNAME/rafa-ai.git
cd rafa-ai
npm install
```

### 3. Set up environment variables

```bash
cp .env.example .env
# Edit .env and add your HF_API_KEY
```

### 4. Run locally

```bash
npm start
# App runs at http://localhost:3000
```

---

## ☁️ Deploy to Render (Free Tier)

1. **Push your code to GitHub**

2. **Go to [render.com](https://render.com)** and sign up (free)

3. **New → Web Service** → Connect your GitHub repo

4. **Configure:**
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
   - **Environment:** Node

5. **Add environment variable:**
   - Key: `HF_API_KEY`
   - Value: your Hugging Face token

6. **Deploy!** Render gives you a free `.onrender.com` URL.

> ⚠️ **Note:** On first request, the Mistral model may take ~20 seconds to "warm up" on Hugging Face's free tier. Subsequent requests are fast.

---

## 🌍 Language Support

Select your language from the dropdown in the header. The AI will respond in your chosen language.

| Code | Language |
|------|----------|
| `en` | English |
| `fr` | French |
| `es` | Spanish |
| `de` | German |
| `ar` | Arabic |

---

## 🔒 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `HF_API_KEY` | ✅ Yes | Your Hugging Face API token |
| `PORT` | ❌ Optional | Server port (default: 3000) |

---

## 📝 API Reference

### `POST /api/chat`

**Body:**
```json
{
  "message": "Explain photosynthesis",
  "mode": "homework",
  "language": "en",
  "history": []
}
```

**Response:**
```json
{
  "reply": "Photosynthesis is...",
  "cached": false
}
```

**Modes:** `chat` · `homework` · `study` · `writing`

---

## 🙏 Credits

- AI powered by [Hugging Face](https://huggingface.co) — Mistral-7B-Instruct
- Built with ❤️ by **RICKY** · [Valenhart](https://valenhart.dev)
