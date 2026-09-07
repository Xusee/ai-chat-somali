/*
============================================================
AI CHAT SOMALI - public/app.js
============================================================
*/

"use strict";

/*
============================================================
API CONFIG
============================================================
*/

// Render server-kaaga
const API_URL = "https://ai-chat-somali-1.onrender.com";

// API endpoints
const API = {
    chat: `${API_URL}/chat`,
    health: `${API_URL}/api/health`,
    chats: `${API_URL}/api/chats`,
    login: `${API_URL}/api/login`,
    register: `${API_URL}/api/register`
};


/*
============================================================
HELPER: ELEMENT SELECTOR
============================================================
*/

function getElement(...selectors) {
    for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element) return element;
    }
    return null;
}
/* =====================================================
   AI CHAT SOMALI - public/app.js
 

/* =====================================================
   FIND HTML ELEMENTS
   ===================================================== */

const messageInput = getElement(
    "#messageInput",
    "#userInput",
    "#chatInput",
    "textarea[name='message']",
    ".message-input"
);

const sendButton = getElement(
    "#sendButton",
    "#sendBtn",
    ".send-btn",
    "button[type='submit']"
);

const chatMessages = getElement(
    "#chatMessages",
    "#messages",
    "#chatContainer",
    ".chat-messages",
    ".messages"
);

const newChatButton = getElement(
    "#newChatBtn",
    "#newChat",
    ".new-chat-btn"
);

const clearChatButton = getElement(
    "#clearChatBtn",
    "#deleteChatBtn",
    ".clear-chat-btn"
);

const connectionStatus = getElement(
    "#connectionStatus",
    "#serverStatus",
    ".connection-status"
);


/* =====================================================
   APP STATE
   ===================================================== */

let isSending = false;


/* =====================================================
   CONNECTION STATUS
   ===================================================== */

function updateConnectionStatus(online) {
    if (!connectionStatus) return;

    if (online) {
        connectionStatus.textContent = "🟢 Server-ku wuu shaqaynayaa";
        connectionStatus.classList.remove("offline");
        connectionStatus.classList.add("online");
    } else {
        connectionStatus.textContent = "🔴 Server-ka lama xiriiri karo";
        connectionStatus.classList.remove("online");
        connectionStatus.classList.add("offline");
    }
}


/* =====================================================
   CHECK SERVER
   ===================================================== */

async function checkServer() {
    try {
        const response = await fetch(API.health, {
            method: "GET",
            cache: "no-store"
        });

        if (!response.ok) {
            throw new Error("Server caafimaadkiisa lama xaqiijin karo");
        }

        updateConnectionStatus(true);
        return true;

    } catch (error) {
        console.error("Health Check Error:", error);
        updateConnectionStatus(false);
        return false;
    }
}


/* =====================================================
   CREATE MESSAGE
   ===================================================== */

function addMessage(text, sender = "assistant") {

    if (!chatMessages) {
        console.error("Chat container lama helin.");
        return null;
    }

    const messageWrapper = document.createElement("div");

    messageWrapper.className =
        sender === "user"
            ? "message user-message"
            : "message assistant-message";

    const messageContent = document.createElement("div");

    messageContent.className = "message-content";

    messageContent.textContent = text;

    messageWrapper.appendChild(messageContent);

    chatMessages.appendChild(messageWrapper);

    scrollToBottom();

    return messageWrapper;
}


/* =====================================================
   ADD LOADING MESSAGE
   ===================================================== */

function addLoadingMessage() {

    if (!chatMessages) return null;

    const wrapper = document.createElement("div");

    wrapper.className = "message assistant-message loading-message";

    wrapper.innerHTML = `
        <div class="message-content">
            <span class="typing-text">
                AI Chat Somali ayaa ka fikiraya...
            </span>
            <span class="typing-dots">
                <span>.</span>
                <span>.</span>
                <span>.</span>
            </span>
        </div>
    `;

    chatMessages.appendChild(wrapper);

    scrollToBottom();

    return wrapper;
}


/* =====================================================
   REMOVE LOADING
   ===================================================== */

function removeLoadingMessage(element) {
    if (element && element.parentNode) {
        element.remove();
    }
}


/* =====================================================
   SCROLL
   ===================================================== */

