require("dotenv").config();

const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const app = express();

/* =====================================================
   CONFIG
===================================================== */

const PORT = process.env.PORT || 3000;

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

const OPENROUTER_URL =
  "https://openrouter.ai/api/v1/chat/completions";

const AI_MODEL =
  process.env.AI_MODEL || "google/gemini-2.5-flash";

const TIMEOUT_MS = 30000;

// 10MB
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;


/* =====================================================
   MIDDLEWARE
===================================================== */

app.use(cors());

app.use(express.json({
  limit: "15mb"
}));

app.use(express.urlencoded({
  extended: true,
  limit: "15mb"
}));

app.use(express.static(path.join(__dirname, "public")));


/* =====================================================
   MULTER IMAGE UPLOAD
===================================================== */

const storage = multer.memoryStorage();

const upload = multer({
  storage,

  limits: {
    fileSize: MAX_IMAGE_SIZE
  },

  fileFilter: (req, file, cb) => {

    if (!file.mimetype.startsWith("image/")) {

      return cb(
        new Error(
          "Faylkan sawir ma aha. Fadlan geli JPG, PNG, WEBP ama GIF."
        )
      );
    }

    cb(null, true);
  }
});


/* =====================================================
   CHAT STORAGE
===================================================== */

const DATA_DIR = path.join(__dirname, "data");

const CHAT_FILE = path.join(
  DATA_DIR,
  "chats.json"
);


function ensureDataFolder() {

  if (!fs.existsSync(DATA_DIR)) {

    fs.mkdirSync(DATA_DIR, {
      recursive: true
    });

  }

  if (!fs.existsSync(CHAT_FILE)) {

    fs.writeFileSync(
      CHAT_FILE,
      JSON.stringify([], null, 2)
    );

  }

}


function getChats() {

  try {

    ensureDataFolder();

    const data = fs.readFileSync(
      CHAT_FILE,
      "utf8"
    );

    return JSON.parse(data || "[]");

  } catch (error) {

    console.error(
      "Chat read error:",
      error.message
    );

    return [];

  }

}


function saveChats(chats) {

  try {

    ensureDataFolder();

    fs.writeFileSync(
      CHAT_FILE,
      JSON.stringify(chats, null, 2)
    );

    return true;

  } catch (error) {

    console.error(
      "Chat save error:",
      error.message
    );

    return false;

  }

}


function addChat(
  userMessage,
  aiMessage,
  hasImage = false
) {

  const chats = getChats();

  const chat = {

    id:
      Date.now().toString() +
      "-" +
      Math.random()
        .toString(36)
        .substring(2, 8),

    user: userMessage,

    assistant: aiMessage,

    hasImage,

    createdAt:
      new Date().toISOString()

  };


  chats.unshift(chat);

  // Kaydi ugu badnaan 100 chat
  const latestChats =
    chats.slice(0, 100);

  saveChats(latestChats);

  return chat;

}


/* =====================================================
   IMAGE VALIDATION
===================================================== */

function isValidBase64Image(value) {

  if (!value) {
    return false;
  }

  if (
    typeof value !== "string"
  ) {
    return false;
  }

  return value.startsWith(
    "data:image/"
  );

}


function getBase64ImageSize(dataUrl) {

  try {

    const base64 =
      dataUrl.split(",")[1];

    if (!base64) {
      return 0;
    }

    return Buffer
      .from(base64, "base64")
      .length;

  } catch {

    return 0;

  }

}


function getImageMimeType(
  dataUrl
) {

  try {

    const match =
      dataUrl.match(
        /^data:(image\/[a-zA-Z0-9.+-]+);base64,/
      );

    return match
      ? match[1]
      : "image/jpeg";

  } catch {

    return "image/jpeg";

  }

}


/* =====================================================
   FILE IMAGE -> BASE64
===================================================== */

function uploadedFileToDataUrl(file) {

  if (!file) {
    return null;
  }

  const base64 =
    file.buffer.toString("base64");

  return `data:${file.mimetype};base64,${base64}`;

}


/* =====================================================
   FETCH WITH 30 SECOND TIMEOUT
===================================================== */

async function fetchWithTimeout(
  url,
  options,
  timeout = TIMEOUT_MS
) {

  const controller =
    new AbortController();

  const timer =
    setTimeout(
      () => controller.abort(),
      timeout
    );

  try {

    const response =
      await fetch(
        url,
        {
          ...options,
          signal:
            controller.signal
        }
      );

    return response;

  } finally {

    clearTimeout(timer);

  }

}


/* =====================================================
   AI REQUEST
===================================================== */

