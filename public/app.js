/* =========================================
   AI CHAT SOMALI - APP.JS
========================================= */

const API_URL = "/chat";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;


/* =========================================
   GET HTML ELEMENTS
========================================= */

const messageInput =
    document.getElementById("messageInput");

const sendButton =
    document.getElementById("sendBtn");

const imageInput =
    document.getElementById("imageInput");

const imageBtn =
    document.getElementById("imageBtn");

const imagePreview =
    document.getElementById("imagePreview");

const imagePreviewContainer =
    document.getElementById("imagePreviewContainer");

const chatContainer =
    document.getElementById("chatMessages");

const clearChatsButton =
    document.getElementById("deleteHistoryBtn");

const newChatButton =
    document.getElementById("newChatBtn");

const chatHistory =
    document.getElementById("chatHistory");

const welcomeMessage =
    document.getElementById("welcomeMessage");

const serverStatus =
    document.getElementById("serverStatus");


/* =========================================
   VARIABLES
========================================= */

let selectedImage = null;

let isSending = false;


/* =========================================
   IMAGE BUTTON
========================================= */

if (imageBtn && imageInput) {

    imageBtn.addEventListener(
        "click",
        function () {

            imageInput.click();

        }
    );

}


/* =========================================
   IMAGE UPLOAD
========================================= */

if (imageInput) {

    imageInput.addEventListener(
        "change",

        async function (event) {

            const file =
                event.target.files[0];


            if (!file) {

                return;

            }


            /* CHECK FILE TYPE */

            if (!file.type.startsWith("image/")) {

                showError(
                    "Fadlan dooro sawir sax ah."
                );

                imageInput.value = "";

                return;

            }


            /* CHECK FILE SIZE */

            if (file.size > MAX_IMAGE_SIZE) {

                showError(
                    "Sawirka aad ayuu u weyn yahay. Ugu badnaan waa 5MB."
                );

                imageInput.value = "";

                return;

            }


            try {

                selectedImage =
                    await convertImageToBase64(
                        file
                    );


                showImagePreview(
                    selectedImage
                );


            } catch (error) {

                console.error(
                    "Image Error:",
                    error
                );


                showError(
                    "Sawirka lama akhrin karin."
                );

            }

        }

    );

}


/* =========================================
   CONVERT IMAGE TO BASE64
========================================= */

function convertImageToBase64(file) {

    return new Promise(
        function (resolve, reject) {

            const reader =
                new FileReader();


            reader.onload =
                function () {

                    resolve(
                        reader.result
                    );

                };


            reader.onerror =
                function () {

                    reject(
                        new Error(
                            "Sawirka lama akhrin karin."
                        )
                    );

                };


            reader.readAsDataURL(
                file
            );

        }

    );

}


/* =========================================
   SHOW IMAGE PREVIEW
========================================= */

function showImagePreview(image) {

    if (!imagePreview ||
        !imagePreviewContainer) {

        return;

    }


    imagePreview.src =
        image;


    imagePreviewContainer.style.display =
        "block";

}


/* =========================================
   REMOVE SELECTED IMAGE
========================================= */

function removeSelectedImage() {

    selectedImage =
        null;


    if (imageInput) {

        imageInput.value =
            "";

    }


    if (imagePreview) {

        imagePreview.src =
            "";

    }


    if (imagePreviewContainer) {

        imagePreviewContainer.style.display =
            "none";

    }

}


/* =========================================
   SEND MESSAGE
========================================= */

