// =====================================================
// AI CHAT SOMALI - APP.JS
// =====================================================

// IMPORTANT:
// Markuu app-ku online noqdo, API-ga wuxuu noqonayaa
// isla domain-ka uu browser-ku joogo.
// Sidaas darteed localhost looma baahna.

const API = window.location.origin;

let token =
    localStorage.getItem("ai_token");

let currentUser = null;

try {

    currentUser =
        JSON.parse(
            localStorage.getItem("ai_user")
        );

} catch {

    currentUser = null;
}

// =====================================================
// ELEMENTS
// =====================================================

const messages =
    document.getElementById("messages");

const chatForm =
    document.getElementById("chatForm");

const messageInput =
    document.getElementById("messageInput");

const imageInput =
    document.getElementById("imageInput");

const imageBtn =
    document.getElementById("imageBtn");

const logoutBtn =
    document.getElementById("logoutBtn");

const clearBtn =
    document.getElementById("clearBtn");

const userName =
    document.getElementById("userName");

const userEmail =
    document.getElementById("userEmail");

const loginSection =
    document.getElementById("loginSection");

const chatSection =
    document.getElementById("chatSection");

// =====================================================
// HELPERS
// =====================================================

function escapeHTML(text) {

    const div =
        document.createElement("div");

    div.textContent =
        text || "";

    return div.innerHTML;
}

function showError(message) {

    if (!messages) return;

    const box =
        document.createElement("div");

    box.className =
        "message error";

    box.innerHTML =
        ❌ ${escapeHTML(message)};

    messages.appendChild(box);

    messages.scrollTop =
        messages.scrollHeight;
}

function addUserMessage(text) {

    const box =
        document.createElement("div");

    box.className =
        "message user";

    box.innerHTML =
        escapeHTML(text);

    messages.appendChild(box);

    messages.scrollTop =
        messages.scrollHeight;
}

function addAIMessage(text) {

    const box =
        document.createElement("div");

    box.className =
        "message ai";

    box.innerHTML =
        escapeHTML(text)
            .replace(/\n/g, "<br>");

    messages.appendChild(box);

    messages.scrollTop =
        messages.scrollHeight;
}

function loading(show) {

    let item =
        document.getElementById(
            "aiLoading"
        );

    if (show) {

        if (item) return;

        item =
            document.createElement("div");

        item.id =
            "aiLoading";

        item.className =
            "message ai";

        item.innerHTML =
            "🤖 AI ayaa qoraya...";

        messages.appendChild(item);

        messages.scrollTop =
            messages.scrollHeight;

    } else {

        if (item) {
            item.remove();
        }
    }
}

// =====================================================
// AUTH CHECK
// =====================================================

async function checkLogin() {

    if (!token) {

        showLogin();

        return;
    }

    try {

        const response =
            await fetch(
                '${API}/api/me',
                {
                    headers: {
                        Authorization:
                            Bearer ${token}
                    }
                }
            );

        const data =
            await response.json();

        if (!response.ok) {

            logout(false);

            return;
        }

        currentUser =
            data.user;

        localStorage.setItem(
            "ai_user",
            JSON.stringify(
                currentUser
            )
        );

        showChat();

        await loadChats();

    } catch (error) {

        showError(
            "Server-ka lama xiriirin karin."
        );
    }
}

// =====================================================
// SHOW LOGIN
// =====================================================

function showLogin() {

    if (loginSection)
        loginSection.style.display =
            "block";

    if (chatSection)
        chatSection.style.display =
            "none";
}

// =====================================================
// SHOW CHAT
// =====================================================

function showChat() {

    if (loginSection)
        loginSection.style.display =
            "none";

    if (chatSection)
        chatSection.style.display =
            "block";

    if (userName)
        userName.textContent =
            currentUser?.name || "";

    if (userEmail)
        userEmail.textContent =
            currentUser?.email || "";
}

// =====================================================
// LOGIN
// =====================================================

async function login(
    email,
    password
) {

    try {

        const response =
            await fetch(
                '${API}/api/login',
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
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
                "Login-ku wuu fashilmay."
            );

            return false;
        }

        token =
            data.token;

        currentUser =
            data.user;

        localStorage.setItem(
            "ai_token",
            token
        );

        localStorage.setItem(
            "ai_user",
            JSON.stringify(
                currentUser
            )
        );

        showChat();

        await loadChats();

        return true;

    } catch (error) {

        alert(
            "Server-ka lama xiriirin karin."
        );

        return false;
    }
}

// =====================================================
// REGISTER
// =====================================================

async function register(
    name,
    email,
    password
) {

    try {

        const response =
            await fetch(
                '${API}/api/register',
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        name,
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
                "User lama abuuri karin."
            );

            return false;
        }

        token =
            data.token;

        currentUser =
            data.user;

        localStorage.setItem(
            "ai_token",
            token
        );

        localStorage.setItem(
            "ai_user",
            JSON.stringify(
                currentUser
            )
        );

        showChat();

        await loadChats();

        return true;

    } catch (error) {

        alert(
            "Server-ka lama xiriirin karin."
        );

        return false;
    }
}

