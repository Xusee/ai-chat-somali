/* =========================================
   ADMIN AUTH
========================================= */

const adminToken =
    localStorage.getItem(
        "adminToken"
    );


/* =========================================
   ADMIN LOGIN
========================================= */

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


            if (!email || !password) {

                alert(
                    "Fadlan geli Email iyo Password."
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
                    await response.json();


                if (!response.ok) {

                    alert(
                        data.error ||
                        "Login ayaa fashilmay."
                    );

                    return;
                }


                /* Hubi inuu yahay Admin */

                if (
                    !data.user ||
                    data.user.role !==
                    "admin"
                ) {

                    alert(
                        "Account-kan Admin ma aha."
                    );

                    return;
                }


                /* Kaydi Token */

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


                alert(
                    "Admin login successful."
                );


                /* Tag Dashboard */

                window.location.href =
                    "/admin/dashboard.html";

            } catch (error) {

                console.error(
                    "ADMIN LOGIN ERROR:",
                    error
                );


                alert(
                    "Server error. Fadlan isku day mar kale."
                );
            }
        }
    );
}


/* =========================================
   VERIFY ADMIN
========================================= */

async function verifyAdmin() {

    try {

        const response =
            await fetch(
                "/api/admin/me",
                {
                    headers: {
                        Authorization:
                            "Bearer " +
                            adminToken
                    }
                }
            );


        if (!response.ok) {

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


        return true;

    } catch (error) {

        console.error(
            "Admin verification error:",
            error
        );

        return false;
    }
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
        "Users loading...";


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
            await response.json();


        if (!response.ok) {

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
                "Users lama helin.";

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

                    ${
                        user.role !== "admin"
                        ?
                        `
                        <button
                            onclick="deleteUser(${user.id})"
                        >
                            Delete User
                        </button>
                        `
                        :
                        `
                        <p>
                            👑 Admin
                        </p>
                        `
                    }

                    <hr>

                </div>
                `
            )
            .join("");

    } catch (error) {

        console.error(error);


        container.innerHTML =
            "Users lama soo qaadi karin.";
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
        "Chats loading...";


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
            await response.json();


        if (!response.ok) {

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
                "Chats lama helin.";

            return;
        }


        container.innerHTML =
            data.chats
            .map(
                chat =>
                `
                <div class="chat-card">

                    <h3>
                        👤 ${chat.name}
                    </h3>

                    <p>
                        ${chat.email}
                    </p>

                    <p>
                        <b>Su'aal:</b>
                        ${chat.message}
                    </p>

                    <p>
                        <b>AI:</b>
                        ${chat.response}
                    </p>

                    ${
                        chat.image
                        ?
                        `
                        <img
                            src="${chat.image}"
                            style="
                                max-width:200px;
                                border-radius:10px;
                            "
                        >
                        `
                        :
                        ""
                    }

                    <hr>

                </div>
                `
            )
            .join("");

    } catch (error) {

        console.error(error);


        container.innerHTML =
            "Chats lama soo qaadi karin.";
    }
}


/* =========================================
   DELETE ALL CHATS
========================================= */

async function deleteAllChats() {

    const confirmDelete =
        confirm(
            "Ma hubtaa inaad tirtirayso dhammaan chats?"
        );


    if (!confirmDelete) return;


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
            await response.json();


        if (!response.ok) {

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

        console.error(error);

        alert(
            "Server error."
        );
    }
}


/* =========================================
   DELETE USER
========================================= */

async function deleteUser(
    userId
) {

    const confirmDelete =
        confirm(
            "Ma hubtaa inaad tirtirayso User-kan?"
        );


    if (!confirmDelete) return;


    try {

        const response =
            await fetch(
                "/api/admin/users/" +
                userId,
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
            await response.json();


        if (!response.ok) {

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

        console.error(error);

        alert(
            "Server error."
        );
    }
}


/* =========================================
   LOAD KNOWLEDGE
========================================= */

async function loadKnowledge() {

    const container =
        document.getElementById(
            "knowledge"
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
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.error
            );
        }


        if (
            !data.knowledge ||
            data.knowledge.length === 0
        ) {

            container.innerHTML =
                "Knowledge lama gelin.";

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
                        onclick="
                            deleteKnowledge(
                                ${item.id}
                            )
                        "
                    >
                        Delete
                    </button>

                    <hr>

                </div>
                `
            )
            .join("");

    } catch (error) {

        console.error(error);

        container.innerHTML =
            "Knowledge lama soo qaadi karin.";
    }
}


/* =========================================
   ADD KNOWLEDGE
========================================= */

async function addKnowledge() {

    const title =
        document
        .getElementById(
            "knowledgeTitle"
        )
        .value
        .trim();


    const content =
        document
        .getElementById(
            "knowledgeContent"
        )
        .value
        .trim();


    if (!title || !content) {

        alert(
            "Fadlan geli Title iyo Content."
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

                        Authorization:
                            "Bearer " +
                            adminToken
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


        if (!response.ok) {

            alert(
                data.error ||
                "Knowledge lama kaydin."
            );

            return;
        }


        alert(
            "Knowledge waa la kaydiyay."
        );


        document
            .getElementById(
                "knowledgeTitle"
            )
            .value =
            "";


        document
            .getElementById(
                "knowledgeContent"
            )
            .value =
            "";


        loadKnowledge();

    } catch (error) {

        console.error(error);


        alert(
            "Server error."
        );
    }
}


/* =========================================
   DELETE KNOWLEDGE
========================================= */

async function deleteKnowledge(
    id
) {

    const confirmDelete =
        confirm(
            "Ma hubtaa inaad tirtirayso Knowledge-kan?"
        );


    if (!confirmDelete) return;


    try {

        const response =
            await fetch(
                "/api/admin/knowledge/" +
                id,
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
            await response.json();


        if (!response.ok) {

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

        console.error(error);

        alert(
            "Server error."
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

        verifyAdmin()
        .then(
            valid => {

                if (valid) {

                    loadUsers();

                    loadChats();

                    loadKnowledge();
                }
            }
        );
    }
}
