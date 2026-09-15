/* =====================================================
   NASIIB BUSINESS CENTER
   ADMIN APP.JS
   Compatible with server.js
===================================================== */


/* =====================================================
   CONFIG
===================================================== */

const API_BASE = "";

const LOGIN_URL = "/api/login";
const ADMIN_ME_URL = "/api/admin/me";
const USERS_URL = "/api/admin/users";
const CHATS_URL = "/api/admin/chats";
const KNOWLEDGE_URL = "/api/admin/knowledge";


/* =====================================================
   HELPER - GET RESPONSE DATA
===================================================== */

async function getResponseData(response) {

    const text = await response.text();

    if (!text) {
        return {};
    }

    try {

        return JSON.parse(text);

    } catch (error) {

        console.error(
            "JSON PARSE ERROR:",
            error
        );

        return {
            error: text
        };
    }
}


/* =====================================================
   GET ADMIN TOKEN
===================================================== */

function getAdminToken() {

    return localStorage.getItem(
        "adminToken"
    );
}


/* =====================================================
   AUTH HEADERS
===================================================== */

function getAuthHeaders() {

    const token =
        getAdminToken();

    return {

        "Authorization":
            `Bearer ${token}`,

        "Accept":
            "application/json"

    };
}


/* =====================================================
   API REQUEST HELPER
===================================================== */

async function apiRequest(
    url,
    options = {}
) {

    const headers = {

        ...getAuthHeaders(),

        ...(options.headers || {})

    };


    const response =
        await fetch(
            url,
            {
                ...options,
                headers
            }
        );


    const data =
        await getResponseData(
            response
        );


    if (
        response.status === 401 ||
        response.status === 403
    ) {

        localStorage.removeItem(
            "adminToken"
        );

        localStorage.removeItem(
            "adminUser"
        );

    }


    return {
        response,
        data
    };
}


/* =====================================================
   LOGIN
===================================================== */

function setupLogin() {

    const loginForm =
        document.getElementById(
            "loginForm"
        );


    if (!loginForm) {

        return;
    }


    loginForm.addEventListener(
        "submit",
        async function(event) {

            event.preventDefault();


            const emailInput =
                document.getElementById(
                    "email"
                );


            const passwordInput =
                document.getElementById(
                    "password"
                );


            const email =
                emailInput
                    ? emailInput.value.trim()
                    : "";


            const password =
                passwordInput
                    ? passwordInput.value
                    : "";


            if (
                !email ||
                !password
            ) {

                alert(
                    "Fadlan geli email iyo password."
                );

                return;
            }


            const submitButton =
                loginForm.querySelector(
                    'button[type="submit"]'
                );


            const oldButtonText =
                submitButton
                    ? submitButton.textContent
                    : "";


            if (submitButton) {

                submitButton.disabled =
                    true;

                submitButton.textContent =
                    "⏳ Login...";
            }


            try {

                const response =
                    await fetch(
                        LOGIN_URL,
                        {
                            method:
                                "POST",

                            headers: {
                                "Content-Type":
                                    "application/json",

                                "Accept":
                                    "application/json"
                            },

                            body:
                                JSON.stringify({
                                    email,
                                    password
                                })
                        }
                    );


                const data =
                    await getResponseData(
                        response
                    );


                console.log(
                    "LOGIN RESPONSE:",
                    response.status,
                    data
                );


                if (!response.ok) {

                    alert(
                        data.error || `Login error: ${response.status}`
                    );

                    return;
                }


                if (!data.token) {

                    alert(
                        "Token-ka Admin lama helin."
                    );

                    return;
                }


                if (!data.user) {

                    alert(
                        "Macluumaadka Admin lama helin."
                    );

                    return;
                }


                if (
                    data.user.role !==
                    "admin"
                ) {

                    alert(
                        "Account-kan Admin ma aha."
                    );

                    return;
                }


                /* SAVE TOKEN */

                localStorage.setItem(
                    "adminToken",
                    data.token
                );


                localStorage.setItem(
                    "adminUser",
                    JSON.stringify(
                        data.user
                    )
                );


                /* GO DASHBOARD */

                window.location.href =
                    "/admin/dashboard.html";


            } catch (error) {

                console.error(
                    "ADMIN LOGIN ERROR:",
                    error
                );


                alert(
                    "Server error: " +
                    (
                        error.message ||
                        "Server-ka lama heli karo."
                    )
                );


            } finally {

                if (submitButton) {

                    submitButton.disabled =
                        false;

                    submitButton.textContent =
                        oldButtonText ||
                        "Login";
                }

            }

        }
    );
}


