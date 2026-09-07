// ==========================================
// AI CHAT SOMALI - SERVER.JS
// Express + SQLite + JWT + OpenRouter
// Text Chat + Image Chat
// ==========================================

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();


// ==========================================
// SETTINGS
// ==========================================

const PORT =
  process.env.PORT || 3000;

const OPENROUTER_API_KEY =
  process.env.OPENROUTER_API_KEY;

const OPENROUTER_MODEL =
  process.env.OPENROUTER_MODEL ||
  "google/gemini-2.0-flash-exp:free";

const JWT_SECRET =
  process.env.JWT_SECRET ||
  "change_this_secret_to_something_long_and_secure";


// ==========================================
// CHECK FETCH
// Node.js 18+ wuxuu leeyahay fetch
// ==========================================

if (typeof fetch === "undefined") {

  console.error(
    "❌ Fetch lama helin. Isticmaal Node.js 18 ama ka sareeya."
  );

}


// ==========================================
// MIDDLEWARE
// ==========================================

app.use(cors());


// Base64 images waxay noqon karaan waaweyn
app.use(
  express.json({

    limit: "25mb"

  })
);


app.use(
  express.urlencoded({

    extended: true,

    limit: "25mb"

  })
);


// ==========================================
// STATIC PUBLIC FOLDER
// ==========================================

app.use(

  express.static(

    path.join(
      __dirname,
      "public"
    )

  )

);


// ==========================================
// DATABASE
// ==========================================

const databasePath =
  path.join(
    __dirname,
    "database.db"
  );


const db =
  new sqlite3.Database(

    databasePath,

    (error) => {

      if (error) {

        console.error(
          "❌ DATABASE ERROR:",
          error.message
        );

      } else {

        console.log(
          "✅ SQLite Database Connected"
        );

      }

    }

  );


// ==========================================
// CREATE USERS TABLE
// ==========================================

db.run(

  `
  CREATE TABLE IF NOT EXISTS users (

    id INTEGER
      PRIMARY KEY
      AUTOINCREMENT,

    name TEXT
      NOT NULL,

    email TEXT
      UNIQUE
      NOT NULL,

    password TEXT
      NOT NULL,

    created_at DATETIME
      DEFAULT CURRENT_TIMESTAMP

  )
  `,

  (error) => {

    if (error) {

      console.error(
        "CREATE USERS TABLE ERROR:",
        error
      );

    }

  }

);


// ==========================================
// CREATE CHATS TABLE
// ==========================================

db.run(

  `
  CREATE TABLE IF NOT EXISTS chats (

    id INTEGER
      PRIMARY KEY
      AUTOINCREMENT,

    user_id INTEGER,

    message TEXT,

    image TEXT,

    reply TEXT,

    created_at DATETIME
      DEFAULT CURRENT_TIMESTAMP

  )
  `,

  (error) => {

    if (error) {

      console.error(
        "CREATE CHATS TABLE ERROR:",
        error
      );

    }

  }

);


// ==========================================
// AUTHENTICATION MIDDLEWARE
// ==========================================

function authenticateToken(
  req,
  res,
  next
) {

  const authHeader =
    req.headers.authorization;


  let token = null;


  if (

    authHeader &&

    authHeader.startsWith(
      "Bearer "
    )

  ) {

    token =
      authHeader.substring(
        7
      );

  }


  // Login la'aan chat waa la isticmaali karaa
  if (!token) {

    req.user = null;

    return next();

  }


  try {

    const decoded =
      jwt.verify(

        token,

        JWT_SECRET

      );


    req.user =
      decoded;


    return next();


  } catch (error) {

    console.log(
      "⚠️ JWT Token invalid ama dhacay"
    );


    req.user =
      null;


    return next();

  }

}


// ==========================================
// REGISTER
// POST /api/register
// ==========================================

