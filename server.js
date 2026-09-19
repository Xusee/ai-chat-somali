/* =========================================================
   NASIIB BUSINESS CENTER
   COMPLETE SERVER.JS

   FEATURES
   ---------------------------------------------------------
   👤 Public User - Login looma baahna
   💬 POST /chat
   🖼️ POST /api/match-image
   📚 SQLite Knowledge Database
   👨‍💼 Admin JWT Login
   📝 Knowledge CRUD
   🔎 Search
   🖼️ Image Upload
   🎤 Audio Upload
   🔊 Audio Transcription
   💾 Chat History
   🗑️ Delete Chat
   ❤️ /api/health
   🤖 OpenRouter AI
========================================================= */

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const sqlite3 = require("sqlite3").verbose();
const OpenAI = require("openai");

/* =========================================================
   CONFIG
========================================================= */

const app = express();

const PORT =
    Number(process.env.PORT) || 3000;

const JWT_SECRET =
    process.env.JWT_SECRET ||
    "CHANGE_THIS_JWT_SECRET";

const OPENROUTER_API_KEY =
    process.env.OPENROUTER_API_KEY || "";

const OPENAI_API_KEY =
    process.env.OPENAI_API_KEY || "";

const AI_MODEL =
    process.env.AI_MODEL ||
    "openrouter/free";

const APP_URL =
    process.env.APP_URL ||
    `http://localhost:${PORT}`;

const ADMIN_EMAIL =
    process.env.ADMIN_EMAIL ||
    "admin@nasiib.com";

const ADMIN_PASSWORD =
    process.env.ADMIN_PASSWORD ||
    "123456";

/* =========================================================
   DIRECTORIES
========================================================= */

const PUBLIC_DIR =
    path.join(__dirname, "public");

const DATABASE_DIR =
    path.join(__dirname, "database");

const UPLOADS_DIR =
    path.join(__dirname, "uploads");

const KNOWLEDGE_DIR =
    path.join(
        UPLOADS_DIR,
        "knowledge"
    );

[
    DATABASE_DIR,
    UPLOADS_DIR,
    KNOWLEDGE_DIR
].forEach((dir) => {

    if (!fs.existsSync(dir)) {

        fs.mkdirSync(
            dir,
            {
                recursive: true
            }
        );

    }

});

/* =========================================================
   EXPRESS
========================================================= */

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
    express.static(
        PUBLIC_DIR
    )
);

app.use(
    "/uploads",
    express.static(
        UPLOADS_DIR
    )
);

/* =========================================================
   SQLITE
========================================================= */

const DB_FILE =
    path.join(
        DATABASE_DIR,
        "database.sqlite"
    );

const db =
    new sqlite3.Database(
        DB_FILE,
        (error) => {

            if (error) {

                console.error(
                    "❌ SQLite Error:",
                    error
                );

                process.exit(1);
            }

            console.log(
                "🗄️ SQLite connected"
            );

        }
    );

/* =========================================================
   DATABASE HELPERS
========================================================= */

function dbRun(
    sql,
    params = []
) {

    return new Promise(
        (resolve, reject) => {

            db.run(
                sql,
                params,
                function (error) {

                    if (error) {

                        reject(error);

                        return;
                    }

                    resolve({
                        id:
                            this.lastID,

                        changes:
                            this.changes
                    });

                }
            );

        }
    );

}

function dbGet(
    sql,
    params = []
) {

    return new Promise(
        (resolve, reject) => {

            db.get(
                sql,
                params,
                (
                    error,
                    row
                ) => {

                    if (error) {

                        reject(error);

                        return;
                    }

                    resolve(row);

                }
            );

        }
    );

}

function dbAll(
    sql,
    params = []
) {

    return new Promise(
        (resolve, reject) => {

            db.all(
                sql,
                params,
                (
                    error,
                    rows
                ) => {

                    if (error) {

                        reject(error);

                        return;
                    }

                    resolve(
                        rows || []
                    );

                }
            );

        }
    );

}

/* =========================================================
   DATABASE INITIALIZATION
========================================================= */