/* =====================================================
   VERIFY ADMIN
===================================================== */

async function verifyAdmin() {

    const token =
        getAdminToken();


    if (!token) {

        return false;
    }


    try {

        const result =
            await apiRequest(
                ADMIN_ME_URL
            );


        const response =
            result.response;


        const data =
            result.data;


        if (!response.ok) {

            console.error(
                "ADMIN VERIFY FAILED:",
                response.status,
                data
            );

            return false;
        }


        if (
            !data.user ||
            data.user.role !==
            "admin"
        ) {

            console.error(
                "User-ku Admin ma aha."
            );

            return false;
        }


        /* UPDATE SAVED USER */

        localStorage.setItem(
            "adminUser",
            JSON.stringify(
                data.user
            )
        );


        return true;


    } catch (error) {

        console.error(
            "ADMIN VERIFY ERROR:",
            error
        );

        return false;
    }
}


/* =====================================================
   REDIRECT TO LOGIN
===================================================== */

function redirectToLogin() {

    localStorage.removeItem(
        "adminToken"
    );

    localStorage.removeItem(
        "adminUser"
    );


    window.location.href =
        "/admin/";
}


/* =====================================================
   LOAD USERS
===================================================== */

async function loadUsers() {

    const container =
        document.getElementById(
            "users"
        );


    if (!container) {

        return;
    }


    container.innerHTML =
        `
        <tr>
            <td colspan="6">
                ⏳ Users ayaa la soo gelinayaa...
            </td>
        </tr>
        `;


    try {

        const result =
            await apiRequest(
                USERS_URL
            );


        const response =
            result.response;


        const data =
            result.data;


        if (!response.ok) {

            throw new Error(
                data.error ||
                `Users error: ${response.status}`
            );
        }


        const users =
            Array.isArray(
                data.users
            )
            ?
            data.users
            :
            [];


        if (
            users.length === 0
        ) {

            container.innerHTML =
                `
                <tr>
                    <td colspan="6">
                        👤 Wax user ah lama helin.
                    </td>
                </tr>
                `;

            return;
        }


        container.innerHTML =
            users
            .map(
                user => {

                    const userId =
                        Number(
                            user.id
                        );


                    const role =
                        String(
                            user.role ||
                            "user"
                        );


                    return `
                    <tr>

                        <td>
                            ${userId}
                        </td>

                        <td>
                            ${escapeHTML(
                                user.name
                            )}
                        </td>

                        <td>
                            ${escapeHTML(
                                user.email
                            )}
                        </td>

                        <td>
                            ${
                                role === "admin"
                                ?
                                "👑 Admin"
                                :
                                "👤 User"
                            }
                        </td>

                        <td>
                            ${
                                Number(
                                    user.chat_count
                                ) || 0
                            }
                        </td>

                        <td>

                            ${
                                role !== "admin"
                                ?
                                `
                                <button
                                    type="button"
                                    onclick="deleteUserChats(${userId})"
                                >
                                    🗑️ Chats
                                </button>

                                <button
                                    type="button"
                                    onclick="deleteUser(${userId})"
                                >
                                    ❌ User
                                </button>
                                `
                                :
                                `
                                <span>
                                    🔐 Protected
                                </span>
                                `
                            }

                        </td>

                    </tr>
                    `;
                }
            )
            .join("");


    } catch (error) {

        console.error(
            "LOAD USERS ERROR:",
            error
        );


        container.innerHTML =
            `
            <tr>
                <td colspan="6">
                    ❌ Users lama soo qaadi karin.
                    <br>
                    <small>
                        ${escapeHTML(
                            error.message
                        )}
                    </small>
                </td>
            </tr>
            `;
    }
}


/* =====================================================
   LOAD CHATS
===================================================== */

