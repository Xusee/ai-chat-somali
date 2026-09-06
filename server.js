require("dotenv").config();

const express = require("express");
const path = require("path");

const app = express();

const PORT = process.env.PORT || 3000;

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

const AI_MODEL =
  process.env.AI_MODEL ||
  "meta-llama/llama-3.3-70b-instruct:free";

// ================================
// MIDDLEWARE
// ================================

app.use(express.json({ limit: "10mb" }));

app.use(express.urlencoded({
  extended: true,
  limit: "10mb"
}));

// ================================
// CHAT HISTORY
// ================================

let chatHistory = [];

// ================================
// PUBLIC FOLDER
// ================================

app.use(express.static(path.join(__dirname, "public")));

// ================================
// HEALTH CHECK
// ================================

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    status: "Server waa shaqaynayaa",
    service: "AI Chat Somali",
    time: new Date().toISOString()
  });
});

// ================================
// GET CHAT HISTORY
// ================================

app.get("/api/chats", (req, res) => {
  res.status(200).json({
    success: true,
    chats: chatHistory
  });
});

// ================================
// DELETE CHAT HISTORY
// ================================

app.delete("/api/chats", (req, res) => {
  chatHistory = [];

  res.status(200).json({
    success: true,
    message: "Dhammaan chat history waa la tirtiray"
  });
});

// ================================
// CHAT WITH AI
// ================================

app.post("/chat", async (req, res) => {
  try {

    const { message } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({
        success: false,
        error: "Fadlan geli fariin sax ah"
      });
    }

    if (!OPENROUTER_API_KEY) {
      return res.status(500).json({
        success: false,
        error: "OPENROUTER_API_KEY lama helin. Hubi Render Environment Variables."
      });
    }

    const messages = [
      {
        role: "system",
        content: `
Waxaad tahay AI Chat Somali.

Had iyo jeer ku jawaab Af-Soomaali haddii isticmaaluhu ku weydiiyo Af-Soomaali.

Noqo mid saaxiibtinimo leh, caawimaad badan, oo jawaabahaaga si cad u sharax.
        `.trim()
      },
      {
        role: "user",
        content: message.trim()
      }
    ];

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",

        headers: {
          "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": process.env.APP_URL || "http://localhost:3000",
          "X-Title": "AI Chat Somali"
        },

        body: JSON.stringify({
          model: AI_MODEL,
          messages: messages
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {

      console.error("OpenRouter Error:", data);

      return res.status(response.status).json({
        success: false,
        error:
          data?.error?.message ||
          "AI provider error ayaa dhacay",
        details: data
      });
    }

    const aiMessage =
      data?.choices?.[0]?.message?.content ||
      "Raalli iga noqo, jawaab lama helin.";

    // Save history

    const userChat = {
      role: "user",
      content: message.trim(),
      time: new Date().toISOString()
    };

    const assistantChat = {
      role: "assistant",
      content: aiMessage,
      time: new Date().toISOString()
    };

    chatHistory.push(userChat);
    chatHistory.push(assistantChat);

    res.status(200).json({
      success: true,
      reply: aiMessage
    });

  } catch (error) {

    console.error("CHAT ERROR:", error);

    res.status(500).json({
      success: false,
      error: "Server error ayaa dhacay",
      details: error.message
    });
  }
});

// ================================
// HOME PAGE
// ================================

app.get("/", (req, res) => {
  res.sendFile(
    path.join(__dirname, "public", "index.html")
  );
});

// ================================
// 404
// ================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Endpoint lama helin"
  });
});

// ===============================
// START SERVER
// ===============================

app.listen(PORT, "0.0.0.0", () => {
  console.log("====================================");
  console.log("AI Chat Somali Server Started");
  console.log(Port: ${PORT});
  console.log(Server: http://localhost:${PORT});
  console.log(Admin: http://localhost:${PORT}/admin);
  console.log(Health: http://localhost:${PORT}/api/health);
  console.log(Model: ${OPENROUTER_MODEL});
  console.log("====================================");
});
