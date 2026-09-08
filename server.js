require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const sqlite3 = require("sqlite3").verbose();
const multer = require("multer");

const app = express();

const PORT = process.env.PORT || 3000;

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const AI_MODEL = process.env.AI_MODEL || "openrouter/free";
const VISION_MODEL = process.env.VISION_MODEL || "openrouter/free";

const APP_URL =
  process.env.APP_URL || "http://localhost:" + PORT;

/* =====================================================
   MIDDLEWARE
===================================================== */

app.use(cors());

app.use(express.json({
  limit: "12mb"
}));

app.use(express.urlencoded({
  extended: true,
  limit: "12mb"
}));

app.use(express.static(path.join(__dirname, "public")));


/* =====================================================
   IMAGE UPLOAD
===================================================== */

const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 8 * 1024 * 1024
  },

  fileFilter: (req, file, cb) => {

    if (!file.mimetype.startsWith("image/")) {
      return cb(
        new Error("Faylka la soo diray sawir ma aha.")
      );
    }

    cb(null, true);
  }
});


/* =====================================================
   DATABASE
===================================================== */

const DB_PATH = path.join(__dirname, "chat.db");

const db = new sqlite3.Database(DB_PATH, (err) => {

  if (err) {
    console.error("DATABASE ERROR:", err.message);
  } else {
    console.log("📁 SQLite Database Connected");
  }

});


db.serialize(() => {

  db.run(`
    CREATE TABLE IF NOT EXISTS chats (

      id INTEGER PRIMARY KEY AUTOINCREMENT,

      user_message TEXT NOT NULL,

      ai_reply TEXT NOT NULL,

      image TEXT,

      model TEXT,

      created_at DATETIME DEFAULT CURRENT_TIMESTAMP

    )
  `);

});


/* =====================================================
   SQLITE PROMISE HELPERS
===================================================== */

function dbRun(sql, params = []) {

  return new Promise((resolve, reject) => {

    db.run(sql, params, function (err) {

      if (err) {
        reject(err);
      } else {
        resolve({
          id: this.lastID,
          changes: this.changes
        });
      }

    });

  });

}


function dbAll(sql, params = []) {

  return new Promise((resolve, reject) => {

    db.all(sql, params, (err, rows) => {

      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }

    });

  });

}


/* =====================================================
   HELPER: CHECK IMAGE SIZE
===================================================== */

function getBase64Size(base64String) {

  if (!base64String) return 0;

  let base64 = base64String;

  if (base64.includes(",")) {
    base64 = base64.split(",")[1];
  }

  const padding =
    (base64.match(/=/g) || []).length;

  return Math.floor(
    (base64.length * 3) / 4
  ) - padding;

}


/* =====================================================
   HELPER: GET IMAGE DATA
===================================================== */

function getImageFromRequest(req) {

  // Multipart image
  if (req.file) {

    const mimeType = req.file.mimetype;

    const base64 =
      req.file.buffer.toString("base64");

    return {
      dataUrl: `data:${mimeType};base64,${base64}`,
      mimeType
    };

  }


  // JSON image string
  if (req.body.image) {

    // image = data URL
    if (
      typeof req.body.image === "string" &&
      req.body.image.startsWith("data:image/")
    ) {

      return {
        dataUrl: req.body.image
      };

    }


    // image object
    if (
      typeof req.body.image === "object" &&
      req.body.image.data
    ) {

      const mimeType =
        req.body.image.mimeType ||
        "image/jpeg";

      return {
        dataUrl:
          `data:${mimeType};base64,${req.body.image.data}`,

        mimeType
      };

    }

  }


  // imageBase64
  if (req.body.imageBase64) {

    const mimeType =
      req.body.imageMimeType ||
      "image/jpeg";

    return {
      dataUrl:
        `data:${mimeType};base64,${req.body.imageBase64}`,

      mimeType
    };

  }


  return null;

}


/* =====================================================
   HELPER: EXTRACT AI TEXT
===================================================== */

function extractAIText(data) {

  const message =
    data?.choices?.[0]?.message;

  if (!message) {
    return null;
  }


  const content = message.content;


  // Normal string
  if (typeof content === "string") {

    return content.trim();

  }


  // Some models return array
  if (Array.isArray(content)) {

    const text = content
      .map(item => {

        if (typeof item === "string") {
          return item;
        }

        if (item?.text) {
          return item.text;
        }

        return "";

      })
      .join("\n")
      .trim();

    return text || null;

  }


  return null;

}


/* =====================================================
   OPENROUTER REQUEST
===================================================== */

