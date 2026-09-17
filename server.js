/* =========================================================
   NASIIB BUSINESS CENTER
   COMPLETE SERVER
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
    process.env.PORT || 3000;

const JWT_SECRET =
    process.env.JWT_SECRET ||
    "BADAL_SECRET_KAN_PRODUCTION";

const OPENROUTER_API_KEY =
    process.env.OPENROUTER_API_KEY;

const OPENAI_API_KEY =
    process.env.OPENAI_API_KEY;

const AI_MODEL =
    process.env.AI_MODEL ||
    "openrouter/free";

const APP_URL =
    process.env.APP_URL ||
    `http://localhost:${PORT}`;


/* =========================================================
   DIRECTORIES
========================================================= */

const PUBLIC_DIR =
    path.join(
        __dirname,
        "public"
    );

const DATABASE_DIR =
    path.join(
        __dirname,
        "database"
    );

const UPLOADS_DIR =
    path.join(
        __dirname,
        "uploads"
    );

const KNOWLEDGE_UPLOAD_DIR =
    path.join(
        UPLOADS_DIR,
        "knowledge"
    );


/* =========================================================
   CREATE DIRECTORIES
========================================================= */

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
   MIDDLEWARE
========================================================= */

app.use(
    cors()
);

app.use(
    express.json({
        limit: "20mb"
    })
);

app.use(
    express.urlencoded({
        extended: true,
        limit: "20mb"
    })
);


