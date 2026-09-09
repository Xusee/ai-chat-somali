require("dotenv").config();

const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();


/* =========================================
   CONFIG
========================================= */

const PORT = process.env.PORT || 3000;

const OPENROUTER_API_KEY =
  process.env.OPENROUTER_API_KEY;

const OPENROUTER_MODEL =
  process.env.OPENROUTER_MODEL ||
  "google/gemma-3-12b-it:free";

const MAX_IMAGE_SIZE =
  5 * 1024 * 1024; // 5MB

const AI_TIMEOUT =
  30000; // 30 seconds

const CHAT_FILE =
  path.join(__dirname, "chats.json");


/* =========================================
   MIDDLEWARE
========================================= */

app.use(cors());

app.use(express.json({
  limit: "12mb"
}));

app.use(express.urlencoded({
  extended: true,
  limit: "12mb"
}));

app.use(
  express.static(
    path.join(__dirname, "public")
  )
);


/* =========================================
   CREATE chats.json
========================================= */

if (!fs.existsSync(CHAT_FILE)) {

  fs.writeFileSync(
    CHAT_FILE,
    JSON.stringify([], null, 2),
    "utf8"
  );

}


/* =========================================
   READ CHAT HISTORY
========================================= */

function readChats() {

  try {

    const data =
      fs.readFileSync(
        CHAT_FILE,
        "utf8"
      );

    const chats =
      JSON.parse(data || "[]");

    return Array.isArray(chats)
      ? chats
      : [];

  } catch (error) {

    console.error(
      "Chat read error:",
      error.message
    );

    return [];

  }

}


/* =========================================
   SAVE CHAT HISTORY
========================================= */