async function loadChats() {

    const container =
        document.getElementById(
            "chats"
        );


    if (!container) {

        return;
    }


    container.innerHTML =
        `
        <p>
            ⏳ Chat history ayaa la soo gelinayaa...
        </p>
        `;


    try {

        const result =
            await apiRequest(
                CHATS_URL
            );


        const response =
            result.response;


        const data =
            result.data;


        if (!response.ok) {

            throw new Error(
                data.error ||
                `Chats error: ${response.status}`
            );
        }


        const chats =
            Array.isArray(
                data.chats
            )
            ?
            data.chats
            :
            [];


        if (
            chats.length === 0
        ) {

            container.innerHTML =
                `
                <p>
                    💬 Chat history waa madhan yahay.
                </p>
                `;

            return;
        }


        container.innerHTML =
            chats
            .map(
                chat => {

                    const image =
                        chat.image
                        ?
                        `
                        <div class="chat-image-wrapper">

                            <img
                                src="${escapeAttribute(
                                    chat.image
                                )}"
                                class="chat-image"
                                alt="User image"
                                loading="lazy"
                            >

                        </div>
                        `
                        :
                        "";


                    return `
                    <div class="chat-card">

                        <div class="chat-user">

                            👤
                            <b>
                                ${escapeHTML(
                                    chat.name ||
                                    "Anonymous"
                                )}
                            </b>

                            <br>

                            <small>
                                ${escapeHTML(
                                    chat.email ||
                                    "anonymous"
                                )}
                            </small>

                        </div>


                        <div class="chat-message">

                            <b>
                                Su'aal:
                            </b>

                            <p>
                                ${escapeHTML(
                                    chat.message ||
                                    ""
                                )}
                            </p>

                        </div>


                        ${image}


                        <div class="chat-response">

                            <b>
                                🤖 AI:
                            </b>

                            <p>
                                ${escapeHTML(
                                    chat.response ||
                                    ""
                                )}
                            </p>

                        </div>


                        <small>
                            📅
                            ${formatDate(
                                chat.created_at
                            )}
                        </small>


                        <hr>

                    </div>
                    `;
                }
            )
            .join("");


    } catch (error) {

        console.error(
            "LOAD CHATS ERROR:",
            error
        );


        container.innerHTML =
            `
            <p>
                ❌ Chats lama soo qaadi karin.
                <br>
                <small>
                    ${escapeHTML(
                        error.message
                    )}
                </small>
            </p>
            `;
    }
}


/* =====================================================
   DELETE ALL CHATS
===================================================== */

async function deleteAllChats() {

    const confirmed =
        confirm(
            "⚠️ Ma hubtaa inaad tirtirayso DHAMMAAN chat-yada?"
        );


    if (!confirmed) {

        return;
    }


    try {

        const result =
            await apiRequest(
                CHATS_URL,
                {
                    method:
                        "DELETE"
                }
            );


        const response =
            result.response;


        const data =
            result.data;


        if (!response.ok) {

            alert(
                data.error ||
                "Chats lama tirtiri karin."
            );

            return;
        }


        alert(
            data.message ||
            "Dhammaan chats waa la tirtiray."
        );


        await loadChats();

        await loadUsers();


    } catch (error) {

        console.error(
            "DELETE ALL CHATS ERROR:",
            error
        );


        alert(
            "Server error: " +
            error.message
        );
    }
}


/* =====================================================
   DELETE USER CHATS
===================================================== */

async function deleteUserChats(
    userId
) {

    const id =
        Number(userId);


    if (!Number.isInteger(id)) {

        alert(
            "User ID sax ah lama helin."
        );

        return;
    }


    const confirmed =
        confirm(
            "Ma hubtaa inaad tirtirayso dhammaan chats-ka user-kan?"
        );


    if (!confirmed) {

        return;
    }


    try {

        const result =
            await apiRequest(
                `/api/admin/users/${id}/chats`,
                {
                    method:
                        "DELETE"
                }
            );


        const response =
            result.response;


        const data =
            result.data;


        if (!response.ok) {

            alert(
                data.error ||
                "User chats lama tirtiri karin."
            );

            return;
        }


        alert(
            data.message ||
            "User chats waa la tirtiray."
        );


        await loadUsers();

        await loadChats();


    } catch (error) {

        console.error(
            "DELETE USER CHATS ERROR:",
            error
        );


        alert(
            "Server error: " +
            error.message
        );
    }
}


/* =====================================================
   DELETE USER
===================================================== */

