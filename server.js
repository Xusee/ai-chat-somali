// =====================================================
// AI CHAT SOMALI - ONLINE SERVER
// JWT + ADMIN + USERS + CHAT HISTORY + KNOWLEDGE
// OPENROUTER + IMAGE + CORS + POSTGRESQL
// =====================================================

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const { Pool } = require("pg");

const app = express();

// =====================================================
// CONFIG
// =====================================================

const PORT = process.env.PORT || 3000;

const JWT_SECRET =
    process.env.JWT_SECRET || "CHANGE_THIS_SECRET";

const OPENROUTER_API_KEY =
    process.env.OPENROUTER_API_KEY;

const OPENROUTER_MODEL =
    process.env.OPENROUTER_MODEL ||
    "openai/gpt-4o-mini";

// =====================================================
// MIDDLEWARE
// =====================================================

app.use(cors({
    origin: true,
    credentials: true
}));

app.use(express.json({
    limit: "12mb"
}));

app.use(express.urlencoded({
    extended: true,
    limit: "12mb"
}));

// =====================================================
// STATIC FILES
// =====================================================

app.use(express.static(
    path.join(__dirname, "public")
));

// =====================================================
// IMAGE UPLOAD
// =====================================================

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 8 * 1024 * 1024
    },
    fileFilter: (req, file, cb) => {

        if (!file.mimetype.startsWith("image/")) {
            return cb(
                new Error("Kaliya sawir ayaa la oggol yahay.")
            );
        }

        cb(null, true);
    }
});

// =====================================================
// DATABASE
// =====================================================

if (!process.env.DATABASE_URL) {
    console.error(
        "❌ DATABASE_URL lama helin."
    );
    process.exit(1);
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 15000
});

// =====================================================
// DATABASE INITIALIZATION
// =====================================================