app.post(

  "/api/register",

  async (
    req,
    res
  ) => {

    try {

      const {

        name,

        email,

        password

      } = req.body;


      const cleanName =
        String(
          name || ""
        ).trim();


      const cleanEmail =
        String(
          email || ""
        )
          .trim()
          .toLowerCase();


      // -------------------------------
      // VALIDATION
      // -------------------------------

      if (

        !cleanName ||

        !cleanEmail ||

        !password

      ) {

        return res
          .status(400)
          .json({

            success:
              false,

            error:
              "Fadlan buuxi dhammaan xogta."

          });

      }


      if (

        String(
          password
        ).length < 4

      ) {

        return res
          .status(400)
          .json({

            success:
              false,

            error:
              "Password-ku waa inuu ahaadaa ugu yaraan 4 xaraf."

          });

      }


      // -------------------------------
      // HASH PASSWORD
      // -------------------------------

      const hashedPassword =
        await bcrypt.hash(

          password,

          10

        );


      // -------------------------------
      // SAVE USER
      // -------------------------------

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

          cleanName,

          cleanEmail,

          hashedPassword

        ],

        function (
          error
        ) {

          if (error) {

            if (

              error.message.includes(
                "UNIQUE"
              )

            ) {

              return res
                .status(400)
                .json({

                  success:
                    false,

                  error:
                    "Email-kan hore ayaa loo isticmaalay."

                });

            }


            console.error(
              "REGISTER ERROR:",
              error
            );


            return res
              .status(500)
              .json({

                success:
                  false,

                error:
                  "Server-ka ayaa khalad la kulmay."

              });

          }


          // -----------------------------
          // CREATE JWT
          // -----------------------------

          const token =
            jwt.sign(

              {

                id:
                  this.lastID,

                name:
                  cleanName,

                email:
                  cleanEmail

              },

              JWT_SECRET,

              {

                expiresIn:
                  "30d"

              }

            );


          return res.json({

            success:
              true,

            message:
              "Akoonkaaga waa la sameeyay.",

            token:
              token,

            user: {

              id:
                this.lastID,

              name:
                cleanName,

              email:
                cleanEmail

            }

          });

        }

      );


    } catch (
      error
    ) {

      console.error(
        "REGISTER ERROR:",
        error
      );


      return res
        .status(500)
        .json({

          success:
            false,

          error:
            "Server-ka ayaa khalad la kulmay."

        });

    }

  }

);


// ==========================================
// LOGIN
// POST /api/login
// ==========================================

