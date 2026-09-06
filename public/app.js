"use strict";

/*
=====================================================
 AI CHAT SOMALI - PUBLIC APP.JS
=====================================================
 Works with:
   POST   /api/register
   POST   /api/login
   GET    /api/me
   POST   /api/chat
   GET    /api/chats
   DELETE /api/chats

 Features:
   - Login
   - Register
   - JWT authentication
   - Chat
   - Chat history
   - Delete history
   - Image upload
   - Logout
   - Mobile friendly
=====================================================
*/


// =====================================================
// API
// =====================================================

const API = window.location.origin;


// =====================================================
// LOCAL STORAGE KEYS
// =====================================================

const TOKEN_KEY = "ai_token";
const USER_KEY = "ai_user";


// =====================================================
// STATE
// =====================================================

let token = localStorage.getItem(TOKEN_KEY) || "";
let currentUser = null;
let selectedImage = null;


// =====================================================
// DOM HELPERS
// =====================================================

function $(id) {
    return document.getElementById(id);
}


// =====================================================
// ELEMENTS
// =====================================================

const loginSection = $("loginSection");
const chatSection = $("chatSection");

const loginForm = $("loginForm");
const registerForm = $("registerForm");

const loginEmail = $("loginEmail");
const loginPassword = $("loginPassword");

const registerName = $("registerName");
const registerEmail = $("registerEmail");
const registerPassword = $("registerPassword");

const userName = $("userName");
const userEmail = $("userEmail");

const messages = $("messages");

const chatForm = $("chatForm");
const messageInput = $("messageInput");

const imageBtn = $("imageBtn");
const imageInput = $("imageInput");

const clearBtn = $("clearBtn");
const logoutBtn = $("logoutBtn");


// =====================================================
// ESCAPE HTML
// =====================================================

function escapeHTML(value) {
    const div = document.createElement("div");
    div.textContent = value ?? "";
    return div.innerHTML;
}


// =====================================================
// SHOW MESSAGE
// =====================================================

function showMessage(text, type = "error") {

    const old = document.getElementById("appNotice");

    if (old) {
        old.remove();
    }

    const notice = document.createElement("div");

    notice.id = "appNotice";

    notice.style.padding = "12px";
    notice.style.margin = "10px 0";
    notice.style.borderRadius = "10px";
    notice.style.fontSize = "15px";
    notice.style.whiteSpace = "pre-wrap";

    if (type === "success") {
        notice.style.background = "#dcfce7";
        notice.style.color = "#166534";
    } else {
        notice.style.background = "#fee2e2";
        notice.style.color = "#991b1b";
    }

    notice.textContent = text;

    const container =
        document.querySelector(".container") ||
        document.body;

    container.prepend(notice);

    setTimeout(() => {
        notice.remove();
    }, 5000);
}


// =====================================================
// GET ERROR FROM SERVER
// =====================================================

async function getErrorMessage(response) {

    try {

        const data = await response.json();

        return (
            data?.error ||
            data?.message ||
            `Request failed (${response.status})`
        );

    } catch (error) {

        return `Request failed (${response.status})`;
    }
}


// =====================================================
// AUTH HEADERS
// =====================================================

function authHeaders() {

    return {
        "Authorization": `Bearer ${token}`
    };
}


// =====================================================
// SAVE LOGIN
// =====================================================

function saveSession(newToken, user) {

    token = newToken;
    currentUser = user;

    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
}


// =====================================================
// CLEAR LOGIN
// =====================================================

function clearSession() {

    token = "";
    currentUser = null;
    selectedImage = null;

    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
}


// =====================================================
// SHOW LOGIN
// =====================================================

function showLogin() {

    if (loginSection) {
        loginSection.style.display = "block";
    }

    if (chatSection) {
        chatSection.style.display = "none";
    }
}


// =====================================================
// SHOW CHAT
// =====================================================

function showChat() {

    if (loginSection) {
        loginSection.style.display = "none";
    }

    if (chatSection) {
        chatSection.style.display = "block";
    }

    if (currentUser) {

        if (userName) {
            userName.textContent =
                currentUser.name || "User";
        }

        if (userEmail) {
            userEmail.textContent =
                currentUser.email || "";
        }
    }
}


// =====================================================
// LOGIN
// =====================================================

