const API = "";

// ==================================================
// GET LOGIN DATA
// ==================================================

function getToken() {
    return localStorage.getItem("ai_token");
}

function getUser() {
    try {
        return JSON.parse(
            localStorage.getItem("ai_user") || "null"
        );
    } catch (error) {
        return null;
    }
}


// ==================================================
// REDIRECT TO LOGIN
// ==================================================

function goToLogin(message = null) {

    if (message) {
        alert(message);
    }

    window.location.href = "../index.html";
}


// ==================================================
// ADMIN VERIFICATION
// ==================================================

async function checkAdmin() {

    const token = getToken();
    const user = getUser();

    // Token ma jiro
    if (!token) {
        goToLogin(
            "Fadlan marka hore login samee."
        );
        return false;
    }

    // User data ma jiro
    if (!user) {

        localStorage.removeItem("ai_token");
        localStorage.removeItem("ai_user");

        goToLogin(
            "Login-ka lama helin. Fadlan mar kale gal."
        );

        return false;
    }

    // Role admin ma aha
    if (user.role !== "admin") {

        goToLogin(
            "Admin access ayaa loo baahan yahay."
        );

        return false;
    }

    // Server-ka ka xaqiiji token-ka
    try {

        const response = await fetch(
            `${API}/api/knowledge`,
            {
                method: "GET",

                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        // Token dhacay ama khaldan
        if (response.status === 401) {

            localStorage.removeItem("ai_token");
            localStorage.removeItem("ai_user");

            goToLogin(
                "Session-kaaga wuu dhacay. Fadlan mar kale login samee."
            );

            return false;
        }

        // Admin ma aha
        if (response.status === 403) {

            goToLogin(
                "Admin access ayaa loo baahan yahay."
            );

            return false;
        }

        return true;

    } catch (error) {

        console.error(
            "Admin verification error:",
            error
        );

        alert(
            "Server-ka lama xiriiri karo."
        );

        return false;
    }
}


// ==================================================
// LOAD KNOWLEDGE
// ==================================================

async function loadKnowledge() {

    const token = getToken();

    if (!token) {
        return;
    }

    try {

        const response = await fetch(
            `${API}/api/knowledge`,
            {
                method: "GET",

                headers: {
                    Authorization:
                        `Bearer ${token}`
                }
            }
        );

        const data =
            await response.json();

        // Token expired
        if (response.status === 401) {

            localStorage.removeItem(
                "ai_token"
            );

            localStorage.removeItem(
                "ai_user"
            );

            goToLogin(
                "Session-kaaga wuu dhacay."
            );

            return;
        }

        // Not admin
        if (response.status === 403) {

            alert(
                "Admin access ayaa loo baahan yahay."
            );

            return;
        }

        if (!response.ok) {

            alert(
                data.error ||
                "Knowledge lama soo qaadi karin."
            );

            return;
        }

        const list =
            document.getElementById(
                "knowledgeList"
            );

        if (!list) {
            console.error(
                "knowledgeList lama helin."
            );
            return;
        }

        list.innerHTML = "";

        const knowledge =
            data.knowledge || [];

        if (knowledge.length === 0) {

            list.innerHTML = `
                <div class="empty">
                    Weli Knowledge lama darin.
                </div>
            `;

            return;
        }

        knowledge.forEach(item => {

            const div =
                document.createElement("div");

            div.className =
                "knowledge-item";

            div.innerHTML = `
                <h3>
                    ${escapeHtml(item.title)}
                </h3>

                <p>
                    ${escapeHtml(item.content)}
                </p>

                <button
                    class="delete"
                    onclick="deleteKnowledge(${item.id})"
                >
                    🗑️ Tirtir
                </button>
            `;

            list.appendChild(div);
        });

    } catch (error) {

        console.error(
            "Load knowledge error:",
            error
        );

        alert(
            "Server-ka lama xiriiri karo."
        );
    }
}


// ==================================================
// ADD KNOWLEDGE
// ==================================================

async function addKnowledge() {

    const titleInput =
        document.getElementById("title");

    const contentInput =
        document.getElementById("content");

    if (!titleInput || !contentInput) {

        alert(
            "Title ama Content field lama helin."
        );

        return;
    }

    const title =
        titleInput.value.trim();

    const content =
        contentInput.value.trim();

    if (!title || !content) {

        alert(
            "Title iyo content geli."
        );

        return;
    }

    const token = getToken();

    if (!token) {

        goToLogin(
            "Fadlan marka hore login samee."
        );

        return;
    }

    try {

        const response =
            await fetch(
                `${API}/api/knowledge`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json",

                        Authorization:
                            `Bearer ${token}`
                    },

                    body: JSON.stringify({
                        title,
                        content
                    })
                }
            );

        const data =
            await response.json();

        if (response.status === 401) {

            localStorage.removeItem(
                "ai_token"
            );

            localStorage.removeItem(
                "ai_user"
            );

            goToLogin(
                "Session-kaaga wuu dhacay."
            );

            return;
        }

        if (response.status === 403) {

            alert(
                "Kaliya Admin ayaa Knowledge ku dari kara."
            );

            return;
        }

        if (!response.ok) {

            alert(
                data.error ||
                "Knowledge lama kaydin."
            );

            return;
        }

        // Clear fields
        titleInput.value = "";
        contentInput.value = "";

        alert(
            "Knowledge si guul leh ayaa loo kaydiyay. ✅"
        );

        await loadKnowledge();

    } catch (error) {

        console.error(
            "Add knowledge error:",
            error
        );

        alert(
            "Server-ka lama xiriiri karo."
        );
    }
}


