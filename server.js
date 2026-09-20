"use strict";

/*
=========================================================
   NASIIB BUSINESS CENTER
   AI CHAT SOMALI - COMPLETE SERVER
=========================================================

FEATURES
---------------------------------------------------------
👤 Public User - NO LOGIN REQUIRED
💬 POST /chat
🖼️ POST /api/match-image
📚 SQLite Knowledge Database
🔎 Exact Image Match - SHA256
🤖 AI Image Fallback
📝 Knowledge CRUD
👨‍💼 Admin API
🔐 JWT Admin Authentication
🖼️ Image Upload
🔊 Audio Upload
🎙️ Audio Transcription
💾 Chat History
🗑️ Delete Chat
❤️ /api/health
📁 /uploads
=========================================================
*/


/* =====================================================
   IMPORTS
===================================================== */

const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const sqlite3 = require("sqlite3").verbose();
const OpenAI = require("openai");
require("dotenv").config();


/* =====================================================
   APP
===================================================== */

const app = express();

const PORT = process.env.PORT || 3000;

const HOST = "0.0.0.0";


/* =====================================================
   DIRECTORIES
===================================================== */

const ROOT_DIR = __dirname;

const PUBLIC_DIR =
    path.join(ROOT_DIR, "public");

const UPLOAD_DIR =
    path.join(ROOT_DIR, "uploads");

const IMAGE_DIR =
    path.join(UPLOAD_DIR, "images");

const AUDIO_DIR =
    path.join(UPLOAD_DIR, "audio");

const DB_DIR =
    path.join(ROOT_DIR, "db");


/* =====================================================
   CREATE DIRECTORIES
===================================================== */

[
    UPLOAD_DIR,
    IMAGE_DIR,
    AUDIO_DIR,
    DB_DIR
].forEach((dir) => {

    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, {
            recursive: true
        });
    }

});


/* =====================================================
   MIDDLEWARE
===================================================== */

