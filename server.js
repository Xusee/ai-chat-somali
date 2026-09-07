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


// ============================================
// MIDDLEWARE
// ============================================

app.use(cors());

app.use(express.json({
  limit: "20mb"
}));

app.use(express.urlencoded({
  extended: true,
  limit: "20mb"
}));


// ============================================
// STATIC PUBLIC FOLDER
// ============================================

app.use(express.static(path.join(__dirname, "public")));


// ============================================
// DATABASE
// ============================================

const db = new sqlite3.Database(
  path.join(__dirname, "database.db"),
  (err) => {
    if (err) {
      console.error("❌ SQLite Error:", err.message);
    } else {
      console.log("✅ SQLite Database Connected");
    }
  }
);


// ============================================
// CREATE USERS TABLE
// ============================================

db.run(`
CREATE TABLE IF NOT EXISTS users (

  id INTEGER PRIMARY KEY AUTOINCREMENT,

  name TEXT NOT NULL,

  email TEXT NOT NULL UNIQUE,

  password TEXT NOT NULL,

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP

)
`);


// ============================================
// CREATE CHATS TABLE
// ============================================

db.run(`
CREATE TABLE IF NOT EXISTS chats (

  id INTEGER PRIMARY KEY AUTOINCREMENT,

  user_id INTEGER,

  question TEXT,

  answer TEXT,

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP

)
`);


// ============================================
// HEALTH CHECK
// ============================================

app.get("/api/health", (req, res) => {

  res.status(200).json({

    success: true,

    status: "healthy",

    message: "AI Chat Somali Server waa shaqaynayaa",

    timestamp: new Date().toISOString()

  });

});


// ============================================
// REGISTER
// POST /api/register
// ============================================

app.post("/api/register", async (req, res) => {

  try {

    let {
      name,
      email,
      password
    } = req.body;


    // VALIDATION

    if (!name || !email || !password) {

      return res.status(400).json({

        success: false,

        message: "Magaca, email-ka iyo password-ka waa required"

      });

    }


    name = name.trim();

    email = email.trim().toLowerCase();


    if (password.length < 6) {

      return res.status(400).json({

        success: false,

        message: "Password-ku waa inuu ka badan yahay 6 xaraf"

      });

    }


    // CHECK USER

    db.get(

      "SELECT id FROM users WHERE email = ?",

      [email],

      async (err, existingUser) => {

        if (err) {

          console.error(err);

          return res.status(500).json({

            success: false,

            message: "Database error"

          });

        }


        if (existingUser) {

          return res.status(409).json({

            success: false,

            message: "Email-kan hore ayaa loo isticmaalay"

          });

        }


        // HASH PASSWORD

        const hashedPassword =
          await bcrypt.hash(password, 10);


        // INSERT USER

        db.run(

          `
          INSERT INTO users
          (name, email, password)

          VALUES (?, ?, ?)
          `,

          [
            name,
            email,
            hashedPassword
          ],

          function (err) {

            if (err) {

              console.error(err);

              return res.status(500).json({

                success: false,

                message: "User lama samayn karin"

              });

            }


            const user = {

              id: this.lastID,

              name: name,

              email: email

            };


            // CREATE TOKEN

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

              user,

              token

            });

          }

        );

      }

    );


  } catch (error) {

    console.error("REGISTER ERROR:", error);

    res.status(500).json({

      success: false,

      message: "Server error"

    });

  }

});


// ============================================
// USER LOGIN
// POST /api/login
// ============================================

app.post("/api/login", async (req, res) => {

  try {

    let {
      email,
      password
    } = req.body;


    if (!email || !password) {

      return res.status(400).json({

        success: false,

        message: "Email iyo password waa required"

      });

    }


    email = email.trim().toLowerCase();


    db.get(

      "SELECT * FROM users WHERE email = ?",

      [email],

      async (err, user) => {

        if (err) {

          console.error(err);

          return res.status(500).json({

            success: false,

            message: "Database error"

          });

        }


        if (!user) {

          return res.status(401).json({

            success: false,

            message: "Email ama password waa khalad"

          });

        }


        // CHECK PASSWORD

        const passwordCorrect =
          await bcrypt.compare(
            password,
            user.password
          );


        if (!passwordCorrect) {

          return res.status(401).json({

            success: false,

            message: "Email ama password waa khalad"

          });

        }


        const userData = {

          id: user.id,

          name: user.name,

          email: user.email

        };


        const token = jwt.sign(

          userData,

          JWT_SECRET,

          {
            expiresIn: "30d"
          }

        );


        res.json({

          success: true,

          message: "Login waa guulaystay",

          user: userData,

          token

        });

      }

    );


  } catch (error) {

    console.error("LOGIN ERROR:", error);

    res.status(500).json({

      success: false,

      message: "Server error"

    });

  }

});

