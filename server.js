require("dotenv").config();

const express = require("express");
const path = require("path");

const app = express();

const PORT = process.env.PORT || 3000;

// ==========================================
// MIDDLEWARE
// ==========================================

app.use(express.json({
  limit: "10mb"
}));

app.use(express.urlencoded({
  extended: true,
  limit: "10mb"
}));

// ==========================================
// CHAT HISTORY
// Xusuusta chat-ka inta server-ku shaqaynayo
// ==========================================

let chats = [];

// ==========================================
// PUBLIC FOLDER
// public/index.html si toos ah ayuu u furmayaa
// ==========================================

app.use(express.static(path.join(__dirname, "public")));

// ==========================================
// HOME PAGE
// ==========================================

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ==========================================
// HEALTH CHECK
// GET /api/health
// ==========================================

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    status: "online",
    message: "AI Chat Somali server-ka wuu shaqaynayaa",
    time: new Date().toISOString()
  });
});

// ==========================================
// GET CHAT HISTORY
// GET /api/chats
// ==========================================

app.get("/api/chats", (req, res) => {
  res.status(200).json({
    success: true,
    chats: chats
  });
});

// ==========================================
// DELETE ALL CHATS
// DELETE /api/chats
// ==========================================

app.delete("/api/chats", (req, res) => {

  chats = [];

  res.status(200).json({
    success: true,
    message: "Dhammaan chat history waa la tirtiray"
  });

});

// ==========================================
// AI CHAT
// POST /chat
// ==========================================

app.post("/chat", async (req, res) => {

  try {

    const {
      message,
      image
    } = req.body;

    // ----------------------------
    // Validate message
    // ----------------------------

    if (!message || !message.trim()) {

      return res.status(400).json({
        success: false,
        error: "Fadlan qor fariin."
      });

    }

    // ----------------------------
    // API KEY CHECK
    // ----------------------------

    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {

      return res.status(500).json({
        success: false,
        error: "OPENROUTER_API_KEY lama helin. Hubi Environment Variables."
      });

    }

    // ----------------------------
    // Save user message
    // ----------------------------

    const userChat = {
      id: Date.now(),
      role: "user",
      message: message.trim(),
      image: image || null,
      createdAt: new Date().toISOString()
    };

    chats.push(userChat);

    // ----------------------------
    // AI Messages
    // ----------------------------

    const messages = [

      {
        role: "system",
        content: `
Waxaad tahay AI Chat Somali.

Si fiican ugu jawaab Af-Soomaali.

Haddii qofku ku weydiiyo su'aal farsamo:
- Sharax si fudud.
- Isticmaal tallaabooyin.
- Haddii code loo baahan yahay, bixi code sax ah.

Haddii su'aashu Af-Ingiriisi tahay,
waxaad ku jawaabi kartaa Af-Ingiriisi.

Noqo mid saaxiibtinimo leh,
caawimaad badan,
oo jawaab cad bixiya.
        `.trim()
      },

      {
        role: "user",
        content: message.trim()
      }

    ];

    // ----------------------------
    // IMAGE SUPPORT
    // ----------------------------

    if (image) {

      messages[1] = {
        role: "user",
        content: [
          {
            type: "text",
            text: message.trim()
          },
          {
            type: "image_url",
            image_url: {
              url: image
            }
          }
        ]
      };

    }

    // ----------------------------
    // OPENROUTER REQUEST
    // ----------------------------

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {

        method: "POST",

        headers: {
          "Authorization": Bearer ${apiKey},
          "Content-Type": "application/json",
          "HTTP-Referer": process.env.APP_URL || "http://localhost:3000",
          "X-Title": "AI Chat Somali"
        },

        body: JSON.stringify({

          // Waxaad beddeli kartaa model-kan
          model: process.env.AI_MODEL ||
            "meta-llama/llama-3.3-70b-instruct:free",

          messages: messages,

          temperature: 0.7,

          max_tokens: 1500

        })

      }
    );

    // ----------------------------
    // READ RESPONSE
    // ----------------------------

    const data = await response.json();

    // ----------------------------
    // OPENROUTER ERROR
    // ----------------------------

    if (!response.ok) {

      console.error("OpenRouter Error:", data);

      return res.status(response.status).json({
        success: false,
        error:
          data?.error?.message ||
          "AI server-ka ayaa qalad soo celiyey."
      });

    }

    // ----------------------------
    // GET AI ANSWER
    // ----------------------------

    const answer =
      data?.choices?.[0]?.message?.content ||
      "Waan ka xumahay, jawaab lama helin.";

    // ----------------------------
    // SAVE AI ANSWER
    // ----------------------------

    const aiChat = {
      id: Date.now() + 1,
      role: "assistant",
      message: answer,
      createdAt: new Date().toISOString()
    };

    chats.push(aiChat);

    // ----------------------------
    // SEND RESPONSE
    // ----------------------------

    res.status(200).json({

      success: true,

      answer: answer,

      user: userChat,

      assistant: aiChat

    });

  } catch (error) {

    console.error("SERVER ERROR:", error);

    res.status(500).json({

      success: false,

      error: "Server-ka ayaa qalad galay.",

      details: error.message

    });

  }

});

// ==========================================
// 404
// ==========================================

app.use((req, res) => {

  res.status(404).json({
    success: false,
    error: "Endpoint lama helin."
  });

});

// ==========================================
// START SERVER
// ==========================================

app.listen(PORT, () => {

  console.log("=================================");
  console.log("AI CHAT SOMALI SERVER");
  console.log("=================================");
  console.log(Server: http://localhost:${PORT});
  console.log(Health: http://localhost:${PORT}/api/health);
  console.log("Login: OFF");
  console.log("Register: OFF");
  console.log("=================================");

});