async function askAI(
  message,
  imageDataUrl = null
) {

  if (!OPENROUTER_API_KEY) {

    throw new Error(
      "OPENROUTER_API_KEY lama helin. Fadlan ku dar Environment Variables."
    );

  }


  const systemPrompt = `
Waxaad tahay AI caawiye caqli badan oo loogu talagalay AI Chat Somali.

Xeerarkaaga:

1. Su'aal kasta si sax ah oo waxtar leh uga jawaab.
2. Jawaabaha ugu muhiimsan ku bixi Af-Soomaali.
3. Haddii su'aashu u baahan tahay sharaxaad, si cad u sharax.
4. Haddii sawir keliya laguu soo diro, si faahfaahsan ugu sharax sawirka Af-Soomaali.
5. Haddii sawir iyo su'aal wada socdaan, sawirka iyo su'aasha labadaba falanqee.
6. Ha iska dhigin inaad wax aragtay haddii sawirka aan laguu soo dirin.
7. Haddii su'aashu aanay caddayn, isku day inaad fahanto macnaha ugu macquulsan.
8. Jawaabta ha noqon mid madhan.
9. Jawaabta ka dhig mid dabiici ah, sax ah oo si fudud loo fahmi karo.
`;


  let userContent;


  /* ==============================
     IMAGE + TEXT
  ============================== */

  if (imageDataUrl) {

    userContent = [

      {
        type: "text",

        text:
          message && message.trim()
            ? message
            : "Fadlan sawirkan si faahfaahsan ugu sharax Af-Soomaali."
      },

      {
        type: "image_url",

        image_url: {
          url: imageDataUrl
        }
      }

    ];

  }


  /* ==============================
     TEXT ONLY
  ============================== */

  else {

    userContent =
      message;

  }


  const response =
    await fetchWithTimeout(

      OPENROUTER_URL,

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
          JSON.stringify({

            model:
              AI_MODEL,

            messages: [

              {
                role: "system",

                content:
                  systemPrompt
              },

              {
                role: "user",

                content:
                  userContent
              }

            ],

            temperature: 0.4,

            max_tokens: 1500

          })

      },

      TIMEOUT_MS

    );


  let data;


  try {

    data =
      await response.json();

  } catch {

    throw new Error(
      "AI server-ka jawaab sax ah ma soo celin."
    );

  }


  /* ==============================
     OPENROUTER ERROR
  ============================== */

  if (!response.ok) {

    console.error(
      "AI API Error:",
      JSON.stringify(data)
    );

    const errorMessage =
      data?.error?.message ||
      data?.message ||
      "AI server-ka qalad ayaa ka dhacay.";

    throw new Error(
      errorMessage
    );

  }


  /* ==============================
     EXTRACT RESPONSE
  ============================== */

  let answer =
    data?.choices?.[0]?.message?.content;


  if (
    Array.isArray(answer)
  ) {

    answer =
      answer
        .map(item =>
          typeof item === "string"
            ? item
            : item?.text || ""
        )
        .join("\n");

  }


  if (
    !answer ||
    typeof answer !== "string" ||
    answer.trim().length === 0
  ) {

    answer =
      imageDataUrl
        ? "Waxaan helay sawirkaaga, laakiin AI-gu jawaab buuxda ma soo celin. Fadlan isku day mar kale ama soo geli sawirka mar kale."
        : "Waan helay su'aashaada, laakiin AI-gu jawaab ma soo celin. Fadlan isku day mar kale.";

  }


  return answer.trim();

}


/* =====================================================
   POST /chat
===================================================== */

/*

Waxay aqbashaa:

JSON:

{
  "message": "Salaan",
  "image": "data:image/jpeg;base64,..."
}


AMA multipart/form-data:

message = Salaan
image = file

*/

