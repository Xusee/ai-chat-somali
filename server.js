/* =========================================================
   NASIIB BUSINESS CENTER
   COMPLETE CLEAN SERVER.JS
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
    "CHANGE_THIS_SECRET";

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

const KNOWLEDGE_UPLOAD_DIR =
    path.join(
        UPLOADS_DIR,
        "knowledge"
    );

[
    DATABASE_DIR,
    UPLOADS_DIR,
    KNOWLEDGE_UPLOAD_DIR
].forEach(dir => {

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
   SQLITE DATABASE
========================================================= */

const DB_FILE =
    path.join(
        DATABASE_DIR,
        "database.sqlite"
    );

const db =
    new sqlite3.Database(
        DB_FILE,
        error => {

            if (error) {

                console.error(
                    "❌ DATABASE ERROR:",
                    error
                );

                process.exit(1);
            }

            console.log(
                "🗄️ SQLite connected:",
                DB_FILE
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
        (
            resolve,
            reject
        ) => {

            db.run(
                sql,
                params,
                function(error) {

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
        (
            resolve,
            reject
        ) => {

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
        (
            resolve,
            reject
        ) => {

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
   INITIALIZE DATABASE
========================================================= */

async function initializeDatabase() {

    await dbRun(`
        CREATE TABLE IF NOT EXISTS users (

            id
            INTEGER
            PRIMARY KEY
            AUTOINCREMENT,

            email
            TEXT
            UNIQUE
            NOT NULL,

            password
            TEXT
            NOT NULL,

            role
            TEXT
            DEFAULT 'user',

            created_at
            DATETIME
            DEFAULT CURRENT_TIMESTAMP

        )
    `);


    await dbRun(`
        CREATE TABLE IF NOT EXISTS chats (

            id
            INTEGER
            PRIMARY KEY
            AUTOINCREMENT,

            client_id
            TEXT,

            user_id
            INTEGER,

            message
            TEXT,

            image
            TEXT,

            response
            TEXT,

            created_at
            DATETIME
            DEFAULT CURRENT_TIMESTAMP

        )
    `);


    await dbRun(`
        CREATE TABLE IF NOT EXISTS knowledge (

            id
            INTEGER
            PRIMARY KEY
            AUTOINCREMENT,

            title
            TEXT,

            content
            TEXT,

            audio_url
            TEXT,

            image_url
            TEXT,

            created_at
            DATETIME
            DEFAULT CURRENT_TIMESTAMP,

            updated_at
            DATETIME
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

    const passwordHash =
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
            passwordHash
        ]
    );

    console.log(
        "👑 Default admin created:",
        email
    );

}

/* =========================================================
   OPENROUTER
========================================================= */

let openrouter = null;

if (
    OPENROUTER_API_KEY
) {

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
   OPENAI
========================================================= */

let openai = null;

if (
    OPENAI_API_KEY
) {

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
   MULTER STORAGE
========================================================= */

const knowledgeStorage =
    multer.diskStorage({

        destination:
            function(
                req,
                file,
                cb
            ) {

                cb(
                    null,
                    KNOWLEDGE_UPLOAD_DIR
                );

            },

        filename:
            function(
                req,
                file,
                cb
            ) {

                const extension =
                    path
                        .extname(
                            file.originalname ||
                            ""
                        )
                        .replace(
                            /[^a-zA-Z0-9.]/g,
                            ""
                        );

                const filename =
                    "knowledge-" +
                    Date.now() +
                    "-" +
                    crypto
                        .randomBytes(6)
                        .toString("hex") +
                    extension;

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
            function(
                req,
                file,
                cb
            ) {

                const type =
                    file.mimetype ||
                    "";

                if (
                    type.startsWith(
                        "image/"
                    ) ||
                    type.startsWith(
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
                        "Kaliya sawir ama cod ayaa la oggol yahay."
                    )
                );

            }

    });


/* =========================================================
   AUDIO MEMORY UPLOAD
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
            function(
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
                        "Fadlan cod geli."
                    )
                );

            }

    });


/* =========================================================
   IMAGE MEMORY UPLOAD
========================================================= */

const imageUpload =
    multer({

        storage:
            multer.memoryStorage(),

        limits: {

            fileSize:
                10 * 1024 * 1024

        },

        fileFilter:
            function(
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
   HELPERS
========================================================= */

function createToken(
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


function getImageHash(
    buffer
) {

    return crypto
        .createHash(
            "sha256"
        )
        .update(buffer)
        .digest("hex");

}


function deleteUploadedFile(
    url
) {

    if (!url) {
        return;
    }

    const filename =
        path.basename(
            url
        );

    const filePath =
        path.join(
            KNOWLEDGE_UPLOAD_DIR,
            filename
        );

    if (
        fs.existsSync(
            filePath
        )
    ) {

        try {

            fs.unlinkSync(
                filePath
            );

        } catch (error) {

            console.error(
                "FILE DELETE ERROR:",
                error.message
            );

        }

    }

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

        const auth =
            req.headers
                .authorization ||
            "";

        if (
            !auth.startsWith(
                "Bearer "
            )
        ) {

            return res
                .status(401)
                .json({

                    error:
                        "Admin login required."

                });

        }

        const token =
            auth.substring(
                7
            );

        const decoded =
            jwt.verify(
                token,
                JWT_SECRET
            );

        const user =
            await dbGet(
                `
                SELECT
                    id,
                    email,
                    role
                FROM users
                WHERE id = ?
                `,
                [
                    decoded.id
                ]
            );

        if (
            !user ||
            user.role !==
                "admin"
        ) {

            return res
                .status(403)
                .json({

                    error:
                        "Admin access only."

                });

        }

        req.admin =
            user;

        next();

    } catch (error) {

        return res
            .status(401)
            .json({

                error:
                    "Admin token waa khalad ama wuu dhacay."

            });

    }

}


/* =========================================================
   HEALTH
========================================================= */

app.get(
    "/api/health",
    async (
        req,
        res
    ) => {

        try {

            await dbGet(
                "SELECT 1 AS ok"
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
                    [
                        email
                    ]
                );

            if (!user) {

                return res
                    .status(401)
                    .json({

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

                        error:
                            "Akoonkan admin ma aha."

                    });

            }

            const token =
                createToken(
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

        } catch (error) {

            console.error(
                "LOGIN ERROR:",
                error
            );

            res
                .status(500)
                .json({

                    error:
                        "Login error."

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
    (
        req,
        res
    ) => {

        res.json({

            success:
                true,

            user: {

                id:
                    req.admin.id,

                email:
                    req.admin.email,

                role:
                    req.admin.role

            }

        });

    }
);


/* =========================================================
   GET KNOWLEDGE
========================================================= */

app.get(
    "/api/admin/knowledge",
    adminMiddleware,
    async (
        req,
        res
    ) => {

        try {

            const rows =
                await dbAll(
                    `
                    SELECT
                        id,
                        title,
                        content,
                        audio_url,
                        image_url,
                        created_at,
                        updated_at
                    FROM knowledge
                    ORDER BY id DESC
                    `
                );

            res.json(
                rows
            );

        } catch (error) {

            console.error(
                "GET KNOWLEDGE ERROR:",
                error
            );

            res
                .status(500)
                .json({

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
    async (
        req,
        res
    ) => {

        try {

            const q =
                String(
                    req.query.q ||
                    ""
                ).trim();

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
                        `%${q}%`,
                        `%${q}%`
                    ]
                );

            res.json(
                rows
            );

        } catch (error) {

            res
                .status(500)
                .json({

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

    knowledgeUpload.fields(
        [
            {
                name:
                    "audio",

                maxCount:
                    1
            },

            {
                name:
                    "image",

                maxCount:
                    1
            }
        ]
    ),

    async (
        req,
        res
    ) => {

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

            const audio =
                req.files?.audio?.[0] ||
                null;

            const image =
                req.files?.image?.[0] ||
                null;

            if (
                !title &&
                !content &&
                !audio &&
                !image
            ) {

                return res
                    .status(400)
                    .json({

                        error:
                            "Xog geli marka hore."

                    });

            }

            const audioUrl =
                audio
                    ? `/uploads/knowledge/${audio.filename}`
                    : null;

            const imageUrl =
                image
                    ? `/uploads/knowledge/${image.filename}`
                    : null;

            const result =
                await dbRun(
                    `
                    INSERT INTO knowledge
                    (
                        title,
                        content,
                        audio_url,
                        image_url
                    )
                    VALUES (?, ?, ?, ?)
                    `,
                    [
                        title,
                        content,
                        audioUrl,
                        imageUrl
                    ]
                );

            const saved =
                await dbGet(
                    `
                    SELECT *
                    FROM knowledge
                    WHERE id = ?
                    `,
                    [
                        result.id
                    ]
                );

            res.json({

                success:
                    true,

                message:
                    "Knowledge Database-ka waa lagu daray.",

                knowledge:
                    saved

            });

        } catch (error) {

            console.error(
                "ADD KNOWLEDGE ERROR:",
                error
            );

            res
                .status(500)
                .json({

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
                !Number.isInteger(
                    id
                )
            ) {

                return res
                    .status(400)
                    .json({

                        error:
                            "ID khalad ah."

                    });

            }

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

            const result =
                await dbRun(
                    `
                    UPDATE knowledge
                    SET
                        title = ?,
                        content = ?,
                        updated_at =
                            CURRENT_TIMESTAMP
                    WHERE id = ?
                    `,
                    [
                        title,
                        content,
                        id
                    ]
                );

            if (
                result.changes ===
                0
            ) {

                return res
                    .status(404)
                    .json({

                        error:
                            "Knowledge lama helin."

                    });

            }

            const updated =
                await dbGet(
                    `
                    SELECT *
                    FROM knowledge
                    WHERE id = ?
                    `,
                    [
                        id
                    ]
                );

            res.json({

                success:
                    true,

                knowledge:
                    updated

            });

        } catch (error) {

            res
                .status(500)
                .json({

                    error:
                        error.message

                });

        }

    }
);


/* =========================================================
   DELETE KNOWLEDGE
========================================================= */

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

            const item =
                await dbGet(
                    `
                    SELECT *
                    FROM knowledge
                    WHERE id = ?
                    `,
                    [
                        id
                    ]
                );

            if (!item) {

                return res
                    .status(404)
                    .json({

                        error:
                            "Knowledge lama helin."

                    });

            }

            await dbRun(
                `
                DELETE FROM knowledge
                WHERE id = ?
                `,
                [
                    id
                ]
            );

            deleteUploadedFile(
                item.image_url
            );

            deleteUploadedFile(
                item.audio_url
            );

            res.json({

                success:
                    true,

                message:
                    "Knowledge waa la tirtiray."

            });

        } catch (error) {

            console.error(
                "DELETE KNOWLEDGE ERROR:",
                error
            );

            res
                .status(500)
                .json({

                    error:
                        error.message

                });

        }

    }
);


/* =========================================================
   ADMIN AUDIO TRANSCRIPTION
   IMPORTANT:
   - Uses OpenAI
   - Uses audioUpload
   - NO undefined upload variable
   - NO duplicate /transcribe route
========================================================= */

app.post(
    "/api/admin/knowledge/transcribe",

    adminMiddleware,

    audioUpload.single(
        "audio"
    ),

    async (
        req,
        res
    ) => {

        try {

            if (!openai) {

                return res
                    .status(500)
                    .json({

                        success:
                            false,

                        error:
                            "OPENAI_API_KEY lama dejin."

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

                success:
                    true,

                text:
                    transcription.text ||
                    ""

            });

        } catch (error) {

            console.error(
                "❌ AUDIO TRANSCRIPTION ERROR:",
                error
            );

            res
                .status(500)
                .json({

                    success:
                        false,

                    error:
                        error.message ||
                        "Audio transcription failed."

                });

        }

    }
);


/* =========================================================
   ADMIN IMAGE INTERPRETATION
========================================================= */

app.post(
    "/api/admin/knowledge/interpret-image",

    adminMiddleware,

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

                        error:
                            "Sawir geli."

                    });

            }

            if (!openrouter) {

                return res
                    .status(500)
                    .json({

                        error:
                            "OPENROUTER_API_KEY lama dejin."

                    });

            }

            const base64 =
                req.file.buffer
                    .toString(
                        "base64"
                    );

            const dataUrl =
                `data:${req.file.mimetype};base64,${base64}`;

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
                                    `
Waxaad tahay AI Somali ah.

Fasir sawirka si taxaddar leh.

Jawaabta ku qor Af-Soomaali.

Ha samayn xog aan sawirka laga arki karin.
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
                                            "Sawirkan sharax."

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

                        ]

                    });

            const text =
                completion
                    .choices?.[0]
                    ?.message?.content ||
                "AI jawaab kama soo celin.";

            res.json({

                success:
                    true,

                text

            });

        } catch (error) {

            console.error(
                "IMAGE INTERPRET ERROR:",
                error
            );

            res
                .status(500)
                .json({

                    error:
                        error.message ||
                        "Sawirka lama fasiri karin."

                });

        }

    }
);


/* =========================================================
   AUDIO + IMAGE INTERPRETATION
========================================================= */

app.post(
    "/api/admin/knowledge/interpret-all",

    adminMiddleware,

    knowledgeUpload.fields(
        [
            {
                name:
                    "audio",

                maxCount:
                    1
            },

            {
                name:
                    "image",

                maxCount:
                    1
            }
        ]
    ),

    async (
        req,
        res
    ) => {

        let audio = null;
        let image = null;

        try {

            audio =
                req.files?.audio?.[0] ||
                null;

            image =
                req.files?.image?.[0] ||
                null;

            if (
                !audio &&
                !image
            ) {

                return res
                    .status(400)
                    .json({

                        error:
                            "Cod ama sawir geli."

                    });

            }

            let audioText =
                "";

            let imageText =
                "";


            /* -----------------------------------------
               AUDIO
            ----------------------------------------- */

            if (audio) {

                if (!openai) {

                    return res
                        .status(500)
                        .json({

                            error:
                                "OPENAI_API_KEY lama dejin."

                        });

                }

                const audioBuffer =
                    fs.readFileSync(
                        audio.path
                    );

                const audioFile =
                    new File(

                        [
                            audioBuffer
                        ],

                        audio.originalname ||
                            "audio.webm",

                        {
                            type:
                                audio.mimetype ||
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

                audioText =
                    transcription.text ||
                    "";

            }


            /* -----------------------------------------
               IMAGE
            ----------------------------------------- */

            if (image) {

                if (!openrouter) {

                    return res
                        .status(500)
                        .json({

                            error:
                                "OPENROUTER_API_KEY lama dejin."

                        });

                }

                const imageBuffer =
                    fs.readFileSync(
                        image.path
                    );

                const base64 =
                    imageBuffer
                        .toString(
                            "base64"
                        );

                const dataUrl =
                    `data:${image.mimetype};base64,${base64}`;

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
                                        `
Waxaad tahay AI Af-Soomaali ah.

Fasir sawirka si taxaddar leh.

Jawaabta ku qor Af-Soomaali.
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
                                                "Sawirkan sharax."

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

                            ]

                        });

                imageText =
                    completion
                        .choices?.[0]
                        ?.message?.content ||
                    "";

            }


            /* -----------------------------------------
               COMBINE
            ----------------------------------------- */

            const parts = [];


            if (
                audioText
            ) {

                parts.push(
                    `🎙️ Qoraalka codka:\n${audioText}`
                );

            }


            if (
                imageText
            ) {

                parts.push(
                    `🖼️ Fasiraadda sawirka:\n${imageText}`
                );

            }


            let finalText =
                parts.join(
                    "\n\n"
                );


            /* -----------------------------------------
               AI COMBINATION
            ----------------------------------------- */

            if (
                openrouter &&
                parts.length > 1
            ) {

                const combined =
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
Waxaad tahay AI Af-Soomaali ah.

Isku dar xogta codka iyo sawirka.

Jawaab kooban oo cad ku qor Af-Soomaali.
`
                                },

                                {

                                    role:
                                        "user",

                                    content:
                                        parts.join(
                                            "\n\n"
                                        )

                                }

                            ]

                        });

                finalText =
                    combined
                        .choices?.[0]
                        ?.message?.content ||
                    finalText;

            }


            res.json({

                success:
                    true,

                text:
                    finalText

            });

        } catch (error) {

            console.error(
                "INTERPRET ALL ERROR:",
                error
            );

            res
                .status(500)
                .json({

                    error:
                        error.message ||
                        "Codka iyo sawirka lama fasiri karin."

                });

        } finally {

            /* -----------------------------------------
               DELETE TEMPORARY FILES
            ----------------------------------------- */

            if (
                audio?.path &&
                fs.existsSync(
                    audio.path
                )
            ) {

                try {

                    fs.unlinkSync(
                        audio.path
                    );

                } catch {}

            }


            if (
                image?.path &&
                fs.existsSync(
                    image.path
                )
            ) {

                try {

                    fs.unlinkSync(
                        image.path
                    );

                } catch {}

            }

        }

    }
);


/* =========================================================
   EXACT IMAGE MATCH
========================================================= */

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

                        error:
                            "❌ Fadlan sawir geli."

                    });

            }

            const userImageHash =
                getImageHash(
                    req.file.buffer
                );

            const knowledge =
                await dbAll(
                    `
                    SELECT
                        id,
                        title,
                        content,
                        image_url,
                        audio_url,
                        created_at
                    FROM knowledge
                    WHERE
                        image_url IS NOT NULL
                        AND image_url != ''
                    ORDER BY id DESC
                    `
                );

            let matched =
                null;


            for (
                const item
                of knowledge
            ) {

                if (
                    !item.image_url
                ) {
                    continue;
                }

                const filename =
                    path.basename(
                        item.image_url
                    );

                const imagePath =
                    path.join(
                        KNOWLEDGE_UPLOAD_DIR,
                        filename
                    );

                if (
                    !fs.existsSync(
                        imagePath
                    )
                ) {
                    continue;
                }

                const buffer =
                    fs.readFileSync(
                        imagePath
                    );

                const databaseHash =
                    getImageHash(
                        buffer
                    );

                if (
                    databaseHash ===
                    userImageHash
                ) {

                    matched =
                        item;

                    break;

                }

            }


            if (!matched) {

                return res
                    .status(404)
                    .json({

                        success:
                            false,

                        found:
                            false,

                        error:
                            "❌ Sawirkan Database-ka lagama helin."

                    });

            }


            res.json({

                success:
                    true,

                found:
                    true,

                message:
                    "✅ Sawirka Database-ka waa laga helay.",

                knowledge: {

                    id:
                        matched.id,

                    title:
                        matched.title ||
                        "",

                    content:
                        matched.content ||
                        "",

                    image_url:
                        matched.image_url ||
                        "",

                    audio_url:
                        matched.audio_url ||
                        "",

                    created_at:
                        matched.created_at ||
                        ""

                }

            });

        } catch (error) {

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

                    error:
                        "❌ Khalad ayaa ka dhacay raadinta sawirka."

                });

        }

    }
);


