require("dotenv").config();

const express = require("express");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();

const app = express();

const PORT = process.env.PORT || 3000;

const OPENROUTER_API_KEY =
    process.env.OPENROUTER_API_KEY;

const OPENROUTER_MODEL =
    process.env.OPENROUTER_MODEL ||
    "google/gemma-3-27b-it:free";

const MAX_IMAGE_SIZE =
    7 * 1024 * 1024;

const REQUEST_TIMEOUT =
    30000;


// ========================================
// MIDDLEWARE
// ========================================

app.use(express.json({
    limit: "12mb"
}));

app.use(express.urlencoded({
    extended: true,
    limit: "12mb"
}));

app.use(express.static(
    path.join(__dirname, "public")
));


// ========================================
// SQLITE DATABASE
// ========================================

const db = new sqlite3.Database(
    "./database.db",
    (error) => {

        if (error) {

            console.error(
                "DATABASE ERROR:",
                error.message
            );

        } else {

            console.log(
                "🗄️ SQLite Database Connected"
            );

        }

    }
);


// ========================================
// CREATE USERS TABLE
// ========================================

db.run(`
    CREATE TABLE IF NOT EXISTS users (

        id INTEGER PRIMARY KEY AUTOINCREMENT,

        name TEXT,

        email TEXT UNIQUE,

        password TEXT,

        created_at DATETIME
        DEFAULT CURRENT_TIMESTAMP

    )
`);


// ========================================
// CREATE CHATS TABLE
// ========================================

db.run(`
    CREATE TABLE IF NOT EXISTS chats (

        id INTEGER PRIMARY KEY AUTOINCREMENT,

        message TEXT,

        image TEXT,

        reply TEXT,

        created_at DATETIME
        DEFAULT CURRENT_TIMESTAMP

    )
`);


// ========================================
// DATABASE HELPERS
// ========================================

function dbAll(query, params = []) {

    return new Promise(
        (resolve, reject) => {

            db.all(
                query,
                params,

                (error, rows) => {

                    if (error) {

                        reject(error);

                    } else {

                        resolve(rows);

                    }

                }

            );

        }
    );

}


function dbGet(query, params = []) {

    return new Promise(
        (resolve, reject) => {

            db.get(
                query,
                params,

                (error, row) => {

                    if (error) {

                        reject(error);

                    } else {

                        resolve(row);

                    }

                }

            );

        }
    );

}


function dbRun(query, params = []) {

    return new Promise(
        (resolve, reject) => {

            db.run(
                query,
                params,

                function (error) {

                    if (error) {

                        reject(error);

                    } else {

                        resolve({
                            id: this.lastID,
                            changes: this.changes
                        });

                    }

                }

            );

        }
    );

}


// ========================================
// IMAGE VALIDATION
// ========================================

function validateImage(image) {

    if (!image) {

        return {
            valid: true
        };

    }


    if (
        typeof image !== "string" ||
        !image.startsWith("data:image/")
    ) {

        return {

            valid: false,

            message:
                "Sawirka ma aha image sax ah."

        };

    }


    const parts =
        image.split(",");


    if (parts.length < 2) {

        return {

            valid: false,

            message:
                "Sawirka waa khaldan yahay."

        };

    }


    const base64Data =
        parts[1];


    const size =
        Buffer.byteLength(
            base64Data,
            "base64"
        );


    if (
        size > MAX_IMAGE_SIZE
    ) {

        return {

            valid: false,

            message:
                "Sawirku aad buu u weyn yahay. Dooro sawir ka yar 7MB."

        };

    }


    return {

        valid: true,

        size: size

    };

}


// ========================================
// 🔎 DATABASE SEARCH
// ========================================

async function searchDatabase(
    searchText
) {

    if (
        !searchText ||
        !searchText.trim()
    ) {

        return null;

    }


    const text =
        searchText.trim();


    const lowerText =
        text.toLowerCase();


    const databaseInfo = {

        users: null,

        chats: null,

        searchResults: null

    };


    // ------------------------------------
    // USER COUNT
    // ------------------------------------

    if (
        lowerText.includes("immisa qof") ||
        lowerText.includes("immisa user") ||
        lowerText.includes("tirada user") ||
        lowerText.includes("users")
    ) {

        const result =
            await dbGet(
                `
                SELECT COUNT(*) AS total
                FROM users
                `
            );


        databaseInfo.users = {

            total:
                result.total

        };

    }


    // ------------------------------------
    // CHAT COUNT
    // ------------------------------------

    if (
        lowerText.includes("immisa chat") ||
        lowerText.includes("tirada chat")
    ) {

        const result =
            await dbGet(
                `
                SELECT COUNT(*) AS total
                FROM chats
                `
            );


        databaseInfo.chats = {

            total:
                result.total

        };

    }


    // ------------------------------------
    // SEARCH USERS BY NAME
    // ------------------------------------

    if (
        lowerText.includes("raadi") ||
        lowerText.includes("search") ||
        lowerText.includes("hel")
    ) {

        const words =
            text.split(" ");


        const searchWord =
            words[words.length - 1];


        if (
            searchWord.length > 1
        ) {

        const rows = await new Promise((resolve, reject) => {
    db.all(
        `
        SELECT name, email
        FROM users
        WHERE name LIKE ?
        OR email LIKE ?
        LIMIT 10
        `,
        [
            `%${searchWord}%`,
            `%${searchWord}%`
        ],
        (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        }
    );
});

databaseInfo.searchResults = rows;

    }

    }


    // ------------------------------------
    // RETURN ONLY IF DATA EXISTS
    // ------------------------------------

    const hasData =

        databaseInfo.users ||

        databaseInfo.chats ||

        databaseInfo.searchResults;


    return hasData
        ? databaseInfo
        : null;

}


