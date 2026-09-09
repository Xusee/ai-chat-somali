require("dotenv").config();

const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const sqlite3 = require("sqlite3").verbose();

const app = express();

// ================================
// CONFIG
// ================================

const PORT = process.env.PORT || 3000;

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

// Waa inaad .env ku qortaa model taageera sawirrada.
// Tusaale:
// AI_MODEL=google/gemini-2.5-flash
const AI_MODEL =
  process.env.AI_MODEL ||
  "google/gemini-2.5-flash";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const REQUEST_TIMEOUT = 30000; // 30 seconds


// ================================
// MIDDLEWARE
// ================================

app.use(cors());

app.use(express.json({
  limit: "10mb"
}));

app.use(express.urlencoded({
  extended: true,
  limit: "10mb"
}));


// ================================
// STATIC FILES
// ================================

app.use(express.static(path.join(__dirname, "public")));


// ================================
// DATABASE
// ================================

const dbPath = path.join(__dirname, "database.sqlite");

const db = new sqlite3.Database(dbPath, (error) => {
  if (error) {
    console.error("DATABASE ERROR:", error.message);
  } else {
    console.log("✅ Database connected");
  }
});


db.run(`
  CREATE TABLE IF NOT EXISTS chats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    question TEXT,

    answer TEXT,

    image_name TEXT,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);


// ================================
// UPLOAD FOLDER
// ================================

const uploadsFolder = path.join(__dirname, "uploads");

if (!fs.existsSync(uploadsFolder)) {
  fs.mkdirSync(uploadsFolder);
}


// ================================
// MULTER STORAGE
// ================================

const storage = multer.diskStorage({

  destination: function (req, file, cb) {
    cb(null, uploadsFolder);
  },

  filename: function (req, file, cb) {

    const extension = path.extname(file.originalname);

    const fileName =
      Date.now() +
      "-" +
      Math.round(Math.random() * 1000000) +
      extension;

    cb(null, fileName);
  }

});


// ================================
// IMAGE FILTER
// ================================

function imageFilter(req, file, cb) {

  const allowedTypes = [

    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif"

  ];

  if (allowedTypes.includes(file.mimetype)) {

    cb(null, true);

  } else {

    cb(
      new Error(
        "Nooca faylkan lama oggola. Fadlan soo geli JPG, PNG, WEBP ama GIF."
      ),
      false
    );

  }

}


// ================================
// MULTER
// ================================

const upload = multer({

  storage: storage,

  limits: {
    fileSize: MAX_IMAGE_SIZE
  },

  fileFilter: imageFilter

});


// ================================
// SYSTEM PROMPT
// ================================

const SYSTEM_PROMPT = `
Waxaad tahay AI caawiye caqli badan oo si fiican ugu jawaaba Af-Soomaali.

Xeerarka muhiimka ah:

1. Su'aal kasta si toos ah oo sax ah uga jawaab.
2. Haddii isticmaaluhu sawir soo diro, si taxaddar leh u falanqee sawirka.
3. Haddii sawir iyo su'aal la isku daro, labadaba faham.
4. Ha iska indho tirin su'aasha isticmaalaha.
5. Haddii qoraal ku jiro sawirka, isku day inaad akhrido oo sharaxdo.
6. Haddii isticmaaluhu yiraahdo "waa maxay kan?" sawirka ka jawaab.
7. Jawaabta ku bixi Af-Soomaali haddii aysan luqad kale codsan.
8. Ha bixin jawaab madhan.
9. Haddii wax aan caddayn ku jiraan sawirka, si daacad ah u sheeg waxa aad arki karto.
10. Jawaabta ka dhig mid faa'iido leh, cad, oo sax ah.
`;


// ================================
// CONVERT IMAGE TO BASE64
// ================================

function imageToBase64(filePath, mimeType) {

  const imageBuffer = fs.readFileSync(filePath);

  const base64 = imageBuffer.toString("base64");

  return `data:${mimeType};base64,${base64}`;

}


// ================================
// EXTRACT AI TEXT
// ================================

function extractAIText(data) {

  try {

    const choices = data?.choices;

    if (!Array.isArray(choices)) {
      return "";
    }

    const message = choices[0]?.message;

    if (!message) {
      return "";
    }

    const content = message.content;

    // Normal text
    if (typeof content === "string") {
      return content.trim();
    }

    // Array response
    if (Array.isArray(content)) {

      return content
        .map((item) => {

          if (typeof item === "string") {
            return item;
          }

          if (item?.text) {
            return item.text;
          }

          if (item?.content) {
            return item.content;
          }

          return "";

        })
        .join("\n")
        .trim();

    }

    return "";

  } catch (error) {

    console.error(
      "EXTRACT AI TEXT ERROR:",
      error.message
    );

    return "";

  }

}


// ================================
// ASK OPENROUTER
// ================================

async function askAI(question, imageFile) {

  if (!OPENROUTER_API_KEY) {

    throw new Error(
      "OPENROUTER_API_KEY lagama helin .env file-ka."
    );

  }


  // =================================
  // USER TEXT
  // =================================

  let userQuestion =
    typeof question === "string"
      ? question.trim()
      : "";


  // Haddii sawir keliya jiro
  if (!userQuestion && imageFile) {

    userQuestion =
      "Fadlan si faahfaahsan ugu sharax sawirkan Af-Soomaali.";

  }


  // Haddii aan su'aal iyo sawir jirin
  if (!userQuestion && !imageFile) {

    throw new Error(
      "Fadlan geli su'aal ama soo geli sawir."
    );

  }


  // =================================
  // TEXT ONLY
  // =================================

  let userContent = userQuestion;


  // =================================
  // IMAGE + TEXT
  // =================================

  if (imageFile) {

    const base64Image = imageToBase64(
      imageFile.path,
      imageFile.mimetype
    );


    userContent = [

      {
        type: "text",
        text: userQuestion
      },

      {
        type: "image_url",

        image_url: {

          url: base64Image

        }

      }

    ];

  }


  // =================================
  // REQUEST BODY
  // =================================

  const requestBody = {

    model: AI_MODEL,

    messages: [

      {
        role: "system",
        content: SYSTEM_PROMPT
      },

      {
        role: "user",
        content: userContent
      }

    ],

    temperature: 0.4,

    max_tokens: 1200,

    stream: false

  };


  // =================================
  // 30 SECOND TIMEOUT
  // =================================

  const controller = new AbortController();

  const timeout = setTimeout(() => {

    controller.abort();

  }, REQUEST_TIMEOUT);


  try {

    const response = await fetch(

      "https://openrouter.ai/api/v1/chat/completions",

      {

        method: "POST",

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
          JSON.stringify(requestBody),

        signal:
          controller.signal

      }

    );


    clearTimeout(timeout);


    // =================================
    // GET RESPONSE
    // =================================

    const data = await response.json();


    // =================================
    // API ERROR
    // =================================

    if (!response.ok) {

      console.error(
        "OPENROUTER ERROR:",
        JSON.stringify(data, null, 2)
      );


      throw new Error(

        data?.error?.message ||

        `AI Error (${response.status})`

      );

    }


    // =================================
    // EXTRACT RESPONSE
    // =================================

    const reply =
      extractAIText(data);


    // =================================
    // EMPTY RESPONSE
    // =================================

    if (!reply || reply.trim() === "") {

      console.error(
        "AI EMPTY RESPONSE:",
        JSON.stringify(data, null, 2)
      );


      return {
        success: false,

        reply:
          "Waan ka xumahay, AI-gu jawaab sax ah ma soo celin. Fadlan isku day mar kale.",

        raw: data
      };

    }


    return {

      success: true,

      reply: reply.trim(),

      raw: data

    };


  } catch (error) {


    clearTimeout(timeout);


    // TIMEOUT
    if (error.name === "AbortError") {

      throw new Error(

        "Codsigu wuxuu ka dheeraaday 30 ilbiriqsi. Fadlan mar kale isku day."

      );

    }


    throw error;

  }

}


// ================================
// POST /chat
// ================================

app.post(

  "/chat",

  upload.single("image"),

  async (req, res) => {

    let uploadedFile = null;

    try {

      const question =
        req.body?.message ||
        req.body?.question ||
        req.body?.text ||
        "";

      const imageFile =
        req.file || null;


      uploadedFile = imageFile;


      // =============================
      // VALIDATION
      // =============================

      if (
        !question.trim() &&
        !imageFile
      ) {

        return res.status(400).json({

          success: false,

          error:
            "Fadlan geli su'aal ama soo geli sawir."

        });

      }


      console.log("================================");
      console.log("📩 NEW CHAT REQUEST");
      console.log("QUESTION:", question);
      console.log(
        "IMAGE:",
        imageFile
          ? imageFile.originalname
          : "No image"
      );
      console.log("================================");


      // =============================
      // ASK AI
      // =============================

      const result =
        await askAI(
          question,
          imageFile
        );


      // =============================
      // SAVE CHAT
      // =============================

      db.run(

        `
        INSERT INTO chats
        (
          question,
          answer,
          image_name
        )

        VALUES (?, ?, ?)
        `,

        [

          question || "Sawir",

          result.reply,

          imageFile
            ? imageFile.filename
            : null

        ],

        function (dbError) {

          if (dbError) {

            console.error(
              "DATABASE SAVE ERROR:",
              dbError.message
            );

          }

        }

      );


      // =============================
      // SUCCESS RESPONSE
      // =============================

      return res.json({

        success:
          result.success,

        reply:
          result.reply,

        message:
          result.reply,

        hasImage:
          !!imageFile

      });


    } catch (error) {

      console.error(
        "CHAT ERROR:",
        error.message
      );


      // =============================
      // ERROR RESPONSE
      // =============================

      return res.status(500).json({

        success: false,

        error:
          error.message ||
          "Cilad ayaa dhacday.",

        reply:
          "Waan ka xumahay, cilad ayaa dhacday. Fadlan mar kale isku day."

      });

    }

  }

);


// ================================
// GET /api/chats
// ================================

app.get(

  "/api/chats",

  (req, res) => {

    db.all(

      `
      SELECT
        id,
        question,
        answer,
        image_name,
        created_at

      FROM chats

      ORDER BY id DESC
      `,

      [],

      (error, rows) => {

        if (error) {

          console.error(
            "GET CHATS ERROR:",
            error.message
          );


          return res.status(500).json({

            success: false,

            error:
              "Chat history lama soo qaadi karo."

          });

        }


        return res.json({

          success: true,

          chats: rows || []

        });

      }

    );

  }

);


// ================================
// DELETE /api/chats
// ================================

app.delete(

  "/api/chats",

  (req, res) => {

    db.run(

      "DELETE FROM chats",

      [],

      function (error) {

        if (error) {

          console.error(
            "DELETE CHATS ERROR:",
            error.message
          );


          return res.status(500).json({

            success: false,

            error:
              "Chat history lama tirtiri karo."

          });

        }


        return res.json({

          success: true,

          message:
            "Dhammaan chat history waa la tirtiray."

        });

      }

    );

  }

);


// ================================
// GET /api/health
// ================================

app.get(

  "/api/health",

  (req, res) => {

    res.status(200).json({

      success: true,

      status: "healthy",

      message:
        "AI Chat Somali server waa shaqaynayaa.",

      aiConfigured:
        !!OPENROUTER_API_KEY,

      model:
        AI_MODEL,

      time:
        new Date().toISOString()

    });

  }

);


// ================================
// ROOT
// ================================

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


// ================================
// 404
// ================================

app.use(

  (req, res) => {

    res.status(404).json({

      success: false,

      error:
        "Endpoint-kan lama helin."

    });

  }

);


// ================================
// MULTER ERROR HANDLER
// ================================

app.use(

  (error, req, res, next) => {

    if (
      error instanceof multer.MulterError
    ) {

      if (
        error.code === "LIMIT_FILE_SIZE"
      ) {

        return res.status(400).json({

          success: false,

          error:
            "Sawirku aad ayuu u weyn yahay. Ugu badnaan 5MB."

        });

      }


      return res.status(400).json({

        success: false,

        error:
          error.message

      });

    }


    if (error) {

      console.error(
        "SERVER ERROR:",
        error.message
      );


      return res.status(500).json({

        success: false,

        error:
          error.message ||
          "Server error."

      });

    }


    next();

  }

);


// ================================
// START SERVER
// ================================

app.listen(

  PORT,

  "0.0.0.0",

  () => {

    console.log("");
    console.log("==============================");
    console.log("🚀 AI CHAT SOMALI RUNNING");
    console.log(`🌐 Port: ${PORT}`);
    console.log(`🤖 Model: ${AI_MODEL}`);
    console.log("❤️ Health: /api/health");
    console.log("==============================");
    console.log("");

  }

);
