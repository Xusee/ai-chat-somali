require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const OpenAI = require("openai");
const sqlite3 = require("sqlite3").verbose();
const sharp = require("sharp");

const app = express();

/* =====================================================
   CONFIG
===================================================== */

const PORT = Number(process.env.PORT || 3000);

const APP_URL =
  process.env.APP_URL ||
  `http://localhost:${PORT}`;

const JWT_SECRET =
  process.env.JWT_SECRET ||
  "CHANGE_THIS_SECRET";

const ADMIN_EMAIL =
  process.env.ADMIN_EMAIL ||
  "admin@nasiib.com";

const ADMIN_PASSWORD =
  process.env.ADMIN_PASSWORD ||
  "123456";

const OPENROUTER_API_KEY =
  process.env.OPENROUTER_API_KEY || "";

const AI_MODEL =
  process.env.AI_MODEL ||
  "openrouter/free";

const VISION_MODEL =
  process.env.VISION_MODEL ||
  "google/gemini-2.5-flash";

const TRANSCRIPTION_MODEL =
  process.env.TRANSCRIPTION_MODEL ||
  "openai/whisper-1";

/* =====================================================
   DIRECTORIES
===================================================== */

const ROOT = __dirname;

const PUBLIC_DIR =
  path.join(ROOT, "public");

const UPLOAD_DIR =
  path.join(ROOT, "uploads");

const KNOWLEDGE_DIR =
  path.join(UPLOAD_DIR, "knowledge");

const DATABASE_DIR =
  path.join(ROOT, "database");

const DB_FILE =
  path.join(
    DATABASE_DIR,
    "database.sqlite"
  );

[
  PUBLIC_DIR,
  UPLOAD_DIR,
  KNOWLEDGE_DIR,
  DATABASE_DIR
].forEach((dir) => {
  fs.mkdirSync(dir, {
    recursive: true
  });
});

/* =====================================================
   EXPRESS
===================================================== */

app.use(cors());

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

app.use(
  express.static(PUBLIC_DIR)
);

app.use(
  "/uploads",
  express.static(UPLOAD_DIR)
);

/* =====================================================
   OPENROUTER
===================================================== */

const openrouter =
  OPENROUTER_API_KEY
    ? new OpenAI({
        baseURL:
          "https://openrouter.ai/api/v1",

        apiKey:
          OPENROUTER_API_KEY,

        defaultHeaders: {
          "HTTP-Referer": APP_URL,
          "X-Title":
            "NASIIB BUSINESS CENTER"
        }
      })
    : null;

if (!OPENROUTER_API_KEY) {
  console.warn(
    "⚠️ OPENROUTER_API_KEY lama dejin."
  );
}

/* =====================================================
   SQLITE
===================================================== */

const db =
  new sqlite3.Database(DB_FILE);

