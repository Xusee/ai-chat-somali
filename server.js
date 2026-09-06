require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const sqlite3 = require("sqlite3").verbose();

const app = express();

const PORT = process.env.PORT || 10000;

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL =
  process.env.OPENROUTER_MODEL || "meta-llama/llama-3.3-70b-instruct:free";

const JWT_SECRET =
  process.env.JWT_SECRET || "ai-chat-somali-secret-key-change-this";

// ==========================================
// MIDDLEWARE
// ==========================================

app.use(cors());

app.use(express.json({
  limit: "20mb"
}));

app.use(express.urlencoded({
  extended: true
}));

// ==========================================
// STATIC FILES
// ==========================================

// Folder-ka main
app.use(express.static(__dirname));

// Admin folder
app.use("/admin", express.static(path.join(__dirname, "admin")));

// ==========================================
// DATABASE
// ==========================================

const dbPath = path.join(__dirname, "database.db");

const db = new sqlite3.Database(dbPath, (error) => {
  if (error) {
    console.error("Database Error:", error.message);
  } else {
    console.log("SQLite Database Connected");
  }
});

// ==========================================
// CREATE TABLES
// ==========================================

db.serialize(() => {

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS chats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

});

// ==========================================
// JWT AUTH MIDDLEWARE
// ==========================================

function authenticateToken(req, res, next) {

  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      success: false,
      error: "Authorization token lama helin"
    });
  }

  const token = authHeader.startsWith("Bearer ")
    ? authHeader.substring(7)
    : authHeader;

  jwt.verify(token, JWT_SECRET, (error, user) => {

    if (error) {
      return res.status(403).json({
        success: false,
        error: "Token-ka ma saxna ama wuu dhacay"
      });
    }

    req.user = user;

    next();

  });

}

// ==========================================
// HOME
// ==========================================

app.get("/", (req, res) => {

  res.sendFile(path.join(__dirname, "index.html"));

});

// ==========================================
// ADMIN PAGE
// ==========================================

app.get("/admin", (req, res) => {

  res.sendFile(
    path.join(__dirname, "admin", "index.html")
  );

});

// ==========================================
// HEALTH CHECK
// ==========================================

app.get("/api/health", (req, res) => {

  res.status(200).json({

    success: true,

    message: "AI Chat Somali Server waa shaqaynayaa",

    status: "healthy",

    model: OPENROUTER_MODEL,

    timestamp: new Date().toISOString()

  });

});

// ==========================================
// REGISTER
// ==========================================

app.post("/api/register", async (req, res) => {

  try {

    const {
      name,
      email,
      password
    } = req.body;

    if (!name || !email || !password) {

      return res.status(400).json({

        success: false,

        error: "Fadlan buuxi magaca, email-ka iyo password-ka"

      });

    }

    if (password.length < 4) {

      return res.status(400).json({

        success: false,

        error: "Password-ku waa inuu ahaadaa ugu yaraan 4 xaraf"

      });

    }

    db.get(

      "SELECT id FROM users WHERE email = ?",

      [email.toLowerCase()],

      async (error, existingUser) => {

        if (error) {

          return res.status(500).json({

            success: false,

            error: "Database error"

          });

        }

        if (existingUser) {

          return res.status(409).json({

            success: false,

            error: "Email-kan hore ayaa loo isticmaalay"

          });

        }

        const hashedPassword =
          await bcrypt.hash(password, 10);

        db.run(

          `
          INSERT INTO users (name, email, password)
          VALUES (?, ?, ?)
          `,

          [
            name.trim(),
            email.toLowerCase(),
            hashedPassword
          ],

          function (error) {

            if (error) {

              console.error(error);

              return res.status(500).json({

                success: false,

                error: "User lama abuuri karin"

              });

            }

            const user = {

              id: this.lastID,

              name: name.trim(),

              email: email.toLowerCase()

            };

            const token = jwt.sign(

              user,

              JWT_SECRET,

              {
                expiresIn: "30d"
              }

            );

            res.status(201).json({

              success: true,

              message: "Account-ka si guul leh ayaa loo sameeyay",

              token,

              user

            });

          }

        );

      }

    );

  } catch (error) {

    console.error("REGISTER ERROR:", error);

    res.status(500).json({

      success: false,

      error: "Server error"

    });

  }

});