async function sendMessage() {

    if (isSending) {

        return;

    }


    const message =
        messageInput
            ? messageInput.value.trim()
            : "";


    /* EMPTY CHECK */

    if (!message &&
        !selectedImage) {

        showError(
            "Fadlan qor su'aal ama dooro sawir."
        );

        return;

    }


    isSending =
        true;


    updateSendButton(
        true
    );


    const currentImage =
        selectedImage;


    /* HIDE WELCOME */

    if (welcomeMessage) {

        welcomeMessage.style.display =
            "none";

    }


    /* SHOW USER MESSAGE */

    addUserMessage(
        message,
        currentImage
    );


    /* CLEAR INPUT */

    if (messageInput) {

        messageInput.value =
            "";

    }


    removeSelectedImage();


    /* SHOW TYPING */

    const typingId =
        showTyping();


    let timeout;


    try {

        const controller =
            new AbortController();


        timeout =
            setTimeout(
                function () {

                    controller.abort();

                },

                30000
            );


        /* SEND REQUEST */

        const response =
            await fetch(
                API_URL,

                {
                    method:
                        "POST",

                    headers:
                        {
                            "Content-Type":
                                "application/json"
                        },

                    body:
                        JSON.stringify(
                            {
                                message:
                                    message,

                                image:
                                    currentImage
                            }
                        ),

                    signal:
                        controller.signal
                }
            );


        clearTimeout(
            timeout
        );


        let data;


        try {

            data =
                await response.json();

        } catch {

            throw new Error(
                "Server-ku jawaab JSON sax ah ma soo celin."
            );

        }


        removeTyping(
            typingId
        );


        if (!response.ok) {

            throw new Error(
                data.error ||
                "Server-ka ayaa khalad soo celiyay."
            );

        }


        const answer =
            data.answer;


        /* EMPTY AI RESPONSE */

        if (!answer ||
            typeof answer !== "string" ||
            answer.trim().length === 0) {

            addAIMessage(
                "Waan ka xumahay, AI-gu jawaab madhan ayuu soo celiyay. Fadlan isku day mar kale."
            );

        } else {

            addAIMessage(
                answer.trim()
            );

        }


        /* UPDATE HISTORY */

        loadChats();


    } catch (error) {

        removeTyping(
            typingId
        );


        console.error(
            "Chat Error:",
            error
        );


        if (
            error.name ===
            "AbortError"
        ) {

            addErrorMessage(
                "⏳ AI-gu kama jawaabin 30 ilbiriqsi gudahood. Fadlan isku day mar kale."
            );

        } else {

            addErrorMessage(
                "❌ " +
                (
                    error.message ||
                    "Wax khalad ah ayaa dhacay."
                )
            );

        }

    } finally {

        clearTimeout(
            timeout
        );


        isSending =
            false;


        updateSendButton(
            false
        );

    }

}


/* =========================================
   ADD USER MESSAGE
========================================= */

function addUserMessage(
    message,
    image
) {

    if (!chatContainer) {

        return;

    }


    const wrapper =
        document.createElement(
            "div"
        );


    wrapper.className =
        "message user";


    const content =
        document.createElement(
            "div"
        );


    content.className =
        "message-content";


    /* IMAGE */

    if (image) {

        const img =
            document.createElement(
                "img"
            );


        img.src =
            image;


        img.className =
            "chat-image";


        img.alt =
            "Sawirka isticmaalaha";


        content.appendChild(
            img
        );

    }


    /* TEXT */

    if (message) {

        const text =
            document.createElement(
                "div"
            );


        text.style.marginTop =
            image
                ? "10px"
                : "0";


        text.textContent =
            message;


        content.appendChild(
            text
        );

    }


    wrapper.appendChild(
        content
    );


    chatContainer.appendChild(
        wrapper
    );


    scrollToBottom();

}


/* =========================================
   ADD AI MESSAGE
========================================= */

function addAIMessage(message) {

    if (!chatContainer) {

        return;

    }


    const wrapper =
        document.createElement(
            "div"
        );


    wrapper.className =
        "message assistant";


    const content =
        document.createElement(
            "div"
        );


    content.className =
        "message-content";


    content.textContent =
        message;


    wrapper.appendChild(
        content
    );


    chatContainer.appendChild(
        wrapper
    );


    scrollToBottom();

}


/* =========================================
   ADD ERROR MESSAGE
========================================= */

function addErrorMessage(message) {

    if (!chatContainer) {

        alert(message);

        return;

    }


    const wrapper =
        document.createElement(
            "div"
        );


    wrapper.className =
        "message assistant";


    const content =
        document.createElement(
            "div"
        );


    content.className =
        "message-content";


    content.textContent =
        message;


    wrapper.appendChild(
        content
    );


    chatContainer.appendChild(
        wrapper
    );


    scrollToBottom();

}


/* =========================================
   SHOW ERROR
========================================= */

function showError(message) {

    addErrorMessage(
        "❌ " + message
    );

}


/* =========================================
   SHOW TYPING
========================================= */

function showTyping() {

    if (!chatContainer) {

        return null;

    }


    const id =
        "typing-" +
        Date.now();


    const wrapper =
        document.createElement(
            "div"
        );


    wrapper.id =
        id;


    wrapper.className =
        "message assistant loading";


    wrapper.innerHTML =
        `
        <div class="message-content">
            🤖 AI Chat Somali ayaa qoraya...
        </div>
        `;


    chatContainer.appendChild(
        wrapper
    );


    scrollToBottom();


    return id;

}


/* =========================================
   REMOVE TYPING
========================================= */

function removeTyping(id) {

    if (!id) {

        return;

    }


    const typing =
        document.getElementById(
            id
        );


    if (typing) {

        typing.remove();

    }

}