async function login(email, password) {

    email = email.trim();

    if (!email || !password) {
        showMessage(
            "Fadlan geli email iyo password."
        );
        return;
    }

    try {

        showMessage(
            "⏳ Login ayaa socda...",
            "success"
        );

        const response = await fetch(
            `${API}/api/login`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    email: email,
                    password: password
                })
            }
        );

        if (!response.ok) {

            const error =
                await getErrorMessage(response);

            throw new Error(error);
        }

        const data =
            await response.json();

        if (!data.success || !data.token) {

            throw new Error(
                data.error ||
                "Login-ku ma shaqayn."
            );
        }

        saveSession(
            data.token,
            data.user
        );

        showChat();

        showMessage(
            "✅ Si guul leh ayaad u gashay.",
            "success"
        );

        if (loginForm) {
            loginForm.reset();
        }

        await loadChats();

    } catch (error) {

        console.error(
            "LOGIN ERROR:",
            error
        );

        showMessage(
            "❌ " +
            (error.message ||
                "Login-ku wuu fashilmay.")
        );
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

    name = name.trim();
    email = email.trim();

    if (!name || !email || !password) {

        showMessage(
            "Fadlan buuxi magaca, email-ka iyo password-ka."
        );

        return;
    }

    if (password.length < 6) {

        showMessage(
            "❌ Password-ku ugu yaraan 6 xaraf ha noqdo."
        );

        return;
    }

    try {

        showMessage(
            "⏳ Account ayaa la samaynayaa...",
            "success"
        );

        const response = await fetch(
            `${API}/api/register`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    name: name,
                    email: email,
                    password: password
                })
            }
        );

        if (!response.ok) {

            const error =
                await getErrorMessage(response);

            throw new Error(error);
        }

        const data =
            await response.json();

        if (!data.success || !data.token) {

            throw new Error(
                data.error ||
                "Account lama samayn."
            );
        }

        saveSession(
            data.token,
            data.user
        );

        showChat();

        showMessage(
            "✅ Account-ka si guul leh ayaa loo sameeyay.",
            "success"
        );

        if (registerForm) {
            registerForm.reset();
        }

        await loadChats();

    } catch (error) {

        console.error(
            "REGISTER ERROR:",
            error
        );

        showMessage(
            "❌ " +
            (error.message ||
                "Account lama samayn.")
        );
    }
}


// =====================================================
// CHECK CURRENT USER
// =====================================================

async function checkAuth() {

    if (!token) {

        showLogin();
        return false;
    }

    try {

        const response = await fetch(
            `${API}/api/me`,
            {
                method: "GET",

                headers: {
                    "Authorization":
                        `Bearer ${token}`
                }
            }
        );

        if (!response.ok) {

            clearSession();
            showLogin();

            return false;
        }

        const data =
            await response.json();

        if (!data.success || !data.user) {

            clearSession();
            showLogin();

            return false;
        }

        currentUser = data.user;

        localStorage.setItem(
            USER_KEY,
            JSON.stringify(currentUser)
        );

        showChat();

        await loadChats();

        return true;

    } catch (error) {

        console.error(
            "AUTH CHECK ERROR:",
            error
        );

        /*
        Haddii internet/server-ka uu
        cilad leeyahay, session-ka lama
        tirtirayo si user-ku uusan
        si lama filaan ah uga bixin.
        */

        showLogin();

        showMessage(
            "❌ Server-ka lama xiriirin karo."
        );

        return false;
    }
}


// =====================================================
// ADD USER MESSAGE
// =====================================================

function addUserMessage(text, imageFile = null) {

    if (!messages) {
        return;
    }

    const div =
        document.createElement("div");

    div.className =
        "message user";

    let html = "";

    if (text) {

        html +=
            `<div>${escapeHTML(text).replace(
                /\n/g,
                "<br>"
            )}</div>`;
    }

    if (imageFile) {

        const imageURL =
            URL.createObjectURL(imageFile);

        html += `
            <div style="margin-top:10px;">
                <img
                    src="${imageURL}"
                    alt="Sawir"
                    style="
                        max-width:100%;
                        max-height:300px;
                        border-radius:10px;
                    "
                >
            </div>
        `;
    }

    div.innerHTML = html;

    messages.appendChild(div);

    scrollMessages();
}


// =====================================================
// ADD AI MESSAGE
// =====================================================

function addAIMessage(text) {

    if (!messages) {
        return;
    }

    const div =
        document.createElement("div");

    div.className =
        "message ai";

    /*
    Waxaan isticmaalay textContent si
    jawaabta AI aysan HTML khatar ah
    ugu gelin browser-ka.
    */

    const content =
        document.createElement("div");

    content.textContent =
        text || "Jawaab lama helin.";

    content.style.whiteSpace =
        "pre-wrap";

    div.appendChild(content);

    messages.appendChild(div);

    scrollMessages();
}


// =====================================================
// ADD ERROR MESSAGE
// =====================================================

function addErrorMessage(text) {

    if (!messages) {
        return;
    }

    const div =
        document.createElement("div");

    div.className =
        "message error";

    div.textContent =
        "❌ " +
        (text || "Khalad ayaa dhacay.");

    messages.appendChild(div);

    scrollMessages();
}


// =====================================================
// SCROLL CHAT
// =====================================================