// ==========================================
// ADMIN LOGIN
// POST /api/admin/login
// ==========================================

app.post("/api/admin/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Hubinta xogta madhan
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email ama password waa khalad"
      });
    }

    // Hubi Environment Variables
    if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
      console.error("ADMIN_EMAIL ama ADMIN_PASSWORD lama helin .env");

      return res.status(500).json({
        success: false,
        message: "Admin settings lama helin"
      });
    }

    // Isbarbardhig Email
    const emailCorrect =
      email.trim().toLowerCase() ===
      process.env.ADMIN_EMAIL.trim().toLowerCase();

    // Isbarbardhig Password
    const passwordCorrect =
      password === process.env.ADMIN_PASSWORD;

    if (!emailCorrect || !passwordCorrect) {
      return res.status(401).json({
        success: false,
        message: "Email ama password waa khalad"
      });
    }

    // JWT Token
    const token = jwt.sign(
      {
        email: process.env.ADMIN_EMAIL,
        role: "admin"
      },
      process.env.JWT_SECRET || "AI_CHAT_SOMALI_SECRET_2026",
      {
        expiresIn: "30d"
      }
    );

    return res.status(200).json({
      success: true,
      message: "Admin si guul leh ayuu u galay",
      token: token,
      admin: {
        email: process.env.ADMIN_EMAIL,
        role: "admin"
      }
    });

  } catch (error) {
    console.error("ADMIN LOGIN ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});


// ============================================
// VERIFY USER TOKEN
// ============================================

function authenticateToken(
  req,
  res,
  next
) {

  const authHeader =
    req.headers.authorization;


  if (!authHeader) {

    return res.status(401).json({

      success: false,

      message: "Token lama helin"

    });

  }


  const token =
    authHeader.split(" ")[1];


  if (!token) {

    return res.status(401).json({

      success: false,

      message: "Token lama helin"

    });

  }


  jwt.verify(

    token,

    JWT_SECRET,

    (err, user) => {

      if (err) {

        return res.status(403).json({

          success: false,

          message:
            "Token waa khalad ama wuu dhacay"

        });

      }


      req.user = user;

      next();

    }

  );

}


// ============================================
// ADMIN AUTH
// ============================================

function authenticateAdmin(
  req,
  res,
  next
) {

  const authHeader =
    req.headers.authorization;


  if (!authHeader) {

    return res.status(401).json({

      success: false,

      message: "Admin token lama helin"

    });

  }


  const token =
    authHeader.split(" ")[1];


  jwt.verify(

    token,

    JWT_SECRET,

    (err, admin) => {

      if (err) {

        return res.status(403).json({

          success: false,

          message:
            "Admin token waa khalad"

        });

      }


      if (admin.role !== "admin") {

        return res.status(403).json({

          success: false,

          message:
            "Admin permission ma lihid"

        });

      }


      req.admin = admin;

      next();

    }

  );

}


// ============================================
// CHAT
// POST /chat
// ============================================

app.post("/chat", async (req, res) => {

  try {

    const {
      message,
      userId,
      history
    } = req.body;


    if (!message) {

      return res.status(400).json({

        success: false,

        message: "Fariin geli"

      });

    }


    // ========================================
    // CHECK API KEY
    // ========================================

    if (!OPENROUTER_API_KEY) {

      return res.status(500).json({

        success: false,

        message:
          "OPENROUTER_API_KEY lama helin server-ka"

      });

    }


    // ========================================
    // SYSTEM MESSAGE
    // ========================================

    const messages = [

      {

        role: "system",

        content: `
Waxaad tahay AI Chat Somali.

Waxaad si fiican ugu jawaabtaa Af-Soomaali.

Noqo mid saaxiibtinimo leh,
fudud,
caawin badan,
oo jawaab cad bixiya.

Haddii qofku ku qoro Ingiriisi,
waad fahmi kartaa laakiin haddii uu
Af-Soomaali ku qoro,
ku jawaab Af-Soomaali.
`

      }

    ];


    // ========================================
    // HISTORY
    // ========================================

    if (
      Array.isArray(history)
    ) {

      history.forEach((item) => {

        if (
          item.role &&
          item.content
        ) {

          messages.push({

            role: item.role,

            content: item.content

          });

        }

      });

    }


    // USER MESSAGE

    messages.push({

      role: "user",

      content: message

    });


    // ========================================
    // OPENROUTER REQUEST
    // ========================================

    const response =
      await fetch(

        "https://openrouter.ai/api/v1/chat/completions",

        {

          method: "POST",

          headers: {

            "Authorization":
              `Bearer ${OPENROUTER_API_KEY}`,

            "Content-Type":
              "application/json"

          },

          body: JSON.stringify({

            model:
              process.env.AI_MODEL ||
              "meta-llama/llama-3.3-70b-instruct:free",

            messages

          })

        }

      );


    const data =
      await response.json();


    // ========================================
    // API ERROR
    // ========================================

    if (!response.ok) {

      console.error(
        "OPENROUTER ERROR:",
        data
      );

      return res.status(
        response.status
      ).json({

        success: false,

        message:
          data?.error?.message ||
          "AI service error"

      });

    }


    const answer =
      data?.choices?.[0]?.message?.content ||
      "Waan ka xumahay, jawaab lama helin.";


    // ========================================
    // SAVE CHAT
    // ========================================

    if (userId) {

      db.run(

        `
        INSERT INTO chats
        (user_id, question, answer)

        VALUES (?, ?, ?)
        `,

        [

          userId,

          message,

          answer

        ],

        (err) => {

          if (err) {

            console.error(
              "SAVE CHAT ERROR:",
              err
            );

          }

        }

      );

    }


    // ========================================
    // RESPONSE
    // ========================================

    res.json({

      success: true,

      answer

    });


  } catch (error) {

    console.error(
      "CHAT ERROR:",
      error
    );


    res.status(500).json({

      success: false,

      message:
        "Server error ayaa dhacay"

    });

  }

});


// ============================================
// GET CHATS
// GET /api/chats
// ============================================

app.get(
  "/api/chats",

  (req, res) => {

    const userId =
      req.query.userId;


    if (!userId) {

      return res.status(400).json({

        success: false,

        message:
          "userId lama helin"

      });

    }


    db.all(

      `
      SELECT *

      FROM chats

      WHERE user_id = ?

      ORDER BY id DESC
      `,

      [userId],

      (err, rows) => {

        if (err) {

          console.error(err);

          return res.status(500).json({

            success: false,

            message:
              "Chats lama heli karo"

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


// ============================================
// DELETE CHATS
// DELETE /api/chats
// ============================================

app.delete(
  "/api/chats",

  (req, res) => {

    const userId =
      req.query.userId;


    if (!userId) {

      return res.status(400).json({

        success: false,

        message:
          "userId lama helin"

      });

    }


    db.run(

      `
      DELETE FROM chats

      WHERE user_id = ?
      `,

      [userId],

      function (err) {

        if (err) {

          console.error(err);

          return res.status(500).json({

            success: false,

            message:
              "Chats lama tirtiri karo"

          });

        }


        res.json({

          success: true,

          message:
            "Chat history waa la tirtiray",

          deleted:
            this.changes

        });

      }

    );

  }

);


// ============================================
// ADMIN GET USERS
// ============================================

app.get(
  "/api/admin/users",

  authenticateAdmin,

  (req, res) => {

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

      (err, users) => {

        if (err) {

          return res.status(500).json({

            success: false,

            message:
              "Users lama heli karo"

          });

        }


        res.json({

          success: true,

          users

        });

      }

    );

  }

);


// ============================================
// ADMIN GET CHATS
// ============================================

app.get(
  "/api/admin/chats",

  authenticateAdmin,

  (req, res) => {

    db.all(

      `
      SELECT
        chats.*,
        users.name,
        users.email

      FROM chats

      LEFT JOIN users

      ON chats.user_id = users.id

      ORDER BY chats.id DESC

      LIMIT 100
      `,

      [],

      (err, chats) => {

        if (err) {

          return res.status(500).json({

            success: false,

            message:
              "Chats lama heli karo"

          });

        }


        res.json({

          success: true,

          chats

        });

      }

    );

  }

);


// ============================================
// ADMIN STATS
// ============================================

app.get(
  "/api/admin/stats",

  authenticateAdmin,

  (req, res) => {

    db.get(

      `
      SELECT
      (
        SELECT COUNT(*)
        FROM users
      ) AS users,

      (
        SELECT COUNT(*)
        FROM chats
      ) AS chats
      `,

      [],

      (err, stats) => {

        if (err) {

          return res.status(500).json({

            success: false,

            message:
              "Stats lama heli karo"

          });

        }


        res.json({

          success: true,

          stats

        });

      }

    );

  }

);


// ============================================
// ADMIN PAGE
// IMPORTANT:
// public/admin.html file must exist
// ============================================

app.get(
  "/admin",

  (req, res) => {

    res.sendFile(
      path.join(
        __dirname,
        "public",
        "admin.html"
      )
    );

  }

);


// ============================================
// HOME PAGE
// ============================================

app.get(
  "/",

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


// ============================================
// 404
// ============================================

app.use(
  (req, res) => {

    res.status(404).json({

      success: false,

      message:
        "Endpoint lama helin",

      path:
        req.originalUrl

    });

  }

);


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
