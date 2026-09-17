/* =========================================================
   NASIIB BUSINESS CENTER
   COMPLETE SERVER
   ---------------------------------------------------------
   Features:

   USER
   - Public Chat
   - No Register
   - No User Login
   - Anonymous Client ID
   - Chat History
   - Delete Chat History
   - Text
   - Image

   ADMIN
   - Admin Login
   - Knowledge Database
   - Add Text
   - Upload Audio
   - Upload Image
   - Audio -> Text
   - Image -> AI Interpretation
   - Edit Knowledge
   - Delete Knowledge
   - Search Knowledge

   DATABASE
   - SQLite

   AI
   - OpenRouter
   - OpenAI SDK
========================================================= */


/* =========================================================
   1. REQUIREMENTS
========================================================= */

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const OpenAI = require("openai");


/* =========================================================
   2. EXPRESS CONFIG
========================================================= */

const app = express();

const PORT =
    process.env.PORT || 3000;

const JWT_SECRET =
    process.env.JWT_SECRET ||
    "BADAL_SECRET_KAN_PRODUCTION";

const OPENROUTER_API_KEY =
    process.env.OPENROUTER_API_KEY || "";

const AI_MODEL =
    process.env.AI_MODEL ||
    "openrouter/free";

const APP_URL =
    process.env.APP_URL ||
    `http://localhost:${PORT}`;


/* =========================================================
   3. MIDDLEWARE
========================================================= */

app.use(
    cors()
);

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


/* =========================================================
   4. OPENROUTER
========================================================= */

let openai = null;

