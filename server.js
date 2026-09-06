// ==========================================
// AI CHAT SOMALI - SERVER.JS
// LOGIN LOOMA BAAHNA
// ==========================================

require("dotenv").config();

const express = require("express");
const path = require("path");

const app = express();

const PORT = process.env.PORT || 3000;


// ==========================================
// OPENROUTER SETTINGS
// ==========================================

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

const OPENROUTER_MODEL =
  process.env.OPENROUTER_MODEL ||
  "meta-llama/llama-3.3-70b-instruct:free";


// ==========================================
// MIDDLEWARE
// ==========================================

app.use(express.json({
  limit: "20mb"
}));

app.use(express.urlencoded({
  extended: true,
  limit: "20mb"
}));


// ==========================================
// SERVE PUBLIC FOLDER
// ==========================================

app.use(express.static(path.join(__dirname, "public")));


// ==========================================
// CHAT HISTORY
// Memory ku meel gaar ah
// ==========================================

let chats = [];


// ==========================================
// HOME
// ==========================================

app.get("/", (req, res) => {

  res.sendFile(
    path.join(__dirname, "public", "index.html")
  );

});


// ==========================================
// HEALTH CHECK
// ==========================================

app.get("/api/health", (req, res) => {

  res.status(200).json({

    success: true,

    status: "online",

    loginRequired: false,

    message: "AI Chat Somali server waa shaqaynayaa",

    time: new Date().toISOString()

  });

});


// ==========================================
// GET ALL CHATS
// LOGIN LOOMA BAAHNA
// ==========================================

app.get("/api/chats", (req, res) => {

  res.json({

    success: true,

    chats: chats

  });

});


// ==========================================
// DELETE ALL CHATS
// LOGIN LOOMA BAAHNA
// ==========================================

app.delete("/api/chats", (req, res) => {

  chats = [];

  res.json({

    success: true,

    message: "Dhammaan chat-yada waa la tirtiray"

  });

});


// ==========================================
// AI CHAT ENDPOINT
// POST /chat
// ==========================================