async function initializeDatabase() {

    await dbRun(`
        CREATE TABLE IF NOT EXISTS users (

            id INTEGER
            PRIMARY KEY
            AUTOINCREMENT,

            email TEXT
            UNIQUE
            NOT NULL,

            password TEXT
            NOT NULL,

            role TEXT
            DEFAULT 'user',

            created_at DATETIME
            DEFAULT CURRENT_TIMESTAMP

        )
    `);

    await dbRun(`
        CREATE TABLE IF NOT EXISTS knowledge (

            id INTEGER
            PRIMARY KEY
            AUTOINCREMENT,

            title TEXT,

            content TEXT,

            image_url TEXT,

            audio_url TEXT,

            image_hash TEXT,

            created_at DATETIME
            DEFAULT CURRENT_TIMESTAMP,

            updated_at DATETIME
            DEFAULT CURRENT_TIMESTAMP

        )
    `);

    await dbRun(`
        CREATE TABLE IF NOT EXISTS chats (

            id INTEGER
            PRIMARY KEY
            AUTOINCREMENT,

            client_id TEXT,

            user_id INTEGER,

            message TEXT,

            image TEXT,

            response TEXT,

            created_at DATETIME
            DEFAULT CURRENT_TIMESTAMP

        )
    `);

}

/* =========================================================
   DEFAULT ADMIN
========================================================= */

async function createDefaultAdmin() {

    const email =
        ADMIN_EMAIL
            .trim()
            .toLowerCase();

    const existing =
        await dbGet(
            `
            SELECT id
            FROM users
            WHERE email = ?
            `,
            [email]
        );

    if (existing) {
        return;
    }

    const hash =
        await bcrypt.hash(
            ADMIN_PASSWORD,
            10
        );

    await dbRun(
        `
        INSERT INTO users
        (
            email,
            password,
            role
        )
        VALUES (?, ?, 'admin')
        `,
        [
            email,
            hash
        ]
    );

    console.log(
        "👨‍💼 Admin created:",
        email
    );

}

/* =========================================================
   OPENROUTER
========================================================= */

let openrouter = null;

if (OPENROUTER_API_KEY) {

    openrouter =
        new OpenAI({

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

        });

} else {

    console.warn(
        "⚠️ OPENROUTER_API_KEY lama dejin."
    );

}

/* =========================================================
   OPENAI - AUDIO
========================================================= */

let openai = null;

if (OPENAI_API_KEY) {

    openai =
        new OpenAI({

            apiKey:
                OPENAI_API_KEY

        });

} else {

    console.warn(
        "⚠️ OPENAI_API_KEY lama dejin."
    );

}

/* =========================================================
   MULTER - IMAGE STORAGE
========================================================= */

const imageStorage =
    multer.diskStorage({

        destination:
            function (
                req,
                file,
                cb
            ) {

                cb(
                    null,
                    KNOWLEDGE_DIR
                );

            },

        filename:
            function (
                req,
                file,
                cb
            ) {

                const ext =
                    path.extname(
                        file.originalname ||
                        ""
                    );

                const filename =
                    "knowledge-" +
                    Date.now() +
                    "-" +
                    crypto
                        .randomBytes(5)
                        .toString("hex") +
                    ext;

                cb(
                    null,
                    filename
                );

            }

    });

const imageUpload =
    multer({

        storage:
            imageStorage,

        limits: {

            fileSize:
                10 * 1024 * 1024

        },

        fileFilter:
            function (
                req,
                file,
                cb
            ) {

                if (
                    (
                        file.mimetype ||
                        ""
                    ).startsWith(
                        "image/"
                    )
                ) {

                    cb(
                        null,
                        true
                    );

                    return;
                }

                cb(
                    new Error(
                        "Fadlan sawir geli."
                    )
                );

            }

    });

/* =========================================================
   MULTER - AUDIO MEMORY
========================================================= */

const audioUpload =
    multer({

        storage:
            multer.memoryStorage(),

        limits: {

            fileSize:
                25 * 1024 * 1024

        },

        fileFilter:
            function (
                req,
                file,
                cb
            ) {

                if (
                    (
                        file.mimetype ||
                        ""
                    ).startsWith(
                        "audio/"
                    )
                ) {

                    cb(
                        null,
                        true
                    );

                    return;
                }

                cb(
                    new Error(
                        "Fadlan audio/cod geli."
                    )
                );

            }

    });