/* =========================================================
   PUBLIC CHAT
========================================================= */

app.post(
    "/chat",

    async (
        req,
        res
    ) => {

        try {

            const message =
                String(
                    req.body.message ||
                    ""
                ).trim();

            const image =
                req.body.image ||
                null;

            const clientId =
                String(
                    req.body.clientId ||
                    ""
                ).trim();


            if (
                !message &&
                !image
            ) {

                return res
                    .status(400)
                    .json({

                        error:
                            "Qoraal ama sawir geli."

                    });

            }


            if (!openrouter) {

                return res
                    .status(500)
                    .json({

                        error:
                            "OPENROUTER_API_KEY lama dejin."

                    });

            }


            /* -----------------------------------------
               KNOWLEDGE
            ----------------------------------------- */

            const knowledge =
                await dbAll(
                    `
                    SELECT
                        id,
                        title,
                        content,
                        image_url,
                        audio_url
                    FROM knowledge
                    ORDER BY id DESC
                    `
                );


            const knowledgeText =
                knowledge
                    .map(
                        item => {

                            return `
ID: ${item.id}
Title: ${item.title || ""}
Content: ${item.content || ""}
Image: ${item.image_url || ""}
Audio: ${item.audio_url || ""}
`;

                        }
                    )
                    .join(
                        "\n----------------\n"
                    );


            /* -----------------------------------------
               SYSTEM
            ----------------------------------------- */

            const systemPrompt =
                `
Waxaad tahay AI-ga NASIIB BUSINESS CENTER.

Had iyo jeer ku jawaab Af-Soomaali.

Isticmaal Knowledge Database-ka marka
xogta su'aasha ku jirta database-ka laga heli karo.

Ha been abuuran xog.

Haddii xogta database-ka aysan ku jirin,
si cad u sheeg.

KNOWLEDGE DATABASE:

${knowledgeText}
`;


            const messages = [

                {

                    role:
                        "system",

                    content:
                        systemPrompt

                }

            ];


            /* -----------------------------------------
               USER
            ----------------------------------------- */

            if (image) {

                messages.push({

                    role:
                        "user",

                    content: [

                        {

                            type:
                                "text",

                            text:
                                message ||
                                "Fasir sawirkan."

                        },

                        {

                            type:
                                "image_url",

                            image_url: {

                                url:
                                    image

                            }

                        }

                    ]

                });

            } else {

                messages.push({

                    role:
                        "user",

                    content:
                        message

                });

            }


            /* -----------------------------------------
               AI
            ----------------------------------------- */

            const completion =
                await openrouter
                    .chat
                    .completions
                    .create({

                        model:
                            AI_MODEL,

                        messages:
                            messages

                    });


            const responseText =
                completion
                    .choices?.[0]
                    ?.message?.content ||
                "AI jawaab kama soo celin.";


            /* -----------------------------------------
               SAVE CHAT
            ----------------------------------------- */

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
                    clientId ||
                        null,

                    message,

                    image,

                    responseText
                ]
            );


            res.json({

                success:
                    true,

                response:
                    responseText

            });

        } catch (error) {

            console.error(
                "CHAT ERROR:",
                error
            );

            res
                .status(500)
                .json({

                    error:
                        error.message ||
                        "AI request failed."

                });

        }

    }
);