app.post(

  "/api/login",

  async (
    req,
    res
  ) => {

    try {

      const {

        email,

        password

      } = req.body;


      const cleanEmail =
        String(
          email || ""
        )
          .trim()
          .toLowerCase();


      if (

        !cleanEmail ||

        !password

      ) {

        return res
          .status(400)
          .json({

            success:
              false,

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

          cleanEmail

        ],

        async (
          error,
          user
        ) => {

          if (error) {

            console.error(
              "LOGIN DATABASE ERROR:",
              error
            );


            return res
              .status(500)
              .json({

                success:
                  false,

                error:
                  "Server-ka ayaa khalad la kulmay."

              });

          }


          if (!user) {

            return res
              .status(401)
              .json({

                success:
                  false,

                error:
                  "Email ama password waa khaldan yahay."

              });

          }


          // -----------------------------
          // CHECK PASSWORD
          // -----------------------------

          const passwordCorrect =
            await bcrypt.compare(

              password,

              user.password

            );


          if (
            !passwordCorrect
          ) {

            return res
              .status(401)
              .json({

                success:
                  false,

                error:
                  "Email ama password waa khaldan yahay."

              });

          }


          // -----------------------------
          // CREATE TOKEN
          // -----------------------------

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


          return res.json({

            success:
              true,

            message:
              "Soo dhowow!",

            token:
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


    } catch (
      error
    ) {

      console.error(
        "LOGIN ERROR:",
        error
      );


      return res
        .status(500)
        .json({

          success:
            false,

          error:
            "Server-ka ayaa khalad la kulmay."

        });

    }

  }

);


// ==========================================
// CHAT
// POST /chat
//
// APP.JS SENDS:
//
// {
//   message: "...",
//   image: "data:image/...;base64,..."
// }
// ==========================================

app.post(

  "/chat",

  authenticateToken,

  async (
    req,
    res
  ) => {

    try {


      // =====================================
      // GET DATA
      // =====================================

      const {

        message,

        image

      } = req.body || {};


      // =====================================
      // CLEAN MESSAGE
      // =====================================

      const cleanMessage =

        typeof message === "string"

          ? message.trim()

          : "";


      // =====================================
      // CLEAN IMAGE
      // =====================================

      const cleanImage =

        typeof image === "string" &&
        image.trim()

          ? image.trim()

          : null;


      // =====================================
      // LOG REQUEST
      // =====================================

      console.log(
        ""
      );

      console.log(
        "========================================"
      );

      console.log(
        "📩 NEW CHAT REQUEST"
      );

      console.log(
        "📝 Message:",
        cleanMessage ||
        "(Qoraal ma jiro)"
      );

      console.log(
        "🖼️ Image:",
        cleanImage
          ? "Sawir waa jiraa"
          : "Sawir ma jiro"
      );

      console.log(
        "========================================"
      );


      // =====================================
      // CHECK INPUT
      // =====================================

      if (

        !cleanMessage &&

        !cleanImage

      ) {

        return res
          .status(400)
          .json({

            success:
              false,

            error:
              "Fadlan qor fariin ama dooro sawir."

          });

      }


      // =====================================
      // CHECK IMAGE FORMAT
      // =====================================

      if (
        cleanImage
      ) {

        if (

          !cleanImage.startsWith(
            "data:image/"
          )

        ) {

          console.error(
            "❌ Invalid image format"
          );


          return res
            .status(400)
            .json({

              success:
                false,

              error:
                "Sawirka la soo diray ma aha Base64 image sax ah."

            });

        }

      }


      // =====================================
      // CHECK OPENROUTER KEY
      // =====================================

      if (

        !OPENROUTER_API_KEY

      ) {

        console.error(
          "❌ OPENROUTER_API_KEY lama helin."
        );


        return res
          .status(500)
          .json({

            success:
              false,

            error:
              "OPENROUTER_API_KEY lama dejin. Hubi faylka .env."

          });

      }


      // =====================================
      // BUILD AI USER CONTENT
      // =====================================

      const userContent =
        [];


      // -------------------------------------
      // TEXT
      // -------------------------------------

      if (
        cleanMessage
      ) {

        userContent.push({

          type:
            "text",

          text:
            cleanMessage

        });

      }


      // -------------------------------------
      // IMAGE
      // -------------------------------------

      if (
        cleanImage
      ) {

        userContent.push({

          type:
            "image_url",

          image_url: {

            url:
              cleanImage

          }

        });

      }


      console.log(
        "📦 AI Content:",
        userContent.length,
        "qaybood"
      );


      // =====================================
      // OPENROUTER REQUEST
      // =====================================

      console.log(
        "🤖 Sending request to OpenRouter..."
      );


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

                `http://localhost:${PORT}`,


              "X-Title":
                "AI Chat Somali"

            },


            body:

              JSON.stringify({

                model:
                  OPENROUTER_MODEL,


                messages: [

                  // -----------------------
                  // SYSTEM
                  // -----------------------

                  {

                    role:
                      "system",

                    content:
                      `
Waxaad tahay AI Chat Somali, caawiye caqli badan.

XEERARKA:

1. Mar walba ku jawaab Af-Soomaali.
2. Jawaabaha ka dhig kuwo cad oo fudud.
3. Haddii user-ku sawir kuu soo diro, si taxaddar leh u eeg sawirka.
4. Haddii user-ku sawir keliya soo diro, sharax waxa sawirka ka muuqda.
5. Haddii sawir iyo su'aal la isku daro, ka jawaab su'aasha sawirka ku saabsan.
6. Haddii qoraal keliya la soo diro, si fiican uga jawaab.
7. Noqo caawiye saaxiibtinimo leh.
8. Haddii aanad wax sawirka ka hubin karin, si daacad ah u sheeg.
`

                  },


                  // -----------------------
                  // USER
                  // -----------------------

                  {

                    role:
                      "user",

                    content:
                      userContent

                  }

                ],


                temperature:
                  0.7,


                max_tokens:
                  1500

              })

          }

        );


      // =====================================
      // READ RESPONSE
      // =====================================

      let data;


      try {

        data =
          await aiResponse.json();

      } catch (
        error
      ) {

        console.error(
          "❌ OpenRouter JSON ERROR:",
          error
        );


        return res
          .status(500)
          .json({

            success:
              false,

            error:
              "OpenRouter jawaab sax ah ma soo celin."

          });

      }


      // =====================================
      // OPENROUTER ERROR
      // =====================================

      if (

        !aiResponse.ok

      ) {

        console.error(
          "========================================"
        );

        console.error(
          "❌ OPENROUTER ERROR"
        );

        console.error(
          "STATUS:",
          aiResponse.status
        );

        console.error(

          JSON.stringify(

            data,

            null,

            2

          )

        );

        console.error(
          "========================================"
        );


        return res
          .status(
            aiResponse.status
          )
          .json({

            success:
              false,

            error:

              data?.error?.message ||

              "OpenRouter API ayaa khalad bixisay."

          });

      }


      // =====================================
      // GET AI REPLY
      // =====================================

      let reply =

        data?.choices?.[0]
          ?.message?.content;


      // Haddii content null yahay
      if (

        !reply

      ) {

        reply =
          "Waan ka xumahay, AI jawaab ma soo celin.";

      }


      // Hubi inuu string yahay
      if (

        typeof reply !== "string"

      ) {

        reply =
          JSON.stringify(
            reply
          );

      }


      console.log(
        "✅ AI RESPONSE RECEIVED"
      );


      // =====================================
      // GET USER ID
      // =====================================

      const userId =

        req.user

          ? req.user.id

          : null;


      // =====================================
      // SAVE CHAT TO DATABASE
      // =====================================

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

          cleanMessage,

          cleanImage,

          reply

        ],

        function (
          error
        ) {

          if (
            error
          ) {

            console.error(

              "❌ SAVE CHAT ERROR:",

              error.message

            );

          } else {

            console.log(

              "💾 CHAT SAVED:",

              this.lastID

            );

          }

        }

      );


      // =====================================
      // SEND RESPONSE TO APP.JS
      // =====================================

      return res.json({

        success:
          true,

        reply:
          reply

      });


    } catch (
      error
    ) {

      console.error(
        "========================================"
      );

      console.error(
        "❌ CHAT SERVER ERROR"
      );

      console.error(
        error
      );

      console.error(
        "========================================"
      );


      return res
        .status(500)
        .json({

          success:
            false,

          error:
            "Server-ka ayaa khalad la kulmay.",

          details:
            error.message

        });

    }

  }

);


