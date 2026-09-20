"use strict";

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const { Pool } = require("pg");
const OpenAI = require("openai");
const sharp = require("sharp");

const app = express();

/* =====================================================
   CONFIG
===================================================== */

const PORT = Number(process.env.PORT || 3000);

const APP_URL =
  process.env.APP_URL ||
  `http://localhost:${PORT}`;

const DATABASE_URL =
  process.env.DATABASE_URL;

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
  "openrouter/free";

const TRANSCRIPTION_MODEL =
  process.env.TRANSCRIPTION_MODEL ||
  "openai/whisper-1";

const PHASH_THRESHOLD =
  Number(process.env.PHASH_THRESHOLD || 10);


/* =====================================================
   CHECK DATABASE
===================================================== */

if (!DATABASE_URL) {

  console.error("");
  console.error("❌ DATABASE_URL lama dejin.");
  console.error(
    "Render → Environment → DATABASE_URL geli."
  );
  console.error("");

  process.exit(1);
}


/* =====================================================
   EXPRESS
===================================================== */

app.set("trust proxy", 1);

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


/* =====================================================
   POSTGRESQL
===================================================== */



const pool = new Pool({
  connectionString: process.env.DATABASE_URL,

  ssl: {
    rejectUnauthorized: false
  },

  max: 10,

  idleTimeoutMillis: 30000,

  connectionTimeoutMillis: 10000
});


/* =====================================================
   OPENROUTER
===================================================== */