async function initDatabase() {

    await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'user',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS chats (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL
                REFERENCES users(id)
                ON DELETE CASCADE,
            message TEXT NOT NULL,
            response TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS knowledge (
            id SERIAL PRIMARY KEY,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    console.log("✅ PostgreSQL database connected");
    console.log("✅ Users table ready");
    console.log("✅ Chats table ready");
    console.log("✅ Knowledge table ready");

    await createAdmin();
}

// =====================================================
// CREATE ADMIN
// =====================================================

async function createAdmin() {

    const email =
        process.env.ADMIN_EMAIL ||
        "admin@aichatsomali.com";

    const password =
        process.env.ADMIN_PASSWORD ||
        "Admin12345";

    const name =
        process.env.ADMIN_NAME ||
        "AI Chat Somali Admin";

    const existing =
        await pool.query(
            `SELECT id, role
             FROM users
             WHERE email = $1`,
            [email]
        );

    if (existing.rows.length > 0) {

        if (existing.rows[0].role !== "admin") {

            await pool.query(
                `UPDATE users
                 SET role = 'admin'
                 WHERE id = $1`,
                [existing.rows[0].id]
            );

            console.log(
                "✅ Existing user promoted to admin"
            );
        } else {
            console.log("✅ Admin already exists");
        }

        return;
    }

    const hashedPassword =
        await bcrypt.hash(password, 12);

    await pool.query(
        `INSERT INTO users
        (name, email, password, role)
        VALUES ($1, $2, $3, 'admin')`,
        [
            name,
            email,
            hashedPassword
        ]
    );

    console.log("=================================");
    console.log("✅ ADMIN CREATED");
    console.log("Email:", email);
    console.log("Password:", password);
    console.log("=================================");
}

// =====================================================
// JWT
// =====================================================

function createToken(user) {

    return jwt.sign(
        {
            id: user.id,
            email: user.email,
            role: user.role
        },
        JWT_SECRET,
        {
            expiresIn: "7d"
        }
    );
}

// =====================================================
// AUTH MIDDLEWARE
// =====================================================

function auth(req, res, next) {

    const header =
        req.headers.authorization;

    if (!header ||
        !header.startsWith("Bearer ")) {

        return res.status(401).json({
            success: false,
            error: "Login ayaa loo baahan yahay."
        });
    }

    const token =
        header.substring(7);

    try {

        const decoded =
            jwt.verify(
                token,
                JWT_SECRET
            );

        req.user = decoded;

        next();

    } catch (error) {

        return res.status(401).json({
            success: false,
            error: "Token-ka wuu dhacay ama waa khaldan yahay."
        });
    }
}

// =====================================================
// ADMIN MIDDLEWARE
// =====================================================

function adminOnly(req, res, next) {

    if (!req.user) {

        return res.status(401).json({
            success: false,
            error: "Login ayaa loo baahan yahay."
        });
    }

    if (req.user.role !== "admin") {

        return res.status(403).json({
            success: false,
            error: "Admin access ayaa loo baahan yahay."
        });
    }

    next();
}

// =====================================================
// HEALTH
// =====================================================

app.get("/api/health", async (req, res) => {

    try {

        await pool.query("SELECT 1");

        res.json({
            success: true,
            status: "online",
            database: "PostgreSQL",
            model: OPENROUTER_MODEL
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            error: "Database connection failed"
        });
    }
});

// =====================================================
// REGISTER
// =====================================================

app.post("/api/register", async (req, res) => {

    try {

        const {
            name,
            email,
            password
        } = req.body;

        if (!name ||
            !email ||
            !password) {

            return res.status(400).json({
                success: false,
                error:
                    "Magaca, email-ka iyo password-ka waa required."
            });
        }

        if (password.length < 6) {

            return res.status(400).json({
                success: false,
                error:
                    "Password-ku ugu yaraan 6 xaraf ha noqdo."
            });
        }

        const cleanEmail =
            email.trim().toLowerCase();

        const existing =
            await pool.query(
                `SELECT id
                 FROM users
                 WHERE email = $1`,
                [cleanEmail]
            );

        if (existing.rows.length > 0) {

            return res.status(409).json({
                success: false,
                error:
                    "Email-kan hore ayaa loo isticmaalay."
            });
        }

        const hashedPassword =
            await bcrypt.hash(password, 12);

        const result =
            await pool.query(
                `INSERT INTO users
                (name, email, password, role)
                VALUES ($1, $2, $3, 'user')
                RETURNING id, name, email, role`,
                [
                    name.trim(),
                    cleanEmail,
                    hashedPassword
                ]
            );

        const user =
            result.rows[0];

        const token =
            createToken(user);

        res.status(201).json({
            success: true,
            message:
                "Account-ka si guul leh ayaa loo sameeyay.",
            token,
            user
        });

    } catch (error) {

        console.error(
            "REGISTER ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            error:
                "User lama abuuri karin."
        });
    }
});

// =====================================================
// LOGIN
// =====================================================

app.post("/api/login", async (req, res) => {

    try {

        const {
            email,
            password
        } = req.body;

        if (!email ||
            !password) {

            return res.status(400).json({
                success: false,
                error:
                    "Email-ka iyo password-ka waa required."
            });
        }

        const cleanEmail =
            email.trim().toLowerCase();

        const result =
            await pool.query(
                `SELECT *
                 FROM users
                 WHERE email = $1`,
                [cleanEmail]
            );

        if (result.rows.length === 0) {

            return res.status(401).json({
                success: false,
                error:
                    "Email ama password waa khaldan yahay."
            });
        }

        const user =
            result.rows[0];

        const valid =
            await bcrypt.compare(
                password,
                user.password
            );

        if (!valid) {

            return res.status(401).json({
                success: false,
                error:
                    "Email ama password waa khaldan yahay."
            });
        }

        const safeUser = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role
        };

        const token =
            createToken(safeUser);

        res.json({
            success: true,
            token,
            user: safeUser
        });

    } catch (error) {

        console.error(
            "LOGIN ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            error:
                "Login-ku wuu fashilmay."
        });
    }
});

// =====================================================
// CURRENT USER
// =====================================================