function scrollToBottom() {
    if (!chatMessages) return;

    setTimeout(() => {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }, 50);
}


/* =====================================================
   BUTTON STATE
   ===================================================== */

function setSendingState(sending) {

    isSending = sending;

    if (!sendButton) return;

    sendButton.disabled = sending;

    if (sending) {
        sendButton.dataset.originalText =
            sendButton.textContent;

        sendButton.textContent = "Sug...";
    } else {

        if (sendButton.dataset.originalText) {
            sendButton.textContent =
                sendButton.dataset.originalText;
        } else {
            sendButton.textContent = "Dir";
        }
    }
}


/* =====================================================
   EXTRACT AI RESPONSE
   ===================================================== */

function getAIResponse(data) {

    if (!data) return null;

    // Qaabab kala duwan oo server.js soo celin karo

    if (typeof data === "string") {
        return data;
    }

    if (data.reply) {
        return data.reply;
    }

    if (data.response) {
        return data.response;
    }

    if (data.message) {
        return data.message;
    }

    if (data.answer) {
        return data.answer;
    }

    if (data.text) {
        return data.text;
    }

    if (
        data.choices &&
        data.choices[0] &&
        data.choices[0].message &&
        data.choices[0].message.content
    ) {
        return data.choices[0].message.content;
    }

    return null;
}


/* =====================================================
   SEND CHAT MESSAGE
   ===================================================== */

async function sendMessage() {

    if (isSending) return;

    if (!messageInput) {
        console.error("Message input lama helin.");
        return;
    }

    const message = messageInput.value.trim();

    if (!message) return;

    // User message
    addMessage(message, "user");

    // Input nadiifi
    messageInput.value = "";

    // Disable send
    setSendingState(true);

    // Loading
    const loadingMessage = addLoadingMessage();

    try {

        console.log("Sending message:", message);

        const response = await fetch(API.chat, {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                message: message
            })
        });


        /* ==========================================
           READ RESPONSE
           ========================================== */

        let data;

        const contentType =
            response.headers.get("content-type") || "";

        if (contentType.includes("application/json")) {
            data = await response.json();
        } else {
            const text = await response.text();

            data = {
                response: text
            };
        }


        console.log("Server Response:", data);


        /* ==========================================
           CHECK ERROR
           ========================================== */

        if (!response.ok) {

            const errorMessage =
                data?.error ||
                data?.message ||
                `Server error: ${response.status}`;

            throw new Error(errorMessage);
        }


        /* ==========================================
           GET AI ANSWER
           ========================================== */

        const aiResponse = getAIResponse(data);

        if (!aiResponse) {
            throw new Error(
                "AI jawaab sax ah lama helin. Hubi server.js endpoint-ka /chat."
            );
        }


        /* ==========================================
           REMOVE LOADING
           ========================================== */

        removeLoadingMessage(loadingMessage);


        /* ==========================================
           SHOW AI MESSAGE
           ========================================== */

        addMessage(aiResponse, "assistant");

        updateConnectionStatus(true);


        /* ==========================================
           SAVE LOCAL CHAT
           ========================================== */

        saveChatLocally();

    } catch (error) {

        console.error("CHAT ERROR:", error);

        removeLoadingMessage(loadingMessage);

        updateConnectionStatus(false);

        addMessage(
            "⚠️ Waan ka xumahay, jawaabta AI lama helin. " +
            "Hubi server.js, API Key-ga iyo internet-ka. " +
            "Error: " + error.message,
            "assistant"
        );

    } finally {

        setSendingState(false);

        if (messageInput) {
            messageInput.focus();
        }
    }
}


/* =====================================================
   SAVE CHAT LOCAL STORAGE
   ===================================================== */

function saveChatLocally() {

    if (!chatMessages) return;

    const messages = [];

    chatMessages
        .querySelectorAll(".message")
        .forEach((message) => {

            const content =
                message.querySelector(".message-content");

            if (!content) return;

            if (message.classList.contains("loading-message")) {
                return;
            }

            messages.push({
                role:
                    message.classList.contains("user-message")
                        ? "user"
                        : "assistant",

                content: content.textContent.trim()
            });
        });

    localStorage.setItem(
        "aiChatSomaliMessages",
        JSON.stringify(messages)
    );
}


/* =====================================================
   LOAD LOCAL CHAT
   ===================================================== */