async function askOpenRouter({
  message,
  image
}) {

  const selectedModel =
    image
      ? VISION_MODEL
      : AI_MODEL;


  console.log(
    "OPENROUTER MODEL:",
    selectedModel
  );


  if (
    !selectedModel ||
    selectedModel.trim() === ""
  ) {

    throw new Error(
      "AI_MODEL ama VISION_MODEL lama helin."
    );

  }


  if (
    !OPENROUTER_API_KEY ||
    OPENROUTER_API_KEY.trim() === ""
  ) {

    throw new Error(
      "OPENROUTER_API_KEY lama helin."
    );

  }


  /* -------------------------
     SYSTEM MESSAGE
  ------------------------- */

  const messages = [

    {
      role: "system",

      content: `
Waxaad tahay AI Chat Somali.

Si cad oo sax ah uga jawaab Af-Soomaali.

Haddii isticmaaluhu su'aal ku weydiiyo:
- si caadi ah uga jawaab
- ha oran "Jawaab lama helin" haddii aad jawaab bixin karto

Haddii sawir la soo diro:
- sawirka sharax Af-Soomaali
- sheeg waxa sawirka ka muuqda
- haddii su'aal la socoto sawirka, ka jawaab su'aasha adigoo sawirka eegaya

Ha sheegin in server-ku khaldan yahay haddii dhibaatadu aysan kaa iman.

Jawaabaha ka dhig kuwo cad, dabiici ah, oo faa'iido leh.
      `.trim()
    }

  ];


  /* -------------------------
     USER TEXT ONLY
  ------------------------- */

  if (!image) {

    messages.push({

      role: "user",

      content:
        message ||
        "Fadlan iga caawi."

    });

  }


  /* -------------------------
     IMAGE + TEXT
  ------------------------- */

  if (image) {

    const imageContent = [

      {
        type: "text",

        text:
          message ||
          "Fadlan sawirkan sharax Af-Soomaali."
      },

      {
        type: "image_url",

        image_url: {
          url: image.dataUrl
        }
      }

    ];


    messages.push({

      role: "user",

      content: imageContent

    });

  }


  /* -------------------------
     30 SECOND TIMEOUT
  ------------------------- */

  const controller =
    new AbortController();

  const timeout =
    setTimeout(() => {

      controller.abort();

    }, 30000);


  try {

    const response =
      await fetch(
        "https://openrouter.ai/api/v1/chat/completions",
        {

          method: "POST",

          signal: controller.signal,

          headers: {

            "Authorization":
              `Bearer ${OPENROUTER_API_KEY}`,

            "Content-Type":
              "application/json",

            "HTTP-Referer":
              APP_URL,

            "X-Title":
              "AI Chat Somali"

          },

          body: JSON.stringify({

            model: selectedModel,

            messages,

            temperature: 0.7,

            max_tokens: 1500

          })

        }
      );


    const rawText =
      await response.text();


    let data;

    try {

      data =
        JSON.parse(rawText);

    } catch {

      data = {
        raw: rawText
      };

    }


    /* -------------------------
       OPENROUTER ERROR
    ------------------------- */

    if (!response.ok) {

      console.error(
        "OPENROUTER ERROR:",
        response.status,
        data
      );


      const apiError =
        data?.error?.message ||
        data?.message ||
        "OpenRouter ayaa diiday codsiga.";

      throw new Error(
        `OpenRouter Error (${response.status}): ${apiError}`
      );

    }


    const reply =
      extractAIText(data);


    if (
      !reply ||
      reply.trim() === ""
    ) {

      console.error(
        "AI EMPTY RESPONSE:",
        JSON.stringify(data, null, 2)
      );

      throw new Error(
        "AI-gu jawaab madhan ayuu soo celiyey."
      );

    }


    return {

      reply,

      model:
        data?.model ||
        selectedModel

    };


  } finally {

    clearTimeout(timeout);

  }

}


/* =====================================================
   POST /chat
===================================================== */

app.post(
  "/chat",
  upload.single("image"),
  async (req, res) => {

    try {

      const message =
        (
          req.body.message ||
          req.body.text ||
          req.body.prompt ||
          ""
        )
        .trim();


      const image =
        getImageFromRequest(req);


      /* -------------------------
         VALIDATE
      ------------------------- */

      if (
        !message &&
        !image
      ) {

        return res.status(400).json({

          ok: false,

          error:
            "Fadlan geli su'aal ama sawir."

        });

      }


      /* -------------------------
         IMAGE SIZE CHECK
      ------------------------- */

      if (image) {

        const imageSize =
          getBase64Size(
            image.dataUrl
          );


        const MAX_IMAGE_SIZE =
          8 * 1024 * 1024;


        if (
          imageSize >
          MAX_IMAGE_SIZE
        ) {

          return res.status(413).json({

            ok: false,

            error:
              "Sawirku aad ayuu u weyn yahay. Ugu badnaan 8MB ayaa la oggol yahay."

          });

        }

      }


      console.log(
        "================================"
      );

      console.log(
        "💬 NEW CHAT"
      );

      console.log(
        "MESSAGE:",
        message || "[Sawir kaliya]"
      );

      console.log(
        "IMAGE:",
        image ? "YES" : "NO"
      );

      console.log(
        "================================"
      );


      /* -------------------------
         ASK AI
      ------------------------- */

      const aiResult =
        await askOpenRouter({

          message,

          image

        });


      /* -------------------------
         SAVE CHAT
      ------------------------- */

      const saved =
        await dbRun(

          `
          INSERT INTO chats
          (
            user_message,
            ai_reply,
            image,
            model
          )
          VALUES (?, ?, ?, ?)
          `,

          [

            message ||
              "[Sawir]",

            aiResult.reply,

            image
              ? image.dataUrl
              : null,

            aiResult.model

          ]

        );


      /* -------------------------
         SUCCESS
      ------------------------- */

      return res.json({

        ok: true,

        chatId:
          saved.id,

        reply:
          aiResult.reply,

        model:
          aiResult.model

      });


    } catch (error) {

      console.error(
        "CHAT ERROR:",
        error
      );


      /* -------------------------
         TIMEOUT
      ------------------------- */

      if (
        error.name ===
        "AbortError"
      ) {

        return res.status(504).json({

          ok: false,

          error:
            "Codsigu wuxuu dhaafay 30 ilbiriqsi. Fadlan mar kale isku day."

        });

      }


      /* -------------------------
         GENERAL ERROR
      ------------------------- */

      return res.status(500).json({

        ok: false,

        error:
          error.message ||
          "Wax khalad ah ayaa dhacay."

      });

    }

  }
);


