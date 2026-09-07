require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();

const PORT = process.env.PORT || 3000;

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

const JWT_SECRET =
  process.env.JWT_SECRET || "change_this_secret";


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

app.use(
  express.static(
    path.join(__dirname, "public")
  )
);


// ========================================
// DATABASE
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
        "✅ SQLite Database Connected"
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

    name TEXT NOT NULL,

    email TEXT UNIQUE NOT NULL,

    password TEXT NOT NULL,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP

  )
`);


// ========================================
// CREATE CHATS TABLE
// ========================================

db.run(`
  CREATE TABLE IF NOT EXISTS chats (

    id INTEGER PRIMARY KEY AUTOINCREMENT,

    user_id INTEGER,

    message TEXT,

    image TEXT,

    reply TEXT,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP

  )
`);


// ========================================
// AUTH MIDDLEWARE
// ========================================

function authenticateToken(
  req,
  res,
  next
) {

  const authHeader =
    req.headers.authorization;

  const token =
    authHeader &&
    authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;


  // User aan login samayn
  // Chat-ka wuu isticmaali karaa
  // laakiin user_id ma laha

  if (!token) {

    req.user = null;

    return next();

  }


  try {

    const user =
      jwt.verify(
        token,
        JWT_SECRET
      );

    req.user = user;

    next();

  } catch (error) {

    req.user = null;

    next();

  }

}


// ========================================
// REGISTER
// ========================================

app.post(
  "/api/register",
  async (req, res) => {

    try {

      const {
        name,
        email,
        password
      } = req.body;


      if (
        !name ||
        !email ||
        !password
      ) {

        return res.status(400).json({

          error:
            "Fadlan buuxi dhammaan xogta."

        });

      }


      if (
        password.length < 4
      ) {

        return res.status(400).json({

          error:
            "Password-ku waa inuu ahaadaa ugu yaraan 4 xaraf."

        });

      }


      const hashedPassword =
        await bcrypt.hash(
          password,
          10
        );


      db.run(

        `
        INSERT INTO users
        (
          name,
          email,
          password
        )
        VALUES (?, ?, ?)
        `,

        [
          name,
          email,
          hashedPassword
        ],

        function (error) {

          if (error) {

            if (
              error.message.includes(
                "UNIQUE"
              )
            ) {

              return res.status(400).json({

                error:
                  "Email-kan hore ayaa loo isticmaalay."

              });

            }


            console.error(
              "REGISTER ERROR:",
              error
            );

            return res.status(500).json({

              error:
                "Server-ka ayaa khalad la kulmay."

            });

          }


          const token =
            jwt.sign(

              {

                id:
                  this.lastID,

                name,

                email

              },

              JWT_SECRET,

              {

                expiresIn:
                  "30d"

              }

            );


          res.json({

            success: true,

            message:
              "Akoonkaaga waa la sameeyay.",

            token,

            user: {

              id:
                this.lastID,

              name,

              email

            }

          });

        }

      );


    } catch (error) {

      console.error(
        "REGISTER ERROR:",
        error
      );

      res.status(500).json({

        error:
          "Server-ka ayaa khalad la kulmay."

      });

    }

  }
);


// ========================================
// LOGIN
// ========================================

app.post(
  "/api/login",
  async (req, res) => {

    try {

      const {
        email,
        password
      } = req.body;


      if (
        !email ||
        !password
      ) {

        return res.status(400).json({

          error:
            "Email iyo password geli."

        });

      }


      db.get(

        `
        SELECT *
        FROM users
        WHERE email = ?
        `,

        [
          email
        ],

        async (
          error,
          user
        ) => {

          if (error) {

            console.error(
              "LOGIN ERROR:",
              error
            );

            return res.status(500).json({

              error:
                "Server-ka ayaa khalad la kulmay."

            });

          }


          if (!user) {

            return res.status(401).json({

              error:
                "Email ama password waa khaldan yahay."

            });

          }


          const passwordCorrect =
            await bcrypt.compare(

              password,

              user.password

            );


          if (
            !passwordCorrect
          ) {

            return res.status(401).json({

              error:
                "Email ama password waa khaldan yahay."

            });

          }


          const token =
            jwt.sign(

              {

                id:
                  user.id,

                name:
                  user.name,

                email:
                  user.email

              },

              JWT_SECRET,

              {

                expiresIn:
                  "30d"

              }

            );


          res.json({

            success: true,

            message:
              "Soo dhowow!",

            token,

            user: {

              id:
                user.id,

              name:
                user.name,

              email:
                user.email

            }

          });

        }

      );


    } catch (error) {

      console.error(
        "LOGIN ERROR:",
        error
      );

      res.status(500).json({

        error:
          "Server-ka ayaa khalad la kulmay."

      });

    }

  }
);


// ========================================
// CHAT + IMAGE
// ========================================

app.post(
  "/chat",
  authenticateToken,

  async (
    req,
    res
  ) => {

    try {

      const {
        message,
        image
      } = req.body;


      // ------------------------------------
      // CHECK INPUT
      // ------------------------------------

      if (
        !message &&
        !image
      ) {

        return res.status(400).json({

          error:
            "Fadlan qor su'aal ama dooro sawir."

        });

      }


      // ------------------------------------
      // OPENROUTER API KEY CHECK
      // ------------------------------------

      if (
        !OPENROUTER_API_KEY
      ) {

        console.error(
          "OPENROUTER_API_KEY lama helin"
        );

        return res.status(500).json({

          error:
            "OPENROUTER_API_KEY lama dejin."

        });

      }


      // ------------------------------------
      // USER CONTENT
      // ------------------------------------

      const userContent = [];


      // Qoraal

      if (
        message &&
        message.trim()
      ) {

        userContent.push({

          type:
            "text",

          text:
            message.trim()

        });

      }


      // Sawir

      if (image) {

        userContent.push({

          type:
            "image_url",

          image_url: {

            url:
              image

          }

        });

      }


      // ------------------------------------
      // OPENROUTER REQUEST
      // ------------------------------------

      const aiResponse =
        await fetch(

          "https://openrouter.ai/api/v1/chat/completions",

          {

            method:
              "POST",


            headers: {

              "Authorization":
                `Bearer ${OPENROUTER_API_KEY}`,

              "Content-Type":
                "application/json",

              "HTTP-Referer":
                process.env.APP_URL ||
                "http://localhost:3000",

              "X-Title":
                "AI Chat Somali"

            },


            body:
              JSON.stringify({

                // Haddii model-kan
                // OpenRouter-kaaga shaqayn waayo
                // beddel OPENROUTER_MODEL
                // gudaha Render Environment Variables

                model:
                  process.env.OPENROUTER_MODEL ||
                  "google/gemini-2.0-flash-exp:free",


                messages: [

                  {

                    role:
                      "system",

                    content:
                      `
