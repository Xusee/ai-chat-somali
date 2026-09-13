/* =====================================================
   ADMIN APP.JS
===================================================== */


/* =====================================================
   LOGIN
===================================================== */

const loginForm =
    document.getElementById(
        "loginForm"
    );


if (loginForm) {

    loginForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();


            const email =
                document
                .getElementById(
                    "email"
                )
                .value
                .trim();


            const password =
                document
                .getElementById(
                    "password"
                )
                .value;


            if (
                !email ||
                !password
            ) {

                alert(
                    "Fadlan geli email iyo password."
                );

                return;
            }


try {

    const response =
        await fetch(
            "/api/login",
            {
                method:
                    "POST",

                headers: {
                    "Content-Type":
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


    if (!response.ok) {

        console.error(
            "LOGIN SERVER RESPONSE:",
            response.status,
            data
        );

        alert(
            data.error || `Login error: ${response.status}`
        );

        return;
    }


    if (!data.user) {

        alert(
            "User information lama helin."
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


    window.location.href =
        "/admin/dashboard.html";


} catch (error) {

    console.error(
        "ADMIN LOGIN ERROR:",
        error
    );


    alert(
        "Server error: " +
        error.message
    );
}


    }
);


/* =====================================================
   ADMIN TOKEN
===================================================== */

const adminToken =
    localStorage.getItem(
        "adminToken"
    );


/* =====================================================
   AUTH HEADERS
===================================================== */

function getAuthHeaders() {

    return {

        Authorization:
            "Bearer " +
            adminToken
    };
}


/* =====================================================
   VERIFY ADMIN
===================================================== */

async function verifyAdmin() {

    try {

        const response =
            await fetch(
                "/api/admin/me",
                {
                    headers:
                        getAuthHeaders()
                }
            );


        const data =
            await response.json();


        if (
            !response.ok
        ) {

            throw new Error(
                data.error ||
                "Admin access lama oggolaan."
            );
        }


        if (
            !data.user ||
            data.user.role !==
            "admin"
        ) {

            throw new Error(
                "Admin ma tihid."
            );
        }


        return true;


    } catch (error) {

        console.error(
            "ADMIN VERIFY ERROR:",
            error
        );


        localStorage.removeItem(
            "adminToken"
        );


        localStorage.removeItem(
            "adminUser"
        );


        window.location.href =
            "/admin/";


        return false;
    }
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
                Loading...
            </td>
        </tr>
        `;


    try {

        const response =
            await fetch(
                "/api/admin/users",
                {
                    headers:
                        getAuthHeaders()
                }
            );


        const data =
            await response.json();


        if (
            !response.ok
        ) {

            throw new Error(
                data.error ||
                "Users lama helin."
            );
        }


        if (
            !data.users ||
            data.users.length === 0
        ) {

            container.innerHTML =
                `
                <tr>
                    <td colspan="6">
                        Wax user ah lama helin.
                    </td>
                </tr>
                `;

            return;
        }


        container.innerHTML =
            data.users
            .map(
                user =>
                `
                <tr>

                    <td>
                        ${user.id}
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
                        ${user.role}
                    </td>


                    <td>
                        ${user.chat_count}
                    </td>


                    <td>

                        ${
                            user.role !== "admin"
                            ?
                            `
                            <button
                                onclick="deleteUserChats(${user.id})"
                            >
                                🗑️ Chats
                            </button>


                            <button
                                onclick="deleteUser(${user.id})"
                            >
                                ❌ User
                            </button>
                            `
                            :
                            `
                            <span>
                                👑 Admin
                            </span>
                            `
                        }

                    </td>

                </tr>
                `
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
                    Users lama soo qaadi karin.
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
        "Loading...";


    try {

        const response =
            await fetch(
                "/api/admin/chats",
                {
                    headers:
                        getAuthHeaders()
                }
            );


        const data =
            await response.json();


        if (
            !response.ok
        ) {

            throw new Error(
                data.error ||
                "Chats lama helin."
            );
        }


        if (
            !data.chats ||
            data.chats.length === 0
        ) {

            container.innerHTML =
                `
                <p>
                    Chat history waa madhan yahay.
                </p>
                `;

            return;
        }


        container.innerHTML =
            data.chats
            .map(
                chat =>
                `
                <div class="chat-card">

                    <div class="chat-user">

                        👤
                        <b>
                            ${escapeHTML(
                                chat.name
                            )}
                        </b>

                        <br>

                        <small>
                            ${escapeHTML(
                                chat.email
                            )}
                        </small>

                    </div>


                    <div class="chat-message">

                        <b>
                            Su'aal:
                        </b>

                        <p>
                            ${escapeHTML(
                                chat.message
                            )}
                        </p>

                    </div>


                    <div class="chat-response">

                        <b>
                            AI:
                        </b>

                        <p>
                            ${escapeHTML(
                                chat.response
                            )}
                        </p>

                    </div>


                    ${
                        chat.image
                        ?
                        `
                        <img
                            src="${chat.image}"
                            class="chat-image"
                            alt="User image"
                        >
                        `
                        :
                        ""
                    }


                    <small>

                        ${formatDate(
                            chat.created_at
                        )}

                    </small>


                    <hr>

                </div>
                `
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
                Chats lama soo qaadi karin.
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
            "Ma hubtaa inaad tirtirayso dhammaan chats?"
        );


    if (!confirmed) {

        return;
    }


    try {

        const response =
            await fetch(
                "/api/admin/chats",
                {
                    method:
                        "DELETE",

                    headers:
                        getAuthHeaders()
                }
            );


        const data =
            await response.json();


        if (
            !response.ok
        ) {

            alert(
                data.error ||
                "Chats lama tirtiri karin."
            );

            return;
        }


        alert(
            "Dhammaan chats waa la tirtiray."
        );


        loadChats();

        loadUsers();


    } catch (error) {

        console.error(
            "DELETE ALL CHATS ERROR:",
            error
        );


        alert(
            "Server error."
        );
    }
}


/* =====================================================
   DELETE USER CHATS
===================================================== */

async function deleteUserChats(
    userId
) {

    const confirmed =
        confirm(
            "Ma tirtiraysaa chats-ka user-kan?"
        );


    if (!confirmed) {

        return;
    }


    try {

        const response =
            await fetch(
                `/api/admin/users/${userId}/chats`,
                {
                    method:
                        "DELETE",

                    headers:
                        getAuthHeaders()
                }
            );


        const data =
            await response.json();


        if (
            !response.ok
        ) {

            alert(
                data.error ||
                "Chats lama tirtiri karin."
            );

            return;
        }


        alert(
            "User chats waa la tirtiray."
        );


        loadUsers();

        loadChats();


    } catch (error) {

        console.error(
            error
        );


        alert(
            "Server error."
        );
    }
}


/* =====================================================
   DELETE USER
===================================================== */

async function deleteUser(
    userId
) {

    const confirmed =
        confirm(
            "Ma hubtaa inaad tirtirayso user-kan?"
        );


    if (!confirmed) {

        return;
    }


    try {

        const response =
            await fetch(
                `/api/admin/users/${userId}`,
                {
                    method:
                        "DELETE",

                    headers:
                        getAuthHeaders()
                }
            );


        const data =
            await response.json();


        if (
            !response.ok
        ) {

            alert(
                data.error ||
                "User lama tirtiri karin."
            );

            return;
        }


        alert(
            "User waa la tirtiray."
        );


        loadUsers();

        loadChats();


    } catch (error) {

        console.error(
            error
        );


        alert(
            "Server error."
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
        "Loading...";


    try {

        const response =
            await fetch(
                "/api/admin/knowledge",
                {
                    headers:
                        getAuthHeaders()
                }
            );


        const data =
            await response.json();


        if (
            !response.ok
        ) {

            throw new Error(
                data.error ||
                "Knowledge lama helin."
            );
        }


        if (
            !data.knowledge ||
            data.knowledge.length === 0
        ) {

            container.innerHTML =
                `
                <p>
                    Knowledge wali lama gelin.
                </p>
                `;

            return;
        }


        container.innerHTML =
            data.knowledge
            .map(
                item =>
                `
                <div class="knowledge-card">

                    <h3>

                        ${escapeHTML(
                            item.title
                        )}

                    </h3>


                    <p>

                        ${escapeHTML(
                            item.content
                        )}

                    </p>


                    <button
                        onclick="deleteKnowledge(${item.id})"
                    >

                        🗑️ Delete

                    </button>


                    <hr>

                </div>
                `
            )
            .join("");


    } catch (error) {

        console.error(
            "LOAD KNOWLEDGE ERROR:",
            error
        );


        container.innerHTML =
            `
            Knowledge lama soo qaadi karin.
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
        titleInput
        .value
        .trim();


    const content =
        contentInput
        .value
        .trim();


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

        const response =
            await fetch(
                "/api/admin/knowledge",
                {
                    method:
                        "POST",

                    headers: {

                        "Content-Type":
                            "application/json",

                        ...getAuthHeaders()
                    },

                    body:
                        JSON.stringify({
                            title,
                            content
                        })
                }
            );


        const data =
            await response.json();


        if (
            !response.ok
        ) {

            alert(
                data.error ||
                "Knowledge lama kaydin."
            );

            return;
        }


        alert(
            "Knowledge waa la kaydiyay."
        );


        titleInput.value =
            "";


        contentInput.value =
            "";


        loadKnowledge();


    } catch (error) {

        console.error(
            "ADD KNOWLEDGE ERROR:",
            error
        );


        alert(
            "Server error."
        );
    }
}


/* =====================================================
   DELETE KNOWLEDGE
===================================================== */

async function deleteKnowledge(
    id
) {

    const confirmed =
        confirm(
            "Ma hubtaa inaad tirtirayso Knowledge-kan?"
        );


    if (!confirmed) {

        return;
    }


    try {

        const response =
            await fetch(
                `/api/admin/knowledge/${id}`,
                {
                    method:
                        "DELETE",

                    headers:
                        getAuthHeaders()
                }
            );


        const data =
            await response.json();


        if (
            !response.ok
        ) {

            alert(
                data.error ||
                "Knowledge lama tirtiri karin."
            );

            return;
        }


        alert(
            "Knowledge waa la tirtiray."
        );


        loadKnowledge();


    } catch (error) {

        console.error(
            error
        );


        alert(
            "Server error."
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
        )
        .toLocaleString(
            "so-SO"
        );

    } catch (error) {

        return date;
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
   DASHBOARD INITIALIZATION
===================================================== */

async function initializeDashboard() {

    if (!adminToken) {

        window.location.href =
            "/admin/";

        return;
    }


    const isAdmin =
        await verifyAdmin();


    if (!isAdmin) {

        return;
    }


    await loadUsers();


    await loadChats();


    await loadKnowledge();
}


/* =====================================================
   AUTO RUN
===================================================== */

if (
    window.location.pathname.includes(
        "dashboard.html"
    )
) 

    initializeDashboard();
}
