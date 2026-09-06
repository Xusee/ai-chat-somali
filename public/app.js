// ============================================
// AI CHAT SOMALI - PUBLIC APP
// LOGIN / REGISTER MA JIRO
// ============================================

const API = window.location.origin;

// Chat history
let chats = JSON.parse(localStorage.getItem("ai_chat_history")) || [];

// Current chat
let currentChat = null;


// ============================================
// MARKA PAGE-KA FURMO
// ============================================

document.addEventListener("DOMContentLoaded", () => {

    console.log("AI Chat Somali started");

    // Si toos ah u muuji chat-ka
    showChatApp();

    // Hel elements
    const sendBtn = document.getElementById("sendBtn");
    const messageInput = document.getElementById("messageInput");

    // Send button
    if (sendBtn) {
        sendBtn.addEventListener("click", sendMessage);
    }

    // Enter si fariin loo diro
    if (messageInput) {

        messageInput.addEventListener("keydown", (event) => {

            if (event.key === "Enter" && !event.shiftKey) {

                event.preventDefault();

                sendMessage();

            }

        });

    }


    // New Chat
    const newChatBtn = document.getElementById("newChatBtn");

    if (newChatBtn) {

        newChatBtn.addEventListener("click", newChat);

    }


    // Delete All Chats
    const deleteAllBtn = document.getElementById("deleteAllBtn");

    if (deleteAllBtn) {

        deleteAllBtn.addEventListener("click", deleteAllChats);

    }


    // Load local chats
    renderChats();

});


// ============================================
// MUUJI CHAT APP
// ============================================

function showChatApp() {

    const loginPage = document.getElementById("loginPage");

    if (loginPage) {

        loginPage.style.display = "none";

    }


    const registerPage = document.getElementById("registerPage");

    if (registerPage) {

        registerPage.style.display = "none";

    }


    const chatPage = document.getElementById("chatPage");

    if (chatPage) {

        chatPage.style.display = "block";

    }


    const app = document.getElementById("app");

    if (app) {

        app.style.display = "block";

    }

}


// ============================================
// DIR FARIIN
// ============================================

async function sendMessage() {

    const messageInput = document.getElementById("messageInput");

    if (!messageInput) {

        console.error("messageInput lama helin");

        return;

    }


    const message = messageInput.value.trim();


    if (!message) {

        return;

    }


    // Muuji fariinta user-ka
    addMessage("user", message);


    // Nadiifi input
    messageInput.value = "";


    // Disable button inta AI jawaabayo
    const sendBtn = document.getElementById("sendBtn");

    if (sendBtn) {

        sendBtn.disabled = true;

    }


    // Loading message
    const loadingId = addLoadingMessage();


    try {

        const response = await fetch(`${API}/chat`, {

            method: "POST",

            headers: {

                "Content-Type": "application/json"

            },

            body: JSON.stringify({

                message: message

            })

        });


        const data = await response.json();


        // Ka saar loading
        removeLoadingMessage(loadingId);


        if (!response.ok) {

            throw new Error(

                data.error ||
                "Wax qalad ah ayaa dhacay"

            );

        }


        // AI response
        const reply =

            data.reply ||
            data.message ||
            data.response ||
            "Waan ka xumahay, jawaab lama helin.";


        addMessage("assistant", reply);


        // Save chat
        saveChat(message, reply);


    }

    catch (error) {

        console.error(error);


        removeLoadingMessage(loadingId);


        addMessage(

            "assistant",

            "⚠️ Waan ka xumahay, server-ka lama xiriiri karo. Fadlan hubi server.js iyo internet-ka."

        );

    }

    finally {

        if (sendBtn) {

            sendBtn.disabled = false;

        }

    }

}


// ============================================
// KU DAR MESSAGE SCREEN-KA
// ============================================

function addMessage(role, text) {

    const messagesContainer =

        document.getElementById("messages") ||
        document.getElementById("chatMessages") ||
        document.querySelector(".messages") ||
        document.querySelector(".chat-messages");


    if (!messagesContainer) {

        console.error("Messages container lama helin");

        return;

    }


    const messageDiv = document.createElement("div");


    messageDiv.className =

        role === "user"
            ? "message user-message"
            : "message ai-message";


    const content = document.createElement("div");


    content.className = "message-content";


    content.textContent = text;


    messageDiv.appendChild(content);


    messagesContainer.appendChild(messageDiv);


    // Hoos ugu scroll garee
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

}