app.get(
    "/api/me",
    auth,
    async (req, res) => {

        const result =
            await pool.query(
                `SELECT id, name, email, role
                 FROM users
                 WHERE id = $1`,
                [req.user.id]
            );

        if (result.rows.length === 0) {

            return res.status(404).json({
                success: false,
                error: "User lama helin."
            });
        }

        res.json({
            success: true,
            user: result.rows[0]
        });
    }
);

// =====================================================
// KNOWLEDGE FOR AI
// =====================================================

async function getKnowledge() {

    const result =
        await pool.query(
            `SELECT title, content
             FROM knowledge
             ORDER BY id DESC
             LIMIT 30`
        );

    if (result.rows.length === 0) {
        return "";
    }

    return result.rows
        .map(item =>
            `Cinwaan: ${item.title}\n${item.content}`
        )
        .join("\n\n");
}

// =====================================================
// CHAT
// =====================================================

app.post(
    "/api/chat",
    auth,
    upload.single("image"),
    async (req, res) => {

        try {

            if (!OPENROUTER_API_KEY) {

                return res.status(500).json({
                    success: false,
                    error:
                        "OPENROUTER_API_KEY lama dejin."
                });
            }

            const message =
                req.body.message?.trim();

            if (!message &&
                !req.file) {

                return res.status(400).json({
                    success: false,
                    error:
                        "Fadlan qor su'aal ama geli sawir."
                });
            }

            const knowledge =
                await getKnowledge();

            let systemPrompt = `
Waxaad tahay AI Chat Somali.

Jawaabahaaga ku bixi Af-Soomaali
haddii user-ku uusan si cad luuqad kale u codsan.

Noqo caawimaad, sax ah, kooban marka
su'aashu fudud tahay, faahfaahsan marka
loo baahan yahay.

`;

            if (knowledge) {

                systemPrompt += `
KNOWLEDGE-KA APP-KA:

${knowledge}

Isticmaal knowledge-kan marka uu
khuseeyo su'aasha user-ka.
`;
            }

            const userContent = [];

            if (message) {

                userContent.push({
                    type: "text",
                    text: message
                });
            }

            if (req.file) {

                const base64 =
                    req.file.buffer.toString("base64");

                userContent.push({
                    type: "image_url",
                    image_url: {
                        url:
                            `data:${req.file.mimetype};base64,${base64}`
                    }
                });
            }

            const response =
                await fetch(
                    "https://openrouter.ai/api/v1/chat/completions",
                    {
                        method: "POST",
headers: {
    "Authorization":
        Bearer ${OPENROUTER_API_KEY},

    "Content-Type":
        "application/json",

    "HTTP-Referer":
        process.env.APP_URL ||
        "http://localhost:3000",

    "X-Title":
        "AI Chat Somali"
},
                      
                        },

                        body: JSON.stringify({
                            model: OPENROUTER_MODEL,

                            messages: [
                                {
                                    role: "system",
                                    content: systemPrompt
                                },
                                {
                                    role: "user",
                                    content:
                                        userContent
                                }
                            ],

                            temperature: 0.7,

                            max_tokens: 1500
                        })
                    }
                );

            const data =
                await response.json();

            if (!response.ok) {

                console.error(
                    "OPENROUTER ERROR:",
                    data
                );

                return res.status(502).json({
                    success: false,
                    error:
                        data?.error?.message ||
                        "OpenRouter AI error."
                });
            }

            const answer =
                data?.choices?.[0]?.message?.content;

            if (!answer) {

                return res.status(502).json({
                    success: false,
                    error:
                        "AI jawaab ma soo celin."
                });
            }

            await pool.query(
                `INSERT INTO chats
                (user_id, message, response)
                VALUES ($1, $2, $3)`,
                [
                    req.user.id,
                    message ||
                        "[Sawir]",
                    answer
                ]
            );

            res.json({
                success: true,
                answer
            });

        } catch (error) {

            console.error(
                "CHAT ERROR:",
                error
            );

            res.status(500).json({
                success: false,
                error:
                    "AI error: " +
                    error.message
            });
        }
    }
);

// =====================================================
// USER CHAT HISTORY
// =====================================================