function loadLocalChat() {

    if (!chatMessages) return;

    try {

        const saved =
            localStorage.getItem("aiChatSomaliMessages");

        if (!saved) return;

        const messages =
            JSON.parse(saved);

        if (!Array.isArray(messages)) return;

        // Haddii container hore wax ugu jiraan
        if (chatMessages.children.length > 0) return;

        messages.forEach((message) => {

            addMessage(
                message.content,
                message.role === "user"
                    ? "user"
                    : "assistant"
            );

        });

    } catch (error) {

        console.error(
            "Local chat loading error:",
            error
        );

    }
}


/* =====================================================
   LOAD SERVER CHAT HISTORY
   ===================================================== */

async function loadChatHistory() {

    try {

        const response =
            await fetch(API.chats, {
                method: "GET"
            });

        if (!response.ok) {
            return;
        }

        const data =
            await response.json();

        console.log(
            "Chat History:",
            data
        );

        // Haddii server-ku chats array soo celiyo
        const chats =
            data.chats ||
            data.messages ||
            data;

        if (!Array.isArray(chats)) {
            return;
        }

    } catch (error) {

        console.warn(
            "Server chat history lama helin:",
            error.message
        );

    }
}


/* =====================================================
   NEW CHAT
   ===================================================== */

function newChat() {

    if (chatMessages) {
        chatMessages.innerHTML = "";
    }

    localStorage.removeItem(
        "aiChatSomaliMessages"
    );

    addMessage(
        "Salaan! 👋 Waxaan ahay AI Chat Somali. Sideen kuu caawin karaa maanta?",
        "assistant"
    );

    if (messageInput) {
        messageInput.focus();
    }
}


/* =====================================================
   CLEAR CHAT
   ===================================================== */

async function clearChat() {

    const confirmed =
        confirm(
            "Ma hubtaa inaad tirtirayso dhammaan chat-ka?"
        );

    if (!confirmed) return;


    /* Local */
    localStorage.removeItem(
        "aiChatSomaliMessages"
    );


    /* Server */

    try {

        await fetch(API.chats, {
            method: "DELETE"
        });

    } catch (error) {

        console.warn(
            "Server chat delete error:",
            error.message
        );

    }


    /* UI */

    if (chatMessages) {
        chatMessages.innerHTML = "";
    }


    addMessage(
        "Chat-ka waa la tirtiray. 🗑️",
        "assistant"
    );
}


/* =====================================================
   ENTER KEY
   ===================================================== */

function handleKeyboard(event) {

    // Enter = Send
    // Shift + Enter = New line

    if (
        event.key === "Enter" &&
        !event.shiftKey
    ) {

        event.preventDefault();

        sendMessage();
    }
}


/* =====================================================
   EVENT LISTENERS
   ===================================================== */

if (sendButton) {

    sendButton.addEventListener(
        "click",
        function (event) {

            event.preventDefault();

            sendMessage();

        }
    );

}


if (messageInput) {

    messageInput.addEventListener(
        "keydown",
        handleKeyboard
    );

}


if (newChatButton) {

    newChatButton.addEventListener(
        "click",
        function (event) {

            event.preventDefault();

            newChat();

        }
    );

}


if (clearChatButton) {

    clearChatButton.addEventListener(
        "click",
        function (event) {

            event.preventDefault();

            clearChat();

        }
    );

}


/* =====================================================
   START APPLICATION
   ===================================================== */

document.addEventListener(
    "DOMContentLoaded",
    async function () {

        console.log(
            "AI Chat Somali App Started"
        );

        // Check server
        const online =
            await checkServer();

        // Load local history
        loadLocalChat();

        // Try server history
        loadChatHistory();


        // Welcome message
        if (
            chatMessages &&
            chatMessages.children.length === 0
        ) {

            if (online) {

                addMessage(
                    "Salaan! 👋 Ku soo dhowow AI Chat Somali. Sideen kuu caawin karaa?",
                    "assistant"
                );

            } else {

                addMessage(
                    "⚠️ Server-ka lama xiriiri karo hadda. Fadlan hubi server.js.",
                    "assistant"
                );

            }
        }

    }
);


/* =====================================================
   CHECK CONNECTION EVERY 30 SECONDS
   ===================================================== */

setInterval(
    checkServer,
    30000
);