/* =========================================================
   PUBLIC CHAT HISTORY
========================================================= */

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
                ).trim();

            if (!clientId) {

                return res.json(
                    []
                );

            }

            const rows =
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
                    [
                        clientId
                    ]
                );

            res.json(
                rows
            );

        } catch (error) {

            res
                .status(500)
                .json({

                    error:
                        error.message

                });

        }

    }
);


/* =========================================================
   DELETE PUBLIC CHAT HISTORY
========================================================= */

app.delete(
    "/api/chats",

    async (
        req,
        res
    ) => {

        try {

            const clientId =
                String(
                    req.body.clientId ||
                    ""
                ).trim();

            if (!clientId) {

                return res
                    .status(400)
                    .json({

                        error:
                            "clientId missing."

                    });

            }

            await dbRun(
                `
                DELETE FROM chats
                WHERE client_id = ?
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

        } catch (error) {

            res
                .status(500)
                .json({

                    error:
                        error.message

                });

        }

    }
);


/* =========================================================
   ADMIN ALL CHATS
========================================================= */

app.get(
    "/api/admin/chats",

    adminMiddleware,

    async (
        req,
        res
    ) => {

        try {

            const rows =
                await dbAll(
                    `
                    SELECT *
                    FROM chats
                    ORDER BY id DESC
                    `
                );

            res.json(
                rows
            );

        } catch (error) {

            res
                .status(500)
                .json({

                    error:
                        error.message

                });

        }

    }
);


/* =========================================================
   ADMIN USER CHATS
========================================================= */

app.get(
    "/api/admin/users/:id/chats",

    adminMiddleware,

    async (
        req,
        res
    ) => {

        try {

            const userId =
                Number(
                    req.params.id
                );

            const rows =
                await dbAll(
                    `
                    SELECT *
                    FROM chats
                    WHERE user_id = ?
                    ORDER BY id DESC
                    `,
                    [
                        userId
                    ]
                );

            res.json(
                rows
            );

        } catch (error) {

            res
                .status(500)
                .json({

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

    async (
        req,
        res
    ) => {

        try {

            await dbRun(
                `
                DELETE FROM chats
                `
            );

            res.json({

                success:
                    true,

                message:
                    "Dhammaan chat history waa la tirtiray."

            });

        } catch (error) {

            res
                .status(500)
                .json({

                    error:
                        error.message

                });

        }

    }
);


/* =========================================================
   ADMIN USERS
========================================================= */

app.get(
    "/api/admin/users",

    adminMiddleware,

    async (
        req,
        res
    ) => {

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

            res.json(
                users
            );

        } catch (error) {

            res
                .status(500)
                .json({

                    error:
                        error.message

                });

        }

    }
);


/* =========================================================
   ROOT
========================================================= */

app.get(
    "/",

    (
        req,
        res
    ) => {

        res.sendFile(
            path.join(
                PUBLIC_DIR,
                "index.html"
            )
        );

    }
);


/* =========================================================
   ADMIN
========================================================= */

app.get(
    "/admin",

    (
        req,
        res
    ) => {

        res.redirect(
            "/admin/"
        );

    }
);


/* =========================================================
   API 404
========================================================= */

app.use(
    (
        req,
        res,
        next
    ) => {

        if (
            req.method === "GET" &&
            req.path.startsWith(
                "/api/"
            )
        ) {

            return res
                .status(404)
                .json({

                    error:
                        "API endpoint not found."

                });

        }

        next();

    }
);


/* =========================================================
   FRONTEND FALLBACK
========================================================= */

app.use(
    (
        req,
        res,
        next
    ) => {

        if (
            req.method !==
            "GET"
        ) {

            return next();

        }

        res.sendFile(
            path.join(
                PUBLIC_DIR,
                "index.html"
            )
        );

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

                    error:
                        `Upload error: ${error.message}`

                });

        }


        res
            .status(500)
            .json({

                error:
                    error.message ||
                    "Internal server error."

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
                    `🌐 Port: ${PORT}`
                );

                console.log(
                    `🤖 AI Model: ${AI_MODEL}`
                );

                console.log(
                    `🗄️ Database: ${DB_FILE}`
                );

                console.log(
                    `📁 Knowledge: ${KNOWLEDGE_UPLOAD_DIR}`
                );

                console.log(
                    "👤 User: Public / No Login"
                );

                console.log(
                    "👑 Admin: /admin/"
                );

                console.log(
                    "🎙️ Audio: OpenAI"
                );

                console.log(
                    "🖼️ Image: OpenRouter"
                );

                console.log(
                    "🔎 Image Match: /api/match-image"
                );

                console.log(
                    "=========================================="
                );

                console.log("");

            }

        );

    } catch (error) {

        console.error(
            "❌ SERVER START ERROR:",
            error
        );

        process.exit(
            1
        );

    }

}


/* =========================================================
   START
========================================================= */

startServer();