// ==========================================
// GET CHAT HISTORY
// GET /api/chats
// ==========================================

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
          ORDER BY id ASC
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
          ORDER BY id ASC
          `;


        values =
          [];

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

            console.error(
              "GET CHATS ERROR:",
              error
            );


            return res
              .status(500)
              .json({

                success:
                  false,

                error:
                  "Chat history lama soo qaadi karin."

              });

          }


          return res.json({

            success:
              true,

            chats:
              chats || []

          });

        }

      );


    } catch (
      error
    ) {

      console.error(
        "GET CHATS ERROR:",
        error
      );


      return res
        .status(500)
        .json({

          success:
            false,

          error:
            "Server-ka ayaa khalad la kulmay."

        });

    }

  }

);


// ==========================================
// DELETE CHAT HISTORY
// DELETE /api/chats
// ==========================================

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


        values =
          [];

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

            console.error(
              "DELETE CHAT ERROR:",
              error
            );


            return res
              .status(500)
              .json({

                success:
                  false,

                error:
                  "Chats lama tirtiri karin."

              });

          }


          return res.json({

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

      console.error(
        "DELETE CHAT ERROR:",
        error
      );


      return res
        .status(500)
        .json({

          success:
            false,

          error:
            "Server-ka ayaa khalad la kulmay."

        });

    }

  }

);


// ==========================================
// HEALTH CHECK
// GET /api/health
// ==========================================

app.get(

  "/api/health",

  (
    req,
    res
  ) => {

    return res.json({

      success:
        true,

      status:
        "ok",

      service:
        "AI Chat Somali",

      imageChat:
        true,

      time:
        new Date()
          .toISOString()

    });

  }

);


// ==========================================
// HOME PAGE
// ==========================================

app.get(

  "/",

  (
    req,
    res
  ) => {

    return res.sendFile(

      path.join(

        __dirname,

        "public",

        "index.html"

      )

    );

  }

);


// ==========================================
// 404
// ==========================================

app.use(

  (
    req,
    res
  ) => {

    return res
      .status(404)
      .json({

        success:
          false,

        error:
          "Endpoint lama helin."

      });

  }

);


// ==========================================
// SERVER START
// ==========================================

app.listen(

  PORT,

  "0.0.0.0",

  () => {

    console.log(
      ""
    );

    console.log(
      "========================================"
    );

    console.log(
      "🤖 AI CHAT SOMALI SERVER STARTED"
    );

    console.log(
      "========================================"
    );

    console.log(
      `🚀 http://localhost:${PORT}`
    );

    console.log(
      `📡 Port: ${PORT}`
    );

    console.log(
      "💬 Text Chat: Enabled"
    );

    console.log(
      "🖼️ Image Chat: Enabled"
    );

    console.log(
      "💾 SQLite: Enabled"
    );

    console.log(
      "🔐 JWT: Enabled"
    );

    console.log(
      `🤖 Model: ${OPENROUTER_MODEL}`
    );

    console.log(
      "========================================"
    );

    console.log(
      ""
    );

  }

);