function run(sql, params = []) {
  return new Promise(
    (resolve, reject) => {
      db.run(
        sql,
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

function get(sql, params = []) {
  return new Promise(
    (resolve, reject) => {
      db.get(
        sql,
        params,
        (error, row) => {
          if (error) {
            reject(error);
          } else {
            resolve(
              row || null
            );
          }
        }
      );
    }
  );
}

function all(sql, params = []) {
  return new Promise(
    (resolve, reject) => {
      db.all(
        sql,
        params,
        (error, rows) => {
          if (error) {
            reject(error);
          } else {
            resolve(
              rows || []
            );
          }
        }
      );
    }
  );
}

/* =====================================================
   HASH
===================================================== */

function sha256(buffer) {
  return crypto
    .createHash("sha256")
    .update(buffer)
    .digest("hex");
}

/* =====================================================
   HEER 2
   PERCEPTUAL IMAGE HASH
===================================================== */

async function makePHash(buffer) {
  const result =
    await sharp(buffer)
      .rotate()
      .resize(32, 32, {
        fit: "fill"
      })
      .grayscale()
      .raw()
      .toBuffer({
        resolveWithObject: true
      });

  const data =
    result.data;

  let total = 0;

  for (const pixel of data) {
    total += pixel;
  }

  const average =
    total / data.length;

  let bits = "";

  for (const pixel of data) {
    bits +=
      pixel >= average
        ? "1"
        : "0";
  }

  const bytes = [];

  for (
    let i = 0;
    i < bits.length;
    i += 8
  ) {
    bytes.push(
      parseInt(
        bits.slice(i, i + 8),
        2
      )
    );
  }

  return Buffer
    .from(bytes)
    .toString("hex");
}

/* =====================================================
   HAMMING DISTANCE
===================================================== */

function hammingDistance(
  hashA,
  hashB
) {
  if (
    !hashA ||
    !hashB ||
    hashA.length !== hashB.length
  ) {
    return Infinity;
  }

  const A =
    Buffer.from(
      hashA,
      "hex"
    );

  const B =
    Buffer.from(
      hashB,
      "hex"
    );

  let distance = 0;

  for (
    let i = 0;
    i < A.length;
    i++
  ) {
    let value =
      A[i] ^ B[i];

    while (value) {
      distance +=
        value & 1;

      value >>= 1;
    }
  }

  return distance;
}

/*
   0   = isku mid
   yar = aad isugu dhow
   weyn = kala duwan
*/

const PHASH_THRESHOLD =
  Number(
    process.env.PHASH_THRESHOLD ||
      170
  );

/* =====================================================
   FILE HELPERS
===================================================== */

function safeFileName(value) {
  return path.basename(
    value || ""
  );
}

function uploadUrl(
  filename
) {
  return (
    "/uploads/knowledge/" +
    encodeURIComponent(
      filename
    )
  );
}

function deleteFileByUrl(
  url
) {
  if (!url) return;

  try {
    const filename =
      safeFileName(url);

    if (!filename) return;

    const filePath =
      path.join(
        KNOWLEDGE_DIR,
        filename
      );

    if (
      fs.existsSync(filePath)
    ) {
      fs.unlinkSync(
        filePath
      );
    }
  } catch (error) {
    console.warn(
      "File delete error:",
      error.message
    );
  }
}

/* =====================================================
   MULTER
===================================================== */

const knowledgeStorage =
  multer.diskStorage({
    destination:
      (_req, _file, cb) => {
        cb(
          null,
          KNOWLEDGE_DIR
        );
      },

    filename:
      (_req, file, cb) => {
        const ext =
          path.extname(
            file.originalname ||
              ""
          )
            .toLowerCase()
            .replace(
              /[^a-z0-9.]/g,
              ""
            ) || ".bin";

        const filename =
          `knowledge-${Date.now()}-${crypto
            .randomBytes(5)
            .toString("hex")}${ext}`;

        cb(
          null,
          filename
        );
      }
  });

const knowledgeUpload =
  multer({
    storage:
      knowledgeStorage,

    limits: {
      fileSize:
        25 * 1024 * 1024
    },

    fileFilter:
      (_req, file, cb) => {
        if (
          file.mimetype.startsWith(
            "image/"
          ) ||
          file.mimetype.startsWith(
            "audio/"
          )
        ) {
          cb(null, true);
        } else {
          cb(
            new Error(
              "Kaliya sawir ama cod ayaa la oggol yahay."
            )
          );
        }
      }
  });

const imageUpload =
  multer({
    storage:
      multer.memoryStorage(),

    limits: {
      fileSize:
        10 * 1024 * 1024
    },

    fileFilter:
      (_req, file, cb) => {
        if (
          file.mimetype.startsWith(
            "image/"
          )
        ) {
          cb(null, true);
        } else {
          cb(
            new Error(
              "Fadlan sawir geli."
            )
          );
        }
      }
  });

const audioUpload =
  multer({
    storage:
      multer.memoryStorage(),

    limits: {
      fileSize:
        25 * 1024 * 1024
    },

    fileFilter:
      (_req, file, cb) => {
        if (
          file.mimetype.startsWith(
            "audio/"
          )
        ) {
          cb(null, true);
        } else {
          cb(
            new Error(
              "Fadlan cod geli."
            )
          );
        }
      }
  });

/* =====================================================
   DATABASE INIT
===================================================== */

async function initDatabase() {

  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      created_at DATETIME
        DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS chats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id TEXT NOT NULL,
      user_id INTEGER,
      message TEXT,
      image TEXT,
      image_url TEXT,
      response TEXT,
      created_at DATETIME
        DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS knowledge (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT,
      content TEXT,
      image_url TEXT,
      audio_url TEXT,
      image_hash TEXT,
      image_phash TEXT,
      created_at DATETIME
        DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME
        DEFAULT CURRENT_TIMESTAMP
    )
  `);

  /* ===================================================
     MIGRATIONS
  =================================================== */

  const chatColumns =
    await all(
      "PRAGMA table_info(chats)"
    );

  if (
    !chatColumns.some(
      (column) =>
        column.name ===
        "image_url"
    )
  ) {
    await run(
      "ALTER TABLE chats ADD COLUMN image_url TEXT"
    );
  }

  const knowledgeColumns =
    await all(
      "PRAGMA table_info(knowledge)"
    );

  if (
    !knowledgeColumns.some(
      (column) =>
        column.name ===
        "image_hash"
    )
  ) {
    await run(
      "ALTER TABLE knowledge ADD COLUMN image_hash TEXT"
    );
  }

  if (
    !knowledgeColumns.some(
      (column) =>
        column.name ===
        "image_phash"
    )
  ) {
    await run(
      "ALTER TABLE knowledge ADD COLUMN image_phash TEXT"
    );
  }

  await run(`
    CREATE INDEX IF NOT EXISTS
    idx_knowledge_image_hash
    ON knowledge(image_hash)
  `);

  await run(`
    CREATE INDEX IF NOT EXISTS
    idx_knowledge_image_phash
    ON knowledge(image_phash)
  `);

  /* ===================================================
     BACKFILL HASHES
  =================================================== */

  const images =
    await all(`
      SELECT
        id,
        image_url,
        image_hash,
        image_phash
      FROM knowledge
      WHERE image_url IS NOT NULL
        AND image_url != ''
    `);

  for (
    const row of images
  ) {
    try {
      const filename =
        safeFileName(
          row.image_url
        );

      const filePath =
        path.join(
          KNOWLEDGE_DIR,
          filename
        );

      if (
        !fs.existsSync(
          filePath
        )
      ) {
        continue;
      }

      const buffer =
        fs.readFileSync(
          filePath
        );

      const exactHash =
        row.image_hash ||
        sha256(buffer);

      const perceptualHash =
        row.image_phash ||
        await makePHash(
          buffer
        );

      await run(
        `
        UPDATE knowledge
        SET
          image_hash = ?,
          image_phash = ?
        WHERE id = ?
        `,
        [
          exactHash,
          perceptualHash,
          row.id
        ]
      );
    } catch (error) {
      console.warn(
        "Hash error:",
        error.message
      );
    }
  }
}

/* =====================================================
   DEFAULT ADMIN
===================================================== */

async function createDefaultAdmin() {

  const existing =
    await get(
      `
      SELECT id
      FROM users
      WHERE email = ?
      `,
      [ADMIN_EMAIL]
    );

  if (existing) {
    return;
  }

  const passwordHash =
    await bcrypt.hash(
      ADMIN_PASSWORD,
      10
    );

  await run(
    `
    INSERT INTO users (
      email,
      password,
      role
    )
    VALUES (?, ?, 'admin')
    `,
    [
      ADMIN_EMAIL,
      passwordHash
    ]
  );

  console.log(
    `👨‍💼 Admin created: ${ADMIN_EMAIL}`
  );
}

/* =====================================================
   JWT ADMIN MIDDLEWARE
===================================================== */

async function requireAdmin(
  req,
  res,
  next
) {
  try {

    const authorization =
      req.headers.authorization ||
      "";

    if (
      !authorization.startsWith(
        "Bearer "
      )
    ) {
      return res
        .status(401)
        .json({
          success: false,
          error:
            "Admin login ayaa loo baahan yahay."
        });
    }

    const token =
      authorization.slice(7);

    const decoded =
      jwt.verify(
        token,
        JWT_SECRET
      );

    const adminUser =
      await get(
        `
        SELECT
          id,
          email,
          role
        FROM users
        WHERE id = ?
        `,
        [decoded.id]
      );

    if (
      !adminUser ||
      adminUser.role !==
        "admin"
    ) {
      return res
        .status(403)
        .json({
          success: false,
          error:
            "Admin access denied."
        });
    }

    req.admin =
      adminUser;

    next();

  } catch (error) {

    return res
      .status(401)
      .json({
        success: false,
        error:
          "JWT token-ka Admin-ka waa khalad ama wuu dhacay."
      });
  }
}

/* =====================================================
   API HEALTH
===================================================== */

app.get(
  "/api/health",
  async (_req, res) => {

    try {

      await get(
        "SELECT 1"
      );

      res.json({
        success: true,
        online: true,
        app:
          "NASIIB BUSINESS CENTER",

        publicUser: true,

        loginRequiredForChat:
          false,

        sqlite: true,

        openrouter:
          Boolean(
            OPENROUTER_API_KEY
          ),

        aiModel:
          AI_MODEL,

        visionModel:
          VISION_MODEL,

        exactMatch:
          true,

        similarMatch:
          true,

        visionOCR:
          true,

        phashThreshold:
          PHASH_THRESHOLD
      });

    } catch (error) {

      res
        .status(500)
        .json({
          success: false,
          sqlite: false,
          error:
            error.message
        });
    }
  }
);

/* =====================================================
   ADMIN LOGIN
   PUBLIC CHAT LOGIN UMA BAAHNA
===================================================== */

app.post(
  "/api/login",
  async (req, res) => {

    try {

      const email =
        String(
          req.body.email ||
            ""
        )
          .trim()
          .toLowerCase();

      const password =
        String(
          req.body.password ||
            ""
        );

      if (
        !email ||
        !password
      ) {
        return res
          .status(400)
          .json({
            success: false,
            error:
              "Email iyo password geli."
          });
      }

      const user =
        await get(
          `
          SELECT *
          FROM users
          WHERE email = ?
          `,
          [email]
        );

      if (
        !user ||
        user.role !==
          "admin"
      ) {
        return res
          .status(401)
          .json({
            success: false,
            error:
              "Email ama password waa khalad."
          });
      }

      const valid =
        await bcrypt.compare(
          password,
          user.password
        );

      if (!valid) {
        return res
          .status(401)
          .json({
            success: false,
            error:
              "Email ama password waa khalad."
          });
      }

      const token =
        jwt.sign(
          {
            id: user.id,
            email:
              user.email,
            role:
              user.role
          },
          JWT_SECRET,
          {
            expiresIn:
              "7d"
          }
        );

      res.json({
        success: true,
        token,
        user: {
          id: user.id,
          email:
            user.email,
          role:
            user.role
        }
      });

    } catch (error) {

      res
        .status(500)
        .json({
          success: false,
          error:
            error.message
        });
    }
  }
);

/* =====================================================
   ADMIN ME
===================================================== */

app.get(
  "/api/admin/me",
  requireAdmin,
  (req, res) => {

    res.json({
      success: true,
      user:
        req.admin
    });
  }
);

/* =====================================================
   ADMIN KNOWLEDGE GET
===================================================== */

app.get(
  "/api/admin/knowledge",
  requireAdmin,
  async (_req, res) => {

    try {

      const knowledge =
        await all(`
          SELECT *
          FROM knowledge
          ORDER BY id DESC
        `);

      res.json({
        success: true,
        knowledge
      });

    } catch (error) {

      res
        .status(500)
        .json({
          success: false,
          error:
            error.message
        });
    }
  }
);

/* =====================================================
   ADMIN KNOWLEDGE SEARCH
===================================================== */

app.get(
  "/api/admin/knowledge/search",
  requireAdmin,
  async (req, res) => {

    try {

      const q =
        String(
          req.query.q ||
            ""
        ).trim();

      const knowledge =
        await all(
          `
          SELECT *
          FROM knowledge
          WHERE title LIKE ?
             OR content LIKE ?
          ORDER BY id DESC
          `,
          [
            `%${q}%`,
            `%${q}%`
          ]
        );

      res.json({
        success: true,
        knowledge
      });

    } catch (error) {

      res
        .status(500)
        .json({
          success: false,
          error:
            error.message
        });
    }
  }
);

/* =====================================================
   ADMIN KNOWLEDGE CREATE
   IMAGE + AUDIO
===================================================== */

app.post(
  "/api/admin/knowledge",
  requireAdmin,

  knowledgeUpload.fields([
    {
      name: "image",
      maxCount: 1
    },
    {
      name: "audio",
      maxCount: 1
    }
  ]),

  async (req, res) => {

    try {

      const image =
        req.files?.image?.[0];

      const audio =
        req.files?.audio?.[0];

      const title =
        String(
          req.body.title ||
            ""
        ).trim();

      const content =
        String(
          req.body.content ||
            ""
        ).trim();

      if (
        !title ||
        !content
      ) {
        return res
          .status(400)
          .json({
            success: false,
            error:
              "Title iyo content waa khasab."
          });
      }

      let imageUrl = "";
      let audioUrl = "";
      let imageHash = "";
      let imagePHash = "";

      if (image) {

        const buffer =
          fs.readFileSync(
            image.path
          );

        imageUrl =
          uploadUrl(
            image.filename
          );

        imageHash =
          sha256(buffer);

        imagePHash =
          await makePHash(
            buffer
          );
      }

      if (audio) {
        audioUrl =
          uploadUrl(
            audio.filename
          );
      }

      const result =
        await run(
          `
          INSERT INTO knowledge (
            title,
            content,
            image_url,
            audio_url,
            image_hash,
            image_phash
          )
          VALUES (?, ?, ?, ?, ?, ?)
          `,
          [
            title,
            content,
            imageUrl,
            audioUrl,
            imageHash,
            imagePHash
          ]
        );

      const knowledge =
        await get(
          `
          SELECT *
          FROM knowledge
          WHERE id = ?
          `,
          [result.id]
        );

      res.status(201).json({
        success: true,
        knowledge
      });

    } catch (error) {

      console.error(
        "KNOWLEDGE CREATE:",
        error
      );

      res
        .status(500)
        .json({
          success: false,
          error:
            error.message
        });
    }
  }
);

/* =====================================================
   ADMIN KNOWLEDGE UPDATE
===================================================== */

app.put(
  "/api/admin/knowledge/:id",
  requireAdmin,

  knowledgeUpload.fields([
    {
      name: "image",
      maxCount: 1
    },
    {
      name: "audio",
      maxCount: 1
    }
  ]),

  async (req, res) => {

    try {

      const id =
        Number(
          req.params.id
        );

      const old =
        await get(
          `
          SELECT *
          FROM knowledge
          WHERE id = ?
          `,
          [id]
        );

      if (!old) {
        return res
          .status(404)
          .json({
            success: false,
            error:
              "Knowledge lama helin."
          });
      }

      const image =
        req.files?.image?.[0];

      const audio =
        req.files?.audio?.[0];

      let imageUrl =
        old.image_url ||
        "";

      let audioUrl =
        old.audio_url ||
        "";

      let imageHash =
        old.image_hash ||
        "";

      let imagePHash =
        old.image_phash ||
        "";

      if (image) {

        const buffer =
          fs.readFileSync(
            image.path
          );

        imageUrl =
          uploadUrl(
            image.filename
          );

        imageHash =
          sha256(buffer);

        imagePHash =
          await makePHash(
            buffer
          );

        deleteFileByUrl(
          old.image_url
        );
      }

      if (audio) {

        audioUrl =
          uploadUrl(
            audio.filename
          );

        deleteFileByUrl(
          old.audio_url
        );
      }

      await run(
        `
        UPDATE knowledge
        SET
          title = ?,
          content = ?,
          image_url = ?,
          audio_url = ?,
          image_hash = ?,
          image_phash = ?,
          updated_at =
            CURRENT_TIMESTAMP
        WHERE id = ?
        `,
        [
          req.body.title ??
            old.title,

          req.body.content ??
            old.content,

          imageUrl,
          audioUrl,
          imageHash,
          imagePHash,
          id
        ]
      );

      const knowledge =
        await get(
          `
          SELECT *
          FROM knowledge
          WHERE id = ?
          `,
          [id]
        );

      res.json({
        success: true,
        knowledge
      });

    } catch (error) {

      console.error(
        "KNOWLEDGE UPDATE:",
        error
      );

      res
        .status(500)
        .json({
          success: false,
          error:
            error.message
        });
    }
  }
);

/* =====================================================
   ADMIN KNOWLEDGE DELETE
===================================================== */

app.delete(
  "/api/admin/knowledge/:id",
  requireAdmin,

  async (req, res) => {

    try {

      const id =
        Number(
          req.params.id
        );

      const knowledge =
        await get(
          `
          SELECT *
          FROM knowledge
          WHERE id = ?
          `,
          [id]
        );

      if (!knowledge) {
        return res
          .status(404)
          .json({
            success: false,
            error:
              "Knowledge lama helin."
          });
      }

      await run(
        `
        DELETE FROM knowledge
        WHERE id = ?
        `,
        [id]
      );

      deleteFileByUrl(
        knowledge.image_url
      );

      deleteFileByUrl(
        knowledge.audio_url
      );

      res.json({
        success: true,
        message:
          "Knowledge waa la tirtiray."
      });

    } catch (error) {

      res
        .status(500)
        .json({
          success: false,
          error:
            error.message
        });
    }
  }
);

/* =====================================================
   HEER 1 + HEER 2
   /api/match-image
===================================================== */

app.post(
  "/api/match-image",
  imageUpload.single("image"),

  async (req, res) => {

    try {

      if (!req.file) {
        return res
          .status(400)
          .json({
            success: false,
            found: false,
            match: "none",
            message:
              "❌ Fadlan sawir geli."
          });
      }

      const buffer =
        req.file.buffer;

      /* ================================================
         HEER 1 — EXACT SHA-256
      ================================================= */

      const exactHash =
        sha256(buffer);

      const exact =
        await get(
          `
          SELECT *
          FROM knowledge
          WHERE image_hash = ?
          ORDER BY id DESC
          LIMIT 1
          `,
          [exactHash]
        );

      if (exact) {

        return res.json({
          success: true,
          found: true,

          title:
            exact.title || "",

          content:
            exact.content || "",

          image_url:
            exact.image_url || "",

          audio_url:
            exact.audio_url || "",

          knowledge:
            exact,

          match:
            "exact",

          message:
            "✅ Sawirka Database-ka waa laga helay."
        });
      }

      /* ================================================
         HEER 2 — SIMILAR IMAGE
      ================================================= */

      const userPHash =
        await makePHash(
          buffer
        );

      const databaseImages =
        await all(`
          SELECT *
          FROM knowledge
          WHERE image_url IS NOT NULL
            AND image_url != ''
            AND image_phash IS NOT NULL
        `);

      let bestMatch =
        null;

      for (
        const item
        of databaseImages
      ) {

        const distance =
          hammingDistance(
            userPHash,
            item.image_phash
          );

        if (
          !bestMatch ||
          distance <
            bestMatch.distance
        ) {
          bestMatch = {
            item,
            distance
          };
        }
      }

      if (
        bestMatch &&
        bestMatch.distance <=
          PHASH_THRESHOLD
      ) {

        return res.json({
          success: true,
          found: true,

          title:
            bestMatch.item
              .title || "",

          content:
            bestMatch.item
              .content || "",

          image_url:
            bestMatch.item
              .image_url || "",

          audio_url:
            bestMatch.item
              .audio_url || "",

          knowledge:
            bestMatch.item,

          match:
            "similar",

          similarity_distance:
            bestMatch.distance,

          message:
            "✅ Sawir la mid ah ayaa Database-ka laga helay."
        });
      }

      /* ================================================
         LAMA HELIN
         PUBLIC APP → /chat → HEER 3 AI VISION
      ================================================= */

      return res
        .status(404)
        .json({
          success: false,
          found: false,

          title: "",
          content: "",
          image_url: "",
          audio_url: "",
          knowledge: null,

          match: "none",

          message:
            "❌ Sawirkan Database-ka lagama helin."
        });

    } catch (error) {

      console.error(
        "MATCH IMAGE ERROR:",
        error
      );

      res
        .status(500)
        .json({
          success: false,
          found: false,
          match: "none",
          error:
            error.message
        });
    }
  }
);

/* =====================================================
   HEER 3 — OPENROUTER VISION AI
===================================================== */

async function analyzeImageWithAI(
  imageDataUrl,
  userMessage
) {

  if (!openrouter) {
    throw new Error(
      "OPENROUTER_API_KEY lama dejin."
    );
  }

  const systemPrompt = `
Waxaad tahay NASIIB BUSINESS CENTER AI.

Jawaab kasta ku bixi Af Soomaali.

MARKA SAWIR LAGU SOO DIRO:

1. 👁️ Si taxaddar leh u EEG sawirka.

2. 📝 Akhri qoraalka ku qoran sawirka.

3. 📋 Isku day inaad soo saarto
   dhammaan qoraalka muuqda.

4. 🔢 Akhri lambarada muuqda.

5. 📅 Akhri taariikhaha muuqda.

6. 🏷️ Akhri magacyada,
   cinwaanada iyo labels-ka.

7. 📸 Haddii uu yahay screenshot,
   qoraalka screenshot-ka akhri.

8. 🖼️ Haddii sawirka meel kale laga keenay,
   weli isku day inaad akhrido qoraalka.

9. 🔎 Haddii uu yahay product,
   akhri magaca product-ka,
   xogta iyo qoraalka muuqda.

10. 📄 Haddii uu yahay document,
    akhri qoraalka muuqda.

11. 🧾 Haddii uu yahay receipt,
    akhri qiimaha, taariikhda,
    magaca iyo xogta kale ee muuqata.

12. Haddii qayb ka mid ah qoraalka
    aan si cad loo arki karin,
    sheeg inaysan caddayn.

13. ❌ Ha samayn xog aan sawirka
    laga arki karin.

14. Marka hore soo saar
    qoraalka sawirka.

15. Kadib sharax waxa
    sawirku ka hadlayo.

16. Jawaabta ugu dambayn
    ku bixi Af Soomaali.
`;

  const response =
    await openrouter.chat.completions.create({

      model:
        VISION_MODEL,

      messages: [

        {
          role: "system",

          content:
            systemPrompt
        },

        {
          role: "user",

          content: [

            {
              type: "text",

              text:
                userMessage ||
                `
Sawirkan si faahfaahsan u akhri.

📝 Qoraalka ku qoran soo saar.

🔢 Lambarada akhri.

📅 Taariikhaha akhri.

Kadib Af Soomaali ku sharax
waxa sawirku ka hadlayo.
`
            },

            {
              type:
                "image_url",

              image_url: {
                url:
                  imageDataUrl
              }
            }

          ]
        }

      ],

      temperature:
        0.1
    });

  return (
    response
      ?.choices?.[0]
      ?.message
      ?.content ||
    "AI wax jawaab ah kama soo saarin sawirka."
  );
}

/* =====================================================
   /chat
   PUBLIC USER
   LOGIN LOOMA BAAHNA
===================================================== */

app.post(
  "/chat",

  async (req, res) => {

    try {

      const clientId =
        String(
          req.body.clientId ||
            "anonymous"
        ).trim();

      const message =
        String(
          req.body.message ||
            ""
        ).trim();

      const image =
        typeof req.body.image ===
          "string"
          ? req.body.image
          : "";

      if (
        !message &&
        !image
      ) {
        return res
          .status(400)
          .json({
            success: false,
            error:
              "Qoraal ama sawir geli."
          });
      }

      if (!openrouter) {
        return res
          .status(500)
          .json({
            success: false,
            error:
              "OPENROUTER_API_KEY lama dejin."
          });
      }

      let answer = "";

      /* ================================================
         IMAGE
         HEER 3 — VISION AI
      ================================================= */

      if (image) {

        answer =
          await analyzeImageWithAI(
            image,
            message
          );

      }

      /* ================================================
         TEXT ONLY
      ================================================= */

      else {

        const knowledge =
          await all(`
            SELECT
              title,
              content
            FROM knowledge
            ORDER BY id DESC
            LIMIT 100
          `);

        const knowledgeText =
          knowledge
            .map(
              (item) =>
                `Title: ${
                  item.title || ""
                }

Content:
${
  item.content || ""
}`
            )
            .join(
              "\n\n"
            );

        const response =
          await openrouter
            .chat
            .completions
            .create({

              model:
                AI_MODEL,

              messages: [

                {
                  role:
                    "system",

                  content:
                    `
Waxaad tahay
NASIIB BUSINESS CENTER AI.

Had iyo jeer ku jawaab
Af Soomaali.

Isticmaal Knowledge Database-ka
marka xogtiisu khusayso
su'aasha user-ka.

DATABASE:

${
  knowledgeText ||
  "Database-ku waa madhan."
}
`
                },

                {
                  role:
                    "user",

                  content:
                    message
                }

              ],

              temperature:
                0.3
            });

        answer =
          response
            ?.choices?.[0]
            ?.message
            ?.content ||
          "";
      }

      /* ================================================
         SAVE CHAT HISTORY
      ================================================= */

      await run(
        `
        INSERT INTO chats (
          client_id,
          message,
          image,
          image_url,
          response
        )
        VALUES (?, ?, ?, ?, ?)
        `,
        [
          clientId,

          message ||
            null,

          image ||
            null,

          image ||
            null,

          answer
        ]
      );

      res.json({
        success: true,

        response:
          answer,

        text:
          answer,

        clientId,

        source:
          image
            ? "ai_vision"
            : "ai"
      });

    } catch (error) {

      console.error(
        "CHAT ERROR:",
        error
      );

      res
        .status(500)
        .json({
          success: false,
          error:
            error.message
        });
    }
  }
);

/* =====================================================
   CHAT HISTORY
===================================================== */

app.get(
  "/api/chats",
  async (req, res) => {

    try {

      const clientId =
        String(
          req.query.clientId ||
            req.query.client_id ||
            ""
        ).trim();

      if (!clientId) {
        return res.json({
          success: true,
          chats: []
        });
      }

      const chats =
        await all(
          `
          SELECT *
          FROM chats
          WHERE client_id = ?
          ORDER BY id ASC
          `,
          [clientId]
        );

      res.json({
        success: true,
        chats
      });

    } catch (error) {

      res
        .status(500)
        .json({
          success: false,
          error:
            error.message
        });
    }
  }
);

/* =====================================================
   DELETE CHAT
===================================================== */

app.delete(
  "/api/chats",
  async (req, res) => {

    try {

      const clientId =
        String(
          req.body.clientId ||
            req.body.client_id ||
            req.query.clientId ||
            req.query.client_id ||
            ""
        ).trim();

      if (!clientId) {
        return res
          .status(400)
          .json({
            success: false,
            error:
              "clientId ayaa loo baahan yahay."
          });
      }

      const result =
        await run(
          `
          DELETE FROM chats
          WHERE client_id = ?
          `,
          [clientId]
        );

      res.json({
        success: true,

        deleted:
          result.changes,

        message:
          "Chat history waa la tirtiray."
      });

    } catch (error) {

      res
        .status(500)
        .json({
          success: false,
          error:
            error.message
        });
    }
  }
);

/* =====================================================
   ADMIN CHATS
===================================================== */

app.get(
  "/api/admin/chats",
  requireAdmin,

  async (_req, res) => {

    try {

      const chats =
        await all(`
          SELECT *
          FROM chats
          ORDER BY id DESC
          LIMIT 500
        `);

      res.json({
        success: true,
        chats
      });

    } catch (error) {

      res
        .status(500)
        .json({
          success: false,
          error:
            error.message
        });
    }
  }
);

/* =====================================================
   ADMIN USERS
===================================================== */

app.get(
  "/api/admin/users",
  requireAdmin,

  async (_req, res) => {

    try {

      const users =
        await all(`
          SELECT
            id,
            email,
            role,
            created_at
          FROM users
          ORDER BY id DESC
        `);

      res.json({
        success: true,
        users
      });

    } catch (error) {

      res
        .status(500)
        .json({
          success: false,
          error:
            error.message
        });
    }
  }
);

/* =====================================================
   AUDIO TRANSCRIPTION
===================================================== */

app.post(
  "/api/admin/knowledge/transcribe",

  requireAdmin,

  audioUpload.single(
    "audio"
  ),

  async (req, res) => {

    try {

      if (!openrouter) {
        return res
          .status(500)
          .json({
            success: false,
            error:
              "OPENROUTER_API_KEY lama dejin."
          });
      }

      if (!req.file) {
        return res
          .status(400)
          .json({
            success: false,
            error:
              "Fadlan cod geli."
          });
      }

      const mime =
        req.file.mimetype ||
        "audio/webm";

      let format =
        "webm";

      if (
        mime.includes(
          "mpeg"
        )
      ) {
        format = "mp3";
      } else if (
        mime.includes(
          "wav"
        )
      ) {
        format = "wav";
      } else if (
        mime.includes(
          "mp4"
        )
      ) {
        format = "mp4";
      } else if (
        mime.includes(
          "m4a"
        )
      ) {
        format = "m4a";
      }

      const response =
        await fetch(
          "https://openrouter.ai/api/v1/audio/transcriptions",
          {
            method:
              "POST",

            headers: {
              Authorization:
                `Bearer ${OPENROUTER_API_KEY}`,

              "Content-Type":
                "application/json",

              "HTTP-Referer":
                APP_URL,

              "X-Title":
                "NASIIB BUSINESS CENTER"
            },

            body:
              JSON.stringify({
                model:
                  TRANSCRIPTION_MODEL,

                input_audio: {
                  data:
                    req.file.buffer.toString(
                      "base64"
                    ),

                  format
                }
              })
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        return res
          .status(
            response.status
          )
          .json({
            success: false,
            error:
              data?.error?.message ||
              "Codka lama turjumi karin."
          });
      }

      res.json({
        success: true,

        text:
          data?.text ||
          data?.transcript ||
          ""
      });

    } catch (error) {

      console.error(
        "TRANSCRIPTION ERROR:",
        error
      );

      res
        .status(500)
        .json({
          success: false,
          error:
            error.message
        });
    }
  }
);

/* =====================================================
   PUBLIC PAGES
===================================================== */

app.get(
  "/",
  (_req, res) => {
    res.sendFile(
      path.join(
        PUBLIC_DIR,
        "index.html"
      )
    );
  }
);

app.get(
  "/admin",
  (_req, res) => {
    res.sendFile(
      path.join(
        PUBLIC_DIR,
        "admin",
        "index.html"
      )
    );
  }
);

app.get(
  "/admin/",
  (_req, res) => {
    res.sendFile(
      path.join(
        PUBLIC_DIR,
        "admin",
        "index.html"
      )
    );
  }
);

/* =====================================================
   ERROR HANDLER
===================================================== */

app.use(
  (
    error,
    _req,
    res,
    _next
  ) => {

    console.error(
      "SERVER ERROR:",
      error
    );

    res
      .status(500)
      .json({
        success: false,
        error:
          error.message ||
          "Server error."
      });
  }
);

/* =====================================================
   404
===================================================== */

app.use(
  (_req, res) => {

    res
      .status(404)
      .json({
        success: false,
        error:
          "API route lama helin."
      });
  }
);

/* =====================================================
   START
===================================================== */

async function startServer() {

  try {

    await initDatabase();

    await createDefaultAdmin();

    app.listen(
      PORT,
      "0.0.0.0",
      () => {

        console.log("");
        console.log(
          "======================================"
        );

        console.log(
          "   NASIIB BUSINESS CENTER"
        );

        console.log(
          "======================================"
        );

        console.log(
          `🌐 Port: ${PORT}`
        );

        console.log(
          "👤 Public User: ON"
        );

        console.log(
          "🔐 Public Login: NOT REQUIRED"
        );

        console.log(
          "💬 /chat: ON"
        );

        console.log(
          "🖼️ /api/match-image: ON"
        );

        console.log(
          "🔎 HEER 1 Exact Match: ON"
        );

        console.log(
          "🔎 HEER 2 Similar Match: ON"
        );

        console.log(
          "🤖 HEER 3 Vision AI: ON"
        );

        console.log(
          "📝 OCR/Image Text Reading: ON"
        );

        console.log(
          `🧠 AI Model: ${AI_MODEL}`
        );

        console.log(
          `👁️ Vision Model: ${VISION_MODEL}`
        );

        console.log(
          "🗄️ SQLite: ON"
        );

        console.log(
          "👨‍💼 JWT Admin: ON"
        );

        console.log(
          "======================================"
        );
      }
    );

  } catch (error) {

    console.error(
      "❌ SERVER START ERROR:",
      error
    );

    process.exit(1);
  }
}

startServer();