// ==========================================
// LOGIN
// ==========================================

app.post("/api/login", (req, res) => {

  const {
    email,
    password
  } = req.body;

  if (!email || !password) {

    return res.status(400).json({

      success: false,

      error: "Email iyo password ayaa loo baahan yahay"

    });

  }

  db.get(

    "SELECT * FROM users WHERE email = ?",

    [email.toLowerCase()],

    async (error, user) => {

      if (error) {

        return res.status(500).json({

          success: false,

          error: "Database error"

        });

      }

      if (!user) {

        return res.status(401).json({

          success: false,

          error: "Email ama password waa khalad"

        });

      }

      const passwordCorrect =
        await bcrypt.compare(password, user.password);

      if (!passwordCorrect) {

        return res.status(401).json({

          success: false,

          error: "Email ama password waa khalad"

        });

      }

      const token = jwt.sign(

        {

          id: user.id,

          name: user.name,

          email: user.email

        },

        JWT_SECRET,

        {

          expiresIn: "30d"

        }

      );

      res.json({

        success: true,

        message: "Login successful",

        token,

        user: {

          id: user.id,

          name: user.name,

          email: user.email

        }

      });

    }

  );

});

// ==========================================
// GET CURRENT USER
// ==========================================

app.get(
  "/api/me",
  authenticateToken,
  (req, res) => {

    res.json({

      success: true,

      user: req.user

    });

  }
);

// ==========================================
// CHAT WITH OPENROUTER
// ==========================================

app.post("/chat", async (req, res) => {

  try {

    if (!OPENROUTER_API_KEY) {

      return res.status(500).json({

        success: false,

        error:
          "OPENROUTER_API_KEY lagama helin Environment Variables"

      });

    }

    let {
      message,
      messages,
      userId
    } = req.body;

    let chatMessages = [];

    // Haddii frontend-ku soo diro messages array
    if (Array.isArray(messages) && messages.length > 0) {

      chatMessages = messages;

    } else if (message) {

      chatMessages = [
        {
          role: "user",
          content: message
        }
      ];

    } else {

      return res.status(400).json({

        success: false,

        error: "Fariin lama helin"

      });

    }

    // System message
    const finalMessages = [

      {
        role: "system",

        content: `
Waxaad tahay AI Chat Somali.

Had iyo jeer ugu jawaab isticmaalaha Af-Soomaali haddii aanu luqad kale codsan.

Noqo mid:
- saaxiibtinimo leh
- caawimaad badan
- jawaab cad bixiya
- sharaxaad fiican sameeya
- code sax ah sameeya marka programming la weydiiyo
        `.trim()
      },

      ...chatMessages

    ];

    // Last user message
    const lastUserMessage =
      chatMessages
        .filter((item) => item.role === "user")
        .pop();

    // Save user message haddii userId jiro
    if (userId && lastUserMessage) {

      db.run(

        `
        INSERT INTO chats (user_id, role, content)
        VALUES (?, ?, ?)
        `,

        [
          userId,
          "user",
          typeof lastUserMessage.content === "string"
            ? lastUserMessage.content
            : JSON.stringify(lastUserMessage.content)
        ]

      );

    }

    const response = await fetch(

      "https://openrouter.ai/api/v1/chat/completions",

      {

        method: "POST",

        headers: {

          "Content-Type": "application/json",

          "Authorization":
            `Bearer ${OPENROUTER_API_KEY}`,

          "HTTP-Referer":
            "https://ai-chat-somali.onrender.com",

          "X-Title":
            "AI Chat Somali"

        },

        body: JSON.stringify({

          model: OPENROUTER_MODEL,

          messages: finalMessages,

          temperature: 0.7,

          max_tokens: 2000

        })

      }

    );

    const data = await response.json();

    if (!response.ok) {

      console.error(
        "OPENROUTER ERROR:",
        data
      );

      return res.status(response.status).json({

        success: false,

        error:
          data?.error?.message ||
          "OpenRouter API error"

      });

    }

    const aiMessage =
      data?.choices?.[0]?.message?.content;

    if (!aiMessage) {

      return res.status(500).json({

        success: false,

        error:
          "AI jawaab sax ah ma soo celin"

      });

    }

    // Save AI response
    if (userId) {

      db.run(

        `
        INSERT INTO chats (user_id, role, content)
        VALUES (?, ?, ?)
        `,

        [
          userId,
          "assistant",
          aiMessage
        ]

      );

    }

    res.json({

      success: true,

      reply: aiMessage,

      message: aiMessage,

      model: OPENROUTER_MODEL

    });

  } catch (error) {

    console.error(
      "CHAT ERROR:",
      error
    );

    res.status(500).json({

      success: false,

      error:
        error.message ||
        "Chat server error"

    });

  }

});