app.get(
    "/api/chats",
    auth,
    async (req, res) => {

        try {

            const result =
                await pool.query(
                    `SELECT id,
                            message,
                            response,
                            created_at
                     FROM chats
                     WHERE user_id = $1
                     ORDER BY id ASC`,
                    [req.user.id]
                );

            res.json({
                success: true,
                chats: result.rows
            });

        } catch (error) {

            res.status(500).json({
                success: false,
                error:
                    "Chat history lama soo qaadi karin."
            });
        }
    }
);

// =====================================================
// DELETE USER CHAT HISTORY
// =====================================================

app.delete(
    "/api/chats",
    auth,
    async (req, res) => {

        try {

            await pool.query(
                `DELETE FROM chats
                 WHERE user_id = $1`,
                [req.user.id]
            );

            res.json({
                success: true,
                message:
                    "Chat history-ga waa la tirtiray."
            });

        } catch (error) {

            res.status(500).json({
                success: false,
                error:
                    "Tirtiriddu way fashilantay."
            });
        }
    }
);

// =====================================================
// ADMIN ME
// =====================================================

app.get(
    "/api/admin/me",
    auth,
    adminOnly,
    async (req, res) => {

        res.json({
            success: true,
            admin: req.user
        });
    }
);

// =====================================================
// ADMIN USERS
// =====================================================

app.get(
    "/api/admin/users",
    auth,
    adminOnly,
    async (req, res) => {

        try {

            const result =
                await pool.query(
                    `SELECT
                        u.id,
                        u.name,
                        u.email,
                        u.role,
                        u.created_at,
                        COUNT(c.id)::INTEGER AS chat_count
                     FROM users u
                     LEFT JOIN chats c
                     ON c.user_id = u.id
                     GROUP BY
                        u.id,
                        u.name,
                        u.email,
                        u.role,
                        u.created_at
                     ORDER BY u.id DESC`
                );

            res.json({
                success: true,
                users: result.rows
            });

        } catch (error) {

            res.status(500).json({
                success: false,
                error:
                    "Users lama soo qaadi karin."
            });
        }
    }
);

// =====================================================
// ADMIN CHAT HISTORY
// =====================================================

app.get(
    "/api/admin/chats",
    auth,
    adminOnly,
    async (req, res) => {

        try {

            const result =
                await pool.query(
                    `SELECT
                        c.id,
                        c.message,
                        c.response,
                        c.created_at,
                        u.name,
                        u.email
                     FROM chats c
                     JOIN users u
                     ON u.id = c.user_id
                     ORDER BY c.id DESC
                     LIMIT 500`
                );

            res.json({
                success: true,
                chats: result.rows
            });

        } catch (error) {

            res.status(500).json({
                success: false,
                error:
                    "Chat history lama soo qaadi karin."
            });
        }
    }
);

// =====================================================
// ADMIN DELETE ALL CHATS
// =====================================================

app.delete(
    "/api/admin/chats",
    auth,
    adminOnly,
    async (req, res) => {

        try {

            await pool.query(
                `DELETE FROM chats`
            );

            res.json({
                success: true,
                message:
                    "Dhammaan chat history waa la tirtiray."
            });

        } catch (error) {

            res.status(500).json({
                success: false,
                error:
                    "Chats lama tirtiri karin."
            });
        }
    }
);

// =====================================================
// ADMIN DELETE ONE USER CHATS
// =====================================================

app.delete(
    "/api/admin/users/:id/chats",
    auth,
    adminOnly,
    async (req, res) => {

        try {

            await pool.query(
                `DELETE FROM chats
                 WHERE user_id = $1`,
                [req.params.id]
            );

            res.json({
                success: true,
                message:
                    "User-ka chat history-giisa waa la tirtiray."
            });

        } catch (error) {

            res.status(500).json({
                success: false,
                error:
                    "Chats lama tirtiri karin."
            });
        }
    }
);

// =====================================================
// ADMIN KNOWLEDGE LIST
// =====================================================