const ai =
  OPENROUTER_API_KEY
    ? new OpenAI({

        baseURL:
          "https://openrouter.ai/api/v1",

        apiKey:
          OPENROUTER_API_KEY,

        defaultHeaders: {

          "HTTP-Referer":
            APP_URL,

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
   MULTER
===================================================== */

const upload =
  multer({

    storage:
      multer.memoryStorage(),

    limits: {

      fileSize:
        25 * 1024 * 1024

    }

  });


/* =====================================================
   IMAGE UPLOAD
===================================================== */

const imageUpload =
  multer({

    storage:
      multer.memoryStorage(),

    limits: {

      fileSize:
        8 * 1024 * 1024

    },

    fileFilter(
      req,
      file,
      cb
    ) {

      if (
        file.mimetype &&
        file.mimetype.startsWith(
          "image/"
        )
      ) {

        return cb(
          null,
          true
        );

      }

      cb(
        new Error(
          "Kaliya sawir ayaa la oggol yahay."
        )
      );

    }

  });


/* =====================================================
   KNOWLEDGE UPLOAD
===================================================== */

const knowledgeUpload =
  multer({

    storage:
      multer.memoryStorage(),

    limits: {

      fileSize:
        25 * 1024 * 1024

    },

    fileFilter(
      req,
      file,
      cb
    ) {

      const allowed =
        file.mimetype?.startsWith(
          "image/"
        ) ||
        file.mimetype?.startsWith(
          "audio/"
        );

      if (allowed) {

        return cb(
          null,
          true
        );

      }

      cb(
        new Error(
          "Kaliya sawir ama cod ayaa la oggol yahay."
        )
      );

    }

  });


/* =====================================================
   DATABASE HELPERS
===================================================== */

async function query(
  sql,
  params = []
) {

  return pool.query(
    sql,
    params
  );

}


async function get(
  sql,
  params = []
) {

  const result =
    await pool.query(
      sql,
      params
    );

  return (
    result.rows[0] ||
    null
  );

}


async function all(
  sql,
  params = []
) {

  const result =
    await pool.query(
      sql,
      params
    );

  return result.rows;

}


/* =====================================================
   SHA-256
===================================================== */

function sha256(
  buffer
) {

  return crypto
    .createHash("sha256")
    .update(buffer)
    .digest("hex");

}


/* =====================================================
   SIMILAR IMAGE HASH
   64-bit dHash
===================================================== */

async function pHash(
  buffer
) {

  const result =
    await sharp(buffer)

      .resize(
        9,
        8,
        {
          fit: "fill"
        }
      )

      .grayscale()

      .raw()

      .toBuffer({
        resolveWithObject:
          true
      });


  const data =
    result.data;


  let bits = "";


  for (
    let y = 0;
    y < 8;
    y++
  ) {

    for (
      let x = 0;
      x < 8;
      x++
    ) {

      const left =
        data[
          y * 9 + x
        ];

      const right =
        data[
          y * 9 + x + 1
        ];


      bits +=
        left < right
          ? "1"
          : "0";

    }

  }


  return BigInt(
    "0b" + bits
  )
    .toString(16)
    .padStart(
      16,
      "0"
    );

}


/* =====================================================
   HAMMING DISTANCE
===================================================== */

function hammingDistance(
  a,
  b
) {

  if (!a || !b) {

    return 999;

  }


  try {

    let value =
      BigInt(
        "0x" + a
      ) ^
      BigInt(
        "0x" + b
      );


    let count = 0;


    while (
      value > 0n
    ) {

      value &=
        value - 1n;

      count++;

    }


    return count;

  } catch {

    return 999;

  }

}


/* =====================================================
   DATABASE INITIALIZATION
===================================================== */

async function initializeDatabase() {

  await query(`

    CREATE TABLE IF NOT EXISTS users (

      id BIGSERIAL PRIMARY KEY,

      email TEXT UNIQUE NOT NULL,

      password TEXT NOT NULL,

      role TEXT NOT NULL
        DEFAULT 'user',

      created_at
        TIMESTAMPTZ NOT NULL
        DEFAULT NOW()

    )

  `);


  await query(`

    CREATE TABLE IF NOT EXISTS knowledge (

      id BIGSERIAL PRIMARY KEY,

      title TEXT NOT NULL
        DEFAULT '',

      content TEXT NOT NULL
        DEFAULT '',

      image_url TEXT,

      audio_url TEXT,

      image_hash TEXT,

      image_phash TEXT,

      image_data BYTEA,

      image_mime TEXT,

      audio_data BYTEA,

      audio_mime TEXT,

      created_at
        TIMESTAMPTZ NOT NULL
        DEFAULT NOW(),

      updated_at
        TIMESTAMPTZ NOT NULL
        DEFAULT NOW()

    )

  `);

// ==========================================
// KNOWLEDGE IMAGE/AUDIO URL MIGRATION
// ==========================================

await query(`
  ALTER TABLE knowledge
  ADD COLUMN IF NOT EXISTS image_url TEXT
`);

await query(`
  ALTER TABLE knowledge
  ADD COLUMN IF NOT EXISTS audio_url TEXT
`);

await query(`
  ALTER TABLE knowledge
  ADD COLUMN IF NOT EXISTS image_hash TEXT
`);

await query(`
  ALTER TABLE knowledge
  ADD COLUMN IF NOT EXISTS image_phash TEXT
`);

await query(`
  ALTER TABLE knowledge
  ADD COLUMN IF NOT EXISTS image_data BYTEA
`);

await query(`
  ALTER TABLE knowledge
  ADD COLUMN IF NOT EXISTS image_mime TEXT
`);

await query(`
  ALTER TABLE knowledge
  ADD COLUMN IF NOT EXISTS audio_data BYTEA
`);

await query(`
  ALTER TABLE knowledge
  ADD COLUMN IF NOT EXISTS audio_mime TEXT
`);

  // kadibna code-kii hore ee line 550...

  await query(`

    CREATE TABLE IF NOT EXISTS chats (

      id BIGSERIAL PRIMARY KEY,

      client_id TEXT,

      user_id BIGINT
        REFERENCES users(id)
        ON DELETE SET NULL,

      message TEXT,

      image_data BYTEA,

      image_mime TEXT,

      response TEXT,

      created_at
        TIMESTAMPTZ NOT NULL
        DEFAULT NOW()

    )

  `);
// ==========================================
// CHATS CLIENT_ID MIGRATION
// ==========================================

await query(`
  ALTER TABLE chats
  ADD COLUMN IF NOT EXISTS client_id TEXT
`);
// ==========================================
// KNOWLEDGE IMAGE COLUMNS MIGRATION
// ==========================================

await query(`
  ALTER TABLE knowledge
  ADD COLUMN IF NOT EXISTS image_hash TEXT
`);

await query(`
  ALTER TABLE knowledge
  ADD COLUMN IF NOT EXISTS image_phash TEXT
`);

await query(`
  ALTER TABLE knowledge
  ADD COLUMN IF NOT EXISTS image_data BYTEA
`);

await query(`
  ALTER TABLE knowledge
  ADD COLUMN IF NOT EXISTS image_mime TEXT
`);

await query(`
  ALTER TABLE knowledge
  ADD COLUMN IF NOT EXISTS audio_data BYTEA
`);

await query(`
  ALTER TABLE knowledge
  ADD COLUMN IF NOT EXISTS audio_mime TEXT
`);
  await query(`

    CREATE INDEX IF NOT EXISTS
    idx_knowledge_image_hash

    ON knowledge(image_hash)

  `);


  await query(`

    CREATE INDEX IF NOT EXISTS
    idx_knowledge_image_phash

    ON knowledge(image_phash)

  `);


  await query(`

    CREATE INDEX IF NOT EXISTS
    idx_knowledge_created_at

    ON knowledge(created_at DESC)

  `);


  await query(`

    CREATE INDEX IF NOT EXISTS
    idx_chats_client_id

    ON chats(client_id)

  `);


  console.log(
    "✅ PostgreSQL tables diyaar."
  );

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
      WHERE email = $1
      `,
      [
        ADMIN_EMAIL
      ]
    );


  if (existing) {

    return;

  }


  const passwordHash =
    await bcrypt.hash(
      ADMIN_PASSWORD,
      12
    );

await query(
  `
  INSERT INTO users
  (
    name,
    email,
    password,
    role
  )
  VALUES
  (
    $1,
    $2,
    $3,
    'admin'
  )
  `,
 [
  "Admin",
  ADMIN_EMAIL,
  passwordHash
]
);

  console.log(
    `👑 Default admin created: ${ADMIN_EMAIL}`
  );

}


/* =====================================================
   JWT
===================================================== */

function signAdminToken(
  user
) {

  return jwt.sign(

    {

      id:
        user.id,

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

}


/* =====================================================
   ADMIN MIDDLEWARE
===================================================== */

function adminMiddleware(
  req,
  res,
  next
) {

  try {

    const header =
      req.headers.authorization ||
      "";


    if (
      !header.startsWith(
        "Bearer "
      )
    ) {

      return res
        .status(401)
        .json({

          success:
            false,

          error:
            "Admin login ayaa loo baahan yahay."

        });

    }


    const token =
      header.slice(7);


    const decoded =
      jwt.verify(
        token,
        JWT_SECRET
      );


    if (
      decoded.role !==
      "admin"
    ) {

      return res
        .status(403)
        .json({

          success:
            false,

          error:
            "Admin kaliya ayaa geli kara."

        });

    }


    req.admin =
      decoded;


    next();

  } catch {

    return res
      .status(401)
      .json({

        success:
          false,

        error:
          "Token-ka admin-ka waa khaldan yahay ama wuu dhacay."

      });

  }

}


/* =====================================================
   KNOWLEDGE FORMAT
===================================================== */

function rowToKnowledge(
  row
) {

  if (!row) {

    return null;

  }


  return {

    id:
      row.id,

    title:
      row.title || "",

    content:
      row.content || "",

    image_url:
      row.image_url || null,

    audio_url:
      row.audio_url || null,

    image_hash:
      row.image_hash || null,

    image_phash:
      row.image_phash || null,

    created_at:
      row.created_at,

    updated_at:
      row.updated_at

  };

}


/* =====================================================
   HEALTH
===================================================== */

app.get(
  "/api/health",
  async (
    req,
    res
  ) => {

    try {

      await query(
        "SELECT 1"
      );


      res.json({

        success:
          true,

        status:
          "ok",

        database:
          "postgresql",

        database_connected:
          true,

        ai_configured:
          Boolean(
            OPENROUTER_API_KEY
          ),

        ai_model:
          AI_MODEL,

        vision_model:
          VISION_MODEL,

        phash_threshold:
          PHASH_THRESHOLD

      });

    } catch (
      error
    ) {

      res
        .status(503)
        .json({

          success:
            false,

          status:
            "error",

          database:
            "postgresql",

          database_connected:
            false,

          error:
            error.message

        });

    }

  }
);


/* =====================================================
   ADMIN LOGIN
===================================================== */

app.post(
  "/api/login",
  async (
    req,
    res
  ) => {

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

            success:
              false,

            error:
              "Email iyo password geli."

          });

      }


      const user =
        await get(

          `
          SELECT
            id,
            email,
            password,
            role

          FROM users

          WHERE
            LOWER(email)
            =
            LOWER($1)
          `,

          [
            email
          ]

        );


      if (
        !user ||
        user.role !==
        "admin"
      ) {

        return res
          .status(401)
          .json({

            success:
              false,

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

            success:
              false,

            error:
              "Email ama password waa khalad."

          });

      }


      const token =
        signAdminToken(
          user
        );


      res.json({

        success:
          true,

        token,

        user: {

          id:
            user.id,

          email:
            user.email,

          role:
            user.role

        }

      });

    } catch (
      error
    ) {

      console.error(
        "LOGIN ERROR:",
        error
      );


      res
        .status(500)
        .json({

          success:
            false,

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
  adminMiddleware,
  async (
    req,
    res
  ) => {

    res.json({

      success:
        true,

      user:
        req.admin

    });

  }
);


/* =====================================================
   GET KNOWLEDGE
===================================================== */

app.get(
  "/api/admin/knowledge",
  adminMiddleware,
  async (
    req,
    res
  ) => {

    try {

      const rows =
        await all(`

          SELECT

            id,
            title,
            content,
            image_url,
            audio_url,
            image_hash,
            image_phash,
            created_at,
            updated_at

          FROM knowledge

          ORDER BY
            id DESC

        `);


      res.json({

        success:
          true,

        knowledge:
          rows.map(
            rowToKnowledge
          )

      });

    } catch (
      error
    ) {

      res
        .status(500)
        .json({

          success:
            false,

          error:
            error.message

        });

    }

  }
);


/* =====================================================
   SEARCH KNOWLEDGE
===================================================== */

app.get(
  "/api/admin/knowledge/search",
  adminMiddleware,
  async (
    req,
    res
  ) => {

    try {

      const q =
        String(
          req.query.q ||
          ""
        )
        .trim();


      if (!q) {

        const rows =
          await all(`

            SELECT
              id,
              title,
              content,
              image_url,
              audio_url,
              image_hash,
              image_phash,
              created_at,
              updated_at

            FROM knowledge

            ORDER BY
              id DESC

          `);


        return res.json({

          success:
            true,

          knowledge:
            rows.map(
              rowToKnowledge
            )

        });

      }


      const rows =
        await all(

          `

          SELECT

            id,
            title,
            content,
            image_url,
            audio_url,
            image_hash,
            image_phash,
            created_at,
            updated_at

          FROM knowledge

          WHERE

            title ILIKE $1

            OR

            content ILIKE $1

          ORDER BY
            id DESC

          `,

          [
            `%${q}%`
          ]

        );


      res.json({

        success:
          true,

        knowledge:
          rows.map(
            rowToKnowledge
          )

      });

    } catch (
      error
    ) {

      res
        .status(500)
        .json({

          success:
            false,

          error:
            error.message

        });

    }

  }
);


/* =====================================================
   ADD KNOWLEDGE
===================================================== */

app.post(
  "/api/admin/knowledge",

  adminMiddleware,

  knowledgeUpload.fields([

    {
      name:
        "image",

      maxCount:
        1
    },

    {
      name:
        "audio",

      maxCount:
        1
    }

  ]),

  async (
    req,
    res
  ) => {

    try {

      const title =
        String(
          req.body.title ||
          ""
        )
        .trim();


      const content =
        String(
          req.body.content ||
          ""
        )
        .trim();


      const imageFile =
        req.files?.image?.[0] ||
        null;


      const audioFile =
        req.files?.audio?.[0] ||
        null;


      if (
        !title &&
        !content &&
        !imageFile &&
        !audioFile
      ) {

        return res
          .status(400)
          .json({

            success:
              false,

            error:
              "Xog geli marka hore."

          });

      }


      let imageHash =
        null;

      let imagePhash =
        null;

      let imageData =
        null;

      let imageMime =
        null;


      if (imageFile) {

        imageData =
          imageFile.buffer;

        imageMime =
          imageFile.mimetype;

        imageHash =
          sha256(
            imageFile.buffer
          );

        imagePhash =
          await pHash(
            imageFile.buffer
          );

      }


      let audioData =
        null;

      let audioMime =
        null;


      if (audioFile) {

        audioData =
          audioFile.buffer;

        audioMime =
          audioFile.mimetype;

      }


      const result =
        await query(

          `

          INSERT INTO knowledge

          (
            title,
            content,
            image_hash,
            image_phash,
            image_data,
            image_mime,
            audio_data,
            audio_mime
          )

          VALUES

          (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7,
            $8
          )

          RETURNING id

          `,

          [

            title,

            content,

            imageHash,

            imagePhash,

            imageData,

            imageMime,

            audioData,

            audioMime

          ]

        );


      const id =
        result.rows[0].id;


      await query(

        `

        UPDATE knowledge

        SET

          image_url =
            CASE

              WHEN image_data
                IS NOT NULL

              THEN
                $1

              ELSE
                NULL

            END,

          audio_url =
            CASE

              WHEN audio_data
                IS NOT NULL

              THEN
                $2

              ELSE
                NULL

            END,

          updated_at =
            NOW()

        WHERE id =
          $3

        `,

        [

          `/api/knowledge/${id}/image`,

          `/api/knowledge/${id}/audio`,

          id

        ]

      );


      const saved =
        await get(

          `

          SELECT

            id,
            title,
            content,
            image_url,
            audio_url,
            image_hash,
            image_phash,
            created_at,
            updated_at

          FROM knowledge

          WHERE id =
            $1

          `,

          [
            id
          ]

        );


      res.json({

        success:
          true,

        message:
          "Knowledge PostgreSQL Database-ka waa lagu kaydiyey.",

        knowledge:
          rowToKnowledge(
            saved
          )

      });

    } catch (
      error
    ) {

      console.error(
        "ADD KNOWLEDGE ERROR:",
        error
      );


      res
        .status(500)
        .json({

          success:
            false,

          error:
            error.message

        });

    }

  }
);


/* =====================================================
   EDIT KNOWLEDGE
===================================================== */

app.put(
  "/api/admin/knowledge/:id",

  adminMiddleware,

  knowledgeUpload.fields([

    {
      name:
        "image",

      maxCount:
        1
    },

    {
      name:
        "audio",

      maxCount:
        1
    }

  ]),

  async (
    req,
    res
  ) => {

    try {

      const id =
        Number(
          req.params.id
        );


      if (
        !Number.isInteger(id)
      ) {

        return res
          .status(400)
          .json({

            success:
              false,

            error:
              "ID khaldan."

          });

      }


      const old =
        await get(

          `
          SELECT *
          FROM knowledge
          WHERE id = $1
          `,

          [
            id
          ]

        );


      if (!old) {

        return res
          .status(404)
          .json({

            success:
              false,

            error:
              "Knowledge lama helin."

          });

      }


      const title =
        req.body.title !==
        undefined

          ? String(
              req.body.title
            ).trim()

          : old.title;


      const content =
        req.body.content !==
        undefined

          ? String(
              req.body.content
            ).trim()

          : old.content;


      const imageFile =
        req.files?.image?.[0] ||
        null;


      const audioFile =
        req.files?.audio?.[0] ||
        null;


      if (imageFile) {

        const hash =
          sha256(
            imageFile.buffer
          );


        const phash =
          await pHash(
            imageFile.buffer
          );


        await query(

          `

          UPDATE knowledge

          SET

            title =
              $1,

            content =
              $2,

            image_url =
              $3,

            image_hash =
              $4,

            image_phash =
              $5,

            image_data =
              $6,

            image_mime =
              $7,

            updated_at =
              NOW()

          WHERE id =
            $8

          `,

          [

            title,

            content,

            `/api/knowledge/${id}/image`,

            hash,

            phash,

            imageFile.buffer,

            imageFile.mimetype,

            id

          ]

        );

      } else {

        await query(

          `

          UPDATE knowledge

          SET

            title =
              $1,

            content =
              $2,

            updated_at =
              NOW()

          WHERE id =
            $3

          `,

          [

            title,

            content,

            id

          ]

        );

      }


      if (audioFile) {

        await query(

          `

          UPDATE knowledge

          SET

            audio_url =
              $1,

            audio_data =
              $2,

            audio_mime =
              $3,

            updated_at =
              NOW()

          WHERE id =
            $4

          `,

          [

            `/api/knowledge/${id}/audio`,

            audioFile.buffer,

            audioFile.mimetype,

            id

          ]

        );

      }


      const saved =
        await get(

          `

          SELECT

            id,
            title,
            content,
            image_url,
            audio_url,
            image_hash,
            image_phash,
            created_at,
            updated_at

          FROM knowledge

          WHERE id =
            $1

          `,

          [
            id
          ]

        );


      res.json({

        success:
          true,

        message:
          "Knowledge waa la cusboonaysiiyey.",

        knowledge:
          rowToKnowledge(
            saved
          )

      });

    } catch (
      error
    ) {

      console.error(
        "EDIT KNOWLEDGE ERROR:",
        error
      );


      res
        .status(500)
        .json({

          success:
            false,

          error:
            error.message

        });

    }

  }
);


/* =====================================================
   DELETE KNOWLEDGE
===================================================== */

app.delete(
  "/api/admin/knowledge/:id",

  adminMiddleware,

  async (
    req,
    res
  ) => {

    try {

      const id =
        Number(
          req.params.id
        );


      const row =
        await get(

          `
          SELECT id
          FROM knowledge
          WHERE id = $1
          `,

          [
            id
          ]

        );


      if (!row) {

        return res
          .status(404)
          .json({

            success:
              false,

            error:
              "Knowledge lama helin."

          });

      }


      await query(

        `
        DELETE FROM knowledge
        WHERE id = $1
        `,

        [
          id
        ]

      );


      res.json({

        success:
          true,

        message:
          "Knowledge waa la tirtiray."

      });

    } catch (
      error
    ) {

      res
        .status(500)
        .json({

          success:
            false,

          error:
            error.message

        });

    }

  }
);


/* =====================================================
   DATABASE IMAGE
===================================================== */

app.get(
  "/api/knowledge/:id/image",
  async (
    req,
    res
  ) => {

    try {

      const id =
        Number(
          req.params.id
        );


      const row =
        await get(

          `
          SELECT
            image_data,
            image_mime

          FROM knowledge

          WHERE id =
            $1

          `,

          [
            id
          ]

        );


      if (
        !row ||
        !row.image_data
      ) {

        return res
          .status(404)
          .send(
            "Sawirka lama helin."
          );

      }


      res.setHeader(

        "Content-Type",

        row.image_mime ||
        "image/jpeg"

      );


      res.setHeader(

        "Cache-Control",

        "public, max-age=31536000"

      );


      res.send(
        row.image_data
      );

    } catch (
      error
    ) {

      res
        .status(500)
        .send(
          "Sawirka lama soo qaadi karin."
        );

    }

  }
);


/* =====================================================
   DATABASE AUDIO
===================================================== */

app.get(
  "/api/knowledge/:id/audio",
  async (
    req,
    res
  ) => {

    try {

      const id =
        Number(
          req.params.id
        );


      const row =
        await get(

          `
          SELECT
            audio_data,
            audio_mime

          FROM knowledge

          WHERE id =
            $1

          `,

          [
            id
          ]

        );


      if (
        !row ||
        !row.audio_data
      ) {

        return res
          .status(404)
          .send(
            "Codka lama helin."
          );

      }


      res.setHeader(

        "Content-Type",

        row.audio_mime ||
        "audio/mpeg"

      );


      res.setHeader(

        "Cache-Control",

        "public, max-age=31536000"

      );


      res.send(
        row.audio_data
      );

    } catch (
      error
    ) {

      res
        .status(500)
        .send(
          "Codka lama soo qaadi karin."
        );

    }

  }
);


/* =====================================================
   AUDIO TRANSCRIPTION
===================================================== */

app.post(

  "/api/admin/knowledge/transcribe",

  adminMiddleware,

  upload.single("audio"),

  async (
    req,
    res
  ) => {

    try {

      if (
        !ai ||
        !OPENROUTER_API_KEY
      ) {

        return res
          .status(500)
          .json({

            success:
              false,

            error:
              "OPENROUTER_API_KEY lama dejin."

          });

      }


      if (!req.file) {

        return res
          .status(400)
          .json({

            success:
              false,

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
        ) ||
        mime.includes(
          "mp3"
        )
      ) {

        format =
          "mp3";

      } else if (
        mime.includes(
          "wav"
        )
      ) {

        format =
          "wav";

      } else if (
        mime.includes(
          "mp4"
        ) ||
        mime.includes(
          "m4a"
        )
      ) {

        format =
          "m4a";

      } else if (
        mime.includes(
          "ogg"
        )
      ) {

        format =
          "ogg";

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
                    req.file.buffer
                      .toString(
                        "base64"
                      ),

                  format:
                    format

                }

              })

          }

        );


      const data =
        await response.json();


      if (
        !response.ok
      ) {

        return res
          .status(
            response.status
          )
          .json({

            success:
              false,

            error:
              data?.error?.message ||
              "Codka lama turjumi karin."

          });

      }


      res.json({

        success:
          true,

        text:
          data.text || ""

      });

    } catch (
      error
    ) {

      console.error(
        "TRANSCRIBE ERROR:",
        error
      );


      res
        .status(500)
        .json({

          success:
            false,

          error:
            error.message

        });

    }

  }

);


/* =====================================================
   IMAGE MATCH
   LEVEL 1 = EXACT SHA-256
   LEVEL 2 = SIMILAR dHash
===================================================== */

app.post(

  "/api/match-image",

  imageUpload.single(
    "image"
  ),

  async (
    req,
    res
  ) => {

    try {

      if (!req.file) {

        return res
          .status(400)
          .json({

            success:
              false,

            found:
              false,

            match:
              "none",

            message:
              "❌ Fadlan sawir geli."

          });

      }


      const buffer =
        req.file.buffer;


      /* =========================================
         LEVEL 1
         EXACT SHA-256
      ========================================= */

      const imageHash =
        sha256(
          buffer
        );


      const exact =
        await get(

          `

          SELECT

            id,
            title,
            content,
            image_url,
            audio_url,
            image_hash,
            image_phash,
            created_at,
            updated_at

          FROM knowledge

          WHERE image_hash =
            $1

          ORDER BY id DESC

          LIMIT 1

          `,

          [
            imageHash
          ]

        );


      if (exact) {

        return res.json({

          success:
            true,

          found:
            true,

          match:
            "exact",

          title:
            exact.title || "",

          content:
            exact.content || "",

          image_url:
            exact.image_url || "",

          audio_url:
            exact.audio_url || "",

          knowledge:
            rowToKnowledge(
              exact
            ),

          message:
            "✅ Sawirka Database-ka waa laga helay."

        });

      }


      /* =========================================
         LEVEL 2
         SIMILAR IMAGE
      ========================================= */

      const incomingPhash =
        await pHash(
          buffer
        );


      const rows =
        await all(

          `

          SELECT

            id,
            title,
            content,
            image_url,
            audio_url,
            image_hash,
            image_phash,
            created_at,
            updated_at

          FROM knowledge

          WHERE

            image_data
            IS NOT NULL

            AND

            image_phash
            IS NOT NULL

          `

        );


      let best =
        null;


      for (
        const row
        of rows
      ) {

        const distance =
          hammingDistance(

            incomingPhash,

            row.image_phash

          );


        if (
          !best ||
          distance <
          best.distance
        ) {

          best = {

            row,

            distance

          };

        }

      }


      if (
        best &&
        best.distance <=
        PHASH_THRESHOLD
      ) {

        return res.json({

          success:
            true,

          found:
            true,

          match:
            "similar",

          similarity_distance:
            best.distance,

          title:
            best.row.title ||
            "",

          content:
            best.row.content ||
            "",

          image_url:
            best.row.image_url ||
            "",

          audio_url:
            best.row.audio_url ||
            "",

          knowledge:
            rowToKnowledge(
              best.row
            ),

          message:
            "✅ Sawir la mid ah ayaa Database-ka laga helay."

        });

      }


      /* =========================================
         DATABASE MISS
         APP.JS SHOULD CONTINUE TO /chat
      ========================================= */

      return res
        .status(404)
        .json({

          success:
            false,

          found:
            false,

          match:
            "none",

          message:
            "❌ Sawirkan Database-ka lagama helin.",

          ai_fallback:
            true

        });

    } catch (
      error
    ) {

      console.error(
        "MATCH IMAGE ERROR:",
        error
      );


      res
        .status(500)
        .json({

          success:
            false,

          found:
            false,

          match:
            "error",

          error:
            error.message

        });

    }

  }

);


/* =====================================================
   PUBLIC CHAT
   TEXT + IMAGE
===================================================== */

app.post(
  "/chat",
  async (
    req,
    res
  ) => {

    try {

      if (
        !ai ||
        !OPENROUTER_API_KEY
      ) {

        return res
          .status(500)
          .json({

            success:
              false,

            error:
              "OPENROUTER_API_KEY lama darin."

          });

      }


      const message =
        String(
          req.body.message ||
          ""
        )
        .trim();


      const image =
        req.body.image ||
        null;


      const clientId =
        String(
          req.body.clientId ||
          ""
        )
        .trim();


      if (
        !message &&
        !image
      ) {

        return res
          .status(400)
          .json({

            success:
              false,

            error:
              "Qoraal ama sawir soo dir."

          });

      }


      let responseText =
        "";


      /* =========================================
         IMAGE → VISION AI
      ========================================= */

      if (image) {

        const dataUrl =

          image.startsWith(
            "data:"
          )

            ? image

            : `data:image/jpeg;base64,${image}`;


        const prompt =

          message ||

          `

Sawirkan si taxaddar leh u eeg.

Af Soomaali iigu sharax.

1. Akhri qoraalka ku qoran sawirka.

2. Akhri tirooyinka iyo lambarrada.

3. Akhri taariikhaha haddii ay jiraan.

4. Sheeg magaca badeecadda ama shirkadda.

5. Sharax waxa sawirku yahay.

6. Haddii qoraal aanu caddeyn,
   sheeg waxa aan la hubin.

Ha sameyn xog aan sawirka ku jirin.

`;


        const completion =

          await ai.chat.completions.create({

            model:
              VISION_MODEL,

            messages: [

              {

                role:
                  "system",

                content:
                  `
Waxaad tahay AI ka tirsan
NASIIB BUSINESS CENTER.

Had iyo jeer Af Soomaali ku jawaab.

Marka sawir la diro,
si taxaddar leh u akhri:

- qoraalka
- tirooyinka
- taariikhaha
- magaca badeecadda
- xogta muuqata

Ha sameyn xog aan sawirka ku jirin.
`

              },

              {

                role:
                  "user",

                content: [

                  {

                    type:
                      "text",

                    text:
                      prompt

                  },

                  {

                    type:
                      "image_url",

                    image_url: {

                      url:
                        dataUrl

                    }

                  }

                ]

              }

            ],

            max_tokens:
              1500

          });


        responseText =

          completion
            .choices?.[0]
            ?.message
            ?.content ||

          "Sawirka waan helay, laakiin jawaab lama soo saari karin.";

      }


      /* =========================================
         TEXT → AI
      ========================================= */

      else {

        const completion =

          await ai.chat.completions.create({

            model:
              AI_MODEL,

            messages: [

              {

                role:
                  "system",

                content:
                  `
Waxaad tahay AI ka tirsan
NASIIB BUSINESS CENTER.

Had iyo jeer Af Soomaali ku jawaab.

Jawaabta ka dhig mid cad,
kooban oo waxtar leh.
`

              },

              {

                role:
                  "user",

                content:
                  message

              }

            ],

            max_tokens:
              1200

          });


        responseText =

          completion
            .choices?.[0]
            ?.message
            ?.content ||

          "Jawaab lama helin.";

      }


      /* =========================================
         SAVE CHAT
      ========================================= */

      let savedChat =
        null;


      try {

        let imageBuffer =
          null;


        if (
          image &&
          image.includes(
            "base64,"
          )
        ) {

          imageBuffer =
            Buffer.from(

              image
                .split(
                  "base64,"
                )[1],

              "base64"

            );

        }


        const result =
          await query(

            `

            INSERT INTO chats

            (
              client_id,
              message,
              image_data,
              image_mime,
              response
            )

            VALUES

            (
              $1,
              $2,
              $3,
              $4,
              $5
            )

            RETURNING

              id,
              client_id,
              message,
              response,
              created_at

            `,

            [

              clientId ||
                null,

              message ||
                null,

              imageBuffer,

              image
                ? "image/jpeg"
                : null,

              responseText

            ]

          );


        savedChat =
          result.rows[0];

      } catch (
        dbError
      ) {

        console.error(
          "CHAT SAVE ERROR:",
          dbError
        );

      }


      res.json({

        success:
          true,

        response:
          responseText,

        message:
          responseText,

        chat:
          savedChat

      });

    } catch (
      error
    ) {

      console.error(
        "CHAT ERROR:",
        error
      );


      res
        .status(500)
        .json({

          success:
            false,

          error:
            error?.error?.message ||
            error?.message ||
            "AI response error."

        });

    }

  }
);


/* =====================================================
   CHAT HISTORY
===================================================== */

app.get(
  "/api/chats",
  async (
    req,
    res
  ) => {

    try {

      const clientId =
        String(
          req.query.clientId ||
          ""
        )
        .trim();


      if (!clientId) {

        return res.json({

          success:
            true,

          chats:
            []

        });

      }


      const rows =
        await all(

          `

          SELECT

            id,
            client_id,
            message,
            response,
            created_at

          FROM chats

          WHERE client_id =
            $1

          ORDER BY
            id ASC

          `,

          [
            clientId
          ]

        );


      res.json({

        success:
          true,

        chats:
          rows

      });

    } catch (
      error
    ) {

      res
        .status(500)
        .json({

          success:
            false,

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
  async (
    req,
    res
  ) => {

    try {

      const clientId =
        String(

          req.body?.clientId ||

          req.query.clientId ||

          ""

        )
        .trim();


      if (!clientId) {

        return res
          .status(400)
          .json({

            success:
              false,

            error:
              "clientId ayaa loo baahan yahay."

          });

      }


      await query(

        `

        DELETE FROM chats

        WHERE client_id =
          $1

        `,

        [
          clientId
        ]

      );


      res.json({

        success:
          true,

        message:
          "Chat history waa la tirtiray."

      });

    } catch (
      error
    ) {

      res
        .status(500)
        .json({

          success:
            false,

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
  adminMiddleware,
  async (
    req,
    res
  ) => {

    try {

      const rows =
        await all(`

          SELECT

            id,
            client_id,
            message,
            response,
            created_at

          FROM chats

          ORDER BY
            id DESC

          LIMIT 500

        `);


      res.json({

        success:
          true,

        chats:
          rows

      });

    } catch (
      error
    ) {

      res
        .status(500)
        .json({

          success:
            false,

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
  adminMiddleware,
  async (
    req,
    res
  ) => {

    try {

      const rows =
        await all(`

          SELECT

            id,
            email,
            role,
            created_at

          FROM users

          ORDER BY
            id DESC

        `);


      res.json({

        success:
          true,

        users:
          rows

      });

    } catch (
      error
    ) {

      res
        .status(500)
        .json({

          success:
            false,

          error:
            error.message

        });

    }

  }
);


/* =====================================================
   STATIC FILES
===================================================== */

app.use(

  express.static(
    path.join(
      __dirname,
      "public"
    )
  )

);


/* =====================================================
   ADMIN PAGE
===================================================== */

app.get(
  "/admin",
  (
    req,
    res
  ) => {

    res.sendFile(

      path.join(
        __dirname,
        "public",
        "admin",
        "index.html"
      )

    );

  }
);


app.get(
  "/admin/",
  (
    req,
    res
  ) => {

    res.sendFile(

      path.join(
        __dirname,
        "public",
        "admin",
        "index.html"
      )

    );

  }
);


/* =====================================================
   HOME
===================================================== */

app.get(
  "/",
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


/* =====================================================
   ERROR HANDLER
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
      error instanceof
      multer.MulterError
    ) {

      return res
        .status(400)
        .json({

          success:
            false,

          error:
            `Upload error: ${error.message}`

        });

    }


    res
      .status(500)
      .json({

        success:
          false,

        error:
          error.message ||
          "Internal server error."

      });

  }

);


/* =====================================================
   START SERVER
===================================================== */

async function startServer() {

  try {

    await query(
      "SELECT NOW()"
    );


    console.log(
      "✅ PostgreSQL connected."
    );


    await initializeDatabase();


    await createDefaultAdmin();


    app.listen(

      PORT,

      "0.0.0.0",

      () => {

        console.log("");
        console.log(
          "=========================================="
        );

        console.log(
          "🚀 NASIIB BUSINESS CENTER"
        );

        console.log(
          "=========================================="
        );

        console.log(
          `🌐 PORT: ${PORT}`
        );

        console.log(
          "🗄️ DATABASE: PostgreSQL"
        );

        console.log(
          `🤖 AI MODEL: ${AI_MODEL}`
        );

        console.log(
          `👁️ VISION MODEL: ${VISION_MODEL}`
        );

        console.log(
          `🔎 PHASH THRESHOLD: ${PHASH_THRESHOLD}`
        );

        console.log(
          "👤 PUBLIC USER: NO LOGIN"
        );

        console.log(
          "👑 ADMIN: /admin/"
        );

        console.log(
          "🖼️ IMAGE MATCH: /api/match-image"
        );

        console.log(
          "💬 CHAT: /chat"
        );

        console.log(
          "=========================================="
        );

      }

    );

  } catch (
    error
  ) {

    console.error(
      "❌ SERVER START ERROR:",
      error
    );

    process.exit(1);

  }

}


/* =====================================================
   SHUTDOWN
===================================================== */

process.on(
  "SIGINT",
  async () => {

    await pool.end();

    process.exit(0);

  }
);


process.on(
  "SIGTERM",
  async () => {

    await pool.end();

    process.exit(0);

  }
);


/* =====================================================
   RUN
===================================================== */

startServer();