app.post("/chat", async (req, res) => {

  try {

    const {

      message,

      messages

    } = req.body;


    // ======================================
    // CHECK API KEY
    // ======================================

    if (!OPENROUTER_API_KEY) {

      console.error(
        "OPENROUTER_API_KEY lama helin"
      );

      return res.status(500).json({

        success: false,

        error:
          "OPENROUTER_API_KEY lama dejin server-ka"

      });

    }


    // ======================================
    // PREPARE MESSAGES
    // ======================================

    let conversation = [];


    // Haddii frontend-ku soo diro messages
    if (
      Array.isArray(messages) &&
      messages.length > 0
    ) {

      conversation = messages;

    }

    // Haddii frontend-ku soo diro hal message
    else {

      if (
        !message ||
        typeof message !== "string" ||
        !message.trim()
      ) {

        return res.status(400).json({

          success: false,

          error: "Fariin sax ah lama soo dirin"

        });

      }


      conversation = [

        {

          role: "user",

          content: message.trim()

        }

      ];

    }


    // ======================================
    // SYSTEM PROMPT
    // ======================================

    const systemMessage = {

      role: "system",

      content: `
Waxaad tahay AI Chat Somali.

Shaqadaadu waa inaad dadka ka caawiso
su'aalaha iyo dhibaatooyinka ay qabaan.

Xeerarka:

- Ku jawaab Af-Soomaali inta badan.
- Noqo mid saaxiibtinimo leh.
- Jawaabahaaga ha noqdaan kuwo cad.
- Haddii qofku Ingiriisi ku weydiiyo,
  waad ku jawaabi kartaa Ingiriisi.
- Haddii code lagu weydiiyo,
  bixi code dhamaystiran oo shaqaynaya.
- Sharax talaabooyinka muhiimka ah.
- Haddii aadan hubin jawaabta,
  si daacad ah u sheeg.
- Ha sheegan inaad tahay qof bini'aadam ah.

Magacaaga waa:
AI Chat Somali 🤖
`

    };


    // System message hore geli
    conversation.unshift(systemMessage);


    // ======================================
    // LIMIT CHAT HISTORY
    // ======================================

    if (conversation.length > 30) {

      conversation =
        conversation.slice(-30);

      conversation.unshift(systemMessage);

    }


    // ======================================
    // SEND REQUEST TO OPENROUTER
    // ======================================

    console.log(
      "🤖 AI request ayaa OpenRouter loo dirayaa..."
    );


    const response = await fetch(

      "https://openrouter.ai/api/v1/chat/completions",

      {

        method: "POST",

        headers: {

          "Content-Type":
            "application/json",

          "Authorization":
            `Bearer ${OPENROUTER_API_KEY}`,

          "HTTP-Referer":
            process.env.APP_URL ||
            "http://localhost:3000",

          "X-Title":
            "AI Chat Somali"

        },


        body: JSON.stringify({

          model:
            OPENROUTER_MODEL,

          messages:
            conversation,

          temperature:
            0.7,

          max_tokens:
            2000

        })

      }

    );


    // ======================================
    // GET RESPONSE
    // ======================================

    const data =
      await response.json();


    // ======================================
    // OPENROUTER ERROR
    // ======================================

    if (!response.ok) {

      console.error(
        "OPENROUTER ERROR:",
        JSON.stringify(data, null, 2)
      );


      return res.status(
        response.status
      ).json({

        success: false,

        error:

          data?.error?.message ||

          data?.message ||

          "AI server error ayaa dhacay"

      });

    }


    // ======================================
    // AI REPLY
    // ======================================

    const reply =

      data?.choices?.[0]?.message?.content ||

      "Waan ka xumahay, jawaab lama helin.";


    // ======================================
    // SAVE CHAT TEMPORARILY
    // ======================================

    const userText =

      typeof message === "string"

        ? message

        : "Chat conversation";


    const chat = {

      id:
        Date.now(),

      user:
        userText,

      assistant:
        reply,

      createdAt:
        new Date().toISOString()

    };


    chats.push(chat);


    // Xaddid memory-ga
    if (chats.length > 100) {

      chats =
        chats.slice(-100);

    }


    console.log(
      "✅ AI jawaab ayaa la helay"
    );


    // ======================================
    // SEND RESPONSE
    // ======================================

    return res.json({

      success: true,

      reply:
        reply,

      message:
        reply,

      chat:
        chat

    });


  }


  // ========================================
  // SERVER ERROR
  // ========================================

  catch (error) {

    console.error(
      "CHAT SERVER ERROR:",
      error
    );


    return res.status(500).json({

      success: false,

      error:
        "Waan ka xumahay, server-ka AI lama xiriiri karo.",

      details:
        process.env.NODE_ENV === "development"

          ? error.message

          : undefined

    });

  }

});


// ==========================================
// ADMIN PAGE
// LOGIN LOOMA BAAHNA
// ==========================================

app.get("/admin", (req, res) => {

  res.sendFile(

    path.join(

      __dirname,

      "public",

      "admin",

      "index.html"

    )

  );

});


// ==========================================
// FALLBACK
// ==========================================

app.get("*", (req, res) => {

  res.sendFile(

    path.join(

      __dirname,

      "public",

      "index.html"

    )

  );

});


// ==========================================
// START SERVER
// ==========================================

app.listen(PORT, () => {

  console.log("");

  console.log(
    "=========================================="
  );

  console.log(
    "🤖 AI CHAT SOMALI SERVER"
  );

  console.log(
    "=========================================="
  );

  console.log(
    `🚀 Server: http://localhost:${PORT}`
  );

  console.log(
    `❤️ Health: http://localhost:${PORT}/api/health`
  );

  console.log(
    "💬 Chat API: POST /chat"
  );

  console.log(
    "🔓 Login: LAMA BAAHNA"
  );

  console.log(
    "🔓 Register: LAMA BAAHNA"
  );

  console.log(
    "=========================================="
  );

  console.log("");

});