/* =========================================================
   STATIC FILES
========================================================= */

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
   DATABASE
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
                    "❌ Database error:",
                    error
                );

                process.exit(1);

            }

            console.log(
                "🗄️ Database:",
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
        (resolve, reject) => {

            db.run(
                sql,
                params,
                function(error) {

                    if (error) {

                        reject(error);

                        return;
                    }

                    resolve({
                        id: this.lastID,
                        changes: this.changes
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
                (error, row) => {

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
                (error, rows) => {

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
   CREATE TABLES
========================================================= */

async function initializeDatabase() {

    await dbRun(`
        CREATE TABLE IF NOT EXISTS users (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            email TEXT UNIQUE NOT NULL,

            password TEXT NOT NULL,

            role TEXT DEFAULT 'user',

            created_at DATETIME
                DEFAULT CURRENT_TIMESTAMP

        )
    `);


    await dbRun(`
        CREATE TABLE IF NOT EXISTS chats (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            client_id TEXT,

            user_id INTEGER,

            message TEXT,

            image TEXT,

            response TEXT,

            created_at DATETIME
                DEFAULT CURRENT_TIMESTAMP

        )
    `);


    await dbRun(`
        CREATE TABLE IF NOT EXISTS knowledge (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            title TEXT,

            content TEXT,

            audio_url TEXT,

            image_url TEXT,

            created_at DATETIME
                DEFAULT CURRENT_TIMESTAMP,

            updated_at DATETIME
                DEFAULT CURRENT_TIMESTAMP

        )
    `);

}


/* =========================================================
   ADMIN ACCOUNT
========================================================= */

async function createDefaultAdmin() {

    const email =
        process.env.ADMIN_EMAIL ||
        "admin@nasiib.com";

    const password =
        process.env.ADMIN_PASSWORD ||
        "123456";


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


    const hashedPassword =
        await bcrypt.hash(
            password,
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
            hashedPassword
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
        "⚠️ OPENROUTER_API_KEY missing."
    );

}


/* =========================================================
   OPENAI - TRANSCRIPTION
========================================================= */

let openai = null;

if (OPENAI_API_KEY) {

    openai =
        new OpenAI({
            apiKey:
                OPENAI_API_KEY
        });

}


/* =========================================================
   MULTER - KNOWLEDGE UPLOAD
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

                const ext =
                    path.extname(
                        file.originalname
                    );

                const safeExt =
                    ext
                        .replace(
                            /[^a-zA-Z0-9.]/g,
                            ""
                        );

                const filename =
                    `knowledge-${Date.now()}-${crypto
                        .randomBytes(6)
                        .toString("hex")}${safeExt}`;


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

                if (
                    file.mimetype.startsWith(
                        "image/"
                    ) ||
                    file.mimetype.startsWith(
                        "audio/"
                    )
                ) {

                    cb(
                        null,
                        true
                    );

                } else {

                    cb(
                        new Error(
                            "Kaliya sawir ama cod ayaa la oggol yahay."
                        )
                    );

                }

            }

    });


/* =========================================================
   MULTER - SINGLE IMAGE MEMORY
========================================================= */

const matchImageUpload =
    multer({

        storage:
            multer.memoryStorage(),

        limits: {

            fileSize:
                5 * 1024 * 1024

        },

        fileFilter:
            function(
                req,
                file,
                cb
            ) {

                if (
                    file.mimetype.startsWith(
                        "image/"
                    )
                ) {

                    cb(
                        null,
                        true
                    );

                } else {

                    cb(
                        new Error(
                            "Fadlan sawir keliya geli."
                        )
                    );

                }

            }

    });


/* =========================================================
   MULTER - AUDIO
========================================================= */

const audioUpload =
    multer({

        storage:
            multer.memoryStorage(),

        limits: {

            fileSize:
                25 * 1024 * 1024

        }

    });


/* =========================================================
   IMAGE HASH
========================================================= */

function getImageHash(
    buffer
) {

    return crypto
        .createHash("sha256")
        .update(buffer)
        .digest("hex");

}


/* =========================================================
   JWT
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


/* =========================================================
   ADMIN AUTH MIDDLEWARE
========================================================= */

async function adminMiddleware(
    req,
    res,
    next
) {

    try {

        const header =
            req.headers.authorization;


        if (
            !header ||
            !header.startsWith(
                "Bearer "
            )
        ) {

            return res.status(
                401
            ).json({

                error:
                    "Admin login required."

            });

        }


        const token =
            header.split(
                " "
            )[1];


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
                [decoded.id]
            );


        if (
            !user ||
            user.role !== "admin"
        ) {

            return res.status(
                403
            ).json({

                error:
                    "Admin access only."

            });

        }


        req.admin =
            user;


        next();

    } catch (error) {

        return res.status(
            401
        ).json({

            error:
                "Token-ka admin-ka waa khalad ama dhacay."

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
                "SELECT 1 AS ok"
            );


            res.json({

                status:
                    "online",

                database:
                    "sqlite",

                ai:
                    OPENROUTER_API_KEY
                        ? "ready"
                        : "missing",

                model:
                    AI_MODEL

            });

        } catch (error) {

            res.status(
                500
            ).json({

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

                return res.status(
                    400
                ).json({

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

                return res.status(
                    401
                ).json({

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

                return res.status(
                    401
                ).json({

                    error:
                        "Email ama password waa khalad."

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


            res.status(
                500
            ).json({

                error:
                    "Login error."

            });

        }

    }
);


/* =========================================================
   ADMIN TOKEN VERIFICATION
========================================================= */

app.get(
    "/api/admin/me",
    adminMiddleware,
    (req, res) => {

        res.json({
            success: true,

            user: {
                id: req.admin.id,
                email: req.admin.email,
                role: req.admin.role
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
    async (req, res) => {

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
                error
            );


            res.status(
                500
            ).json({

                error:
                    "Knowledge lama soo qaadi karin."

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
                )
                .trim();


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

            res.status(
                500
            ).json({

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
    knowledgeUpload.fields([
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
    ]),
    async (req, res) => {

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


            const audioFile =
                req.files &&
                req.files.audio
                    ? req.files.audio[0]
                    : null;


            const imageFile =
                req.files &&
                req.files.image
                    ? req.files.image[0]
                    : null;


            if (
                !title &&
                !content &&
                !audioFile &&
                !imageFile
            ) {

                return res.status(
                    400
                ).json({

                    error:
                        "Xog geli marka hore."

                });

            }


            let audioUrl =
                null;

            let imageUrl =
                null;


            if (audioFile) {

                audioUrl =
                    `/uploads/knowledge/${audioFile.filename}`;

            }


            if (imageFile) {

                imageUrl =
                    `/uploads/knowledge/${imageFile.filename}`;

            }


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
                    [result.id]
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


            res.status(
                500
            ).json({

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
    async (req, res) => {

        try {

            const id =
                Number(
                    req.params.id
                );


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


            const result =
                await dbRun(
                    `
                    UPDATE knowledge

                    SET
                        title = ?,
                        content = ?,
                        updated_at = CURRENT_TIMESTAMP

                    WHERE id = ?
                    `,
                    [
                        title,
                        content,
                        id
                    ]
                );


            if (
                result.changes === 0
            ) {

                return res.status(
                    404
                ).json({

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
                    [id]
                );


            res.json({

                success:
                    true,

                knowledge:
                    updated

            });

        } catch (error) {

            res.status(
                500
            ).json({

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

                return res.status(
                    404
                ).json({

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


            /* Delete image file */

            if (
                item.image_url
            ) {

                const filename =
                    path.basename(
                        item.image_url
                    );

                const file =
                    path.join(
                        KNOWLEDGE_UPLOAD_DIR,
                        filename
                    );


                if (
                    fs.existsSync(
                        file
                    )
                ) {

                    fs.unlinkSync(
                        file
                    );

                }

            }


            /* Delete audio file */

            if (
                item.audio_url
            ) {

                const filename =
                    path.basename(
                        item.audio_url
                    );

                const file =
                    path.join(
                        KNOWLEDGE_UPLOAD_DIR,
                        filename
                    );


                if (
                    fs.existsSync(
                        file
                    )
                ) {

                    fs.unlinkSync(
                        file
                    );

                }

            }


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


            res.status(
                500
            ).json({

                error:
                    error.message

            });

        }

    }
);


/* =========================================================
   TRANSCRIBE AUDIO
========================================================= */

app.post(
    "/api/admin/knowledge/transcribe",
    adminMiddleware,
    audioUpload.single("audio"),
    async (req, res) => {

        try {

            if (!req.file) {

                return res.status(
                    400
                ).json({

                    error:
                        "Audio geli."

                });

            }


            if (!openai) {

                return res.status(
                    500
                ).json({

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
                            req.file.mimetype
                    }
                );


            const transcription =
                await openai.audio.transcriptions.create({

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
                "TRANSCRIBE ERROR:",
                error
            );


            res.status(
                500
            ).json({

                error:
                    error.message ||
                    "Audio transcription failed."

            });

        }

    }
);


/* =========================================================
   INTERPRET IMAGE
========================================================= */

app.post(
    "/api/admin/knowledge/interpret-image",
    adminMiddleware,
    matchImageUpload.single("image"),
    async (req, res) => {

        try {

            if (!req.file) {

                return res.status(
                    400
                ).json({

                    error:
                        "Sawir geli."

                });

            }


            if (!openrouter) {

                return res.status(
                    500
                ).json({

                    error:
                        "OPENROUTER_API_KEY lama dejin."

                });

            }


            const base64 =
                req.file.buffer.toString(
                    "base64"
                );


            const dataUrl =
                `data:${req.file.mimetype};base64,${base64}`;


            const completion =
                await openrouter.chat.completions.create({

                    model:
                        AI_MODEL,

                    messages: [

                        {
                            role:
                                "system",

                            content:
                                `
Waxaad tahay AI Somali ah.
Sawirka si taxaddar leh u fasir.
Jawaabta ku qor Af-Soomaali.
Ha sameyn xog aan sawirka laga arki karin.
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
                                        "Sawirkan fasir oo sharax waxa ku jira."
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
                    ?.message
                    ?.content ||
                "AI jawaab kama soo celin."


            res.json({

                success:
                    true,

                text:
                    text

            });

        } catch (error) {

            console.error(
                "IMAGE AI ERROR:",
                error
            );


            res.status(
                500
            ).json({

                error:
                    error.message

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
    knowledgeUpload.fields([
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
    ]),
    async (req, res) => {

        try {

            const audio =
                req.files &&
                req.files.audio
                    ? req.files.audio[0]
                    : null;


            const image =
                req.files &&
                req.files.image
                    ? req.files.image[0]
                    : null;


            if (
                !audio &&
                !image
            ) {

                return res.status(
                    400
                ).json({

                    error:
                        "Cod ama sawir geli."

                });

            }


            let audioText =
                "";


            /* -----------------------------------------
               AUDIO → TEXT
            ------------------------------------------ */

            if (audio) {

                if (!openai) {

                    return res.status(
                        500
                    ).json({

                        error:
                            "OPENAI_API_KEY lama dejin. Audio transcription lama samayn karo."

                    });

                }


                const audioFile =
                    new File(
                        [
                            fs.readFileSync(
                                audio.path
                            )
                        ],
                        audio.originalname,
                        {
                            type:
                                audio.mimetype
                        }
                    );


                const transcription =
                    await openai.audio.transcriptions.create({

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
               IMAGE → AI
            ------------------------------------------ */

            let imageText =
                "";


            if (image) {

                if (!openrouter) {

                    return res.status(
                        500
                    ).json({

                        error:
                            "OPENROUTER_API_KEY lama dejin."

                    });

                }


                const imageBuffer =
                    fs.readFileSync(
                        image.path
                    );


                const base64 =
                    imageBuffer.toString(
                        "base64"
                    );


                const dataUrl =
                    `data:${image.mimetype};base64,${base64}`;


                const completion =
                    await openrouter.chat.completions.create({

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
                        ?.message
                        ?.content ||
                    "";

            }


            /* -----------------------------------------
               COMBINE
            ------------------------------------------ */

            const parts = [];


            if (audioText) {

                parts.push(
                    `🎙️ Qoraalka codka:\n${audioText}`
                );

            }


            if (imageText) {

                parts.push(
                    `🖼️ Fasiraadda sawirka:\n${imageText}`
                );

            }


            let finalText =
                parts.join(
                    "\n\n"
                );


            /* -----------------------------------------
               OPTIONAL AI COMBINATION
            ------------------------------------------ */

            if (
                openrouter &&
                parts.length > 1
            ) {

                const combined =
                    await openrouter.chat.completions.create({

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
                        ?.message
                        ?.content ||
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


            res.status(
                500
            ).json({

                error:
                    error.message

            });

        }

    }
);


/* =========================================================
   EXACT IMAGE MATCH
========================================================= */

app.post(
    "/api/match-image",
    matchImageUpload.single("image"),
    async (req, res) => {

        try {

            /* -----------------------------------------
               CHECK FILE
            ------------------------------------------ */

            if (!req.file) {

                return res.status(
                    400
                ).json({

                    success:
                        false,

                    found:
                        false,

                    error:
                        "❌ Fadlan sawir geli."

                });

            }


            /* -----------------------------------------
               USER IMAGE HASH
            ------------------------------------------ */

            const userImageHash =
                getImageHash(
                    req.file.buffer
                );


            console.log(
                "🔎 Searching image hash:",
                userImageHash
            );


            /* -----------------------------------------
               GET KNOWLEDGE
            ------------------------------------------ */

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


            /* -----------------------------------------
               EXACT FILE MATCH
            ------------------------------------------ */

            for (
                const item of knowledge
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


                const databaseImagePath =
                    path.join(
                        KNOWLEDGE_UPLOAD_DIR,
                        filename
                    );


                if (
                    !fs.existsSync(
                        databaseImagePath
                    )
                ) {

                    continue;

                }


                const databaseBuffer =
                    fs.readFileSync(
                        databaseImagePath
                    );


                const databaseHash =
                    getImageHash(
                        databaseBuffer
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


            /* -----------------------------------------
               NOT FOUND
            ------------------------------------------ */

            if (!matched) {

                console.log(
                    "❌ Image not found in Database."
                );


                return res.status(
                    404
                ).json({

                    success:
                        false,

                    found:
                        false,

                    error:
                        "❌ Sawirkan Database-ka lagama helin."

                });

            }


            /* -----------------------------------------
               FOUND
            ------------------------------------------ */

            console.log(
                "✅ Image matched Knowledge ID:",
                matched.id
            );


            return res.json({

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


            res.status(
                500
            ).json({

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
    async (req, res) => {

        try {

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

                return res.status(
                    400
                ).json({

                    error:
                        "Qoraal ama sawir geli."

                });

            }


            if (!openrouter) {

                return res.status(
                    500
                ).json({

                    error:
                        "OPENROUTER_API_KEY lama dejin."

                });

            }


            /* -----------------------------------------
               KNOWLEDGE
            ------------------------------------------ */

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


            let knowledgeText =
                "";


            if (
                knowledge.length
            ) {

                knowledgeText =
                    knowledge
                        .map(item => {

                            return `
ID: ${item.id}
Title: ${item.title || ""}
Content: ${item.content || ""}
Image: ${item.image_url || ""}
Audio: ${item.audio_url || ""}
`;

                        })
                        .join(
                            "\n----------------\n"
                        );

            }


            /* -----------------------------------------
               SYSTEM
            ------------------------------------------ */

            const systemPrompt =
                `
Waxaad tahay AI-ga NASIIB BUSINESS CENTER.

Had iyo jeer ku jawaab Af-Soomaali.

Isticmaal Knowledge Database-ka marka xogta
su'aasha ku jirta database-ka laga heli karo.

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
               USER MESSAGE
            ------------------------------------------ */

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
            ------------------------------------------ */

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
                    ?.message
                    ?.content ||
                "AI jawaab kama soo celin."


            /* -----------------------------------------
               SAVE CHAT
            ------------------------------------------ */

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


            res.status(
                500
            ).json({

                error:
                    error.message ||
                    "AI request failed."

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
                    req.query.clientId ||
                    ""
                )
                .trim();


            if (!clientId) {

                return res.json([]);

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

                    WHERE
                        client_id = ?

                    ORDER BY
                        id ASC
                    `,
                    [
                        clientId
                    ]
                );


            res.json(
                rows
            );

        } catch (error) {

            res.status(
                500
            ).json({

                error:
                    error.message

            });

        }

    }
);


/* =========================================================
   DELETE USER CHAT HISTORY
========================================================= */

app.delete(
    "/api/chats",
    async (req, res) => {

        try {

            const clientId =
                String(
                    req.body.clientId ||
                    ""
                )
                .trim();


            if (!clientId) {

                return res.status(
                    400
                ).json({

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

            res.status(
                500
            ).json({

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

            const rows =
                await dbAll(
                    `
                    SELECT
                        *
                    FROM chats
                    ORDER BY id DESC
                    `
                );


            res.json(
                rows
            );

        } catch (error) {

            res.status(
                500
            ).json({

                error:
                    error.message

            });

        }

    }
);


/* =========================================================
   ADMIN - USER CHATS
========================================================= */

app.get(
    "/api/admin/users/:id/chats",
    adminMiddleware,
    async (req, res) => {

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

            res.status(
                500
            ).json({

                error:
                    error.message

            });

        }

    }
);


/* =========================================================
   ADMIN - DELETE ALL CHATS
========================================================= */

app.delete(
    "/api/admin/chats",
    adminMiddleware,
    async (req, res) => {

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

            res.status(
                500
            ).json({

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


            res.json(
                users
            );

        } catch (error) {

            res.status(
                500
            ).json({

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
   ADMIN
========================================================= */

app.get(
    "/admin",
    (req, res) => {

        res.redirect(
            "/admin/"
        );

    }
);


/* =========================================================
   FRONTEND FALLBACK
========================================================= */

app.use(
    (req, res, next) => {

        if (
            req.method !==
            "GET"
        ) {

            return next();

        }


        if (
            req.path.startsWith(
                "/api/"
            )
        ) {

            return res.status(
                404
            ).json({

                error:
                    "API endpoint not found."

            });

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

            return res.status(
                400
            ).json({

                error:
                    `Upload error: ${error.message}`

            });

        }


        res.status(
            500
        ).json({

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
                    "🖼️ Image Match: /api/match-image"
                );

                console.log(
                    "=========================================="
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
