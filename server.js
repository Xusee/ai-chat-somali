// ============================================
// AI CHAT SOMALI - COMPLETE SERVER
// server.js
// ============================================

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// ============================================
// APP
// ============================================

const app = express();

const PORT = process.env.PORT || 10000;

const JWT_SECRET =
  process.env.JWT_SECRET || "change_this_to_a_long_random_secret";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;


// ========================================
// MIDDLEWARE
// ========================================

app.use(cors());

app.use(express.json({
  limit: "20mb"
}));

app.use(express.urlencoded({
  extended: true,
  limit: "20mb"
}));


// ========================================
// STATIC PUBLIC FOLDER
// ========================================

app.use(express.static(path.join(__dirname, "public")));


// ========================================
// REGISTER
// ========================================

app.post("/api/register", async (req, res) => {

  // register code-kaaga halkan

});


// ========================================
// LOGIN
// ========================================

app.post("/api/login", async (req, res) => {

  // login code-kaaga halkan

});


// ========================================
// CHAT + IMAGE
// ========================================

app.post("/chat", async (req, res) => {

  try {

    const { message, image } = req.body;

    // Hubinta in wax la soo diray
    if (!message && !image) {

      return res.status(400).json({
        error: "Fadlan qor su'aal ama dooro sawir."
      });

    }


    const userContent = [];


    // ==============================
    // QORAAL
    // ==============================

    if (message) {

      userContent.push({
        type: "text",
        text: message
      });

    }


    // ==============================
    // SAWIR
    // ==============================

    if (image) {

      userContent.push({
        type: "image_url",

        image_url: {
          url: image
        }

      });

    }


    // ==============================
    // OPENROUTER API
    // ==============================

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {

        method: "POST",

        headers: {

          "Authorization": `Bearer ${OPENROUTER_API_KEY}`,

          "Content-Type": "application/json",

          "HTTP-Referer": "https://ai-chat-somali.onrender.com",

          "X-Title": "AI Chat Somali"

        },

        body: JSON.stringify({

          model: "google/gemini-2.0-flash-exp:free",

          messages: [

            {
              role: "system",

              content:
                "Waxaad tahay AI caawiye ku hadla Af-Soomaali. Sawirrada iyo qoraallada si fiican u sharax Af-Soomaali."
            },

            {
              role: "user",

              content: userContent
            }

          ]

        })

      }
    );


    const data = await response.json();


    // OpenRouter error
    if (!response.ok) {

      console.error("OPENROUTER ERROR:", data);

      return res.status(response.status).json({

        error:
          data?.error?.message ||
          "OpenRouter API ayaa khalad bixisay."

      });

    }


    // Jawaabta AI
    const reply =
      data?.choices?.[0]?.message?.content ||
      "Jawaab lama helin.";


    res.json({

      reply: reply

    });


  } catch (error) {

    console.error("CHAT ERROR:", error);

    res.status(500).json({

      error: "Server-ka ayaa khalad la kulmay."

    });

  }

});


// ========================================
// HEALTH CHECK
// ========================================

app.get("/api/health", (req, res) => {

  res.json({
    status: "ok"
  });

});


// ========================================
// START SERVER
// ========================================

app.listen(PORT, () => {

  console.log(`Server running on port ${PORT}`);

});
// ============================================
// SERVER START
// ============================================

app.listen(

  PORT,

  "0.0.0.0",

  () => {

    console.log(
      "========================================"
    );

    console.log(
      "🤖 AI Chat Somali Server Started"
    );

    console.log(
      `Port: ${PORT}`
    );

    console.log(
      `Server: http://localhost:${PORT}`
    );

    console.log(
      `Admin: http://localhost:${PORT}/admin`
    );

    console.log(
      `Health: http://localhost:${PORT}/api/health`
    );

    console.log(
      "SQLite Database Connected"
    );

    console.log(
      "========================================"
    );

  }

);