async function deleteUser(
    userId
) {

    const id =
        Number(userId);


    if (!Number.isInteger(id)) {

        alert(
            "User ID sax ah lama helin."
        );

        return;
    }


    const confirmed =
        confirm(
            "⚠️ Ma hubtaa inaad tirtirayso user-kan iyo xogtiisa?"
        );


    if (!confirmed) {

        return;
    }


    try {

        const result =
            await apiRequest(
                `/api/admin/users/${id}`,
                {
                    method:
                        "DELETE"
                }
            );


        const response =
            result.response;


        const data =
            result.data;


        if (!response.ok) {

            alert(
                data.error ||
                "User lama tirtiri karin."
            );

            return;
        }


        alert(
            data.message ||
            "User waa la tirtiray."
        );


        await loadUsers();

        await loadChats();


    } catch (error) {

        console.error(
            "DELETE USER ERROR:",
            error
        );


        alert(
            "Server error: " +
            error.message
        );
    }
}


/* =====================================================
   LOAD KNOWLEDGE
===================================================== */

async function loadKnowledge() {

    const container =
        document.getElementById(
            "knowledgeList"
        );


    if (!container) {

        return;
    }


    container.innerHTML =
        `
        <p>
            ⏳ Knowledge ayaa la soo gelinayaa...
        </p>
        `;


    try {

        const result =
            await apiRequest(
                KNOWLEDGE_URL
            );


        const response =
            result.response;


        const data =
            result.data;


        if (!response.ok) {

            throw new Error(
                data.error ||
                `Knowledge error: ${response.status}`
            );
        }


        const knowledge =
            Array.isArray(
                data.knowledge
            )
            ?
            data.knowledge
            :
            [];


        if (
            knowledge.length === 0
        ) {

            container.innerHTML =
                `
                <p>
                    🧠 Knowledge wali lama gelin.
                </p>
                `;

            return;
        }


        container.innerHTML =
            knowledge
            .map(
                item => {

                    return `
                    <div class="knowledge-card">

                        <h3>
                            🧠
                            ${escapeHTML(
                                item.title
                            )}
                        </h3>

                        <p>
                            ${escapeHTML(
                                item.content
                            )}
                        </p>

                        <small>
                            📅
                            ${formatDate(
                                item.created_at
                            )}
                        </small>

                        <br><br>

                        <button
                            type="button"
                            onclick="deleteKnowledge(${Number(
                                item.id
                            )})"
                        >
                            🗑️ Delete
                        </button>

                        <hr>

                    </div>
                    `;
                }
            )
            .join("");


    } catch (error) {

        console.error(
            "LOAD KNOWLEDGE ERROR:",
            error
        );


        container.innerHTML =
            `
            <p>
                ❌ Knowledge lama soo qaadi karin.
                <br>
                <small>
                    ${escapeHTML(
                        error.message
                    )}
                </small>
            </p>
            `;
    }
}


/* =====================================================
   ADD KNOWLEDGE
===================================================== */

async function addKnowledge() {

    const titleInput =
        document.getElementById(
            "knowledgeTitle"
        );


    const contentInput =
        document.getElementById(
            "knowledgeContent"
        );


    if (
        !titleInput ||
        !contentInput
    ) {

        alert(
            "Knowledge inputs lama helin."
        );

        return;
    }


    const title =
        titleInput.value.trim();


    const content =
        contentInput.value.trim();


    if (
        !title ||
        !content
    ) {

        alert(
            "Fadlan geli Cinwaan iyo Knowledge."
        );

        return;
    }


    try {

        const result =
            await apiRequest(
                KNOWLEDGE_URL,
                {
                    method:
                        "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({
                            title,
                            content
                        })
                }
            );


        const response =
            result.response;


        const data =
            result.data;


        if (!response.ok) {

            alert(
                data.error ||
                "Knowledge lama kaydin."
            );

            return;
        }


        alert(
            data.message ||
            "Knowledge waa la kaydiyay."
        );


        titleInput.value =
            "";


        contentInput.value =
            "";


        await loadKnowledge();


    } catch (error) {

        console.error(
            "ADD KNOWLEDGE ERROR:",
            error
        );


        alert(
            "Server error: " +
            error.message
        );
    }
}


/* =====================================================
   DELETE KNOWLEDGE
===================================================== */

