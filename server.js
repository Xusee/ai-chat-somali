require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const sqlite3 = require("sqlite3").verbose();
const OpenAI = require("openai");

const app = express();

/* =====================================================
   CONFIG
===================================================== */

const PORT = process.env.PORT || 3000;

const JWT_SECRET =
    process.env.JWT_SECRET ||
    "BADAL_SECRET_KAN_PRODUCTION";

const OPENROUTER_API_KEY =
    process.env.OPENROUTER_API_KEY;

const AI_MODEL =
    process.env.AI_MODEL ||
    "openrouter/free";

/* =====================================================
   MIDDLEWARE
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
   DATABASE
===================================================== */

const dbPath =
    path.join(
        __dirname,
        "database.db"
    );

const db =
    new sqlite3.Database(
        dbPath,
        error => {

            if (error) {

                console.error(
                    "Database error:",
                    error.message
                );

            } else {

                console.log(
                    "✅ SQLite Database connected"
                );
            }
        }
    );


db.serialize(() => {

    db.run(
        "PRAGMA foreign_keys = ON"
    );

});
/* =====================================================
   DATABASE HELPERS
===================================================== */

function run(sql, params = []) {

    return new Promise(
        (resolve, reject) => {

            db.run(
                sql,
                params,
                function(error) {

                    if (error) {

                        reject(error);

                    } else {

                        resolve({
                            id:
                                this.lastID,

                            changes:
                                this.changes
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

                        resolve(row);
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

                        resolve(rows);
                    }
                }
            );

        }
    );
}

/* =====================================================
   CREATE TABLES
===================================================== */

async function initializeDatabase() {

    try {

        await run(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                role TEXT DEFAULT 'user',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await run(`
            CREATE TABLE IF NOT EXISTS chats (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                message TEXT NOT NULL,
                response TEXT NOT NULL,
                image TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(user_id)
                    REFERENCES users(id)
                    ON DELETE CASCADE
            )
        `);

        await run(`
            CREATE TABLE IF NOT EXISTS knowledge (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        console.log(
            "✅ Database tables ready"
        );

    } catch (error) {

        console.error(
            "Database initialization error:",
            error
        );
    }
}

/* =====================================================
   CREATE ADMIN
===================================================== */

async function createDefaultAdmin() {

    const email =
        process.env.ADMIN_EMAIL;

    const password =
        process.env.ADMIN_PASSWORD;

    if (!email || !password) {

        console.log(
            "⚠️ ADMIN_EMAIL ama ADMIN_PASSWORD lama dejin."
        );

        return;
    }

    try {

        const existingAdmin =
            await get(
                `
                SELECT id
                FROM users
                WHERE email = ?
                `,
                [email]
            );

        if (existingAdmin) {

            console.log(
                "ℹ️ Admin hore ayuu u jiraa."
            );

            return;
        }

        const hashedPassword =
            await bcrypt.hash(
                password,
                10
            );

        await run(
            `
            INSERT INTO users
            (
                name,
                email,
                password,
                role
            )
            VALUES
            (?, ?, ?, ?)
            `,
            [
                "Administrator",
                email,
                hashedPassword,
                "admin"
            ]
        );

        console.log(
            "👑 Default Admin created"
        );

    } catch (error) {

        console.error(
            "Admin creation error:",
            error
        );
    }
}

/* =====================================================
   OPENROUTER AI
===================================================== */

let openai = null;

if (OPENROUTER_API_KEY) {

    openai =
        new OpenAI({
            baseURL:
                "https://openrouter.ai/api/v1",

            apiKey:
                OPENROUTER_API_KEY,

            defaultHeaders: {
                "HTTP-Referer":
                    process.env.APP_URL ||
                    "http://localhost:3000",

                "X-Title":
                    "AI Chat Somali"
            }
        });

    console.log(
        "🤖 OpenRouter AI diyaar ah"
    );

} else {

    console.log(
        "⚠️ OPENROUTER_API_KEY lama helin"
    );
}

/* =====================================================
   AUTH MIDDLEWARE
===================================================== */

function authenticateToken(
    request,
    response,
    next
) {

    const authHeader =
        request.headers.authorization;

    if (!authHeader) {

        return response.status(401).json({
            error:
                "Token lama helin."
        });
    }

    const token =
        authHeader.startsWith(
            "Bearer "
        )
        ?
        authHeader.substring(7)
        :
        null;

    if (!token) {

        return response.status(401).json({
            error:
                "Bearer token sax ah lama helin."
        });
    }

    try {

        const decoded =
            jwt.verify(
                token,
                JWT_SECRET
            );

        request.user =
            decoded;

        next();

    } catch (error) {

        return response.status(403).json({
            error:
                "Token-ka ma saxna ama wuu dhacay."
        });
    }
}

/* =====================================================
   ADMIN MIDDLEWARE
===================================================== */

async function requireAdmin(
    request,
    response,
    next
) {

    try {

        const user =
            await get(
                `
                SELECT
                    id,
                    name,
                    email,
                    role
                FROM users
                WHERE id = ?
                `,
                [
                    request.user.id
                ]
            );

        if (!user) {

            return response.status(401).json({
                error:
                    "User lama helin."
            });
        }

        if (
            user.role !==
            "admin"
        ) {

            return response.status(403).json({
                error:
                    "Admin access ayaa loo baahan yahay."
            });
        }

        request.admin =
            user;

        next();

    } catch (error) {

        return response.status(500).json({
            error:
                "Admin verification error."
        });
    }
}

/* =====================================================
   REGISTER
===================================================== */

app.post(
    "/api/register",
    async (
        request,
        response
    ) => {

        try {

            const {
                name,
                email,
                password
            } =
                request.body;

            if (
                !name ||
                !email ||
                !password
            ) {

                return response
                    .status(400)
                    .json({
                        error:
                            "Name, email iyo password ayaa loo baahan yahay."
                    });
            }

            if (
                password.length < 6
            ) {

                return response
                    .status(400)
                    .json({
                        error:
                            "Password-ku waa inuu ahaadaa ugu yaraan 6 xaraf."
                    });
            }

            const existingUser =
                await get(
                    `
                    SELECT id
                    FROM users
                    WHERE email = ?
                    `,
                    [
                        email.toLowerCase()
                    ]
                );

            if (existingUser) {

                return response
                    .status(409)
                    .json({
                        error:
                            "Email-kan hore ayaa loo isticmaalay."
                    });
            }

            const hashedPassword =
                await bcrypt.hash(
                    password,
                    10
                );

            const result =
                await run(
                    `
                    INSERT INTO users
                    (
                        name,
                        email,
                        password,
                        role
                    )
                    VALUES
                    (?, ?, ?, 'user')
                    `,
                    [
                        name.trim(),
                        email
                            .trim()
                            .toLowerCase(),
                        hashedPassword
                    ]
                );

            const user =
                await get(
                    `
                    SELECT
                        id,
                        name,
                        email,
                        role
                    FROM users
                    WHERE id = ?
                    `,
                    [
                        result.id
                    ]
                );

            const token =
                jwt.sign(
                    {
                        id:
                            user.id,

                        role:
                            user.role
                    },
                    JWT_SECRET,
                    {
                        expiresIn:
                            "7d"
                    }
                );

            response.status(201).json({
                message:
                    "User waa la sameeyay.",
                token,
                user
            });

        } catch (error) {

            console.error(
                error
            );

            response.status(500).json({
                error:
                    "Register error."
            });
        }
    }
);

/* =====================================================
   LOGIN
===================================================== */

app.post(
    "/api/login",
    async (
        request,
        response
    ) => {

        try {

            const {
                email,
                password
            } =
                request.body;

            if (
                !email ||
                !password
            ) {

                return response
                    .status(400)
                    .json({
                        error:
                            "Email iyo password ayaa loo baahan yahay."
                    });
            }

            const user =
                await get(
                    `
                    SELECT *
                    FROM users
                    WHERE email = ?
                    `,
                    [
                        email
                            .trim()
                            .toLowerCase()
                    ]
                );

            if (!user) {

                return response
                    .status(401)
                    .json({
                        error:
                            "Email ama password waa khalad."
                    });
            }

            const passwordCorrect =
                await bcrypt.compare(
                    password,
                    user.password
                );

            if (!passwordCorrect) {

                return response
                    .status(401)
                    .json({
                        error:
                            "Email ama password waa khalad."
                    });
            }

            const token =
                jwt.sign(
                    {
                        id:
                            user.id,

                        role:
                            user.role
                    },
                    JWT_SECRET,
                    {
                        expiresIn:
                            "7d"
                    }
                );

            response.json({
                message:
                    "Login successful.",

                token,

                user: {
                    id:
                        user.id,

                    name:
                        user.name,

                    email:
                        user.email,

                    role:
                        user.role
                }
            });

        } catch (error) {

            console.error(
                error
            );

            response.status(500).json({
                error:
                    "Login error."
            });
        }
    }
);

/* =====================================================
   ADMIN ME
===================================================== */

app.get(
    "/api/admin/me",
    authenticateToken,
    requireAdmin,
    (
        request,
        response
    ) => {

        response.json({
            user:
                request.admin
        });
    }
);

/* =====================================================
   ADMIN USERS
===================================================== */

app.get(
    "/api/admin/users",
    authenticateToken,
    requireAdmin,
    async (
        request,
        response
    ) => {

        try {

            const users =
                await all(`
                    SELECT
                        users.id,
                        users.name,
                        users.email,
                        users.role,
                        users.created_at,

                        COUNT(
                            chats.id
                        )
                        AS chat_count

                    FROM users

                    LEFT JOIN chats
                    ON chats.user_id =
                        users.id

                    GROUP BY
                        users.id

                    ORDER BY
                        users.id DESC
                `);

            response.json({
                users
            });

        } catch (error) {

            console.error(
                error
            );

            response.status(500).json({
                error:
                    "Users lama soo qaadi karin."
            });
        }
    }
);

/* =====================================================
   ADMIN ALL CHATS
===================================================== */

app.get(
    "/api/admin/chats",
    authenticateToken,
    requireAdmin,
    async (
        request,
        response
    ) => {

        try {

            const chats =
                await all(`
                    SELECT
                        chats.id,
                        chats.user_id,
                        chats.message,
                        chats.response,
                        chats.image,
                        chats.created_at,

                        COALESCE(
                            users.name,
                            'Anonymous'
                        )
                        AS name,

                        COALESCE(
                            users.email,
                            'anonymous'
                        )
                        AS email

                    FROM chats

                    LEFT JOIN users
                    ON users.id =
                        chats.user_id

                    ORDER BY
                        chats.id DESC
                `);

            response.json({
                chats
            });

        } catch (error) {

            console.error(
                error
            );

            response.status(500).json({
                error:
                    "Chats lama soo qaadi karin."
            });
        }
    }
);

/* =====================================================
   DELETE ALL CHATS
===================================================== */

app.delete(
    "/api/admin/chats",
    authenticateToken,
    requireAdmin,
    async (
        request,
        response
    ) => {

        try {

            await run(
                "DELETE FROM chats"
            );

            response.json({
                message:
                    "Dhammaan chats waa la tirtiray."
            });

        } catch (error) {

            response.status(500).json({
                error:
                    "Chats lama tirtiri karin."
            });
        }
    }
);

/* =====================================================
   DELETE USER CHATS
===================================================== */

app.delete(
    "/api/admin/users/:id/chats",
    authenticateToken,
    requireAdmin,
    async (
        request,
        response
    ) => {

        try {

            const userId =
                Number(
                    request.params.id
                );

            await run(
                `
                DELETE FROM chats
                WHERE user_id = ?
                `,
                [
                    userId
                ]
            );

            response.json({
                message:
                    "User chats waa la tirtiray."
            });

        } catch (error) {

            response.status(500).json({
                error:
                    "User chats lama tirtiri karin."
            });
        }
    }
);

/* =====================================================
   DELETE USER
===================================================== */

app.delete(
    "/api/admin/users/:id",
    authenticateToken,
    requireAdmin,
    async (
        request,
        response
    ) => {

        try {

            const userId =
                Number(
                    request.params.id
                );

            if (
                userId ===
                request.admin.id
            ) {

                return response
                    .status(400)
                    .json({
                        error:
                            "Admin-kaaga adigu isma tirtiri kartid."
                    });
            }

            const user =
                await get(
                    `
                    SELECT *
                    FROM users
                    WHERE id = ?
                    `,
                    [
                        userId
                    ]
                );

            if (!user) {

                return response
                    .status(404)
                    .json({
                        error:
                            "User lama helin."
                    });
            }

            if (
                user.role ===
                "admin"
            ) {

                return response
                    .status(403)
                    .json({
                        error:
                            "Admin lama tirtiri karo."
                    });
            }

            await run(
                `
                DELETE FROM chats
                WHERE user_id = ?
                `,
                [
                    userId
                ]
            );

            await run(
                `
                DELETE FROM users
                WHERE id = ?
                `,
                [
                    userId
                ]
            );

            response.json({
                message:
                    "User waa la tirtiray."
            });

        } catch (error) {

            response.status(500).json({
                error:
                    "User lama tirtiri karin."
            });
        }
    }
);

/* =====================================================
   KNOWLEDGE LIST
===================================================== */

app.get(
    "/api/admin/knowledge",
    authenticateToken,
    requireAdmin,
    async (
        request,
        response
    ) => {

        try {

            const knowledge =
                await all(`
                    SELECT *
                    FROM knowledge
                    ORDER BY id DESC
                `);

            response.json({
                knowledge
            });

        } catch (error) {

            response.status(500).json({
                error:
                    "Knowledge lama soo qaadi karin."
            });
        }
    }
);

/* =====================================================
   ADD KNOWLEDGE
===================================================== */

app.post(
    "/api/admin/knowledge",
    authenticateToken,
    requireAdmin,
    async (
        request,
        response
    ) => {

        try {

            const {
                title,
                content
            } =
                request.body;

            if (
                !title ||
                !content
            ) {

                return response
                    .status(400)
                    .json({
                        error:
                            "Cinwaan iyo content ayaa loo baahan yahay."
                    });
            }

            const result =
                await run(
                    `
                    INSERT INTO knowledge
                    (
                        title,
                        content
                    )
                    VALUES (?, ?)
                    `,
                    [
                        title.trim(),
                        content.trim()
                    ]
                );

            response.status(201).json({
                message:
                    "Knowledge waa la kaydiyay.",

                id:
                    result.id
            });

        } catch (error) {

            response.status(500).json({
                error:
                    "Knowledge lama kaydin."
            });
        }
    }
);

/* =====================================================
   DELETE KNOWLEDGE
===================================================== */

app.delete(
    "/api/admin/knowledge/:id",
    authenticateToken,
    requireAdmin,
    async (
        request,
        response
    ) => {

        try {

            const id =
                Number(
                    request.params.id
                );

            await run(
                `
                DELETE FROM knowledge
                WHERE id = ?
                `,
                [
                    id
                ]
            );

            response.json({
                message:
                    "Knowledge waa la tirtiray."
            });

        } catch (error) {

            response.status(500).json({
                error:
                    "Knowledge lama tirtiri karin."
            });
        }
    }
);

/* =====================================================
   USER CHAT HISTORY
===================================================== */

app.get(
    "/api/chats",
    authenticateToken,
    async (
        request,
        response
    ) => {

        try {

            const chats =
                await all(
                    `
                    SELECT
                        id,
                        message,
                        response,
                        image,
                        created_at
                    FROM chats
                    WHERE user_id = ?
                    ORDER BY id ASC
                    `,
                    [
                        request.user.id
                    ]
                );

            response.json({
                chats
            });

        } catch (error) {

            response.status(500).json({
                error:
                    "Chat history lama soo qaadi karin."
            });
        }
    }
);

/* =====================================================
   DELETE USER CHAT HISTORY
===================================================== */

app.delete(
    "/api/chats",
    authenticateToken,
    async (
        request,
        response
    ) => {

        try {

            await run(
                `
                DELETE FROM chats
                WHERE user_id = ?
                `,
                [
                    request.user.id
                ]
            );

            response.json({
                message:
                    "Chat history waa la tirtiray."
            });

        } catch (error) {

            response.status(500).json({
                error:
                    "Chat history lama tirtiri karin."
            });
        }
    }
);

/* =====================================================
   AI CHAT
===================================================== */

app.post(
    "/chat",
    async (
        request,
        response
    ) => {

        try {

            const {
                message,
                image,
                userId
            } =
                request.body;

            if (
                !message &&
                !image
            ) {

                return response
                    .status(400)
                    .json({
                        error:
                            "Fariin ama sawir ayaa loo baahan yahay."
                    });
            }

            let knowledgeContext =
                "";

            try {

                const knowledge =
                    await all(`
                        SELECT
                            title,
                            content
                        FROM knowledge
                        ORDER BY id DESC
                        LIMIT 20
                    `);

                if (
                    knowledge.length >
                    0
                ) {

                    knowledgeContext =
                        knowledge
                        .map(
                            item =>
                            `
${item.title}:
${item.content}
                            `
                        )
                        .join("\n\n");
                }

            } catch (error) {

                console.error(
                    "Knowledge error:",
                    error
                );
            }

            if (!openai) {

                return response
                    .status(500)
                    .json({
                        error:
                            "OPENROUTER_API_KEY lama dejin."
                    });
            }

            const messages = [

                {
                    role:
                        "system",

                    content:
`
Waxaad tahay AI Chat Somali.

Mar walba ku jawaab
Af-Soomaali.

Jawaabtaadu ha noqoto
mid cad, saaxiibtinimo leh
oo caawimaad leh.

Knowledge-ka shirkadda:

${knowledgeContext || "Knowledge lama gelin."}
`
                }

            ];

            const userContent =
                [];

            if (message) {

                userContent.push({
                    type:
                        "text",

                    text:
                        message
                });
            }

            if (
                image &&
                image.startsWith(
                    "data:image"
                )
            ) {

                userContent.push({
                    type:
                        "image_url",

                    image_url: {
                        url:
                            image
                    }
                });
            }

            messages.push({
                role:
                    "user",

                content:
                    userContent
            });

            const completion =
                await openai
                .chat
                .completions
                .create({
                    model:
                        AI_MODEL,

                    messages
                });

            const aiResponse =
                completion
                .choices?.[0]
                ?.message
                ?.content ||
                "Waan ka xumahay, jawaab lama helin.";

            let validUserId =
                null;

            if (userId) {

                const user =
                    await get(
                        `
                        SELECT id
                        FROM users
                        WHERE id = ?
                        `,
                        [
                            userId
                        ]
                    );

                if (user) {

                    validUserId =
                        user.id;
                }
            }

            await run(
                `
                INSERT INTO chats
                (
                    user_id,
                    message,
                    response,
                    image
                )
                VALUES
                (?, ?, ?, ?)
                `,
                [
                    validUserId,
                    message || "",
                    aiResponse,
                    image || null
                ]
            );

            response.json({
                response:
                    aiResponse
            });

        } catch (error) {

            console.error(
                "AI CHAT ERROR:",
                error
            );

            response.status(500).json({
                error:
                    error.message ||
                    "AI error ayaa dhacay."
            });
        }
    }
);

/* =====================================================
   HEALTH CHECK
===================================================== */

app.get(
    "/api/health",
    (
        request,
        response
    ) => {

        response.json({
            status:
                "online",

            database:
                "sqlite",

            ai:
                openai
                ?
                "ready"
                :
                "not configured"
        });
    }
);

/* =====================================================
   START SERVER
===================================================== */

async function startServer() {

    await initializeDatabase();

    await createDefaultAdmin();

    app.listen(
        PORT,
        "0.0.0.0",
        () => {

            console.log(
                `
========================================
🚀 Server running

http://localhost:${PORT}

Admin:
http://localhost:${PORT}/admin/

Health:
http://localhost:${PORT}/api/health
========================================
                `
            );
        }
    );
}

startServer();