function saveChats(chats) {

  try {

    fs.writeFileSync(
      CHAT_FILE,
      JSON.stringify(
        chats,
        null,
        2
      ),
      "utf8"
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


/* =========================================
   VALIDATE IMAGE
========================================= */

function validateImage(image) {

  if (!image) {

    return {
      valid: true
    };

  }


  if (
    typeof image !== "string"
  ) {

    return {
      valid: false,
      error:
        "Sawirka la soo diray ma aha format sax ah."
    };

  }


  const allowedTypes = [

    "data:image/jpeg;base64,",
    "data:image/jpg;base64,",
    "data:image/png;base64,",
    "data:image/webp;base64,",
    "data:image/gif;base64,"

  ];


  const validType =
    allowedTypes.some(
      type =>
        image.startsWith(type)
    );


  if (!validType) {

    return {
      valid: false,
      error:
        "Fadlan geli sawir JPG, PNG, WEBP ama GIF."
    };

  }


  const base64 =
    image.split(",")[1];


  if (!base64) {

    return {
      valid: false,
      error:
        "Sawirka lama akhrin karin."
    };

  }


  const size =
    Buffer.byteLength(
      base64,
      "base64"
    );


  if (
    size > MAX_IMAGE_SIZE
  ) {

    return {
      valid: false,
      error:
        "Sawirka aad ayuu u weyn yahay. Cabbirka ugu badan waa 5MB."
    };

  }


  return {
    valid: true,
    size
  };

}


/* =========================================
   FETCH WITH 30 SECOND TIMEOUT
========================================= */

async function fetchWithTimeout(
  url,
  options,
  timeout = AI_TIMEOUT
) {

  const controller =
    new AbortController();


  const timeoutId =
    setTimeout(() => {

      controller.abort();

    }, timeout);


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

    clearTimeout(
      timeoutId
    );

  }

}


/* =========================================
   GET AI ANSWER
========================================= */

async function askAI(
  message,
  image
) {

  if (!OPENROUTER_API_KEY) {

    throw new Error(
      "OPENROUTER_API_KEY lama helin. Fadlan ku dar Environment Variables."
    );

  }


  const userContent = [];


  /* IMAGE ONLY */

  if (
    image &&
    !message
  ) {

    userContent.push({
      type: "text",

      text:
        "Fadlan sawirkan si fiican ugu sharax Af-Soomaali. Sheeg waxa ka muuqda sawirka iyo waxyaabaha muhiimka ah."
    });

  }


  /* TEXT */

  if (
    message &&
    message.trim()
  ) {

    userContent.push({

      type: "text",

      text:
        message.trim()

    });

  }


  /* IMAGE */

  if (image) {

    userContent.push({

      type: "image_url",

      image_url: {
        url: image
      }

    });

  }


  const requestBody = {

    model:
      OPENROUTER_MODEL,

    messages: [

      {

        role:
          "system",

        content: `
Waxaad tahay AI Chat Somali, caawiye caqli badan.

Xeerarka muhiimka ah:

- Ku jawaab Af-Soomaali cad oo dabiici ah.
- Faham su'aasha isticmaalaha ka hor intaadan jawaabin.
- HA ku celin su'aasha isticmaalaha jawaab ahaan.
- Bixi jawaab waxtar leh oo toos ah.
- Haddii sawir jiro, si taxaddar leh u falanqee.
- Haddii sawir iyo su'aal jiraan, labadaba faham oo isku xir.
- Haddii sawir keliya jiro, ku sharax Af-Soomaali.
- Ha bixin jawaab madhan.
- Haddii aadan wax hubin, sheeg inaadan hubin.
- Jawaabaha ka dhig kuwo saaxiibtinimo leh.
`
      },

      {

        role:
          "user",

        content:
          userContent

      }

    ]

  };


  console.log(
    "🤖 AI Request:",
    {
      hasMessage:
        Boolean(message),

      hasImage:
        Boolean(image),

      model:
        OPENROUTER_MODEL
    }
  );


  const response =
    await fetchWithTimeout(

      "https://openrouter.ai/api/v1/chat/completions",

      {

        method:
          "POST",

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

        body:
          JSON.stringify(
            requestBody
          )

      }

    );


  let data;


  try {

    data =
      await response.json();

  } catch (error) {

    throw new Error(
      "AI server-ka jawaab sax ah ma soo celin."
    );

  }


  if (!response.ok) {

    console.error(
      "OpenRouter Error:",
      JSON.stringify(
        data,
        null,
        2
      )
    );


    const errorMessage =
      data?.error?.message ||
      `AI server error: ${response.status}`;


    throw new Error(
      errorMessage
    );

  }


  let answer =
    data
      ?.choices?.[0]
      ?.message
      ?.content;


  /* HANDLE ARRAY RESPONSE */

  if (
    Array.isArray(answer)
  ) {

    answer =
      answer
        .map(item =>
          item?.text || ""
        )
        .join("\n");

  }


  /* EMPTY RESPONSE FALLBACK */

  if (
    !answer ||
    typeof answer !== "string" ||
    answer.trim().length < 1
  ) {

    return (
      "Waan ka xumahay, AI-gu jawaab sax ah ma soo celin. " +
      "Fadlan isku day mar kale."
    );

  }


  return answer.trim();

}


/* =========================================
   POST /chat
========================================= */

app.post(
  "/chat",

  async (req, res) => {

    try {

      const {
        message,
        image
      } = req.body;


      const cleanMessage =
        typeof message === "string"
          ? message.trim()
          : "";


      /* NO MESSAGE */

      if (
        !cleanMessage &&
        !image
      ) {

        return res
          .status(400)
          .json({

            success: false,

            error:
              "Fadlan qor su'aal ama soo geli sawir."

          });

      }


      /* VALIDATE IMAGE */

      const imageValidation =
        validateImage(
          image
        );


      if (
        !imageValidation.valid
      ) {

        return res
          .status(400)
          .json({

            success: false,

            error:
              imageValidation.error

          });

      }


      console.log(
        "💬 New Chat:",
        cleanMessage ||
        "[Sawir keliya]"
      );


      /* ASK AI */

      const answer =
        await askAI(
          cleanMessage,
          image
        );


      /* SAVE CHAT */

      const chats =
        readChats();


      const chat = {

        id:
          Date.now(),

        message:
          cleanMessage,

        image:
          image || null,

        answer,

        createdAt:
          new Date().toISOString()

      };


      chats.unshift(
        chat
      );


      /* MAX 100 CHATS */

      const limitedChats =
        chats.slice(
          0,
          100
        );


      saveChats(
        limitedChats
      );


      return res.json({

        success: true,

        answer,

        chat: {

          id:
            chat.id,

          createdAt:
            chat.createdAt

        }

      });


    } catch (error) {

      console.error(
        "❌ CHAT ERROR:",
        error
      );


      if (
        error.name ===
        "AbortError"
      ) {

        return res
          .status(504)
          .json({

            success: false,

            error:
              "⏳ AI-gu kama jawaabin 30 ilbiriqsi gudahood. Fadlan isku day mar kale."

          });

      }


      return res
        .status(500)
        .json({

          success: false,

          error:
            error.message ||
            "Wax khalad ah ayaa dhacay."

        });

    }

  }

);


/* =========================================
   GET /api/chats
========================================= */

app.get(
  "/api/chats",

  (req, res) => {

    try {

      const chats =
        readChats();


      return res.json({

        success: true,

        total:
          chats.length,

        chats

      });

    } catch (error) {

      return res
        .status(500)
        .json({

          success: false,

          error:
            "Chat history lama heli karo."

        });

    }

  }

);


/* =========================================
   DELETE /api/chats
========================================= */

app.delete(
  "/api/chats",

  (req, res) => {

    try {

      saveChats(
        []
      );


      return res.json({

        success: true,

        message:
          "Chat history waa la tirtiray."

      });

    } catch (error) {

      return res
        .status(500)
        .json({

          success: false,

          error:
            "Chat history lama tirtiri karin."

        });

    }

  }

);


/* =========================================
   GET /api/health
========================================= */

app.get(
  "/api/health",

  (req, res) => {

    return res.status(200).json({

      success: true,

      status:
        "healthy",

      message:
        "AI Chat Somali server-ka wuu shaqaynayaa.",

      model:
        OPENROUTER_MODEL,

      timestamp:
        new Date().toISOString()

    });

  }

);


/* =========================================
   HOME PAGE
========================================= */

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


/* =========================================
   START SERVER
========================================= */

app.listen(
  PORT,

  () => {

    console.log("");
    console.log("=================================");
    console.log("🤖 AI CHAT SOMALI");
    console.log("=================================");
    console.log(
      `🌐 Port: ${PORT}`
    );
    console.log(
      `🧠 Model: ${OPENROUTER_MODEL}`
    );
    console.log(
      "❤️ Health: /api/health"
    );
    console.log("=================================");
    console.log("");

  }

);