app.use(
    cors({
        origin: true,
        credentials: true
    })
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


/* =====================================================
   STATIC FILES
===================================================== */

app.use(
    express.static(PUBLIC_DIR)
);


app.use(
    "/uploads",
    express.static(UPLOAD_DIR)
);


/* =====================================================
   SQLITE DATABASE
===================================================== */

const DB_PATH =
    process.env.DB_PATH ||
    path.join(DB_DIR, "nasiib.db");


const db =
    new sqlite3.Database(DB_PATH);


/* =====================================================
   SQLITE HELPERS
===================================================== */

function dbRun(sql, params = []) {

    return new Promise((resolve, reject) => {

        db.run(
            sql,
            params,
            function (error) {

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

    });

}


function dbGet(sql, params = []) {

    return new Promise((resolve, reject) => {

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

    });

}


function dbAll(sql, params = []) {

    return new Promise((resolve, reject) => {

        db.all(
            sql,
            params,
            (error, rows) => {

                if (error) {
                    reject(error);
                    return;
                }

                resolve(rows || []);

            }
        );

    });

}


/* =====================================================
   DATABASE INITIALIZATION
===================================================== */

async function initializeDatabase() {

    await dbRun(`
        CREATE TABLE IF NOT EXISTS admins (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            email TEXT UNIQUE NOT NULL,

            password_hash TEXT NOT NULL,

            created_at DATETIME DEFAULT CURRENT_TIMESTAMP

        )
    `);


    await dbRun(`
        CREATE TABLE IF NOT EXISTS knowledge (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            title TEXT NOT NULL,

            content TEXT NOT NULL,

            image_url TEXT,

            image_hash TEXT,

            audio_url TEXT,

            knowledge TEXT,

            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP

        )
    `);


    await dbRun(`
        CREATE TABLE IF NOT EXISTS chats (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            client_id TEXT NOT NULL,

            role TEXT NOT NULL,

            message TEXT,

            image_url TEXT,

            response TEXT,

            created_at DATETIME DEFAULT CURRENT_TIMESTAMP

        )
    `);


    await dbRun(`
        CREATE INDEX IF NOT EXISTS
        idx_knowledge_image_hash
        ON knowledge(image_hash)
    `);


    await dbRun(`
        CREATE INDEX IF NOT EXISTS
        idx_chats_client_id
        ON chats(client_id)
    `);


    /*
    -----------------------------------------------------
    CREATE DEFAULT ADMIN
    -----------------------------------------------------
    */

    const adminEmail =
        process.env.ADMIN_EMAIL ||
        "admin@nasiib.com";


    const adminPassword =
        process.env.ADMIN_PASSWORD ||
        "ChangeMe123!";


    const existingAdmin =
        await dbGet(
            `
            SELECT id
            FROM admins
            WHERE email = ?
            `,
            [adminEmail]
        );


    if (!existingAdmin) {

        const passwordHash =
            await bcrypt.hash(
                adminPassword,
                12
            );


        await dbRun(
            `
            INSERT INTO admins
            (
                email,
                password_hash
            )
            VALUES
            (?, ?)
            `,
            [
                adminEmail,
                passwordHash
            ]
        );


        console.log(
            "=========================================="
        );

        console.log(
            "DEFAULT ADMIN CREATED"
        );

        console.log(
            "Email:",
            adminEmail
        );

        console.log(
            "Password:",
            adminPassword
        );

        console.log(
            "=========================================="
        );

    }

}


/* =====================================================
   OPENAI
===================================================== */

const openai =
    process.env.OPENAI_API_KEY
        ? new OpenAI({
            apiKey:
                process.env.OPENAI_API_KEY
        })
        : null;


/* =====================================================
   AI MODEL
===================================================== */

const AI_MODEL =
    process.env.OPENAI_MODEL ||
    "gpt-5.6-luna";


/* =====================================================
   TRANSCRIPTION MODEL
===================================================== */

const TRANSCRIPTION_MODEL =
    process.env.OPENAI_TRANSCRIBE_MODEL ||
    "gpt-4o-mini-transcribe";


/* =====================================================
   JWT
===================================================== */

const JWT_SECRET =
    process.env.JWT_SECRET ||
    "CHANGE_THIS_SECRET_IN_PRODUCTION";


/* =====================================================
   MULTER
===================================================== */

const storage =
    multer.diskStorage({

        destination: function (
            req,
            file,
            cb
        ) {

            if (
                file.mimetype &&
                file.mimetype.startsWith(
                    "audio/"
                )
            ) {

                cb(
                    null,
                    AUDIO_DIR
                );

            } else {

                cb(
                    null,
                    IMAGE_DIR
                );

            }

        },


        filename: function (
            req,
            file,
            cb
        ) {

            const extension =
                path.extname(
                    file.originalname
                ) || "";


            const filename =
                `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${extension}`;


            cb(
                null,
                filename
            );

        }

    });


const upload =
    multer({

        storage,

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

                const allowedImages = [
                    "image/jpeg",
                    "image/png",
                    "image/webp",
                    "image/gif"
                ];


                const allowedAudio = [
                    "audio/mpeg",
                    "audio/mp3",
                    "audio/wav",
                    "audio/x-wav",
                    "audio/ogg",
                    "audio/webm",
                    "audio/mp4",
                    "audio/m4a",
                    "audio/x-m4a"
                ];


                if (
                    allowedImages.includes(
                        file.mimetype
                    )
                ) {

                    cb(
                        null,
                        true
                    );

                    return;

                }


                if (
                    allowedAudio.includes(
                        file.mimetype
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
                        "File type-kan lama oggola."
                    )
                );

            }

    });


/* =====================================================
   HASH FILE
===================================================== */

function getFileHash(filePath) {

    return new Promise(
        (
            resolve,
            reject
        ) => {

            const hash =
                crypto.createHash(
                    "sha256"
                );


            const stream =
                fs.createReadStream(
                    filePath
                );


            stream.on(
                "data",
                (chunk) => {

                    hash.update(
                        chunk
                    );

                }
            );


            stream.on(
                "end",
                () => {

                    resolve(
                        hash.digest(
                            "hex"
                        )
                    );

                }
            );


            stream.on(
                "error",
                reject
            );

        }
    );

}


/* =====================================================
   URL HELPERS
===================================================== */

function getBaseUrl(req) {

    const forwardedProto =
        req.headers[
            "x-forwarded-proto"
        ];


    const protocol =
        forwardedProto ||
        req.protocol;


    return `${protocol}://${req.get("host")}`;

}


function getFileUrl(
    req,
    filePath
) {

    const relative =
        path.relative(
            ROOT_DIR,
            filePath
        );


    const clean =
        relative
            .split(path.sep)
            .join("/");


    return `${getBaseUrl(req)}/${clean}`;

}


/* =====================================================
   DELETE FILE SAFELY
===================================================== */

function deleteFile(
    filePath
) {

    try {

        if (
            filePath &&
            fs.existsSync(filePath)
        ) {

            fs.unlinkSync(
                filePath
            );

        }

    } catch (error) {

        console.error(
            "File delete error:",
            error.message
        );

    }

}


/* =====================================================
   ADMIN JWT MIDDLEWARE
===================================================== */

function requireAdmin(
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

            return res.status(401).json({

                success: false,

                message:
                    "Admin token ayaa loo baahan yahay."

            });

        }


        const token =
            header.substring(7);


        const decoded =
            jwt.verify(
                token,
                JWT_SECRET
            );


        req.admin =
            decoded;


        next();

    } catch (error) {

        return res.status(401).json({

            success: false,

            message:
                "Admin token-ku waa khalad ama wuu dhacay."

        });

    }

}