// ============================================
// LOADING
// ============================================

function addLoadingMessage() {

    const messagesContainer =

        document.getElementById("messages") ||
        document.getElementById("chatMessages") ||
        document.querySelector(".messages") ||
        document.querySelector(".chat-messages");


    if (!messagesContainer) {

        return null;

    }


    const loading = document.createElement("div");


    loading.className = "message ai-message loading-message";


    const id = "loading-" + Date.now();


    loading.id = id;


    loading.innerHTML = `

        <div class="message-content">

            <span>AI Chat Somali ayaa ka fikiraya</span>

            <span class="typing-dots">...</span>

        </div>

    `;


    messagesContainer.appendChild(loading);


    messagesContainer.scrollTop = messagesContainer.scrollHeight;


    return id;

}


// ============================================
// KA SAAR LOADING
// ============================================

function removeLoadingMessage(id) {

    if (!id) return;


    const loading = document.getElementById(id);


    if (loading) {

        loading.remove();

    }

}


// ============================================
// SAVE CHAT LOCALSTORAGE
// ============================================

function saveChat(question, answer) {

    const chat = {

        id: Date.now(),

        question: question,

        answer: answer,

        date: new Date().toISOString()

    };


    chats.unshift(chat);


    localStorage.setItem(

        "ai_chat_history",

        JSON.stringify(chats)

    );


    renderChats();

}


// ============================================
// RENDER CHAT HISTORY
// ============================================

function renderChats() {

    const chatList =

        document.getElementById("chatList") ||
        document.getElementById("historyList") ||
        document.querySelector(".chat-list");


    if (!chatList) {

        return;

    }


    chatList.innerHTML = "";


    chats.forEach(chat => {

        const item = document.createElement("div");


        item.className = "chat-history-item";


        item.textContent =

            chat.question.length > 40

                ? chat.question.substring(0, 40) + "..."

                : chat.question;


        item.addEventListener("click", () => {

            openChat(chat);

        });


        chatList.appendChild(item);

    });

}


// ============================================
// FUR CHAT HORE
// ============================================

function openChat(chat) {

    clearMessages();


    addMessage("user", chat.question);


    addMessage("assistant", chat.answer);

}


// ============================================
// CHAT CUSUB
// ============================================

function newChat() {

    currentChat = null;


    clearMessages();


    const messageInput = document.getElementById("messageInput");


    if (messageInput) {

        messageInput.focus();

    }

}


// ============================================
// NADIIFI MESSAGES
// ============================================

function clearMessages() {

    const messagesContainer =

        document.getElementById("messages") ||
        document.getElementById("chatMessages") ||
        document.querySelector(".messages") ||
        document.querySelector(".chat-messages");


    if (!messagesContainer) {

        return;

    }


    messagesContainer.innerHTML = "";

}


// ============================================
// DELETE ALL CHATS
// ============================================

function deleteAllChats() {

    const confirmDelete = confirm(

        "Ma hubtaa inaad tirtirayso dhammaan chat-yada?"

    );


    if (!confirmDelete) {

        return;

    }


    chats = [];


    localStorage.removeItem("ai_chat_history");


    renderChats();


    clearMessages();


    // Haddii server-ku leeyahay endpoint-kan
    fetch(`${API}/api/chats`, {

        method: "DELETE"

    })

    .catch(error => {

        console.log("Server chat delete error:", error);

    });

}


// ============================================
// DARK MODE
// ============================================

function toggleDarkMode() {

    document.body.classList.toggle("dark-mode");


    const darkMode = document.body.classList.contains("dark-mode");


    localStorage.setItem(

        "ai_dark_mode",

        darkMode

    );

}


// ============================================
// LOAD DARK MODE
// ============================================

(function loadDarkMode() {

    const darkMode =

        localStorage.getItem("ai_dark_mode");


    if (darkMode === "true") {

        document.body.classList.add("dark-mode");

    }

})();


// ============================================
// GLOBAL FUNCTIONS
// ============================================

window.sendMessage = sendMessage;

window.newChat = newChat;

window.deleteAllChats = deleteAllChats;

window.toggleDarkMode = toggleDarkMode;