// ==========================================
// GET CHAT HISTORY
// ==========================================

app.get(
  "/api/chats",
  authenticateToken,
  (req, res) => {

    const userId = req.user.id;

    db.all(

      `
      SELECT
        id,
        role,
        content,
        created_at
      FROM chats
      WHERE user_id = ?
      ORDER BY id ASC
      `,

      [userId],

      (error, rows) => {

        if (error) {

          console.error(error);

          return res.status(500).json({

            success: false,

            error: "Chat history lama soo qaadi karin"

          });

        }

        res.json({

          success: true,

          chats: rows

        });

      }

    );

  }
);

// ==========================================
// DELETE CHAT HISTORY
// ==========================================

app.delete(
  "/api/chats",
  authenticateToken,
  (req, res) => {

    const userId = req.user.id;

    db.run(

      "DELETE FROM chats WHERE user_id = ?",

      [userId],

      function (error) {

        if (error) {

          console.error(error);

          return res.status(500).json({

            success: false,

            error: "Chat history lama tirtiri karin"

          });

        }

        res.json({

          success: true,

          message: "Chat history waa la tirtiray",

          deleted: this.changes

        });

      }

    );

  }
);

// ==========================================
// DELETE SINGLE CHAT
// ==========================================

app.delete(
  "/api/chats/:id",
  authenticateToken,
  (req, res) => {

    const userId = req.user.id;

    const chatId = req.params.id;

    db.run(

      `
      DELETE FROM chats
      WHERE id = ? AND user_id = ?
      `,

      [
        chatId,
        userId
      ],

      function (error) {

        if (error) {

          return res.status(500).json({

            success: false,

            error: "Chat lama tirtiri karin"

          });

        }

        res.json({

          success: true,

          deleted: this.changes

        });

      }

    );

  }
);

// ==========================================
// ADMIN USERS
// ==========================================

app.get("/api/admin/users", (req, res) => {

  db.all(

    `
    SELECT
      id,
      name,
      email,
      created_at
    FROM users
    ORDER BY id DESC
    `,

    [],

    (error, rows) => {

      if (error) {

        return res.status(500).json({

          success: false,

          error: "Users lama soo qaadi karin"

        });

      }

      res.json({

        success: true,

        users: rows

      });

    }

  );

});

// ==========================================
// ADMIN STATS
// ==========================================

app.get("/api/admin/stats", (req, res) => {

  db.get(

    "SELECT COUNT(*) AS totalUsers FROM users",

    [],

    (error1, userResult) => {

      if (error1) {

        return res.status(500).json({

          success: false,

          error: "Database error"

        });

      }

      db.get(

        "SELECT COUNT(*) AS totalChats FROM chats",

        [],

        (error2, chatResult) => {

          if (error2) {

            return res.status(500).json({

              success: false,

              error: "Database error"

            });

          }

          res.json({

            success: true,

            totalUsers:
              userResult.totalUsers,

            totalChats:
              chatResult.totalChats

          });

        }

      );

    }

  );

});

// ==========================================
// 404
// ==========================================

app.use((req, res) => {

  res.status(404).json({

    success: false,

    error: "Endpoint lama helin",

    path: req.originalUrl

  });

});

// ==========================================
// SERVER START
// ==========================================

app.listen(
  PORT,
  "0.0.0.0",
  () => {

    console.log("====================================");

    console.log("AI Chat Somali Server Started");

    console.log(`Port: ${PORT}`);

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
      `Model: ${OPENROUTER_MODEL}`
    );

    console.log("====================================");

  }
);