/* =====================================================
   GET /api/chats
===================================================== */

app.get(
  "/api/chats",

  async (req, res) => {

    try {

      const chats =
        await dbAll(
          `
          SELECT
            id,
            user_message,
            ai_reply,
            image,
            model,
            created_at

          FROM chats

          ORDER BY
            id DESC

          LIMIT 100
          `
        );


      res.json({

        ok: true,

        chats

      });


    } catch (error) {

      console.error(
        "GET CHATS ERROR:",
        error
      );

      res.status(500).json({

        ok: false,

        error:
          "Chat history lama soo qaadi karo."

      });

    }

  }
);


/* =====================================================
   DELETE ALL CHATS
===================================================== */

app.delete(
  "/api/chats",

  async (req, res) => {

    try {

      await dbRun(
        "DELETE FROM chats"
      );


      res.json({

        ok: true,

        message:
          "Dhammaan chat history waa la tirtiray."

      });


    } catch (error) {

      console.error(
        "DELETE CHATS ERROR:",
        error
      );


      res.status(500).json({

        ok: false,

        error:
          "Chat history lama tirtiri karo."

      });

    }

  }
);


/* =====================================================
   DELETE ONE CHAT
===================================================== */

app.delete(
  "/api/chats/:id",

  async (req, res) => {

    try {

      const result =
        await dbRun(

          "DELETE FROM chats WHERE id = ?",

          [
            req.params.id
          ]

        );


      if (
        result.changes === 0
      ) {

        return res.status(404).json({

          ok: false,

          error:
            "Chat lama helin."

        });

      }


      res.json({

        ok: true,

        message:
          "Chat-ka waa la tirtiray."

      });


    } catch (error) {

      console.error(
        "DELETE CHAT ERROR:",
        error
      );


      res.status(500).json({

        ok: false,

        error:
          "Chat-ka lama tirtiri karo."

      });

    }

  }
);


/* =====================================================
   GET /api/health
===================================================== */

app.get(
  "/api/health",

  (req, res) => {

    res.status(200).json({

      ok: true,

      status:
        "healthy",

      message:
        "AI Chat Somali server-ka wuu shaqaynayaa.",

      ai_model:
        AI_MODEL,

      vision_model:
        VISION_MODEL,

      openrouter:
        OPENROUTER_API_KEY
          ? "configured"
          : "missing",

      database:
        "connected"

    });

  }
);


/* =====================================================
   ROOT
===================================================== */

app.get(
  "/",

  (req, res) => {

    const indexFile =
      path.join(
        __dirname,
        "public",
        "index.html"
      );


    if (
      fs.existsSync(
        indexFile
      )
    ) {

      return res.sendFile(
        indexFile
      );

    }


    res.json({

      ok: true,

      message:
        "AI Chat Somali Server Running"

    });

  }
);


/* =====================================================
   404
===================================================== */

app.use(
  (req, res) => {

    res.status(404).json({

      ok: false,

      error:
        "Endpoint lama helin."

    });

  }
);


/* =====================================================
   GLOBAL ERROR
===================================================== */

app.use(
  (
    error,
    req,
    res,
    next
  ) => {

    console.error(
      "SERVER ERROR:",
      error
    );


    if (
      error.code ===
      "LIMIT_FILE_SIZE"
    ) {

      return res.status(413).json({

        ok: false,

        error:
          "Sawirku wuu ka weyn yahay 8MB."

      });

    }


    res.status(500).json({

      ok: false,

      error:
        error.message ||
        "Server error."

    });

  }
);


/* =====================================================
   START SERVER
===================================================== */

app.listen(
  PORT,

  "0.0.0.0",

  () => {

    console.log("");
    console.log(
      "================================"
    );

    console.log(
      "🤖 AI CHAT SOMALI STARTED"
    );

    console.log(
      "🌐 PORT:",
      PORT
    );

    console.log(
      "💬 AI MODEL:",
      AI_MODEL
    );

    console.log(
      "📷 VISION MODEL:",
      VISION_MODEL
    );

    console.log(
      "❤️ HEALTH:",
      /api/health
    );

    console.log(
      "📁 DATABASE:",
      DB_PATH
    );

    console.log(
      "================================"
    );

  }
);