/* =========================================================
   MULTER - IMAGE MEMORY
   Waxaa loo isticmaalaa /api/match-image
========================================================= */

const imageMemoryUpload =
    multer({

        storage:
            multer.memoryStorage(),

        limits: {

            fileSize:
                10 * 1024 * 1024

        },

        fileFilter:
            function (
                req,
                file,
                cb
            ) {

                if (
                    (
                        file.mimetype ||
                        ""
                    ).startsWith(
                        "image/"
                    )
                ) {

                    cb(
                        null,
                        true
                    );

                    return;
                }

                cb(
                    new Error(
                        "Fadlan sawir geli."
                    )
                );

            }

    });

/* =========================================================
   JWT
========================================================= */

function createToken(user) {

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

/* =========================================================
   IMAGE HASH
========================================================= */

function imageHash(buffer) {

    return crypto
        .createHash("sha256")
        .update(buffer)
        .digest("hex");

}

/* =========================================================
   ADMIN MIDDLEWARE
========================================================= */

async function adminMiddleware(
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
                        "Admin login required."

                });

        }

        const token =
            authorization.substring(7);

        const decoded =
            jwt.verify(
                token,
                JWT_SECRET
            );

        const admin =
            await dbGet(
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
            !admin ||
            admin.role !== "admin"
        ) {

            return res
                .status(403)
                .json({

                    success: false,

                    error:
                        "Admin access only."

                });

        }

        req.admin =
            admin;

        next();

    } catch (error) {

        return res
            .status(401)
            .json({

                success: false,

                error:
                    "Token-ka Admin-ka waa khalad ama wuu dhacay."

            });

    }

}

/* =========================================================
   HEALTH
========================================================= */

app.get(
    "/api/health",
    async (req, res) => {

        try {

            await dbGet(
                "SELECT 1"
            );

            res.json({

                status:
                    "online",

                database:
                    "sqlite",

                ai:
                    openrouter
                        ? "ready"
                        : "missing",

                transcription:
                    openai
                        ? "ready"
                        : "missing",

                model:
                    AI_MODEL

            });

        } catch (error) {

            res
                .status(500)
                .json({

                    status:
                        "error",

                    error:
                        error.message

                });

        }

    }
);

/* =========================================================
   ADMIN LOGIN
========================================================= */

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
                await dbGet(
                    `
                    SELECT *
                    FROM users
                    WHERE email = ?
                    `,
                    [email]
                );

            if (!user) {

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

            if (
                user.role !==
                "admin"
            ) {

                return res
                    .status(403)
                    .json({

                        success: false,

                        error:
                            "Admin access only."

                    });

            }

            const token =
                createToken(user);

            res.json({

                success: true,

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

        } catch (error) {

            console.error(
                "LOGIN ERROR:",
                error
            );

            res
                .status(500)
                .json({

                    success: false,

                    error:
                        "Server error."

                });

        }

    }
);

/* =========================================================
   ADMIN ME
========================================================= */

app.get(
    "/api/admin/me",
    adminMiddleware,
    (req, res) => {

        res.json({

            success: true,

            user:
                req.admin

        });

    }
);

/* =========================================================
   GET KNOWLEDGE
========================================================= */