// =====================================================
// SEND CHAT
// =====================================================

async function sendMessage() {

    const text =
        messageInput?.value.trim() ||
        "";

    const image =
        imageInput?.files?.[0];

    if (!text && !image) {

        return;
    }

    addUserMessage(
        text ||
        "📷 Sawir"
    );

    if (messageInput) {
        messageInput.value = "";
    }

    loading(true);

    try {

        const formData =
            new FormData();

        if (text) {

            formData.append(
                "message",
                text
            );
        }

        if (image) {

            formData.append(
                "image",
                image
            );
        }

        const response =
            await fetch(
                '${API}/api/chat',
                {
                    method: "POST",

                    headers: {
                        Authorization:
                            Bearer ${token}
                    },

                    body: formData
                }
            );

        const data =
            await response.json();

        loading(false);

        if (response.status === 401) {

            logout();

            return;
        }

        if (!response.ok) {

            showError(
                data.error ||
                "AI error."
            );

            return;
        }

        addAIMessage(
            data.answer
        );

        if (imageInput) {
            imageInput.value = "";
        }

    } catch (error) {

        loading(false);

        showError(
            "Server-ka lama xiriirin karin."
        );
    }
}

// =====================================================
// LOAD CHAT HISTORY
// =====================================================

async function loadChats() {

    if (!token ||
        !messages) return;

    try {

        const response =
            await fetch(
                '${API}/api/chats',
                {
                    headers: {
                        Authorization:
                            Bearer ${token}
                    }
                }
            );

        const data =
            await response.json();

        if (!response.ok) {

            if (response.status === 401) {
                logout();
            }

            return;
        }

        messages.innerHTML = "";

        data.chats.forEach(chat => {

            addUserMessage(
                chat.message
            );

            addAIMessage(
                chat.response
            );
        });

    } catch (error) {

        showError(
            "Chat history lama soo qaadi karin."
        );
    }
}

// =====================================================
// DELETE CHAT HISTORY
// =====================================================

async function deleteChats() {

    if (!token) return;

    const yes =
        confirm(
            "Ma hubtaa inaad tirtirayso dhammaan chat history-ga?"
        );

    if (!yes) return;

    try {

        const response =
            await fetch(
                '${API}/api/chats',
                {
                    method: "DELETE",

                    headers: {
                        Authorization:
                            Bearer ${token}
                    }
                }
            );

        const data =
            await response.json();

        if (response.ok) {

            messages.innerHTML = "";

        } else {

            alert(
                data.error ||
                "Tirtiriddu way fashilantay."
            );
        }

    } catch (error) {

        alert(
            "Server-ka lama xiriirin karin."
        );
    }
}

// =====================================================
// LOGOUT
// =====================================================

function logout(
    redirect = true
) {

    token = null;
    currentUser = null;

    localStorage.removeItem(
        "ai_token"
    );

    localStorage.removeItem(
        "ai_user"
    );

    if (messages) {
        messages.innerHTML = "";
    }

    showLogin();

    if (redirect) {
        location.reload();
    }
}

// =====================================================
// LOGIN FORM
// =====================================================

const loginForm =
    document.getElementById(
        "loginForm"
    );

if (loginForm) {

    loginForm.addEventListener(
        "submit",
        async event => {

            event.preventDefault();

            const email =
                document.getElementById(
                    "loginEmail"
                ).value.trim();

            const password =
                document.getElementById(
                    "loginPassword"
                ).value;

            await login(
                email,
                password
            );
        }
    );
}

// =====================================================
// REGISTER FORM
// =====================================================

const registerForm =
    document.getElementById(
        "registerForm"
    );

if (registerForm) {

    registerForm.addEventListener(
        "submit",
        async event => {

            event.preventDefault();

            const name =
                document.getElementById(
                    "registerName"
                ).value.trim();

            const email =
                document.getElementById(
                    "registerEmail"
                ).value.trim();

            const password =
                document.getElementById(
                    "registerPassword"
                ).value;

            await register(
                name,
                email,
                password
            );
        }
    );
}

// =====================================================
// CHAT FORM
// =====================================================

if (chatForm) {

    chatForm.addEventListener(
        "submit",
        async event => {

            event.preventDefault();

            await sendMessage();
        }
    );
}

// =====================================================
// IMAGE BUTTON
// =====================================================

if (imageBtn &&
    imageInput) {

    imageBtn.addEventListener(
        "click",
        () => {
            imageInput.click();
        }
    );
}

// =====================================================
// CLEAR CHAT
// =====================================================

if (clearBtn) {

    clearBtn.addEventListener(
        "click",
        deleteChats
    );
}

// =====================================================
// LOGOUT
// =====================================================

if (logoutBtn) {

    logoutBtn.addEventListener(
        "click",
        () => logout()
    );
}

// =====================================================
// ENTER TO SEND
// =====================================================

if (messageInput) {

    messageInput.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Enter" &&
                !event.shiftKey
            ) {

                event.preventDefault();

                sendMessage();
            }
        }
    );
}

// =====================================================
// START
// =====================================================

checkLogin();
