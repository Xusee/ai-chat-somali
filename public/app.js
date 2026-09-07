document.addEventListener("DOMContentLoaded", () => {

    // =========================================
    // ELEMENTS
    // =========================================

    const chatMessages = document.getElementById("chatMessages");
    const messageInput = document.getElementById("messageInput");
    const sendBtn = document.getElementById("sendBtn");

    const newChatBtn = document.getElementById("newChatBtn");
    const deleteChatsBtn = document.getElementById("deleteChatsBtn");

    const chatHistory = document.getElementById("chatHistory");


    // Hubi in elements-ka muhiimka ahi jiraan
    if (!chatMessages || !messageInput || !sendBtn) {
        console.error("❌ Waxaa maqan chatMessages, messageInput ama sendBtn gudaha index.html");
        return;
    }


    // =========================================
    // STORAGE KEYS
    // =========================================

    const STORAGE_KEY = "ai_chat_somali_chats";
    const ACTIVE_CHAT_KEY = "ai_chat_somali_active_chat";


    // =========================================
    // VARIABLES
    // =========================================

    let chats = [];
    let activeChatId = null;
    let isSending = false;


    // =========================================
    // LOAD CHATS
    // =========================================

    function loadChats() {

        try {
            const savedChats = localStorage.getItem(STORAGE_KEY);

            if (savedChats) {
                chats = JSON.parse(savedChats);
            } else {
                chats = [];
            }

        } catch (error) {

            console.error("Chat loading error:", error);
            chats = [];
        }


        activeChatId = localStorage.getItem(ACTIVE_CHAT_KEY);


        // Haddii chat hore u jiray
        if (activeChatId) {

            const chatExists = chats.find(
                chat => chat.id === activeChatId
            );

            if (!chatExists) {
                activeChatId = null;
            }
        }


        // Haddii chats jiraan laakiin active chat aanu jirin
        if (!activeChatId && chats.length > 0) {

            activeChatId = chats[0].id;

            localStorage.setItem(
                ACTIVE_CHAT_KEY,
                activeChatId
            );
        }


        renderHistory();
        renderActiveChat();
    }


    // =========================================
    // SAVE CHATS
    // =========================================

    function saveChats() {

        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(chats)
        );

        if (activeChatId) {

            localStorage.setItem(
                ACTIVE_CHAT_KEY,
                activeChatId
            );

        } else {

            localStorage.removeItem(
                ACTIVE_CHAT_KEY
            );
        }
    }


    // =========================================
    // CREATE NEW CHAT
    // =========================================

    function createNewChat() {

        const newChat = {

            id: "chat_" + Date.now(),

            title: "Chat Cusub",

            messages: [],

            createdAt: new Date().toISOString()
        };


        chats.unshift(newChat);

        activeChatId = newChat.id;


        saveChats();

        renderHistory();

        renderActiveChat();


        messageInput.focus();
    }


    // =========================================
    // GET ACTIVE CHAT
    // =========================================

    function getActiveChat() {

        return chats.find(
            chat => chat.id === activeChatId
        );
    }


    // =========================================
    // ADD MESSAGE
    // =========================================

    function addMessage(role, content) {

        let activeChat = getActiveChat();


        // Haddii chat aanu jirin, samee
        if (!activeChat) {

            createNewChat();

            activeChat = getActiveChat();
        }


        activeChat.messages.push({

            role: role,

            content: content,

            createdAt: new Date().toISOString()
        });


        // Cinwaanka chat-ka ka dhig fariinta ugu horreysa
        if (
            role === "user" &&
            activeChat.title === "Chat Cusub"
        ) {

            let title = content.trim();


            if (title.length > 30) {

                title = title.substring(0, 30) + "...";
            }


            activeChat.title = title;
        }


        saveChats();

        renderHistory();

        renderActiveChat();
    }


    // =========================================
    // RENDER CHAT HISTORY
    // =========================================

    function renderHistory() {

        if (!chatHistory) return;


        chatHistory.innerHTML = "";


        if (chats.length === 0) {

            chatHistory.innerHTML = `
                <p class="empty-history">
                    Weli wax chat ah ma jiro
                </p>
            `;

            return;
        }


        chats.forEach(chat => {

            const item = document.createElement("button");

            item.type = "button";

            item.className = "history-item";


            if (chat.id === activeChatId) {

                item.classList.add("active");
            }


            item.textContent = chat.title;


            item.addEventListener("click", () => {

                activeChatId = chat.id;

                saveChats();

                renderHistory();

                renderActiveChat();
            });


            chatHistory.appendChild(item);
        });
    }


    // =========================================
    // RENDER ACTIVE CHAT
    // =========================================

    function renderActiveChat() {

        chatMessages.innerHTML = "";


        const activeChat = getActiveChat();


        // Haddii chat aanu jirin
        if (!activeChat) {

            chatMessages.innerHTML = `
                <div class="welcome-message">

                    <h1>Ku Soo Dhawoow AI Chat Somali</h1>

                    <p>
                        Wax kasta oo aad rabto waad i weydiin kartaa.
                        Waxaad sidoo kale dooran kartaa sawir haddii app-kaagu taageero.
                    </p>

                </div>
            `;

            return;
        }


        // Haddii chat-ku madhan yahay
        if (activeChat.messages.length === 0) {

            chatMessages.innerHTML = `
                <div class="welcome-message">

                    <h1>Ku Soo Dhawoow AI Chat Somali</h1>

                    <p>
                        Qor fariintaada hoose si aad u bilowdo.
                    </p>

                </div>
            `;

            return;
        }


        // Messages
        activeChat.messages.forEach(message => {

            const messageDiv = document.createElement("div");


            messageDiv.className =
                message.role === "user"
                    ? "message user-message"
                    : "message ai-message";


            const contentDiv = document.createElement("div");

            contentDiv.className = "message-content";


            // textContent ayaa ka ammaan badan innerHTML
            contentDiv.textContent = message.content;


            messageDiv.appendChild(contentDiv);


            chatMessages.appendChild(messageDiv);
        });


        scrollToBottom();
    }


    // =========================================
    // LOADING MESSAGE
    // =========================================

    function showLoading() {

        removeLoading();


        const loadingDiv = document.createElement("div");

        loadingDiv.id = "aiLoading";

        loadingDiv.className = "message ai-message loading-message";


        loadingDiv.innerHTML = `
            <div class="message-content">
                AI-ga ayaa ka jawaabaya...
            </div>
        `;


        chatMessages.appendChild(loadingDiv);


        scrollToBottom();
    }


    function removeLoading() {

        const loading = document.getElementById("aiLoading");

        if (loading) {
            loading.remove();
        }
    }


    // =========================================
    // SCROLL
    // =========================================

    function scrollToBottom() {

        chatMessages.scrollTop =
            chatMessages.scrollHeight;


        window.scrollTo({
            top: document.body.scrollHeight,
            behavior: "smooth"
        });
    }


    // =========================================
    // GET AI RESPONSE
    // =========================================

    async function sendMessage() {

        if (isSending) return;


        const message = messageInput.value.trim();


        if (!message) {

            messageInput.focus();

            return;
        }


        // Samee chat haddii aanu jirin
        if (!getActiveChat()) {

            createNewChat();
        }


        isSending = true;


        sendBtn.disabled = true;


        // User message
        addMessage("user", message);


        // Nadiifi textarea
        messageInput.value = "";


        // Loading
        showLoading();


        try {

            const response = await fetch("/chat", {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({

                    message: message

                })

            });


            // Isku day inaad hesho JSON
            let data;


            try {

                data = await response.json();

            } catch (error) {

                throw new Error(
                    "Server-ku jawaab sax ah ma soo celin."
                );
            }


            if (!response.ok) {

                throw new Error(
                    data.error ||
                    data.message ||
                    "Server error ayaa dhacay."
                );
            }


            removeLoading();


            // Jawaabta server-ka waxay noqon kartaa qaabab kala duwan
            const reply =
                data.reply ||
                data.response ||
                data.message ||
                data.answer ||
                data.content ||
                "Waan ka xumahay, jawaab lama helin.";


            addMessage(
                "assistant",
                reply
            );


        } catch (error) {

            console.error("Chat error:", error);


            removeLoading();


            addMessage(
                "assistant",

                "❌ Khalad ayaa dhacay: " +
                error.message
            );

        } finally {

            isSending = false;

            sendBtn.disabled = false;

            messageInput.focus();
        }
    }


    // =========================================
    // SEND BUTTON
    // =========================================

    sendBtn.addEventListener("click", sendMessage);


    // =========================================
    // ENTER TO SEND
    // =========================================

    messageInput.addEventListener("keydown", (event) => {

        // Enter = send
        // Shift + Enter = newline

        if (
            event.key === "Enter" &&
            !event.shiftKey
        ) {

            event.preventDefault();

            sendMessage();
        }
    });


    // =========================================
    // NEW CHAT BUTTON
    // =========================================

    if (newChatBtn) {

        newChatBtn.addEventListener("click", () => {

            createNewChat();
        });
    }


    // =========================================
    // DELETE ALL CHATS
    // =========================================

    if (deleteChatsBtn) {

        deleteChatsBtn.addEventListener("click", () => {

            const confirmed = confirm(
                "Ma hubtaa inaad tirtirayso dhammaan chat-yada?"
            );


            if (!confirmed) return;


            chats = [];

            activeChatId = null;


            localStorage.removeItem(
                STORAGE_KEY
            );

            localStorage.removeItem(
                ACTIVE_CHAT_KEY
            );


            renderHistory();

            renderActiveChat();
        });
    }


    // =========================================
    // OPTIONAL: IMAGE PREVIEW
    // =========================================

    const imageInput =
        document.getElementById("imageInput");

    const imagePreview =
        document.getElementById("imagePreview");

    const imagePreviewContainer =
        document.getElementById(
            "imagePreviewContainer"
        );


    if (imageInput) {

        imageInput.addEventListener(
            "change",
            () => {

                const file =
                    imageInput.files[0];


                if (!file) {

                    if (imagePreviewContainer) {

                        imagePreviewContainer.style.display =
                            "none";
                    }

                    return;
                }


                if (
                    !file.type.startsWith("image/")
                ) {

                    alert(
                        "Fadlan dooro sawir sax ah."
                    );

                    imageInput.value = "";

                    return;
                }


                const reader = new FileReader();


                reader.onload = (event) => {

                    if (imagePreview) {

                        imagePreview.src =
                            event.target.result;
                    }


                    if (imagePreviewContainer) {

                        imagePreviewContainer.style.display =
                            "block";
                    }
                };


                reader.readAsDataURL(file);
            }
        );
    }


    // =========================================
    // START APP
    // =========================================

    loadChats();

});