// ========================================
// ❤️ GET /api/health
// ========================================

app.get(
    "/api/health",

    async (req, res) => {

        try {

            const userCount =
                await dbGet(
                    `
                    SELECT COUNT(*) AS total
                    FROM users
                    `
                );


            const chatCount =
                await dbGet(
                    `
                    SELECT COUNT(*) AS total
                    FROM chats
                    `
                );


            res.json({

                success: true,

                status: "online",

                service:
                    "AI Chat Somali",

                model:
                    OPENROUTER_MODEL,

                database: {

                    users:
                        userCount.total,

                    chats:
                        chatCount.total

                },

                time:
                    new Date()
                        .toISOString()

            });

        } catch (error) {

            res.status(500).json({

                success: false,

                error:
                    "Health check error"

            });

        }

    }
);


// ========================================
// 📜 GET /api/chats
// ========================================

app.get(
    "/api/chats",

    async (req, res) => {

        try {

            const chats =
                await dbAll(
                    `
                    SELECT
                        id,
                        message,
                        image,
                        reply,
                        created_at

                    FROM chats

                    ORDER BY id DESC

                    LIMIT 100
                    `
                );


            res.json({

                success: true,

                total:
                    chats.length,

                chats:
                    chats

            });

        } catch (error) {

            console.error(
                "GET CHATS ERROR:",
                error
            );


            res.status(500).json({

                success: false,

                error:
                    "Chat history lama soo qaadi karin."

            });

        }

    }
);


// ========================================
// 🗑️ DELETE /api/chats
// ========================================

app.delete(
    "/api/chats",

    async (req, res) => {

        try {

            const result =
                await dbRun(
                    `
                    DELETE FROM chats
                    `
                );


            res.json({

                success: true,

                message:
                    "Dhammaan chat-yada waa la tirtiray.",

                deleted:
                    result.changes

            });

        } catch (error) {

            console.error(
                "DELETE CHATS ERROR:",
                error
            );


            res.status(500).json({

                success: false,

                error:
                    "Chat-yada lama tirtiri karin."

            });

        }

    }
);