function scrollMessages() {

    if (!messages) {
        return;
    }

    messages.scrollTop =
        messages.scrollHeight;
}


// =====================================================
// CLEAR CHAT SCREEN
// =====================================================

function clearChatScreen() {

    if (messages) {
        messages.innerHTML = "";
    }
}


// =====================================================
// LOAD CHAT HISTORY
// =====================================================

async function loadChats() {

    if (!token || !messages) {
        return;
    }

    try {

        const response = await fetch(
            `${API}/api/chats`,
            {
                method: "GET",

                headers: {
                    "Authorization":
                        `Bearer ${token}`
                }
            }
        );

        if (response.status === 401) {

            clearSession();
            showLogin();

            return;
        }

        if (!response.ok) {

            const error =
                await getErrorMessage(response);

            throw new Error(error);
        }

        const data =
            await response.json();

        clearChatScreen();

        const chats =
            Array.isArray(data.chats)
                ? data.chats
                : [];

        if (chats.length === 0) {

            const welcome =
                document.createElement("div");

            welcome.className =
                "message ai";

            welcome.textContent =
                "👋 Ku soo dhowow AI Chat Somali.\n\nQor su'aashaada si aan kuu caawiyo.";

            messages.appendChild(welcome);

            return;
        }

        chats.forEach(chat => {

            if (chat.message) {

                addUserMessage(
                    chat.message
                );
            }

            if (chat.response) {

                addAIMessage(
                    chat.response
                );
            }
        });

        scrollMessages();

    } catch (error) {

        console.error(
            "LOAD CHATS ERROR:",
            error
        );

        addErrorMessage(
            error.message ||
            "Chat history lama soo qaadi karin."
        );
    }
}


// =====================================================
// SEND CHAT
// =====================================================

async function sendChat() {

    if (!token) {

        showLogin();

        return;
    }

    const text =
        messageInput
            ? messageInput.value.trim()
            : "";

    if (!text && !selectedImage) {

        showMessage(
            "Fadlan qor su'aal ama geli sawir."
        );

        return;
    }

    const sentText = text;
    const sentImage = selectedImage;

    /*
    Marka hore UI-ga tus user message-ka.
    */

    addUserMessage(
        sentText,
        sentImage
    );

    if (messageInput) {
        messageInput.value = "";
    }

    selectedImage = null;

    if (imageInput) {
        imageInput.value = "";
    }

    if (imageBtn) {
        imageBtn.textContent = "📷";
        imageBtn.title = "Geli sawir";
    }

    let sendButton = null;

    if (chatForm) {
        sendButton =
            chatForm.querySelector(
                'button[type="submit"]'
            );
    }

    if (sendButton) {
        sendButton.disabled = true;
        sendButton.textContent = "⏳";
    }

    const loading =
        document.createElement("div");

    loading.className =
        "message ai";

    loading.id =
        "aiLoadingMessage";

    loading.textContent =
        "⏳ waanu ka fikiraynaa fikiraya...";

    if (messages) {
        messages.appendChild(loading);
        scrollMessages();
    }

    try {

        const formData =
            new FormData();

        if (sentText) {

            formData.append(
                "message",
                sentText
            );
        }

        if (sentImage) {

            formData.append(
                "image",
                sentImage
            );
        }

        const response =
            await fetch(
                `${API}/api/chat`,
                {
                    method: "POST",

                    headers: {
                        "Authorization":
                            `Bearer ${token}`
                    },

                    body: formData
                }
            );

        if (loading) {
            loading.remove();
        }

        if (response.status === 401) {

            clearSession();
            showLogin();

            addErrorMessage(
                "Session-ka wuu dhacay. Fadlan mar kale gal."
            );

            return;
        }

        if (!response.ok) {

            const error =
                await getErrorMessage(response);

            throw new Error(error);
        }

        const data =
            await response.json();

        if (!data.success) {

            throw new Error(
                data.error ||
                "AI jawaab ma soo celin."
            );
        }

        addAIMessage(
            data.answer ||
            "AI jawaab ma soo celin."
        );

    } catch (error) {

        console.error(
            "CHAT ERROR:",
            error
        );

        if (loading) {
            loading.remove();
        }

        addErrorMessage(
            error.message ||
            "Chat-ku wuu fashilmay."
        );

    } finally {

        if (sendButton) {

            sendButton.disabled =
                false;

            sendButton.textContent =
                "➤";
        }

        if (messageInput) {
            messageInput.focus();
        }
    }
}


// =====================================================
// DELETE ALL CHAT HISTORY
// =====================================================