// ==================================================
// DELETE KNOWLEDGE
// ==================================================

async function deleteKnowledge(id) {

    if (!id) {
        return;
    }

    const confirmed =
        confirm(
            "Knowledge-kan ma tirtirtaa?"
        );

    if (!confirmed) {
        return;
    }

    const token = getToken();

    if (!token) {

        goToLogin(
            "Fadlan marka hore login samee."
        );

        return;
    }

    try {

        const response =
            await fetch(
                `${API}/api/knowledge/${id}`,
                {
                    method: "DELETE",

                    headers: {
                        Authorization:
                            `Bearer ${token}`
                    }
                }
            );

        const data =
            await response.json();

        if (response.status === 401) {

            localStorage.removeItem(
                "ai_token"
            );

            localStorage.removeItem(
                "ai_user"
            );

            goToLogin(
                "Session-kaaga wuu dhacay."
            );

            return;
        }

        if (response.status === 403) {

            alert(
                "Kaliya Admin ayaa tirtiri kara."
            );

            return;
        }

        if (!response.ok) {

            alert(
                data.error ||
                "Knowledge lama tirtiri karin."
            );

            return;
        }

        alert(
            "Knowledge waa la tirtiray. ✅"
        );

        await loadKnowledge();

    } catch (error) {

        console.error(
            "Delete knowledge error:",
            error
        );

        alert(
            "Server-ka lama xiriiri karo."
        );
    }
}


// ==================================================
// LOGOUT
// ==================================================

function logoutAdmin() {

    localStorage.removeItem(
        "ai_token"
    );

    localStorage.removeItem(
        "ai_user"
    );

    window.location.href =
        "../index.html";
}


// ==================================================
// ESCAPE HTML
// ==================================================

function escapeHtml(text) {

    const div =
        document.createElement("div");

    div.textContent =
        String(text ?? "");

    return div.innerHTML;
}


// ==================================================
// START ADMIN
// ==================================================

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        const isAdmin =
            await checkAdmin();

        if (!isAdmin) {
            return;
        }

        await loadKnowledge();
    }
);


// ==================================================
// MAKE FUNCTIONS AVAILABLE TO HTML
// ==================================================

window.addKnowledge =
    addKnowledge;

window.deleteKnowledge =
    deleteKnowledge;

window.logoutAdmin =
    logoutAdmin;