if (OPENROUTER_API_KEY) {

    openai = new OpenAI({

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

}


/* =========================================================
   5. FOLDERS
========================================================= */

const databaseDir =
    path.join(
        __dirname,
        "database"
    );

const uploadDir =
    path.join(
        __dirname,
        "uploads"
    );

const knowledgeUploadDir =
    path.join(
        uploadDir,
        "knowledge"
    );


/* ---------------------------------------------------------
   CREATE FOLDERS
--------------------------------------------------------- */

[
    databaseDir,
    uploadDir,
    knowledgeUploadDir
].forEach(folder => {

    if (!fs.existsSync(folder)) {

        fs.mkdirSync(
            folder,
            {
                recursive: true
            }
        );

    }

});


/* =========================================================
   6. STATIC FILES
========================================================= */

app.use(
    express.static(
        path.join(
            __dirname,
            "public"
        )
    )
);


/* =========================================================
   7. STATIC UPLOADS
========================================================= */

app.use(
    "/uploads",
    express.static(
        uploadDir
    )
);


/* =========================================================
   8. MULTER / UPLOAD CONFIGURATION
========================================================= */

const storage =
    multer.diskStorage({

        destination:
            function (
                req,
                file,
                cb
            ) {

                cb(
                    null,
                    knowledgeUploadDir
                );

            },


        filename:
            function (
                req,
                file,
                cb
            ) {

                const extension =
                    path.extname(
                        file.originalname
                    );


                const filename =
                    Date.now() +
                    "-" +
                    Math.random()
                        .toString(36)
                        .substring(2, 10) +
                    extension;


                cb(
                    null,
                    filename
                );

            }

    });


const knowledgeUpload =
    multer({

        storage,

        limits: {

            fileSize:
                25 * 1024 * 1024

        }

    });


/* =========================================================
   9. SQLITE DATABASE
========================================================= */

const databasePath =
    path.join(
        databaseDir,
        "database.sqlite"
    );


const db =
    new sqlite3.Database(
        databasePath,
        error => {

            if (error) {

                console.error(
                    "❌ Database Error:",
                    error.message
                );

            } else {

                console.log(
                    "✅ SQLite Database Connected"
                );

            }

        }
    );


/* =========================================================
   10. DATABASE TABLES
========================================================= */

db.serialize(() => {


    /* -----------------------------------------------------
       USERS
    ----------------------------------------------------- */

    db.run(`
        CREATE TABLE IF NOT EXISTS users (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            email TEXT UNIQUE NOT NULL,

            password TEXT NOT NULL,

            role TEXT DEFAULT 'user',

            created_at DATETIME
                DEFAULT CURRENT_TIMESTAMP

        )
    `);


    /* -----------------------------------------------------
       CHATS
    ----------------------------------------------------- */

    db.run(`
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


    /* -----------------------------------------------------
       KNOWLEDGE
    ----------------------------------------------------- */

    db.run(`
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

});


/* =========================================================
   11. DEFAULT ADMIN
========================================================= */

const ADMIN_EMAIL =
    process.env.ADMIN_EMAIL ||
    "admin@nasiib.com";

const ADMIN_PASSWORD =
    process.env.ADMIN_PASSWORD ||
    "123456";


async function createDefaultAdmin() {

    try {

        db.get(
            `
            SELECT id
            FROM users
            WHERE email = ?
            `,
            [ADMIN_EMAIL],

            async (
                error,
                user
            ) => {

                if (error) {

                    console.error(
                        "Admin check error:",
                        error.message
                    );

                    return;

                }


                if (user) {

                    return;

                }


                const hashedPassword =
                    await bcrypt.hash(
                        ADMIN_PASSWORD,
                        10
                    );


                db.run(
                    `
                    INSERT INTO users
                    (
                        email,
                        password,
                        role
                    )

                    VALUES (?, ?, ?)
                    `,

                    [
                        ADMIN_EMAIL,
                        hashedPassword,
                        "admin"
                    ],

                    insertError => {

                        if (insertError) {

                            console.error(
                                "Admin creation error:",
                                insertError.message
                            );

                        } else {

                            console.log(
                                "👑 Default Admin Created"
                            );

                            console.log(
                                "Email:",
                                ADMIN_EMAIL
                            );

                        }

                    }
                );

            }
        );

    } catch (error) {

        console.error(
            "Default admin error:",
            error
        );

    }

}


createDefaultAdmin();


/* =========================================================
   12. AUTHENTICATION
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
   13. ADMIN AUTH MIDDLEWARE
========================================================= */

function adminMiddleware(
    req,
    res,
    next
) {

    try {

        const auth =
            req.headers.authorization || "";


        if (
            !auth.startsWith(
                "Bearer "
            )
        ) {

            return res
                .status(401)
                .json({
                    error:
                        "Admin authentication required"
                });

        }


        const token =
            auth.replace(
                "Bearer ",
                ""
            );


        const decoded =
            jwt.verify(
                token,
                JWT_SECRET
            );


        if (
            decoded.role !== "admin"
        ) {

            return res
                .status(403)
                .json({
                    error:
                        "Admin access only"
                });

        }


        req.admin =
            decoded;


        next();


    } catch (error) {

        return res
            .status(401)
            .json({
                error:
                    "Token-ka Admin-ka waa khaldan yahay ama dhacay"
            });

    }

}


/* =========================================================
   14. ADMIN LOGIN
========================================================= */

app.post(
    "/api/login",
    (req, res) => {

        const email =
            String(
                req.body.email || ""
            )
            .trim()
            .toLowerCase();


        const password =
            String(
                req.body.password || ""
            );


        if (
            !email ||
            !password
        ) {

            return res
                .status(400)
                .json({
                    error:
                        "Email iyo password waa loo baahan yahay"
                });

        }


        db.get(
            `
            SELECT *
            FROM users
            WHERE email = ?
            `,

            [email],

            async (
                error,
                user
            ) => {

                if (error) {

                    return res
                        .status(500)
                        .json({
                            error:
                                error.message
                        });

                }


                if (!user) {

                    return res
                        .status(401)
                        .json({
                            error:
                                "Email ama password khaldan"
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
                                "Email ama password khaldan"
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

            }
        );

    }
);


/* =========================================================
   15. ADMIN ME
========================================================= */

app.get(
    "/api/admin/me",
    adminMiddleware,
    (req, res) => {

        res.json({

            success:
                true,

            admin:
                req.admin

        });

    }
);


/* =========================================================
   16. KNOWLEDGE - GET
========================================================= */

app.get(
    "/api/admin/knowledge",
    adminMiddleware,
    (req, res) => {

        db.all(
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
            `,

            [],

            (error, rows) => {

                if (error) {

                    return res
                        .status(500)
                        .json({
                            error:
                                error.message
                        });

                }


                res.json(rows);

            }
        );

    }
);


/* =========================================================
   17. KNOWLEDGE - SEARCH
========================================================= */

app.get(
    "/api/admin/knowledge/search",
    adminMiddleware,
    (req, res) => {

        const q =
            String(
                req.query.q || ""
            ).trim();


        db.all(
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
            ],

            (error, rows) => {

                if (error) {

                    return res
                        .status(500)
                        .json({
                            error:
                                error.message
                        });

                }


                res.json(rows);

            }
        );

    }
);


/* =========================================================
   18. KNOWLEDGE - ADD
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

    (req, res) => {

        const title =
            String(
                req.body.title || ""
            ).trim();


        const content =
            String(
                req.body.content || ""
            ).trim();


        const audioFile =
            req.files?.audio?.[0];


        const imageFile =
            req.files?.image?.[0];


        const audioUrl =
            audioFile
                ? `/uploads/knowledge/${audioFile.filename}`
                : null;


        const imageUrl =
            imageFile
                ? `/uploads/knowledge/${imageFile.filename}`
                : null;


        if (
            !title &&
            !content &&
            !audioFile &&
            !imageFile
        ) {

            return res
                .status(400)
                .json({
                    error:
                        "Fadlan xog geli"
                });

        }


        db.run(
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
            ],

            function (error) {

                if (error) {

                    console.error(
                        "Knowledge INSERT:",
                        error.message
                    );

                    return res
                        .status(500)
                        .json({
                            error:
                                error.message
                        });

                }


                res.json({

                    success:
                        true,

                    message:
                        "Knowledge Database-ka waa lagu daray",

                    id:
                        this.lastID

                });

            }
        );

    }
);


/* =========================================================
   19. KNOWLEDGE - EDIT
========================================================= */

app.put(
    "/api/admin/knowledge/:id",

    adminMiddleware,

    (req, res) => {

        const id =
            Number(
                req.params.id
            );


        const title =
            String(
                req.body.title || ""
            ).trim();


        const content =
            String(
                req.body.content || ""
            ).trim();


        if (
            !Number.isInteger(id)
        ) {

            return res
                .status(400)
                .json({
                    error:
                        "ID khaldan"
                });

        }


        db.run(
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
            ],

            function (error) {

                if (error) {

                    return res
                        .status(500)
                        .json({
                            error:
                                error.message
                        });

                }


                if (
                    this.changes === 0
                ) {

                    return res
                        .status(404)
                        .json({
                            error:
                                "Knowledge lama helin"
                        });

                }


                res.json({

                    success:
                        true,

                    message:
                        "Knowledge waa la cusbooneysiiyey"

                });

            }
        );

    }
);


/* =========================================================
   20. KNOWLEDGE - DELETE
========================================================= */

app.delete(
    "/api/admin/knowledge/:id",

    adminMiddleware,

    (req, res) => {

        const id =
            Number(
                req.params.id
            );


        db.get(
            `
            SELECT
                audio_url,
                image_url

            FROM knowledge

            WHERE id = ?
            `,

            [id],

            (error, row) => {

                if (error) {

                    return res
                        .status(500)
                        .json({
                            error:
                                error.message
                        });

                }


                if (!row) {

                    return res
                        .status(404)
                        .json({
                            error:
                                "Knowledge lama helin"
                        });

                }


                db.run(
                    `
                    DELETE FROM knowledge
                    WHERE id = ?
                    `,

                    [id],

                    function (
                        deleteError
                    ) {

                        if (
                            deleteError
                        ) {

                            return res
                                .status(500)
                                .json({
                                    error:
                                        deleteError.message
                                });

                        }


                        /* ---------------------------------
                           DELETE AUDIO
                        --------------------------------- */

                        if (
                            row.audio_url
                        ) {

                            const audioPath =
                                path.join(
                                    __dirname,
                                    row.audio_url
                                        .replace(
                                            /^\/uploads\//,
                                            "uploads/"
                                        )
                                );


                            if (
                                fs.existsSync(
                                    audioPath
                                )
                            ) {

                                fs.unlink(
                                    audioPath,
                                    () => {}
                                );

                            }

                        }


                        /* ---------------------------------
                           DELETE IMAGE
                        --------------------------------- */

                        if (
                            row.image_url
                        ) {

                            const imagePath =
                                path.join(
                                    __dirname,
                                    row.image_url
                                        .replace(
                                            /^\/uploads\//,
                                            "uploads/"
                                        )
                                );


                            if (
                                fs.existsSync(
                                    imagePath
                                )
                            ) {

                                fs.unlink(
                                    imagePath,
                                    () => {}
                                );

                            }

                        }


                        res.json({

                            success:
                                true,

                            message:
                                "Knowledge waa la tirtiray"

                        });

                    }
                );

            }
        );

    }
);


/* =========================================================
   21. AUDIO -> TEXT
========================================================= */

app.post(
    "/api/admin/knowledge/transcribe",

    adminMiddleware,

    knowledgeUpload.single(
        "audio"
    ),

    async (
        req,
        res
    ) => {

        try {

            if (
                !req.file
            ) {

                return res
                    .status(400)
                    .json({
                        error:
                            "Audio lama helin"
                    });

            }


            if (
                !process.env
                    .OPENAI_API_KEY
            ) {

                return res
                    .status(500)
                    .json({
                        error:
                            "OPENAI_API_KEY kuma jiro .env"
                    });

            }


            const transcription =
                await openai.audio
                    .transcriptions
                    .create({

                        file:
                            fs.createReadStream(
                                req.file.path
                            ),

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
                "TRANSCRIPTION ERROR:",
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
   22. IMAGE -> AI INTERPRETATION
========================================================= */

app.post(
    "/api/admin/knowledge/interpret-image",

    adminMiddleware,

    knowledgeUpload.single(
        "image"
    ),

    async (
        req,
        res
    ) => {

        try {

            if (
                !req.file
            ) {

                return res
                    .status(400)
                    .json({
                        error:
                            "Sawir lama helin"
                    });

            }


            if (!openai) {

                return res
                    .status(500)
                    .json({
                        error:
                            "OPENROUTER_API_KEY kuma jiro .env"
                    });

            }


            const buffer =
                fs.readFileSync(
                    req.file.path
                );


            const base64 =
                buffer.toString(
                    "base64"
                );


            const imageData =
                `data:${req.file.mimetype};base64,${base64}`;


            const completion =
                await openai.chat
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
Waxaad tahay AI
Af-Soomaali ku jawaaba.

Sawirka si taxaddar
leh u baar.

Haddii uu leeyahay
qoraal, akhri.

Haddii uu leeyahay
xog muhiim ah, sharax.

Jawaabta ku qor
Af-Soomaali.
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
                                            "Fasir sawirkan oo soo saar xogta muhiimka ah."
                                    },

                                    {
                                        type:
                                            "image_url",

                                        image_url: {
                                            url:
                                                imageData
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
                    ?.content || "";


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
                        error.message
                });

        }

    }
);


/* =========================================================
   23. PUBLIC CHAT
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
                    req.body.message || ""
                ).trim();


            const image =
                req.body.image ||
                null;


            const clientId =
                String(
                    req.body.clientId ||
                    "anonymous"
                );


            if (
                !message &&
                !image
            ) {

                return res
                    .status(400)
                    .json({
                        error:
                            "Qoraal ama sawir geli"
                    });

            }


            if (!openai) {

                return res
                    .status(500)
                    .json({
                        error:
                            "OPENROUTER_API_KEY kuma jiro .env"
                    });

            }


            /* -----------------------------------------
               GET KNOWLEDGE
            ----------------------------------------- */

            const knowledge =
                await getKnowledge();


            const knowledgeText =
                knowledge
                    .map(item => {

                        return `
Cinwaan:
${item.title || ""}

Xog:
${item.content || ""}
`;

                    })
                    .join("\n");


            /* -----------------------------------------
               SYSTEM
            ----------------------------------------- */

            const systemPrompt = `

Waxaad tahay AI-ga
NASIIB BUSINESS CENTER.

Waxaad ku jawaabaysaa
Af-Soomaali.

Haddii Knowledge Database
ku jiro xog la xiriirta
su'aasha user-ka, isticmaal
xogtaas.

Ha sheegan xog aanad
hubin.

Haddii user-ku sawir
soo diro, isku day inaad
fahanto sawirka.

KNOWLEDGE DATABASE:

${knowledgeText}

`;


            /* -----------------------------------------
               USER MESSAGE
            ----------------------------------------- */

            let userContent;


            if (image) {

                userContent = [

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

                ];

            } else {

                userContent =
                    message;

            }


            /* -----------------------------------------
               AI REQUEST
            ----------------------------------------- */

            const completion =
                await openai.chat
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


            const aiResponse =
                completion
                    .choices?.[0]
                    ?.message
                    ?.content ||
                "AI jawaab ma bixin."


            /* -----------------------------------------
               SAVE CHAT
            ----------------------------------------- */

            db.run(
                `
                INSERT INTO chats
                (
                    client_id,
                    user_id,
                    message,
                    image,
                    response
                )

                VALUES (?, ?, ?, ?, ?)
                `,

                [
                    clientId,
                    null,
                    message,
                    image,
                    aiResponse
                ],

                error => {

                    if (error) {

                        console.error(
                            "CHAT SAVE ERROR:",
                            error.message
                        );

                    }

                }
            );


            /* -----------------------------------------
               RESPONSE
            ----------------------------------------- */

            res.json({

                success:
                    true,

                response:
                    aiResponse

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
                        error.message

                });

        }

    }
);


/* =========================================================
   24. GET PUBLIC CHAT HISTORY
========================================================= */

app.get(
    "/api/chats",
    (req, res) => {

        const clientId =
            String(
                req.query.clientId ||
                ""
            );


        if (!clientId) {

            return res.json([]);

        }


        db.all(
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

            [clientId],

            (error, rows) => {

                if (error) {

                    return res
                        .status(500)
                        .json({
                            error:
                                error.message
                        });

                }


                res.json(rows);

            }
        );

    }
);


/* =========================================================
   25. DELETE PUBLIC CHAT HISTORY
========================================================= */

app.delete(
    "/api/chats",
    (req, res) => {

        const clientId =
            String(
                req.query.clientId ||
                req.body.clientId ||
                ""
            );


        if (!clientId) {

            return res
                .status(400)
                .json({
                    error:
                        "clientId ayaa loo baahan yahay"
                });

        }


        db.run(
            `
            DELETE FROM chats
            WHERE client_id = ?
            `,

            [clientId],

            function (error) {

                if (error) {

                    return res
                        .status(500)
                        .json({
                            error:
                                error.message
                        });

                }


                res.json({

                    success:
                        true,

                    deleted:
                        this.changes

                });

            }
        );

    }
);


/* =========================================================
   26. ADMIN CHAT HISTORY
========================================================= */

app.get(
    "/api/admin/chats",
    adminMiddleware,
    (req, res) => {

        db.all(
            `
            SELECT
                id,
                client_id,
                message,
                image,
                response,
                created_at

            FROM chats

            ORDER BY id DESC
            `,

            [],

            (error, rows) => {

                if (error) {

                    return res
                        .status(500)
                        .json({
                            error:
                                error.message
                        });

                }


                res.json(rows);

            }
        );

    }
);


/* =========================================================
   27. ADMIN DELETE ALL CHATS
========================================================= */

app.delete(
    "/api/admin/chats",
    adminMiddleware,
    (req, res) => {

        db.run(
            `
            DELETE FROM chats
            `,

            [],

            function (error) {

                if (error) {

                    return res
                        .status(500)
                        .json({
                            error:
                                error.message
                        });

                }


                res.json({

                    success:
                        true,

                    deleted:
                        this.changes

                });

            }
        );

    }
);


/* =========================================================
   28. HEALTH CHECK
========================================================= */

app.get(
    "/api/health",
    (req, res) => {

        res.json({

            status:
                "online",

            database:
                "sqlite",

            ai:
                openai
                    ? "ready"
                    : "not configured",

            model:
                AI_MODEL

        });

    }
);


/* =========================================================
   29. KNOWLEDGE HELPER
========================================================= */

function getKnowledge() {

    return new Promise(
        (
            resolve,
            reject
        ) => {

            db.all(
                `
                SELECT
                    id,
                    title,
                    content,
                    audio_url,
                    image_url

                FROM knowledge

                ORDER BY id DESC
                `,

                [],

                (
                    error,
                    rows
                ) => {

                    if (error) {

                        reject(
                            error
                        );

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


/* =========================================================
   30. FRONTEND FALLBACK
========================================================= */

app.get(
    "*",
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


/* =========================================================
   31. START SERVER
========================================================= */

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
            "======================================"
        );

        console.log(
            `🌐 Port: ${PORT}`
        );

        console.log(
            `🤖 AI Model: ${AI_MODEL}`
        );

        console.log(
            `🗄️ Database: ${databasePath}`
        );

        console.log(
            `📁 Uploads: ${knowledgeUploadDir}`
        );

        console.log(
            `👑 Admin: ${ADMIN_EMAIL}`
        );

        console.log(
            "======================================"
        );

        console.log("");

    }
);