Waxaad tahay AI Chat Somali.

Waxaad si fiican ugu jawaabtaa Af-Soomaali.

Haddii user-ku sawir soo diro:
- Si taxaddar leh u eeg sawirka.
- Sharax waxa ka muuqda.
- Ka jawaab su'aasha user-ka ee sawirka la xiriirta.
- Isticmaal Af-Soomaali fudud oo cad.

Haddii user-ku su'aal qoraal ah soo diro:
- Ku jawaab Af-Soomaali.
- Noqo caawiye saaxiibtinimo leh.
- Sharaxaad cad bixi.
`

                  },


                  {

                    role:
                      "user",

                    content:
                      userContent

                  }

                ],

                temperature:
                  0.7

              })

          }

        );


      // ------------------------------------
      // READ RESPONSE
      // ------------------------------------

      const data =
        await aiResponse.json();


      // ------------------------------------
      // OPENROUTER ERROR
      // ------------------------------------

      if (
        !aiResponse.ok
      ) {

        console.error(

          "OPENROUTER ERROR:",

          JSON.stringify(
            data,
            null,
            2
          )

        );


        return res
          .status(
            aiResponse.status
          )
          .json({

            error:

              data?.error?.message ||

              "OpenRouter API ayaa khalad bixisay."

          });

      }


      // ------------------------------------
      // GET AI REPLY
      // ------------------------------------

      const reply =

        data?.choices?.[0]
          ?.message?.content ||

        "Waan ka xumahay, jawaab lama helin.";


      // ------------------------------------
      // SAVE CHAT
      // ------------------------------------

      const userId =
        req.user
          ? req.user.id
          : null;


      db.run(

        `
        INSERT INTO chats
        (
          user_id,
          message,
          image,
          reply
        )
        VALUES (?, ?, ?, ?)
        `,

        [

          userId,

          message ||
            "",

          image ||
            null,

          reply

        ],

        function (
          error
        ) {

          if (error) {

            console.error(

              "SAVE CHAT ERROR:",

              error

            );

          }

        }

      );


      // ------------------------------------
      // SEND RESPONSE
      // ------------------------------------

      res.json({

        success:
          true,

        reply:
          reply

      });


    } catch (
      error
    ) {

      console.error(

        "CHAT ERROR:",

        error

      );


      res.status(500).json({

        error:
          "Server-ka ayaa khalad la kulmay.",

        details:
          error.message

      });

    }

  }
);


// ========================================
// GET CHAT HISTORY
// ========================================

app.get(
  "/api/chats",
  authenticateToken,

  (
    req,
    res
  ) => {

    try {

      let query;

      let values;


      if (
        req.user
      ) {

        query =
          `
          SELECT *
          FROM chats
          WHERE user_id = ?
          ORDER BY id DESC
          `;

        values = [
          req.user.id
        ];

      } else {

        query =
          `
          SELECT *
          FROM chats
          WHERE user_id IS NULL
          ORDER BY id DESC
          `;

        values = [];

      }


      db.all(

        query,

        values,

        (
          error,
          chats
        ) => {

          if (
            error
          ) {

            return res
              .status(500)
              .json({

                error:
                  "Chat history lama soo qaadi karin."

              });

          }


          res.json({

            success:
              true,

            chats:
              chats

          });

        }

      );


    } catch (
      error
    ) {

      res.status(500).json({

        error:
          "Server-ka ayaa khalad la kulmay."

      });

    }

  }
);


// ========================================
// DELETE CHAT HISTORY
// ========================================

app.delete(
  "/api/chats",
  authenticateToken,

  (
    req,
    res
  ) => {

    try {

      let query;

      let values;


      if (
        req.user
      ) {

        query =
          `
          DELETE FROM chats
          WHERE user_id = ?
          `;

        values = [
          req.user.id
        ];

      } else {

        query =
          `
          DELETE FROM chats
          WHERE user_id IS NULL
          `;

        values = [];

      }


      db.run(

        query,

        values,

        function (
          error
        ) {

          if (
            error
          ) {

            return res
              .status(500)
              .json({

                error:
                  "Chats lama tirtiri karin."

              });

          }


          res.json({

            success:
              true,

            message:
              "Chat history waa la tirtiray."

          });

        }

      );


    } catch (
      error
    ) {

      res.status(500).json({

        error:
          "Server-ka ayaa khalad la kulmay."

      });

    }

  }
);


// ========================================
// HEALTH CHECK
// ========================================

app.get(
  "/api/health",

  (
    req,
    res
  ) => {

    res.json({

      success:
        true,

      status:
        "ok",

      service:
        "AI Chat Somali",

      time:
        new Date()
          .toISOString()

    });

  }
);


// ========================================
// HOME
// ========================================

app.get(
  "*",

  (
    req,
    res
  ) => {

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

    console.log(
      "========================================"
    );

    console.log(
      "🤖 AI Chat Somali Server Started"
    );

    console.log(
      `🚀 Port: ${PORT}`
    );

    console.log(
      "📷 Image Chat: Enabled"
    );

    console.log(
      "========================================"
    );

  }

);