app.post(
  "/chat",

  upload.single("image"),

  async (req, res) => {

    try {

      let message =
        req.body.message ||
        req.body.question ||
        req.body.prompt ||
        "";


      let imageDataUrl =
        req.body.image ||
        req.body.imageUrl ||
        null;


      /* ==============================
         FILE IMAGE
      ============================== */

      if (req.file) {

        if (
          req.file.size >
          MAX_IMAGE_SIZE
        ) {

          return res
            .status(413)
            .json({

              success: false,

              error:
                "Sawirku aad ayuu u weyn yahay. Cabbirka ugu badan waa 10MB."

            });

        }


        imageDataUrl =
          uploadedFileToDataUrl(
            req.file
          );

      }


      /* ==============================
         BASE64 IMAGE VALIDATION
      ============================== */

      if (imageDataUrl) {

        if (
          !isValidBase64Image(
            imageDataUrl
          )
        ) {

          return res
            .status(400)
            .json({

              success: false,

              error:
                "Sawirka la soo diray ma aha image sax ah."

            });

        }


        const imageSize =
          getBase64ImageSize(
            imageDataUrl
          );


        if (
          imageSize >
          MAX_IMAGE_SIZE
        ) {

          return res
            .status(413)
            .json({

              success: false,

              error:
                "Sawirku aad ayuu u weyn yahay. Cabbirka ugu badan waa 10MB."

            });

        }

      }


      /* ==============================
         EMPTY REQUEST
      ============================== */

      if (
        !message.trim() &&
        !imageDataUrl
      ) {

        return res
          .status(400)
          .json({

            success: false,

            error:
              "Fadlan qor su'aal ama geli sawir."

          });

      }


      /* ==============================
         IMAGE ONLY DEFAULT MESSAGE
      ============================== */

      if (
        !message.trim() &&
        imageDataUrl
      ) {

        message =
          "Fadlan sawirkan si faahfaahsan ugu sharax Af-Soomaali.";

      }


      console.log(
        "Chat request:",
        {
          messageLength:
            message.length,

          hasImage:
            !!imageDataUrl
        }
      );


      /* ==============================
         ASK AI
      ============================== */

      const answer =
        await askAI(
          message,
          imageDataUrl
        );


      /* ==============================
         SAVE CHAT
      ============================== */

      const savedChat =
        addChat(

          message,

          answer,

          !!imageDataUrl

        );


      return res.json({

        success: true,

        message,

        response:
          answer,

        answer,

        chat:
          savedChat

      });

    }


    /* ==============================
       TIMEOUT
    ============================== */

    catch (error) {

      console.error(
        "CHAT ERROR:",
        error
      );


      if (
        error.name === "AbortError"
      ) {

        return res
          .status(504)
          .json({

            success: false,

            error:
              "AI-gu wuxuu ka jawaabi waayay 30 ilbiriqsi gudahood. Fadlan mar kale isku day."

          });

      }


      /* ==============================
         MULTER SIZE ERROR
      ============================== */

      if (
        error.code ===
        "LIMIT_FILE_SIZE"
      ) {

        return res
          .status(413)
          .json({

            success: false,

            error:
              "Sawirku aad ayuu u weyn yahay. Cabbirka ugu badan waa 10MB."

          });

      }


      return res
        .status(500)
        .json({

          success: false,

          error:
            error.message ||
            "Qalad lama filaan ah ayaa dhacay."

        });

    }

  }

);


/* =====================================================
   GET /api/chats
===================================================== */

app.get(
  "/api/chats",

  (req, res) => {

    try {

      const chats =
        getChats();

      res.json({

        success: true,

        count:
          chats.length,

        chats

      });

    } catch (error) {

      res
        .status(500)
        .json({

          success: false,

          error:
            "Chat history lama heli karo."

        });

    }

  }

);


/* =====================================================
   DELETE /api/chats
===================================================== */

app.delete(
  "/api/chats",

  (req, res) => {

    try {

      const success =
        saveChats([]);

      if (!success) {

        throw new Error(
          "Database save error"
        );

      }


      res.json({

        success: true,

        message:
          "Dhammaan chat history waa la tirtiray."

      });

    } catch (error) {

      res
        .status(500)
        .json({

          success: false,

          error:
            "Chat history lama tirtiri karin."

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

      success: true,

      status:
        "healthy",

      message:
        "AI Chat Somali server-ka si fiican ayuu u shaqaynayaa.",

      timestamp:
        new Date().toISOString(),

      aiConfigured:
        !!OPENROUTER_API_KEY,

      model:
        AI_MODEL

    });

  }

);


/* =====================================================
   ROOT
===================================================== */

app.get(
  "/",

  (req, res) => {

    const indexPath =
      path.join(
        __dirname,
        "public",
        "index.html"
      );


    if (
      fs.existsSync(
        indexPath
      )
    ) {

      return res.sendFile(
        indexPath
      );

    }


    res.json({

      success: true,

      message:
        "AI Chat Somali API waa shaqaynayaa."

    });

  }

);


/* =====================================================
   404
===================================================== */

app.use(
  (req, res) => {

    res
      .status(404)
      .json({

        success: false,

        error:
          "Endpoint-kan lama helin."

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
      "GLOBAL ERROR:",
      error
    );


    if (
      error.code ===
      "LIMIT_FILE_SIZE"
    ) {

      return res
        .status(413)
        .json({

          success: false,

          error:
            "Sawirku wuxuu ka weyn yahay 10MB."

        });

    }


    res
      .status(500)
      .json({

        success: false,

        error:
          error.message ||
          "Server error ayaa dhacay."

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
      "===================================="
    );

    console.log(
      "🤖 AI Chat Somali Server Started"
    );

    console.log(
      `🌐 Port: ${PORT}`
    );

    console.log(
      `💬 AI Model: ${AI_MODEL}`
    );

    console.log(
      `🔑 API Key: ${
        OPENROUTER_API_KEY
          ? "READY"
          : "MISSING"
      }`
    );

    console.log(
      `⏳ Timeout: ${
        TIMEOUT_MS / 1000
      } seconds`
    );

    console.log(
      "===================================="
    );

  }

);