async function deleteKnowledge(
    id
) {

    const knowledgeId =
        Number(id);


    if (
        !Number.isInteger(
            knowledgeId
        )
    ) {

        alert(
            "Knowledge ID sax ah lama helin."
        );

        return;
    }


    const confirmed =
        confirm(
            "Ma hubtaa inaad tirtirayso Knowledge-kan?"
        );


    if (!confirmed) {

        return;
    }


    try {

        const result =
            await apiRequest(
                `${KNOWLEDGE_URL}/${knowledgeId}`,
                {
                    method:
                        "DELETE"
                }
            );


        const response =
            result.response;


        const data =
            result.data;


        if (!response.ok) {

            alert(
                data.error ||
                "Knowledge lama tirtiri karin."
            );

            return;
        }


        alert(
            data.message ||
            "Knowledge waa la tirtiray."
        );


        await loadKnowledge();


    } catch (error) {

        console.error(
            "DELETE KNOWLEDGE ERROR:",
            error
        );


        alert(
            "Server error: " +
            error.message
        );
    }
}


/* =====================================================
   LOGOUT
===================================================== */

function logout() {

    const confirmed =
        confirm(
            "Ma hubtaa inaad Admin-ka ka baxayso?"
        );


    if (!confirmed) {

        return;
    }


    localStorage.removeItem(
        "adminToken"
    );


    localStorage.removeItem(
        "adminUser"
    );


    window.location.href =
        "/admin/";
}


/* =====================================================
   FORMAT DATE
===================================================== */

function formatDate(
    date
) {

    if (!date) {

        return "";
    }


    try {

        return new Date(
            date
        ).toLocaleString(
            "so-SO"
        );

    } catch (error) {

        return String(date);
    }
}


/* =====================================================
   SECURITY - ESCAPE HTML
===================================================== */

function escapeHTML(
    text
) {

    if (
        text === null ||
        text === undefined
    ) {

        return "";
    }


    const div =
        document.createElement(
            "div"
        );


    div.textContent =
        String(text);


    return div.innerHTML;
}


/* =====================================================
   SECURITY - ESCAPE ATTRIBUTE
===================================================== */

function escapeAttribute(
    text
) {

    if (
        text === null ||
        text === undefined
    ) {

        return "";
    }


    return String(text)
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        );
}


/* =====================================================
   SHOW ADMIN NAME
===================================================== */

function showAdminName() {

    const adminUser =
        localStorage.getItem(
            "adminUser"
        );


    if (!adminUser) {

        return;
    }


    try {

        const user =
            JSON.parse(
                adminUser
            );


        const elements =
            document.querySelectorAll(
                "#adminName, .admin-name"
            );


        elements.forEach(
            element => {

                element.textContent =
                    user.name ||
                    "Administrator";

            }
        );


    } catch (error) {

        console.warn(
            "Admin user data error:",
            error
        );
    }
}


/* =====================================================
   DASHBOARD INITIALIZATION
===================================================== */

async function initializeDashboard() {

    const token =
        getAdminToken();


    if (!token) {

        redirectToLogin();

        return;
    }


    console.log(
        "🔐 Checking Admin..."
    );


    const isAdmin =
        await verifyAdmin();


    if (!isAdmin) {

        alert(
            "Admin login-ka wuu dhacay ama ma saxna. Fadlan mar kale gal."
        );


        redirectToLogin();

        return;
    }


    console.log(
        "✅ Admin verified"
    );


    showAdminName();


    /* LOAD ALL ADMIN DATA */

    await Promise.all([
        loadUsers(),
        loadChats(),
        loadKnowledge()
    ]);


    console.log(
        "✅ Admin Dashboard loaded"
    );
}


/* =====================================================
   GLOBAL FUNCTIONS
   Required for HTML onclick=""
===================================================== */

window.deleteAllChats =
    deleteAllChats;

window.deleteUserChats =
    deleteUserChats;

window.deleteUser =
    deleteUser;

window.addKnowledge =
    addKnowledge;

window.deleteKnowledge =
    deleteKnowledge;

window.logout =
    logout;

window.loadUsers =
    loadUsers;

window.loadChats =
    loadChats;

window.loadKnowledge =
    loadKnowledge;


/* =====================================================
   START
===================================================== */

document.addEventListener(
    "DOMContentLoaded",
    function() {

        /* LOGIN PAGE */

        setupLogin();


        /* DASHBOARD PAGE */

        if (
            window.location.pathname.includes(
                "dashboard.html"
            )
        ) {

            initializeDashboard();

        }

    }
);