/* =====================================================
   ADMIN LOGIN
===================================================== */

app.post(
    "/api/admin/login",
    async (
        req,
        res
    ) => {

        try {

            const {
                email,
                password
            } = req.body;


            if (
                !email ||
                !password
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Email iyo password waa loo baahan yahay."

                });

            }


            const admin =
                await dbGet(
                    `
                    SELECT *
                    FROM admins
                    WHERE email = ?
                    `,
                    [
                        email
                            .trim()
                            .toLowerCase()
                    ]
                );


            if (!admin) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Email ama password waa khalad."

                });

            }


            const valid =
                await bcrypt.compare(
                    password,
                    admin.password_hash
                );


            if (!valid) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Email ama password waa khalad."

                });

            }


            const token =
                jwt.sign(
                    {
                        id: admin.id,

                        email: admin.email,

                        role: "admin"

                    },

                    JWT_SECRET,

                    {
                        expiresIn:
                            "7d"
                    }
                );


            return res.json({

                success: true,

                token,

                admin: {

                    id: admin.id,

                    email: admin.email,

                    role: "admin"

                }

            });

        } catch (error) {

            console.error(
                "Admin login:",
                error
            );


            res.status(500).json({

                success: false,

                message:
                    "Server error."

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

            admin: req.admin

        });

    }
);


/* =====================================================
   GET KNOWLEDGE
===================================================== */

app.get(
    "/api/admin/knowledge",
    requireAdmin,
    async (
        req,
        res
    ) => {

        try {

            const rows =
                await dbAll(
                    `
                    SELECT *
                    FROM knowledge
                    ORDER BY id DESC
                    `
                );


            res.json({

                success: true,

                knowledge: rows

            });

        } catch (error) {

            console.error(error);

            res.status(500).json({

                success: false,

                message:
                    "Knowledge lama soo qaadi karin."

            });

        }

    }
);


/* =====================================================
   PUBLIC KNOWLEDGE
===================================================== */

