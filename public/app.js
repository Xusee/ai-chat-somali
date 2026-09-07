// ========================================
// AI CHAT SOMALI - public/app.js
// ========================================

document.addEventListener("DOMContentLoaded", () => {

    // ================================
    // ELEMENTS
    // ================================

    const chatMessages = document.getElementById("chatMessages");
    const messageInput = document.getElementById("messageInput");
    const sendBtn = document.getElementById("sendBtn");

    const newChatBtn = document.getElementById("newChatBtn");
    const deleteChatsBtn = document.getElementById("deleteChatsBtn");

    const imageInput = document.getElementById("imageInput");
    const imagePreviewContainer =
        document.getElementById("imagePreviewContainer");

    const imagePreview =
        document.getElementById("imagePreview");

    const removeImageBtn =
        document.getElementById("removeImageBtn");


    // ================================
    // VARIABLES
    // ================================

    let selectedImage = null;

    let currentChat = {
        id: Date.now(),
        messages: []
    };


    // ================================
    // LOAD CHAT HISTORY
    // ================================

    function loadChatHistory() {

        try {

            const savedChats =
                JSON.parse(localStorage.getItem("aiChatSomaliChats")) || [];

            if (savedChats.length > 0) {

                currentChat =
                    savedChats[savedChats.length - 1];

                renderMessages();

            } else {

                showWelcomeMessage();

            }

        } catch (error) {

            console.error(
                "Chat history lama akhrin karin:",
                error
            );

            showWelcomeMessage();

        }

    }


    // ================================
    // WELCOME MESSAGE
    // ================================

    function showWelcomeMessage() {

        if (!chatMessages) return;

        chatMessages.innerHTML = `
            <div class="welcome-message">

                <h2>Ku Soo Dhawoow AI Chat Somali</h2>

                <p>
                    Wax kasta oo aad rabto waad i waydiin kartaa.
                    Waxaad sidoo kale dooran kartaa sawir.
                </p>

            </div>
        `;

    }


    // ================================
    // RENDER MESSAGES
    // ================================

    function renderMessages() {

        if (!chatMessages) return;

        chatMessages.innerHTML = "";

        if (
            !currentChat.messages ||
            currentChat.messages.length === 0
        ) {

            showWelcomeMessage();
            return;

        }


        currentChat.messages.forEach((message) => {

            addMessageToScreen(
                message.role,
                message.content,
                message.image,
                false
            );

        });


        scrollToBottom();

    }


    // ================================
    // ADD MESSAGE TO SCREEN
    // ================================

    function addMessageToScreen(
        role,
        content,
        image = null,
        save = true
    ) {

        if (!chatMessages) return;

        const messageDiv =
            document.createElement("div");

        messageDiv.classList.add(
            "message",
            role === "user"
                ? "user-message"
                : "ai-message"
        );


        // QORAALKA
        if (content) {

            const textDiv =
                document.createElement("div");

            textDiv.classList.add("message-text");

            textDiv.innerText = content;

            messageDiv.appendChild(textDiv);

        }


        // SAWIRKA
        if (image) {

            const img =
                document.createElement("img");

            img.src = image;

            img.classList.add("chat-image");

            img.alt = "Sawirka la soo geliyey";

            messageDiv.appendChild(img);

        }


        chatMessages.appendChild(messageDiv);


        // SAVE MESSAGE
        if (save) {

            currentChat.messages.push({

                role: role,
                content: content,
                image: image

            });

            saveChats();

        }


        scrollToBottom();

    }


    // ================================
    // SAVE CHATS
    // ================================

    function saveChats() {

        try {

            let chats =
                JSON.parse(
                    localStorage.getItem(
                        "aiChatSomaliChats"
                    )
                ) || [];


            // Ka saar chat-kii hore ee isla ID-ga ahaa
            chats =
                chats.filter(
                    chat =>
                        chat.id !== currentChat.id
                );


            // Ku dar chat-ka hadda
            chats.push(currentChat);


            localStorage.setItem(
                "aiChatSomaliChats",
                JSON.stringify(chats)
            );

        } catch (error) {

            console.error(
                "Chat lama kaydin karin:",
                error
            );

        }

    }


    // ================================
    // NEW CHAT
    // ================================

    if (newChatBtn) {

        newChatBtn.addEventListener(
            "click",
            () => {

                currentChat = {

                    id: Date.now(),

                    messages: []

                };


                selectedImage = null;


                if (messageInput) {

                    messageInput.value = "";

                }


                clearImagePreview();

                showWelcomeMessage();

                saveChats();

            }
        );

    }


    // ================================
    // DELETE ALL CHATS
    // ================================

    if (deleteChatsBtn) {

        deleteChatsBtn.addEventListener(
            "click",
            () => {

                const confirmDelete =
                    confirm(
                        "Ma hubtaa inaad tirtirayso dhammaan Chat-yada?"
                    );


                if (!confirmDelete) {

                    return;

                }


                // Tirtir localStorage
                localStorage.removeItem(
                    "aiChatSomaliChats"
                );


                // Chat cusub samee
                currentChat = {

                    id: Date.now(),

                    messages: []

                };


                selectedImage = null;


                if (messageInput) {

                    messageInput.value = "";

                }


                clearImagePreview();

                showWelcomeMessage();


                alert(
                    "Dhammaan Chat-yada waa la tirtiray."
                );

            }
        );

    }


    // ================================
    // SEND MESSAGE
    // ================================

    async function sendMessage() {

        if (!messageInput) return;


        const message =
            messageInput.value.trim();


        if (!message && !selectedImage) {

            return;

        }


        // Keydi sawirka hadda
        const imageToSend =
            selectedImage;


        // USER MESSAGE
        addMessageToScreen(

            "user",

            message,

            imageToSend,

            true

        );


        // Clear input
        messageInput.value = "";


        selectedImage = null;

        clearImagePreview();


        // Disable button
        if (sendBtn) {

            sendBtn.disabled = true;

        }


        // Loading
        const loadingDiv =
            document.createElement("div");

        loadingDiv.classList.add(
            "message",
            "ai-message",
            "loading-message"
        );

        loadingDiv.innerText =
            "AI Chat Somali ayaa ka jawaabaya...";

        chatMessages.appendChild(
            loadingDiv
        );

        scrollToBottom();


        try {

            // ================================
            // SEND TO SERVER
            // ================================

            const response =
                await fetch("/chat", {

                    method: "POST",

                    headers: {

                        "Content-Type":
                            "application/json"

                    },

                    body: JSON.stringify({

                        message: message,

                        image: imageToSend

                    })

                });


            // Remove loading
            loadingDiv.remove();


            const data =
                await response.json();


            if (!response.ok) {

                throw new Error(

                    data.error ||
                    "Server-ka ayaa khalad bixiyey."

                );

            }


            // AI RESPONSE
            addMessageToScreen(

                "assistant",

                data.reply ||
                data.message ||
                "Jawaab lama helin.",

                null,

                true

            );


        } catch (error) {

            console.error(error);


            loadingDiv.remove();


            addMessageToScreen(

                "assistant",

                "Waxaa dhacay qalad. Fadlan hubi server-ka oo mar kale isku day.",

                null,

                true

            );

        } finally {

            if (sendBtn) {

                sendBtn.disabled = false;

            }

        }

    }


    // ================================
    // SEND BUTTON
    // ================================

    if (sendBtn) {

        sendBtn.addEventListener(
            "click",
            sendMessage
        );

    }


    // ================================
    // ENTER KEY
    // ================================

    if (messageInput) {

        messageInput.addEventListener(
            "keydown",
            (event) => {

                // ENTER = SEND
                // SHIFT + ENTER = NEW LINE

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


    // ================================
    // IMAGE INPUT
    // ================================

    if (imageInput) {

        imageInput.addEventListener(
            "change",
            (event) => {

                const file =
                    event.target.files[0];


                if (!file) {

                    return;

                }


                if (
                    !file.type.startsWith(
                        "image/"
                    )
                ) {

                    alert(
                        "Fadlan dooro sawir sax ah."
                    );

                    return;

                }


                const reader =
                    new FileReader();


                reader.onload =
                    (loadEvent) => {

                        selectedImage =
                            loadEvent.target.result;


                        if (
                            imagePreview
                        ) {

                            imagePreview.src =
                                selectedImage;

                        }


                        if (
                            imagePreviewContainer
                        ) {

                            imagePreviewContainer.style.display =
                                "block";

                        }

                    };


                reader.readAsDataURL(
                    file
                );

            }
        );

    }


    // ================================
    // REMOVE IMAGE
    // ================================

    if (removeImageBtn) {

        removeImageBtn.addEventListener(
            "click",
            () => {

                selectedImage = null;

                clearImagePreview();

            }
        );

    }


    // ================================
    // CLEAR IMAGE PREVIEW
    // ================================

    function clearImagePreview() {

        if (imageInput) {

            imageInput.value = "";

        }


        if (imagePreview) {

            imagePreview.src = "";

        }


        if (
            imagePreviewContainer
        ) {

            imagePreviewContainer.style.display =
                "none";

        }

    }


    // ================================
    // SCROLL TO BOTTOM
    // ================================

    function scrollToBottom() {

        if (!chatMessages) return;

        setTimeout(() => {

            chatMessages.scrollTop =
                chatMessages.scrollHeight;

        }, 50);

    }


    // ================================
    // START APP
    // ================================

    loadChatHistory();

});