app.get(
    "/api/admin/knowledge",
    auth,
    adminOnly,
    async (req, res) => {

        try {

            const result =
                await pool.query(
                    `SELECT *
                     FROM knowledge
                     ORDER BY id DESC`
                );

            res.json({
                success: true,
                knowledge: result.rows
            });

        } catch (error) {

            res.status(500).json({
                success: false,
                error:
                    "Knowledge lama soo qaadi karin."
            });
        }
    }
);

// =====================================================
// ADMIN ADD KNOWLEDGE
// =====================================================

app.post(
    "/api/admin/knowledge",
    auth,
    adminOnly,
    async (req, res) => {

        try {

            const {
                title,
                content
            } = req.body;

            if (!title ||
                !content) {

                return res.status(400).json({
                    success: false,
                    error:
                        "Cinwaan iyo qoraal waa required."
                });
            }

            const result =
                await pool.query(
                    `INSERT INTO knowledge
                    (title, content)
                    VALUES ($1, $2)
                    RETURNING *`,
                    [
                        title.trim(),
                        content.trim()
                    ]
                );

            res.json({
                success: true,
                knowledge:
                    result.rows[0]
            });

        } catch (error) {

            res.status(500).json({
                success: false,
                error:
                    "Knowledge lama kaydin karin."
            });
        }
    }
);

// =====================================================
// ADMIN DELETE KNOWLEDGE
// =====================================================

app.delete(
    "/api/admin/knowledge/:id",
    auth,
    adminOnly,
    async (req, res) => {

        try {

            await pool.query(
                `DELETE FROM knowledge
                 WHERE id = $1`,
                [req.params.id]
            );

            res.json({
                success: true,
                message:
                    "Knowledge waa la tirtiray."
            });

        } catch (error) {

            res.status(500).json({
                success: false,
                error:
                    "Knowledge lama tirtiri karin."
            });
        }
    }
);

// =====================================================
// ADMIN DELETE USER
// =====================================================

app.delete(
    "/api/admin/users/:id",
    auth,
    adminOnly,
    async (req, res) => {

        try {

            if (
                Number(req.params.id) ===
                Number(req.user.id)
            ) {

                return res.status(400).json({
                    success: false,
                    error:
                        "Admin-ka isma tirtiri karo."
                });
            }

            await pool.query(
                `DELETE FROM users
                 WHERE id = $1`,
                [req.params.id]
            );

            res.json({
                success: true,
                message:
                    "User waa la tirtiray."
            });

        } catch (error) {

            res.status(500).json({
                success: false,
                error:
                    "User lama tirtiri karin."
            });
        }
    }
);

// =====================================================
// ADMIN PAGE
// =====================================================

app.get("/admin", (req, res) => {

    res.sendFile(
        path.join(
            __dirname,
            "public",
            "admin.html"
        )
    );
});

// =====================================================
// INDEX PAGE
// =====================================================

app.get("/", (req, res) => {

    res.sendFile(
        path.join(
            __dirname,
            "public",
            "index.html"
        )
    );
});

// =====================================================
// 404
// =====================================================

app.use((req, res) => {

    res.status(404).json({
        success: false,
        error:
            `Endpoint-ka lama helin: ${req.method} ${req.originalUrl}`
    });
});

// =====================================================
// ERROR HANDLER
// =====================================================

app.use((error, req, res, next) => {

    console.error(
        "SERVER ERROR:",
        error
    );

    res.status(500).json({
        success: false,
        error:
            error.message ||
            "Server error."
    });
});

// =====================================================
// START SERVER
// =====================================================

async function startServer() {

    try {

        await initDatabase();

        app.listen(
            PORT,
            "0.0.0.0",
            () => {

                console.log("");
                console.log(
                    "=========================================="
                );

                console.log(
                    "🤖 AI CHAT SOMALI ONLINE SERVER"
                );

                console.log(
                    "=========================================="
                );

                console.log(
                    "Server: http://localhost:${PORT}"
                );

                console.log(
                    "Admin:  http://localhost:${PORT}/admin"
                );

                console.log(
                    "Health: http://localhost:${PORT}/api/health"
                );

                console.log(
                    "Model:  ${OPENROUTER_MODEL}"
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