// ========================================
// 💬 POST /chat
// ========================================
app.post("/chat", async (req, res) => {
  try {
    const {
      message = "",
      image = null
    } = req.body;

    // -----------------------------
    // Hubinta API KEY
    // -----------------------------

    if (!process.env.OPENROUTER_API_KEY) {
      return res.status(500).json({
        success: false,
        error: "OPENROUTER_API_KEY lama helin."
      });
    }

    // -----------------------------
    // Hubinta message ama image
    // -----------------------------

    if (!message.trim() && !image) {
      return res.status(400).json({
        success: false,
        error: "Fadlan geli su'aal ama sawir."
      });
    }

    // -----------------------------
    // MODEL
    // -----------------------------

    const selectedModel = image
      ? process.env.VISION_MODEL
      : process.env.AI_MODEL;

    console.log("=================================");
    console.log("CHAT REQUEST");
    console.log("MESSAGE:", message);
    console.log("HAS IMAGE:", !!image);
    console.log("MODEL:", selectedModel);
    console.log("=================================");

    if (!selectedModel || !selectedModel.trim()) {
      return res.status(500).json({
        success: false,
        error: image
          ? "VISION_MODEL lama helin."
          : "AI_MODEL lama helin."
      });
    }

    // -----------------------------
    // MESSAGES
    // -----------------------------

    let messages;

    // Haddii sawir jiro
    if (image) {

      messages = [
        {
          role: "system",
          content: `
Waxaad tahay AI Chat Somali.

Ku jawaab Af-Soomaali.

Haddii sawir lagu soo diro:
- Sawirka si taxaddar leh u eeg.
- Sharax waxa ka muuqda.
- Ka jawaab su'aasha isticmaaleha.
- Haddii su'aal jirto, su'aasha mudnaanta sii.
- Ha sheegin wax aan sawirka ka muuqan adigoo hubin.
`
        },

        {
          role: "user",

          content: [
            {
              type: "text",

              text:
                message.trim() ||
                "Fadlan sawirkan ii sharax Af-Soomaali."
            },

            {
              type: "image_url",

              image_url: {
                url: image
              }
            }
          ]
        }
      ];

    }

    // Haddii qoraal keliya jiro
    else {

      messages = [
        {
          role: "system",

          content: `
Waxaad tahay AI Chat Somali.

Ku jawaab Af-Soomaali si cad, dabiici ah, oo waxtar leh.

Haddii isticmaaluhu ku qoro Ingiriisi ama luqad kale,
waad fahmi kartaa laakiin jawaabta ugu weyn ku bixi Af-Soomaali,
haddii aanu si gaar ah u codsan luqad kale.
`
        },

        {
          role: "user",

          content: message.trim()
        }
      ];

    }

    // -----------------------------
    // TIMEOUT
    // -----------------------------

    const controller =
      new AbortController();

    const timeoutId =
      setTimeout(() => {
        controller.abort();
      }, 60000);

    // -----------------------------
    // OPENROUTER REQUEST
    // -----------------------------

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",

          "Authorization":
            `Bearer ${process.env.OPENROUTER_API_KEY}`,

          "HTTP-Referer":
            process.env.APP_URL ||
            "http://localhost:3000",

          "X-Title":
            "AI Chat Somali"
        },

        signal: controller.signal,

        body: JSON.stringify({
          model: selectedModel.trim(),

          messages: messages,

          max_tokens: 700,

          temperature: 0.7
        })
      }
    );

    clearTimeout(timeoutId);

    // -----------------------------
    // RESPONSE
    // -----------------------------

    const data =
      await response.json();

    console.log(
      "OPENROUTER STATUS:",
      response.status
    );

    console.log(
      "OPENROUTER RESPONSE:",
      JSON.stringify(data, null, 2)
    );

    // -----------------------------
    // OPENROUTER ERROR
    // -----------------------------

    if (!response.ok) {

      const errorMessage =
        data?.error?.message ||
        "OpenRouter qalad ayaa dhacay.";

      console.error(
        "OPENROUTER ERROR:",
        response.status,
        errorMessage
      );

      return res.status(response.status).json({
        success: false,
        error: errorMessage
      });
    }

    // -----------------------------
    // AI REPLY
    // -----------------------------

    const reply =
      data?.choices?.[0]?.message?.content;

    console.log(
      "AI REPLY:",
      reply
    );

    // -----------------------------
    // JAWAAB LAMA HELIN
    // -----------------------------

    if (
      !reply ||
      typeof reply !== "string" ||
      !reply.trim()
    ) {

      console.error(
        "AI jawaab madhan:",
        JSON.stringify(data, null, 2)
      );

      return res.status(500).json({
        success: false,
        error:
          "AI jawaab sax ah ma soo celin."
      });
    }

    // -----------------------------
    // SUCCESS RESPONSE
    // -----------------------------

    return res.json({
      success: true,

      reply:
        reply.trim()
    });

  }

  catch (error) {

    console.error(
      "CHAT SERVER ERROR:",
      error
    );

    // Timeout
    if (
      error.name === "AbortError"
    ) {

      return res.status(504).json({
        success: false,

        error:
          "Codsiga AI-ga waqtigiisu wuu dhammaaday. Fadlan mar kale isku day."
      });
    }

    return res.status(500).json({
      success: false,

      error:
        error.message ||
        "Server-ka waxaa ka dhacay qalad."
    });

  }
});


// ========================================
// HOME
// ========================================

app.get(
    "*",

    (req, res) => {

        res.sendFile(

            path.join(
                __dirname,
                "public",
                "index.html"
            )

        );

    }
);


// ========================================
// SERVER START
// ========================================

app.listen(

    PORT,

    "0.0.0.0",

    () => {

        console.log("");
        console.log(
            "================================"
        );

        console.log(
            "🤖 AI CHAT SOMALI"
        );

        console.log(
            "🗄️ SQLite Database Connected"
        );

        console.log(
            `🚀 Server: http://localhost:${PORT}`
        );

        console.log(
            `🤖 Model: ${OPENROUTER_MODEL}`
        );

        console.log(
            "📷 Image Chat: Enabled"
        );

        console.log(
            "🔎 Database Search: Enabled"
        );

        console.log(
            "❤️ Health: /api/health"
        );

        console.log(
            "================================"
        );
        console.log("");

    }
);
