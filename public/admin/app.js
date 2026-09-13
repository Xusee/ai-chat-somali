const adminToken = localStorage.getItem("adminToken");


/* =========================================
   CHECK ADMIN TOKEN
========================================= */

function authHeaders() {

    return {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + adminToken
    };
}


/* =========================================
   HANDLE API RESPONSE
========================================= */

async function handleResponse(response) {

    let data;

    try {

        data = await response.json();

    } catch (error) {

        throw new Error(
            "Server-ku jawaab sax ah ma soo celin."
        );
    }


    if (!response.ok) {

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

            alert(
                "Admin session-kaagu wuu dhacay. Fadlan mar kale gal."
            );

            window.location.href =
                "/admin/";
        }

        throw new Error(
            data.error ||
            "Server error."
        );
    }

    return data;
}


/* =========================================
   LOAD USERS
========================================= */

async function loadUsers() {

    const container =
        document.getElementById(
            "users"
        );

    if (!container) return;

    container.innerHTML =
        "<p>Users loading...</p>";

    try {

        const response =
            await fetch(
                "/api/admin/users",
                {
                    headers: {
                        Authorization:
                            "Bearer " +
                            adminToken
                    }
                }
            );

        const data =
            await handleResponse(
                response
            );


        if (
            !data.users ||
            data.users.length === 0
        ) {

            container.innerHTML =
                "<p>Wax User ah lama helin.</p>";

            return;
        }


        container.innerHTML =
            data.users
            .map(
                user =>
                `
                <div class="user-card">

                    <h3>
                        ${user.name}
                    </h3>

                    <p>
                        <b>Email:</b>
                        ${user.email}
                    </p>

                    <p>
                        <b>Role:</b>
                        ${user.role}
                    </p>

                    <p>
                        <b>Chats:</b>
                        ${user.chat_count}
                    </p>

                    <button
                        onclick="deleteUser(${user.id})"
                    >
                        Delete User
                    </button>

                </div>
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
            <p>
                Users lama soo qaadi karin:
                ${error.message}
            </p>
            `;
    }
}


/* =========================================
   LOAD CHATS
========================================= */

async function loadChats() {

    const container =
        document.getElementById(
            "chats"
        );

    if (!container) return;

    container.innerHTML =
        "<p>Chats loading...</p>";

    try {

        const response =
            await fetch(
                "/api/admin/chats",
                {
                    headers: {
                        Authorization:
                            "Bearer " +
                            adminToken
                    }
                }
            );

        const data =
            await handleResponse(
                response
            );


        if (
            !data.chats ||
            data.chats.length === 0
        ) {

            container.innerHTML =
                "<p>Chats lama helin.</p>";

            return;
        }


        container.innerHTML =
            data.chats
            .map(
                chat =>
                `
                <div class="chat-card">

                    <h3>
                        ${chat.name}
                    </h3>

                    <p>
                        <b>Email:</b>
                        ${chat.email}
                    </p>

                    <p>
                        <b>Su'aal:</b>
                        ${chat.message}
                    </p>

                    <p>
                        <b>AI Jawaab:</b>
                        ${chat.response}
                    </p>

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
                Chats lama soo qaadi karin:
                ${error.message}
            </p>
            `;
    }
}


/* =========================================
   LOAD KNOWLEDGE
========================================= */

async function loadKnowledge() {

    const container =
        document.getElementById(
            "knowledgeList"
        );

    if (!container) return;

    try {

        const response =
            await fetch(
                "/api/admin/knowledge",
                {
                    headers: {
                        Authorization:
                            "Bearer " +
                            adminToken
                    }
                }
            );

        const data =
            await handleResponse(
                response
            );


        if (
            !data.knowledge ||
            data.knowledge.length === 0
        ) {

            container.innerHTML =
                "<p>Knowledge lama gelin.</p>";

            return;
        }


        container.innerHTML =
            data.knowledge
            .map(
                item =>
                `
                <div class="knowledge-card">

                    <h3>
                        ${item.title}
                    </h3>

                    <p>
                        ${item.content}
                    </p>

                    <button
                        onclick="deleteKnowledge(${item.id})"
                    >
                        Delete
                    </button>

                </div>
                `
            )
            .join("");

    } catch (error) {

        console.error(
            "KNOWLEDGE ERROR:",
            error
        );

        if (container) {

            container.innerHTML =
                "Knowledge lama soo qaadi karin.";
        }
    }
}


/* =========================================
   ADD KNOWLEDGE
========================================= */

async function addKnowledge() {

    const titleInput =
        document.getElementById(
            "knowledgeTitle"
        );

    const contentInput =
        document.getElementById(
            "knowledgeContent"
        );


    const title =
        titleInput.value.trim();

    const content =
        contentInput.value.trim();


    if (
        !title ||
        !content
    ) {

        alert(
            "Fadlan geli Cinwaan iyo Content."
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

                    headers:
                        authHeaders(),

                    body:
                        JSON.stringify({
                            title,
                            content
                        })
                }
            );

        await handleResponse(
            response
        );


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
            error.message
        );
    }
}


/* =========================================
   DELETE KNOWLEDGE
========================================= */

async function deleteKnowledge(id) {

    if (
        !confirm(
            "Ma hubtaa inaad tirtirayso Knowledge-kan?"
        )
    ) {

        return;
    }


    try {

        const response =
            await fetch(
                "/api/admin/knowledge/" + id,
                {
                    method:
                        "DELETE",

                    headers: {
                        Authorization:
                            "Bearer " +
                            adminToken
                    }
                }
            );

        await handleResponse(
            response
        );

        loadKnowledge();

    } catch (error) {

        alert(
            error.message
        );
    }
}


/* =========================================
   DELETE ALL CHATS
========================================= */

async function deleteAllChats() {

    if (
        !confirm(
            "Ma hubtaa inaad tirtirayso dhammaan Chats-ka?"
        )
    ) {

        return;
    }


    try {

        const response =
            await fetch(
                "/api/admin/chats",
                {
                    method:
                        "DELETE",

                    headers: {
                        Authorization:
                            "Bearer " +
                            adminToken
                    }
                }
            );

        const data =
            await handleResponse(
                response
            );


        alert(
            data.message
        );

        loadChats();

        loadUsers();

    } catch (error) {

        alert(
            error.message
        );
    }
}


/* =========================================
   DELETE USER
========================================= */

async function deleteUser(id) {

    if (
        !confirm(
            "Ma hubtaa inaad tirtirayso User-kan?"
        )
    ) {

        return;
    }


    try {

        const response =
            await fetch(
                "/api/admin/users/" + id,
                {
                    method:
                        "DELETE",

                    headers: {
                        Authorization:
                            "Bearer " +
                            adminToken
                    }
                }
            );

        const data =
            await handleResponse(
                response
            );


        alert(
            data.message
        );

        loadUsers();

        loadChats();

    } catch (error) {

        alert(
            error.message
        );
    }
}


/* =========================================
   LOGOUT
========================================= */

function logout() {

    localStorage.removeItem(
        "adminToken"
    );

    localStorage.removeItem(
        "adminUser"
    );

    window.location.href =
        "/admin/";
}


/* =========================================
   DASHBOARD START
========================================= */

if (
    window.location.pathname.includes(
        "dashboard.html"
    )
) {

    if (!adminToken) {

        window.location.href =
            "/admin/";

    } else {

        loadUsers();

        loadChats();

        loadKnowledge();
    }
}