async function deleteChats() {

    if (!token) {

        showLogin();

        return;
    }

    const confirmed =
        window.confirm(
            "Ma hubtaa inaad tirtirayso dhammaan Chat History-ga?"
        );

    if (!confirmed) {
        return;
    }

    try {

        if (clearBtn) {
            clearBtn.disabled = true;
            clearBtn.textContent =
                "⏳ Tirtiraya...";
        }

        const response =
            await fetch(
                `${API}/api/chats`,
                {
                    method: "DELETE",

                    headers: {
                        "Authorization":
                            `Bearer ${token}`
                    }
                }
            );

        if (response.status === 401) {

            clearSession();
            showLogin();

            return;
        }

        if (!response.ok) {

            const error =
                await getErrorMessage(response);

            throw new Error(error);
        }

        const data =
            await response.json();

        clearChatScreen();

        const message =
            document.createElement("div");

        message.className =
            "message ai";

        message.textContent =
            data.message ||
            "✅ Chat history-ga waa la tirtiray.";

        messages.appendChild(message);

        showMessage(
            "✅ Chat history-ga waa la tirtiray.",
            "success"
        );

    } catch (error) {

        console.error(
            "DELETE CHATS ERROR:",
            error
        );

        showMessage(
            "❌ " +
            (error.message ||
                "Tirtiriddu way fashilantay.")
        );

    } finally {

        if (clearBtn) {

            clearBtn.disabled =
                false;

            clearBtn.textContent =
                "🗑️ Tirtir Chat";
        }
    }
}


// =====================================================
// LOGOUT
// =====================================================

function logout() {

    const confirmed =
        window.confirm(
            "Ma hubtaa inaad ka baxayso account-ka?"
        );

    if (!confirmed) {
        return;
    }

    clearSession();

    clearChatScreen();

    showLogin();

    showMessage(
        "👋 Waad ka baxday account-ka.",
        "success"
    );
}


// =====================================================
// IMAGE BUTTON
// =====================================================

if (imageBtn && imageInput) {

    imageBtn.addEventListener(
        "click",
        () => {
            imageInput.click();
        }
    );
}


// =====================================================
// IMAGE SELECT
// =====================================================

if (imageInput) {

    imageInput.addEventListener(
        "change",
        () => {

            const file =
                imageInput.files?.[0];

            if (!file) {

                selectedImage = null;

                if (imageBtn) {
                    imageBtn.textContent =
                        "📷";
                }

                return;
            }

            if (!file.type.startsWith("image/")) {

                showMessage(
                    "❌ Fadlan dooro sawir."
                );

                imageInput.value = "";
                selectedImage = null;

                return;
            }

            /*
            10MB limit dhinaca browser-ka.
            */

            const maxSize =
                10 * 1024 * 1024;

            if (file.size > maxSize) {

                showMessage(
                    "❌ Sawirku waa inuu ka yar yahay 10MB."
                );

                imageInput.value = "";
                selectedImage = null;

                return;
            }

            selectedImage = file;

            if (imageBtn) {

                imageBtn.textContent =
                    "📷✓";

                imageBtn.title =
                    file.name;
            }

            showMessage(
                `📷 Sawirka "${file.name}" waa la doortay.`,
                "success"
            );
        }
    );
}


// =====================================================
// LOGIN FORM
// =====================================================

if (loginForm) {

    loginForm.addEventListener(
        "submit",
        async event => {

            event.preventDefault();

            const email =
                loginEmail
                    ? loginEmail.value.trim()
                    : "";

            const password =
                loginPassword
                    ? loginPassword.value
                    : "";

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

if (registerForm) {

    registerForm.addEventListener(
        "submit",
        async event => {

            event.preventDefault();

            const name =
                registerName
                    ? registerName.value.trim()
                    : "";

            const email =
                registerEmail
                    ? registerEmail.value.trim()
                    : "";

            const password =
                registerPassword
                    ? registerPassword.value
                    : "";

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

            await sendChat();
        }
    );
}


// =====================================================
// ENTER TO SEND
// Shift + Enter = New Line
// =====================================================

if (messageInput) {

    messageInput.addEventListener(
        "keydown",
        async event => {

            if (
                event.key === "Enter" &&
                !event.shiftKey
            ) {

                event.preventDefault();

                await sendChat();
            }
        }
    );
}


// =====================================================
// CLEAR BUTTON
// =====================================================

if (clearBtn) {

    clearBtn.addEventListener(
        "click",
        deleteChats
    );
}


// =====================================================
// LOGOUT BUTTON
// =====================================================

if (logoutBtn) {

    logoutBtn.addEventListener(
        "click",
        logout
    );
}


// =====================================================
// START APPLICATION
// =====================================================

async function startApp() {

    /*
    Haddii token jiro → hubi server-ka.
    Haddii token uusan jirin → login tus.
    */

    if (token) {

        await checkAuth();

    } else {

        showLogin();
    }
}


// =====================================================
// START
// =====================================================

document.addEventListener(
    "DOMContentLoaded",
    startApp
);