app.get(
    "/api/knowledge",
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
                        image_url,
                        audio_url,
                        knowledge,
                        created_at,
                        updated_at
                    FROM knowledge
                    ORDER BY id DESC
                    `
                );


            res.json({

                success: true,

                knowledge: rows

            });

        } catch (error) {

            console.error(error);

            res.status(500).json({

                success: false,

                message:
                    "Knowledge lama soo qaadi karin."

            });

        }

    }
);


/* =====================================================
   CREATE KNOWLEDGE
===================================================== */

app.post(
    "/api/admin/knowledge",
    requireAdmin,

    upload.fields([

        {
            name: "image",
            maxCount: 1
        },

        {
            name: "audio",
            maxCount: 1
        }

    ]),

    async (
        req,
        res
    ) => {

        try {

            const title =
                (
                    req.body.title ||
                    ""
                ).trim();


            const content =
                (
                    req.body.content ||
                    ""
                ).trim();


            const knowledge =
                (
                    req.body.knowledge ||
                    ""
                ).trim();


            if (
                !title ||
                !content
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Title iyo content waa loo baahan yahay."

                });

            }


            let imageUrl = null;

            let imageHash = null;

            let audioUrl = null;


            const imageFile =
                req.files?.image?.[0];


            const audioFile =
                req.files?.audio?.[0];


            if (imageFile) {

                imageHash =
                    await getFileHash(
                        imageFile.path
                    );


                imageUrl =
                    getFileUrl(
                        req,
                        imageFile.path
                    );

            }


            if (audioFile) {

                audioUrl =
                    getFileUrl(
                        req,
                        audioFile.path
                    );

            }


            const result =
                await dbRun(
                    `
                    INSERT INTO knowledge
                    (
                        title,
                        content,
                        image_url,
                        image_hash,
                        audio_url,
                        knowledge
                    )
                    VALUES
                    (?, ?, ?, ?, ?, ?)
                    `,
                    [
                        title,
                        content,
                        imageUrl,
                        imageHash,
                        audioUrl,
                        knowledge
                    ]
                );


            const row =
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


            res.status(201).json({

                success: true,

                message:
                    "Knowledge waa la kaydiyey.",

                knowledge: row

            });

        } catch (error) {

            console.error(
                "Create knowledge:",
                error
            );


            res.status(500).json({

                success: false,

                message:
                    "Knowledge lama kaydin karin."

            });

        }

    }
);


/* =====================================================
   UPDATE KNOWLEDGE
===================================================== */

app.put(
    "/api/admin/knowledge/:id",
    requireAdmin,

    upload.fields([

        {
            name: "image",
            maxCount: 1
        },

        {
            name: "audio",
            maxCount: 1
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

                return res.status(400).json({

                    success: false,

                    message:
                        "ID khaldan."

                });

            }


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

                return res.status(404).json({

                    success: false,

                    message:
                        "Knowledge lama helin."

                });

            }


            const title =
                (
                    req.body.title ??
                    old.title
                ).trim();


            const content =
                (
                    req.body.content ??
                    old.content
                ).trim();


            const knowledge =
                (
                    req.body.knowledge ??
                    old.knowledge ??
                    ""
                ).trim();


            let imageUrl =
                old.image_url;


            let imageHash =
                old.image_hash;


            let audioUrl =
                old.audio_url;


            const imageFile =
                req.files?.image?.[0];


            const audioFile =
                req.files?.audio?.[0];


            if (imageFile) {

                /*
                Delete old local image
                */

                if (
                    old.image_url &&
                    old.image_url.includes(
                        "/uploads/"
                    )
                ) {

                    const oldPath =
                        path.join(
                            ROOT_DIR,
                            old.image_url
                                .split(
                                    "/uploads/"
                                )[1]
                                .split("/")
                                .join(
                                    path.sep
                                )
                        );

                    deleteFile(
                        oldPath
                    );

                }


                imageHash =
                    await getFileHash(
                        imageFile.path
                    );


                imageUrl =
                    getFileUrl(
                        req,
                        imageFile.path
                    );

            }


            if (audioFile) {

                /*
                Delete old local audio
                */

                if (
                    old.audio_url &&
                    old.audio_url.includes(
                        "/uploads/"
                    )
                ) {

                    const oldPath =
                        path.join(
                            ROOT_DIR,
                            old.audio_url
                                .split(
                                    "/uploads/"
                                )[1]
                                .split("/")
                                .join(
                                    path.sep
                                )
                        );

                    deleteFile(
                        oldPath
                    );

                }


                audioUrl =
                    getFileUrl(
                        req,
                        audioFile.path
                    );

            }


            await dbRun(
                `
                UPDATE knowledge

                SET
                    title = ?,
                    content = ?,
                    image_url = ?,
                    image_hash = ?,
                    audio_url = ?,
                    knowledge = ?,
                    updated_at = CURRENT_TIMESTAMP

                WHERE id = ?
                `,
                [
                    title,
                    content,
                    imageUrl,
                    imageHash,
                    audioUrl,
                    knowledge,
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
                    "Knowledge waa la cusboonaysiiyey.",

                knowledge: updated

            });

        } catch (error) {

            console.error(
                "Update knowledge:",
                error
            );


            res.status(500).json({

                success: false,

                message:
                    "Knowledge lama cusboonaysiin karin."

            });

        }

    }
);


/* =====================================================
   DELETE KNOWLEDGE
===================================================== */

app.delete(
    "/api/admin/knowledge/:id",
    requireAdmin,

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
                await dbGet(
                    `
                    SELECT *
                    FROM knowledge
                    WHERE id = ?
                    `,
                    [id]
                );


            if (!row) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Knowledge lama helin."

                });

            }


            /*
            Delete image
            */

            if (
                row.image_url &&
                row.image_url.includes(
                    "/uploads/"
                )
            ) {

                const imagePath =
                    path.join(
                        ROOT_DIR,
                        row.image_url
                            .split(
                                "/uploads/"
                            )[1]
                            .split("/")
                            .join(
                                path.sep
                            )
                    );

                deleteFile(
                    imagePath
                );

            }


            /*
            Delete audio
            */

            if (
                row.audio_url &&
                row.audio_url.includes(
                    "/uploads/"
                )
            ) {

                const audioPath =
                    path.join(
                        ROOT_DIR,
                        row.audio_url
                            .split(
                                "/uploads/"
                            )[1]
                            .split("/")
                            .join(
                                path.sep
                            )
                    );

                deleteFile(
                    audioPath
                );

            }


            await dbRun(
                `
                DELETE FROM knowledge
                WHERE id = ?
                `,
                [id]
            );


            res.json({

                success: true,

                message:
                    "Knowledge waa la tirtiray."

            });

        } catch (error) {

            console.error(error);

            res.status(500).json({

                success: false,

                message:
                    "Knowledge lama tirtiri karin."

            });

        }

    }
);


/* =====================================================
   FIND KNOWLEDGE BY IMAGE HASH
===================================================== */

async function findKnowledgeByImageHash(
    imageHash
) {

    return await dbGet(
        `
        SELECT
            id,
            title,
            content,
            image_url,
            audio_url,
            knowledge,
            image_hash
        FROM knowledge
        WHERE image_hash = ?
        LIMIT 1
        `,
        [imageHash]
    );

}


/* =====================================================
   AI IMAGE INTERPRETATION
===================================================== */

async function interpretImageWithAI(
    imageDataUrl,
    userText = ""
) {

    if (!openai) {

        return {
            success: false,

            message:
                "OPENAI_API_KEY lama dejin."
        };

    }


    const response =
        await openai.responses.create({

            model: AI_MODEL,

            instructions: `
Waxaad tahay AI ku hadla Af-Soomaali.

Isticmaal sawirka user-ku soo diray
si aad u fahanto waxa sawirka ku jira.

Haddii user-ku qoraal raaciyey,
tixgeli qoraalkaas.

Ha sheegan in sawirku Database ku jiro
haddii aan server-ku kuu sheegin.

Jawaabta ku qor Af-Soomaali.
            `,

            input: [

                {
                    role: "user",

                    content: [

                        {
                            type:
                                "input_text",

                            text:
                                userText ||
                                "Fadlan sharax sawirkan."
                        },

                        {
                            type:
                                "input_image",

                            image_url:
                                imageDataUrl
                        }

                    ]

                }

            ]

        });


    return {

        success: true,

        answer:
            response.output_text ||
            "AI jawaab kama soo saarin sawirka."

    };

}


/* =====================================================
   IMAGE MATCH API
===================================================== */

app.post(
    "/api/match-image",

    upload.single("image"),

    async (
        req,
        res
    ) => {

        try {

            if (!req.file) {

                return res.status(400).json({

                    success: false,

                    found: false,

                    message:
                        "Sawir ayaa loo baahan yahay."

                });

            }


            /*
            SHA256 EXACT MATCH
            */

            const imageHash =
                await getFileHash(
                    req.file.path
                );


            const imageUrl =
                getFileUrl(
                    req,
                    req.file.path
                );


            /*
            SEARCH DATABASE
            */

            const found =
                await findKnowledgeByImageHash(
                    imageHash
                );


            /*
            ==========================================
            DATABASE MATCH
            ==========================================
            */

            if (found) {

                return res.json({

                    success: true,

                    found: true,

                    match: "exact",

                    title:
                        found.title,

                    content:
                        found.content,

                    image_url:
                        found.image_url,

                    audio_url:
                        found.audio_url,

                    knowledge:
                        found.knowledge,

                    image_hash:
                        found.image_hash

                });

            }


            /*
            ==========================================
            NOT FOUND
            ==========================================
            */

            const aiData =
                fs.readFileSync(
                    req.file.path
                );


            const base64 =
                aiData.toString(
                    "base64"
                );


            const mime =
                req.file.mimetype ||
                "image/jpeg";


            const imageDataUrl =
                `data:${mime};base64,${base64}`;


            /*
            AI INTERPRETATION
            */

            let aiResult = null;


            try {

                aiResult =
                    await interpretImageWithAI(
                        imageDataUrl,
                        req.body.text ||
                        ""
                    );

            } catch (aiError) {

                console.error(
                    "AI image error:",
                    aiError.message
                );

                aiResult = {

                    success: false,

                    message:
                        "AI sawirka ma fasiri karin."

                };

            }


            return res.json({

                success: true,

                found: false,

                match: null,

                title: null,

                content: null,

                image_url: null,

                audio_url: null,

                knowledge: null,

                message:
                    "Sawirkan Database-ka lagama helin.",

                ai_fallback: true,

                ai_answer:
                    aiResult?.answer ||
                    aiResult?.message ||
                    "AI jawaab kama bixin sawirka."

            });

        } catch (error) {

            console.error(
                "MATCH IMAGE ERROR:",
                error
            );


            res.status(500).json({

                success: false,

                found: false,

                message:
                    "Sawirka lama baarin karin."

            });

        }

    }
);


/* =====================================================
   SEARCH KNOWLEDGE FOR CHAT
===================================================== */

async function searchKnowledge(
    message
) {

    if (!message) {
        return [];
    }


    const words =
        message
            .toLowerCase()
            .split(
                /\s+/
            )
            .map(
                word =>
                    word.replace(
                        /[^\p{L}\p{N}]/gu,
                        ""
                    )
            )
            .filter(
                word =>
                    word.length >= 3
            )
            .slice(
                0,
                10
            );


    if (!words.length) {
        return [];
    }


    const conditions =
        words
            .map(
                () => `
                (
                    LOWER(title) LIKE ?
                    OR LOWER(content) LIKE ?
                    OR LOWER(knowledge) LIKE ?
                )
                `
            )
            .join(" OR ");


    const params = [];


    for (const word of words) {

        const value =
            `%${word}%`;


        params.push(
            value,
            value,
            value
        );

    }


    return await dbAll(
        `
        SELECT
            id,
            title,
            content,
            image_url,
            audio_url,
            knowledge
        FROM knowledge
        WHERE ${conditions}
        ORDER BY id DESC
        LIMIT 5
        `,
        params
    );

}


/* =====================================================
   CHAT WITH AI
===================================================== */

async function chatWithAI({

    message,

    imageDataUrl,

    knowledge

}) {

    if (!openai) {

        return {

            success: false,

            answer:
                "OPENAI_API_KEY lama dejin."

        };

    }


    let knowledgeText =
        "";


    if (
        knowledge &&
        knowledge.length
    ) {

        knowledgeText =
            knowledge
                .map(
                    (
                        item,
                        index
                    ) => {

                        return `
Knowledge ${index + 1}

Title:
${item.title}

Content:
${item.content}

Extra:
${item.knowledge || ""}

Image URL:
${item.image_url || ""}

Audio URL:
${item.audio_url || ""}
                        `;

                    }
                )
                .join(
                    "\n\n"
                );

    }


    const userContent = [];


    userContent.push({

        type:
            "input_text",

        text: `
User message:

${message || "Sawir ayaa la soo diray."}

Knowledge Database:

${knowledgeText || "Wax knowledge ah lama helin."}

Haddii Knowledge Database uu leeyahay
xog si toos ah ugu habboon su'aasha,
isticmaal xogtaas.

Haddii aan xog ku filan laga helin,
isticmaal aqoontaada guud.

Jawaabta ku qor Af-Soomaali.
        `

    });


    if (imageDataUrl) {

        userContent.push({

            type:
                "input_image",

            image_url:
                imageDataUrl

        });

    }


    const response =
        await openai.responses.create({

            model: AI_MODEL,

            instructions: `
Waxaad tahay AI Assistant
oo loogu talagalay Nasiib Business Center.

Luqadda ugu muhiimsan waa Af-Soomaali.

Si cad oo kooban uga jawaab.

Ha sheegan in sawir Database ku jiro
haddii aan xogta Database-ku sidaas caddeyn.

Haddii sawir Database match ah jiro,
xogta Database-ka mudnaanta sii.

Haddii aanu jirin,
sawirka si madax-bannaan u fasir.
            `,

            input: [

                {
                    role: "user",

                    content:
                        userContent

                }

            ]

        });


    return {

        success: true,

        answer:
            response.output_text ||
            "AI jawaab kama soo saarin."

    };

}


/* =====================================================
   CHAT API
===================================================== */

app.post(
    "/chat",

    async (
        req,
        res
    ) => {

        try {

            const {

                message,

                client_id,

                image,

                image_base64

            } = req.body;


            /*
            PUBLIC CLIENT ID
            */

            const clientId =
                (
                    client_id ||
                    crypto.randomUUID()
                ).toString();


            const userMessage =
                (
                    message ||
                    ""
                ).trim();


            /*
            IMAGE
            */

            let imageDataUrl =
                image ||
                image_base64 ||
                null;


            /*
            If image_base64 does not contain
            data:image/... prefix
            */

            if (
                imageDataUrl &&
                !imageDataUrl.startsWith(
                    "data:image/"
                )
            ) {

                imageDataUrl =
                    `data:image/jpeg;base64,${imageDataUrl}`;

            }


            if (
                !userMessage &&
                !imageDataUrl
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Qoraal ama sawir ayaa loo baahan yahay."

                });

            }


            /*
            KNOWLEDGE SEARCH
            */

            const knowledge =
                await searchKnowledge(
                    userMessage
                );


            /*
            SAVE USER MESSAGE
            */

            await dbRun(
                `
                INSERT INTO chats
                (
                    client_id,
                    role,
                    message,
                    image_url,
                    response
                )
                VALUES
                (?, ?, ?, ?, ?)
                `,
                [
                    clientId,
                    "user",
                    userMessage,
                    null,
                    null
                ]
            );


            /*
            AI
            */

            const ai =
                await chatWithAI({

                    message:
                        userMessage,

                    imageDataUrl,

                    knowledge

                });


            /*
            SAVE AI RESPONSE
            */

            await dbRun(
                `
                INSERT INTO chats
                (
                    client_id,
                    role,
                    message,
                    image_url,
                    response
                )
                VALUES
                (?, ?, ?, ?, ?)
                `,
                [
                    clientId,
                    "assistant",
                    null,
                    null,
                    ai.answer
                ]
            );


            /*
            RETURN KNOWLEDGE
            */

            const knowledgeResult =
                knowledge.map(
                    item => ({

                        id:
                            item.id,

                        title:
                            item.title,

                        content:
                            item.content,

                        image_url:
                            item.image_url,

                        audio_url:
                            item.audio_url,

                        knowledge:
                            item.knowledge

                    })
                );


            res.json({

                success: true,

                client_id:
                    clientId,

                answer:
                    ai.answer,

                knowledge:
                    knowledgeResult

            });

        } catch (error) {

            console.error(
                "CHAT ERROR:",
                error
            );


            res.status(500).json({

                success: false,

                message:
                    "Chat server error."

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
                (
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
                        client_id,
                        role,
                        message,
                        image_url,
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

                client_id:
                    clientId,

                chats

            });

        } catch (error) {

            console.error(error);

            res.status(500).json({

                success: false,

                message:
                    "Chat history lama soo qaadi karin."

            });

        }

    }
);


/* =====================================================
   DELETE PUBLIC USER CHAT
===================================================== */

app.delete(
    "/api/chats",

    async (
        req,
        res
    ) => {

        try {

            const clientId =
                (
                    req.body.client_id ||
                    req.query.client_id ||
                    ""
                ).trim();


            if (!clientId) {

                return res.status(400).json({

                    success: false,

                    message:
                        "client_id ayaa loo baahan yahay."

                });

            }


            const result =
                await dbRun(
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

            console.error(error);

            res.status(500).json({

                success: false,

                message:
                    "Chat lama tirtiri karin."

            });

        }

    }
);


/* =====================================================
   ADMIN - ALL CHATS
===================================================== */

app.get(
    "/api/admin/chats",
    requireAdmin,

    async (
        req,
        res
    ) => {

        try {

            const chats =
                await dbAll(
                    `
                    SELECT *
                    FROM chats
                    ORDER BY id DESC
                    LIMIT 1000
                    `
                );


            res.json({

                success: true,

                chats

            });

        } catch (error) {

            console.error(error);

            res.status(500).json({

                success: false,

                message:
                    "Admin chats lama soo qaadi karin."

            });

        }

    }
);


/* =====================================================
   ADMIN DELETE CHAT
===================================================== */

app.delete(
    "/api/admin/chats/:clientId",
    requireAdmin,

    async (
        req,
        res
    ) => {

        try {

            const clientId =
                req.params.clientId;


            const result =
                await dbRun(
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
                    "User chat history waa la tirtiray."

            });

        } catch (error) {

            console.error(error);

            res.status(500).json({

                success: false,

                message:
                    "Chat lama tirtiri karin."

            });

        }

    }
);


/* =====================================================
   AUDIO TRANSCRIPTION
===================================================== */

app.post(
    "/api/transcribe",

    upload.single("audio"),

    async (
        req,
        res
    ) => {

        try {

            if (!req.file) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Audio file ayaa loo baahan yahay."

                });

            }


            if (!openai) {

                deleteFile(
                    req.file.path
                );


                return res.status(500).json({

                    success: false,

                    message:
                        "OPENAI_API_KEY lama dejin."

                });

            }


            /*
            OPENAI TRANSCRIPTION
            */

            const transcription =
                await openai
                    .audio
                    .transcriptions
                    .create({

                        file:
                            fs.createReadStream(
                                req.file.path
                            ),

                        model:
                            TRANSCRIPTION_MODEL

                    });


            const text =
                transcription.text ||
                "";


            const audioUrl =
                getFileUrl(
                    req,
                    req.file.path
                );


            res.json({

                success: true,

                text,

                transcript:
                    text,

                audio_url:
                    audioUrl

            });

        } catch (error) {

            console.error(
                "TRANSCRIPTION ERROR:",
                error
            );


            if (req.file) {

                deleteFile(
                    req.file.path
                );

            }


            res.status(500).json({

                success: false,

                message:
                    "Audio transcription way fashilantay.",

                error:
                    process.env.NODE_ENV ===
                    "development"
                        ? error.message
                        : undefined

            });

        }

    }
);


/* =====================================================
   ADMIN UPLOAD IMAGE ONLY
===================================================== */

app.post(
    "/api/admin/upload-image",

    requireAdmin,

    upload.single("image"),

    async (
        req,
        res
    ) => {

        try {

            if (!req.file) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Image ayaa loo baahan yahay."

                });

            }


            const hash =
                await getFileHash(
                    req.file.path
                );


            const url =
                getFileUrl(
                    req,
                    req.file.path
                );


            res.json({

                success: true,

                image_url:
                    url,

                image_hash:
                    hash

            });

        } catch (error) {

            console.error(error);

            res.status(500).json({

                success: false,

                message:
                    "Image upload error."

            });

        }

    }
);


/* =====================================================
   HEALTH CHECK
===================================================== */

app.get(
    "/api/health",
    async (
        req,
        res
    ) => {

        try {

            const knowledgeCount =
                await dbGet(
                    `
                    SELECT COUNT(*) AS count
                    FROM knowledge
                    `
                );


            const chatCount =
                await dbGet(
                    `
                    SELECT COUNT(*) AS count
                    FROM chats
                    `
                );


            res.json({

                success: true,

                status:
                    "ok",

                server:
                    "Nasiib Business Center",

                database:
                    "SQLite",

                database_file:
                    DB_PATH,

                openai:
                    Boolean(
                        process.env.OPENAI_API_KEY
                    ),

                ai_model:
                    AI_MODEL,

                transcription_model:
                    TRANSCRIPTION_MODEL,

                knowledge_count:
                    knowledgeCount?.count ||
                    0,

                chat_count:
                    chatCount?.count ||
                    0,

                time:
                    new Date().toISOString()

            });

        } catch (error) {

            res.status(500).json({

                success: false,

                status:
                    "error",

                message:
                    error.message

            });

        }

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
                PUBLIC_DIR,
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

            name:
                "Nasiib Business Center",

            message:
                "Server-ku wuu shaqaynayaa."

        });

    }
);


/* =====================================================
   404
===================================================== */

app.use(
    (
        req,
        res
    ) => {

        res.status(404).json({

            success: false,

            message:
                "API route lama helin.",

            path:
                req.originalUrl

        });

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
            "GLOBAL ERROR:",
            error
        );


        if (
            error instanceof
            multer.MulterError
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "File upload error.",

                error:
                    error.message

            });

        }


        res.status(500).json({

            success: false,

            message:
                error.message ||
                "Server error."

        });

    }
);


/* =====================================================
   START SERVER
===================================================== */

async function startServer() {

    try {

        await initializeDatabase();


        app.listen(
            PORT,
            HOST,
            () => {

                console.log("");
                console.log(
                    "================================================"
                );

                console.log(
                    "🚀 NASIIB BUSINESS CENTER"
                );

                console.log(
                    "================================================"
                );

                console.log(
                    `Server: http://localhost:${PORT}`
                );

                console.log(
                    `Health: http://localhost:${PORT}/api/health`
                );

                console.log(
                    `Database: ${DB_PATH}`
                );

                console.log(
                    `AI Model: ${AI_MODEL}`
                );

                console.log(
                    `Transcription: ${TRANSCRIPTION_MODEL}`
                );

                console.log(
                    `OpenAI: ${
                        process.env.OPENAI_API_KEY
                            ? "CONNECTED"
                            : "NOT CONFIGURED"
                    }`
                );

                console.log(
                    "================================================"
                );

            }
        );

    } catch (error) {

        console.error(
            "SERVER START ERROR:",
            error
        );


        process.exit(
            1
        );

    }

}


/* =====================================================
   GRACEFUL SHUTDOWN
===================================================== */

process.on(
    "SIGINT",
    () => {

        db.close(
            () => {

                console.log(
                    "SQLite database closed."
                );

                process.exit(
                    0
                );

            }
        );

    }
);


process.on(
    "SIGTERM",
    () => {

        db.close(
            () => {

                console.log(
                    "SQLite database closed."
                );

                process.exit(
                    0
                );

            }
        );

    }
);


/* =====================================================
   START
===================================================== */

startServer();