app.get(
    "/api/admin/knowledge",
    adminMiddleware,
    async (req, res) => {

        try {

            const rows =
                await dbAll(
                    `
                    SELECT
                        id,
                        title,
                        content,
                        image_url,
                        audio_url,
                        created_at,
                        updated_at
                    FROM knowledge
                    ORDER BY id DESC
                    `
                );

            res.json({

                success: true,

                knowledge:
                    rows

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

/* =========================================================
   SEARCH KNOWLEDGE
========================================================= */

app.get(
    "/api/admin/knowledge/search",
    adminMiddleware,
    async (req, res) => {

        try {

            const q =
                String(
                    req.query.q ||
                    ""
                ).trim();

            if (!q) {

                return res.json({

                    success: true,

                    knowledge: []

                });

            }

            const search =
                `%${q}%`;

            const rows =
                await dbAll(
                    `
                    SELECT *
                    FROM knowledge
                    WHERE
                        title LIKE ?
                        OR content LIKE ?
                    ORDER BY id DESC
                    `,
                    [
                        search,
                        search
                    ]
                );

            res.json({

                success: true,

                knowledge:
                    rows

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

/* =========================================================
   ADD KNOWLEDGE
========================================================= */

app.post(
    "/api/admin/knowledge",
    adminMiddleware,
    imageUpload.single("image"),
    async (req, res) => {

        try {

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

            const audioUrl =
                String(
                    req.body.audio_url ||
                    ""
                ).trim();

            if (
                !title &&
                !content &&
                !req.file &&
                !audioUrl
            ) {

                return res
                    .status(400)
                    .json({

                        success: false,

                        error:
                            "Wax xog ah geli."

                    });

            }

            let imageUrl = "";

            let hash = "";

            if (req.file) {

                imageUrl =
                    "/uploads/knowledge/" +
                    req.file.filename;

                const buffer =
                    fs.readFileSync(
                        req.file.path
                    );

                hash =
                    imageHash(buffer);

            }

            const result =
                await dbRun(
                    `
                    INSERT INTO knowledge
                    (
                        title,
                        content,
                        image_url,
                        audio_url,
                        image_hash
                    )
                    VALUES (?, ?, ?, ?, ?)
                    `,
                    [
                        title,
                        content,
                        imageUrl,
                        audioUrl,
                        hash
                    ]
                );

            const knowledge =
                await dbGet(
                    `
                    SELECT *
                    FROM knowledge
                    WHERE id = ?
                    `,
                    [result.id]
                );

            res.json({

                success: true,

                message:
                    "Knowledge waa la kaydiyey.",

                knowledge

            });

        } catch (error) {

            console.error(
                "ADD KNOWLEDGE ERROR:",
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

/* =========================================================
   EDIT KNOWLEDGE
========================================================= */

app.put(
    "/api/admin/knowledge/:id",
    adminMiddleware,
    imageUpload.single("image"),
    async (req, res) => {

        try {

            const id =
                Number(
                    req.params.id
                );

            const old =
                await dbGet(
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

            const title =
                String(
                    req.body.title ??
                    old.title ??
                    ""
                ).trim();

            const content =
                String(
                    req.body.content ??
                    old.content ??
                    ""
                ).trim();

            const audioUrl =
                String(
                    req.body.audio_url ??
                    old.audio_url ??
                    ""
                ).trim();

            let imageUrl =
                old.image_url || "";

            let hash =
                old.image_hash || "";

            if (req.file) {

                imageUrl =
                    "/uploads/knowledge/" +
                    req.file.filename;

                const buffer =
                    fs.readFileSync(
                        req.file.path
                    );

                hash =
                    imageHash(buffer);

                if (
                    old.image_url
                ) {

                    deleteLocalFile(
                        old.image_url
                    );

                }

            }

            await dbRun(
                `
                UPDATE knowledge
                SET
                    title = ?,
                    content = ?,
                    image_url = ?,
                    audio_url = ?,
                    image_hash = ?,
                    updated_at =
                        CURRENT_TIMESTAMP
                WHERE id = ?
                `,
                [
                    title,
                    content,
                    imageUrl,
                    audioUrl,
                    hash,
                    id
                ]
            );

            const updated =
                await dbGet(
                    `
                    SELECT *
                    FROM knowledge
                    WHERE id = ?
                    `,
                    [id]
                );

            res.json({

                success: true,

                message:
                    "Knowledge waa la cusbooneysiiyey.",

                knowledge:
                    updated

            });

        } catch (error) {

            console.error(
                "EDIT KNOWLEDGE ERROR:",
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

/* =========================================================
   DELETE LOCAL FILE
========================================================= */

function deleteLocalFile(
    url
) {

    if (!url) {
        return;
    }

    const filename =
        path.basename(url);

    const file =
        path.join(
            KNOWLEDGE_DIR,
            filename
        );

    if (
        fs.existsSync(file)
    ) {

        try {

            fs.unlinkSync(file);

        } catch (error) {

            console.error(
                "FILE DELETE ERROR:",
                error.message
            );

        }

    }

}

/* =========================================================
   DELETE KNOWLEDGE
========================================================= */

app.delete(
    "/api/admin/knowledge/:id",
    adminMiddleware,
    async (req, res) => {

        try {

            const id =
                Number(
                    req.params.id
                );

            const item =
                await dbGet(
                    `
                    SELECT *
                    FROM knowledge
                    WHERE id = ?
                    `,
                    [id]
                );

            if (!item) {

                return res
                    .status(404)
                    .json({

                        success: false,

                        error:
                            "Knowledge lama helin."

                    });

            }

            await dbRun(
                `
                DELETE FROM knowledge
                WHERE id = ?
                `,
                [id]
            );

            deleteLocalFile(
                item.image_url
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

/* =========================================================
   AUDIO TRANSCRIPTION
========================================================= */

app.post(
    "/api/admin/knowledge/transcribe",
    adminMiddleware,
    audioUpload.single("audio"),
    async (req, res) => {

        try {

            if (!req.file) {

                return res
                    .status(400)
                    .json({

                        success: false,

                        error:
                            "Fadlan cod geli."

                    });

            }

            if (!openai) {

                return res
                    .status(503)
                    .json({

                        success: false,

                        error:
                            "OPENAI_API_KEY lama dejin."

                    });

            }

            const audioFile =
                new File(
                    [
                        req.file.buffer
                    ],
                    req.file.originalname ||
                    "audio.webm",
                    {
                        type:
                            req.file.mimetype ||
                            "audio/webm"
                    }
                );

            const transcription =
                await openai
                    .audio
                    .transcriptions
                    .create({

                        file:
                            audioFile,

                        model:
                            "gpt-4o-transcribe"

                    });

            res.json({

                success: true,

                text:
                    transcription.text ||
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

/* =========================================================
   IMAGE MATCH
========================================================= */

app.post(
    "/api/match-image",
    imageMemoryUpload.single("image"),
    async (req, res) => {

        try {

            if (!req.file) {

                return res
                    .status(400)
                    .json({

                        success: false,

                        found: false,

                        error:
                            "Fadlan sawir geli."

                    });

            }

            const hash =
                imageHash(
                    req.file.buffer
                );

            const matched =
                await dbGet(
                    `
                    SELECT
                        id,
                        title,
                        content,
                        image_url,
                        audio_url,
                        created_at
                    FROM knowledge
                    WHERE image_hash = ?
                    LIMIT 1
                    `,
                    [hash]
                );

            if (!matched) {

                return res
                    .status(404)
                    .json({

                        success: false,

                        found: false,

                        match: "none",

                        message:
                            "❌ Sawirkan Database-ka lagama helin."

                    });

            }

            const knowledge = {

                id:
                    matched.id,

                title:
                    matched.title || "",

                content:
                    matched.content || "",

                image_url:
                    matched.image_url || "",

                audio_url:
                    matched.audio_url || "",

                created_at:
                    matched.created_at || ""

            };

            res.json({

                success: true,

                found: true,

                match:
                    "exact",

                message:
                    "✅ Sawirka Database-ka waa laga helay.",

                title:
                    knowledge.title,

                content:
                    knowledge.content,

                image_url:
                    knowledge.image_url,

                audio_url:
                    knowledge.audio_url,

                knowledge

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

                    error:
                        error.message

                });

        }

    }
);

/* =========================================================
   PUBLIC CHAT
   Login looma baahna
========================================================= */

app.post(
    "/chat",
    async (req, res) => {

        try {

            const message =
                String(
                    req.body.message ||
                    ""
                ).trim();

            const clientId =
                String(
                    req.body.client_id ||
                    ""
                ).trim();

            const image =
                String(
                    req.body.image ||
                    ""
                ).trim();

            if (!message && !image) {

                return res
                    .status(400)
                    .json({

                        success: false,

                        error:
                            "Fariin ama sawir geli."

                    });

            }

            if (!openrouter) {

                return res
                    .status(503)
                    .json({

                        success: false,

                        error:
                            "OpenRouter API lama dejin."

                    });

            }

            const systemPrompt = `
Waxaad tahay AI Assistant-ka
NASIIB BUSINESS CENTER.

Jawaabahaaga ku qor Af-Soomaali
marka ay suurtagal tahay.

Noqo mid cad, waxtar leh,
oo si wanaagsan u sharaxaya
su'aasha isticmaalaha.
`;

            const userContent = [];

            if (message) {

                userContent.push({

                    type:
                        "text",

                    text:
                        message

                });

            }

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

            const completion =
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
                                    systemPrompt
                            },

                            {
                                role:
                                    "user",

                                content:
                                    userContent
                            }

                        ]

                    });

            const response =
                completion
                    .choices?.[0]
                    ?.message
                    ?.content ||
                "Jawaab lama helin.";

            await dbRun(
                `
                INSERT INTO chats
                (
                    client_id,
                    message,
                    image,
                    response
                )
                VALUES (?, ?, ?, ?)
                `,
                [
                    clientId,
                    message,
                    image,
                    response
                ]
            );

            res.json({

                success: true,

                response,

                message:
                    response

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

/* =========================================================
   CHAT HISTORY
========================================================= */

app.get(
    "/api/chats",
    async (req, res) => {

        try {

            const clientId =
                String(
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
                await dbAll(
                    `
                    SELECT
                        id,
                        message,
                        image,
                        response,
                        created_at
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

/* =========================================================
   DELETE CHAT HISTORY
========================================================= */

app.delete(
    "/api/chats",
    async (req, res) => {

        try {

            const clientId =
                String(
                    req.query.client_id ||
                    req.body.client_id ||
                    ""
                ).trim();

            if (!clientId) {

                return res
                    .status(400)
                    .json({

                        success: false,

                        error:
                            "client_id ayaa loo baahan yahay."

                    });

            }

            await dbRun(
                `
                DELETE FROM chats
                WHERE client_id = ?
                `,
                [clientId]
            );

            res.json({

                success: true,

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

/* =========================================================
   ADMIN - ALL CHATS
========================================================= */

app.get(
    "/api/admin/chats",
    adminMiddleware,
    async (req, res) => {

        try {

            const chats =
                await dbAll(
                    `
                    SELECT *
                    FROM chats
                    ORDER BY id DESC
                    `
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

/* =========================================================
   ADMIN - USERS
========================================================= */

app.get(
    "/api/admin/users",
    adminMiddleware,
    async (req, res) => {

        try {

            const users =
                await dbAll(
                    `
                    SELECT
                        id,
                        email,
                        role,
                        created_at
                    FROM users
                    ORDER BY id DESC
                    `
                );

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

/* =========================================================
   ADMIN DELETE ALL CHATS
========================================================= */

app.delete(
    "/api/admin/chats",
    adminMiddleware,
    async (req, res) => {

        try {

            await dbRun(
                "DELETE FROM chats"
            );

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
                        error.message

                });

        }

    }
);

/* =========================================================
   FRONTEND
========================================================= */

app.get(
    "/",
    (req, res) => {

        res.sendFile(
            path.join(
                PUBLIC_DIR,
                "index.html"
            )
        );

    }
);

/* =========================================================
   ADMIN FRONTEND
========================================================= */

app.get(
    "/admin",
    (req, res) => {

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
    (req, res) => {

        res.sendFile(
            path.join(
                PUBLIC_DIR,
                "admin",
                "index.html"
            )
        );

    }
);

/* =========================================================
   API 404
========================================================= */

app.use(
    "/api",
    (req, res) => {

        res
            .status(404)
            .json({

                success: false,

                error:
                    "API endpoint lama helin."

            });

    }
);

/* =========================================================
   ERROR HANDLER
========================================================= */

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

                    success: false,

                    error:
                        error.message

                });

        }

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

/* =========================================================
   START SERVER
========================================================= */

async function startServer() {

    try {

        await initializeDatabase();

        await createDefaultAdmin();

        app.listen(
            PORT,
            () => {

                console.log("");
                console.log(
                    "======================================"
                );

                console.log(
                    "🚀 NASIIB BUSINESS CENTER"
                );

                console.log(
                    `🌐 http://localhost:${PORT}`
                );

                console.log(
                    `👨‍💼 Admin: http://localhost:${PORT}/admin/`
                );

                console.log(
                    `❤️ Health: http://localhost:${PORT}/api/health`
                );

                console.log(
                    "🗄️ SQLite: READY"
                );

                console.log(
                    openrouter
                        ? "🤖 OpenRouter: READY"
                        : "⚠️ OpenRouter: NOT READY"
                );

                console.log(
                    openai
                        ? "🎤 Audio: READY"
                        : "⚠️ Audio: NOT READY"
                );

                console.log(
                    "======================================"
                );

                console.log("");

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