/* =========================================
   UPDATE SEND BUTTON
========================================= */

function updateSendButton(loading) {

    if (!sendButton) {

        return;

    }


    sendButton.disabled =
        loading;


    sendButton.textContent =
        loading
            ? "⏳"
            : "➤";

}


/* =========================================
   SEND BUTTON
========================================= */

if (sendButton) {

    sendButton.addEventListener(
        "click",
        sendMessage
    );

}


/* =========================================
   ENTER TO SEND
========================================= */

if (messageInput) {

    messageInput.addEventListener(

        "keydown",

        function (event) {

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


/* =========================================
   AUTO RESIZE TEXTAREA
========================================= */

if (messageInput) {

    messageInput.addEventListener(
        "input",

        function () {

            this.style.height =
                "auto";


            this.style.height =
                Math.min(
                    this.scrollHeight,
                    180
                ) + "px";

        }

    );

}


/* =========================================
   LOAD CHAT HISTORY
========================================= */

async function loadChats() {

    try {

        const response =
            await fetch(
                "/api/chats"
            );


        const data =
            await response.json();


        if (
            !response.ok ||
            !data.success ||
            !Array.isArray(
                data.chats
            )
        ) {

            return;

        }


        updateHistorySidebar(
            data.chats
        );


    } catch (error) {

        console.warn(
            "History Error:",
            error.message
        );

    }

}


/* =========================================
   UPDATE HISTORY SIDEBAR
========================================= */

function updateHistorySidebar(chats) {

    if (!chatHistory) {

        return;

    }


    chatHistory.innerHTML =
        "";


    chats
        .slice(0, 30)
        .forEach(
            function (chat) {

                const item =
                    document.createElement(
                        "div"
                    );


                item.className =
                    "history-item";


                item.textContent =
                    chat.message ||
                    "📷 Sawir";


                chatHistory.appendChild(
                    item
                );

            }
        );

}


/* =========================================
   NEW CHAT
========================================= */

if (newChatButton) {

    newChatButton.addEventListener(

        "click",

        function () {

            if (chatContainer) {

                chatContainer.innerHTML =
                    "";

            }


            if (welcomeMessage) {

                chatContainer.appendChild(
                    welcomeMessage
                );


                welcomeMessage.style.display =
                    "block";

            }


            if (messageInput) {

                messageInput.value =
                    "";


                messageInput.focus();

            }


            removeSelectedImage();

        }

    );

}


/* =========================================
   DELETE CHAT HISTORY
========================================= */

if (clearChatsButton) {

    clearChatsButton.addEventListener(

        "click",

        async function () {

            const confirmed =
                confirm(
                    "Ma hubtaa inaad tirtirayso dhammaan chat-yada?"
                );


            if (!confirmed) {

                return;

            }


            try {

                const response =
                    await fetch(

                        "/api/chats",

                        {
                            method:
                                "DELETE"
                        }

                    );


                const data =
                    await response.json();


                if (!response.ok) {

                    throw new Error(
                        data.error ||
                        "Chat history lama tirtiri karin."
                    );

                }


                if (chatHistory) {

                    chatHistory.innerHTML =
                        "";

                }


                if (chatContainer) {

                    chatContainer.innerHTML =
                        "";

                }


                if (welcomeMessage) {

                    chatContainer.appendChild(
                        welcomeMessage
                    );


                    welcomeMessage.style.display =
                        "block";

                }


            } catch (error) {

                addErrorMessage(
                    "❌ " +
                    error.message
                );

            }

        }

    );

}


/* =========================================
   SERVER HEALTH
========================================= */

async function checkServerHealth() {

    if (!serverStatus) {

        return;

    }


    try {

        const response =
            await fetch(
                "/api/health"
            );


        const data =
            await response.json();


        if (
            response.ok &&
            data.success !== false
        ) {

            serverStatus.textContent =
                "🟢 Server-ka waa shaqaynayaa";

        } else {

            serverStatus.textContent =
                "🔴 Server-ka cilad ayaa jirta";

        }

    } catch {

        serverStatus.textContent =
            "🔴 Server-ka lama heli karo";

    }

}


/* =========================================
   SCROLL
========================================= */

function scrollToBottom() {

    if (!chatContainer) {

        return;

    }


    chatContainer.scrollTo(

        {
            top:
                chatContainer.scrollHeight,

            behavior:
                "smooth"
        }

    );

}


/* =========================================
   START APP
========================================= */

document.addEventListener(

    "DOMContentLoaded",

    function () {

        checkServerHealth();

        loadChats();

    }

);
