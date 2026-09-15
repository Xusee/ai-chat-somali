/* =========================================
   NASIIB BUSINESS CENTER
   AI CHAT - APP.JS
========================================= */

const API_URL = "/chat";

const MAX_IMAGE_SIZE =
    5 * 1024 * 1024;


/* =========================================
   HTML ELEMENTS
========================================= */

const messageInput =
    document.getElementById(
        "messageInput"
    );

const sendButton =
    document.getElementById(
        "sendBtn"
    );

const imageInput =
    document.getElementById(
        "imageInput"
    );

const imageBtn =
    document.getElementById(
        "imageBtn"
    );

const imagePreview =
    document.getElementById(
        "imagePreview"
    );

const imagePreviewContainer =
    document.getElementById(
        "imagePreviewContainer"
    );

const chatContainer =
    document.getElementById(
        "chatMessages"
    );

const clearChatsButton =
    document.getElementById(
        "deleteHistoryBtn"
    );

const newChatButton =
    document.getElementById(
        "newChatBtn"
    );

const chatHistory =
    document.getElementById(
        "chatHistory"
    );

const welcomeMessage =
    document.getElementById(
        "welcomeMessage"
    );

const serverStatus =
    document.getElementById(
        "serverStatus"
    );


/* =========================================
   VARIABLES
========================================= */

let selectedImage = null;

let isSending = false;


/* =========================================
   AUTH TOKEN
========================================= */

function getToken() {

    return (
        localStorage.getItem(
            "token"
        ) ||
        localStorage.getItem(
            "userToken"
        )
    );
}


/* =========================================
   AUTH HEADERS
========================================= */

function getAuthHeaders() {

    const token =
        getToken();


    if (!token) {

        return {};

    }


    return {

        Authorization:
            "Bearer " + token

    };
}


/* =========================================
   IMAGE BUTTON
========================================= */

if (
    imageBtn &&
    imageInput
) {

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
        async function(event) {

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

                showError(
                    "Fadlan dooro sawir sax ah."
                );

                imageInput.value =
                    "";

                return;
            }


            if (
                file.size >
                MAX_IMAGE_SIZE
            ) {

                showError(
                    "Sawirku waa inuu ka yar yahay 5MB."
                );

                imageInput.value =
                    "";

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


            } catch(error) {

                console.error(
                    "IMAGE ERROR:",
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
   IMAGE → BASE64
========================================= */

function convertImageToBase64(file) {

    return new Promise(
        function(resolve, reject) {

            const reader =
                new FileReader();


            reader.onload =
                function() {

                    resolve(
                        reader.result
                    );

                };


            reader.onerror =
                function() {

                    reject(
                        new Error(
                            "Image read error"
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
   IMAGE PREVIEW
========================================= */

function showImagePreview(
    image
) {

    if (
        !imagePreview ||
        !imagePreviewContainer
    ) {

        return;

    }


    imagePreview.src =
        image;


    imagePreviewContainer.style.display =
        "block";

}


/* =========================================
   REMOVE IMAGE
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


    if (
        imagePreviewContainer
    ) {

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
        ?
        messageInput.value.trim()
        :
        "";


    if (
        !message &&
        !selectedImage
    ) {

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


    if (welcomeMessage) {

        welcomeMessage.style.display =
            "none";

    }


    addUserMessage(
        message,
        currentImage
    );


    if (messageInput) {

        messageInput.value =
            "";

        messageInput.style.height =
            "auto";

    }


    removeSelectedImage();


    const typingId =
        showTyping();


    let timeout = null;


    try {

        const controller =
            new AbortController();


        timeout =
            setTimeout(
                function() {

                    controller.abort();

                },
                30000
            );


        /*
         * USER ID
         *
         * server.js wuxuu aqbalayaa
         * userId optional ahaan.
         */

        let userId =
            null;


        const savedUser =
            localStorage.getItem(
                "user"
            );


        if (savedUser) {

            try {

                const user =
                    JSON.parse(
                        savedUser
                    );

                userId =
                    user.id ||
                    null;

            } catch {

                userId =
                    null;

            }

        }


        const response =
            await fetch(
                API_URL,
                {
                    method:
                        "POST",

                    headers: {

                        "Content-Type":
                            "application/json",

                        ...getAuthHeaders()

                    },

                    body:
                        JSON.stringify({

                            message:
                                message,

                            image:
                                currentImage,

                            userId:
                                userId

                        }),

                    signal:
                        controller.signal

                }
            );


        clearTimeout(
            timeout
        );


        const data =
            await response.json();


        removeTyping(
            typingId
        );


        if (!response.ok) {

            throw new Error(
                data.error ||
                "Server-ka ayaa khalad soo celiyay."
            );

        }


        /*
         * MUHIIM:
         *
         * server.js:
         *
         * response.json({
         *     response: aiResponse
         * });
         */

        const answer =
            data.response;


        if (
            !answer ||
            typeof answer !==
                "string" ||
            !answer.trim()
        ) {

            addAIMessage(
                "Waan ka xumahay, AI-gu jawaab ma soo celin."
            );

        } else {

            addAIMessage(
                answer.trim()
            );

        }


        /*
         * HISTORY
         */

        loadChats();


    } catch(error) {

        removeTyping(
            typingId
        );


        console.error(
            "CHAT ERROR:",
            error
        );


        if (
            error.name ===
            "AbortError"
        ) {

            addErrorMessage(
                "⏳ AI-gu 30 ilbiriqsi gudahood kama jawaabin. Fadlan mar kale isku day."
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

        if (timeout) {

            clearTimeout(
                timeout
            );

        }


        isSending =
            false;


        updateSendButton(
            false
        );

    }

}


/* =========================================
   USER MESSAGE
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
            "Sawirka user-ka";


        content.appendChild(
            img
        );

    }


    if (message) {

        const text =
            document.createElement(
                "div"
            );


        text.textContent =
            message;


        text.style.marginTop =
            image
            ?
            "10px"
            :
            "0";


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
   AI MESSAGE
========================================= */

function addAIMessage(
    message
) {

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
   ERROR MESSAGE
========================================= */

function addErrorMessage(
    message
) {

    if (!chatContainer) {

        alert(message);

        return;

    }


    const wrapper =
        document.createElement(
            "div"
        );


    wrapper.className =
        "message assistant error";


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

function showError(
    message
) {

    addErrorMessage(
        "❌ " + message
    );

}


/* =========================================
   TYPING
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
            🤖 Waan kaaga jawaabaynaa...
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

function removeTyping(
    id
) {

    if (!id) {

        return;

    }


    const element =
        document.getElementById(
            id
        );


    if (element) {

        element.remove();

    }

}


/* =========================================
   SEND BUTTON
========================================= */

function updateSendButton(
    loading
) {

    if (!sendButton) {

        return;

    }


    sendButton.disabled =
        loading;


    sendButton.textContent =
        loading
        ?
        "⏳"
        :
        "➤";

}


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
        function(event) {

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
   TEXTAREA AUTO RESIZE
========================================= */

if (messageInput) {

    messageInput.addEventListener(
        "input",
        function() {

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

    const token =
        getToken();


    /*
     * server.js wuxuu leeyahay:
     *
     * authenticateToken
     *
     * Sidaas darteed haddii user
     * uusan login ahayn,
     * request lama dirayo.
     */

    if (!token) {

        if (chatHistory) {

            chatHistory.innerHTML =
                "";

        }

        return;

    }


    try {

        const response =
            await fetch(
                "/api/chats",
                {
                    headers:
                        getAuthHeaders()
                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            console.warn(
                "HISTORY ERROR:",
                data.error
            );

            return;

        }


        if (
            !Array.isArray(
                data.chats
            )
        ) {

            return;

        }


        updateHistorySidebar(
            data.chats
        );


    } catch(error) {

        console.warn(
            "History Error:",
            error.message
        );

    }

}


/* =========================================
   UPDATE HISTORY
========================================= */

function updateHistorySidebar(
    chats
) {

    if (!chatHistory) {

        return;

    }


    chatHistory.innerHTML =
        "";


    chats
        .slice(0, 30)
        .forEach(
            function(chat) {

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
        function() {

            if (chatContainer) {

                chatContainer.innerHTML =
                    "";

            }


            if (
                welcomeMessage &&
                chatContainer
            ) {

                chatContainer.appendChild(
                    welcomeMessage
                );


                welcomeMessage.style.display =
                    "block";

            }


            if (messageInput) {

                messageInput.value =
                    "";

                messageInput.style.height =
                    "auto";

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
        async function() {

            const token =
                getToken();


            if (!token) {

                alert(
                    "Fadlan marka hore login samee si aad u tirtirto Chat History."
                );

                return;

            }


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
                                "DELETE",

                            headers:
                                getAuthHeaders()
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


                if (
                    welcomeMessage &&
                    chatContainer
                ) {

                    chatContainer.appendChild(
                        welcomeMessage
                    );


                    welcomeMessage.style.display =
                        "block";

                }


                alert(
                    data.message ||
                    "Chat history waa la tirtiray."
                );


            } catch(error) {

                console.error(
                    "DELETE HISTORY ERROR:",
                    error
                );


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


        if (response.ok) {

            if (
                data.ai ===
                "ready"
            ) {

                serverStatus.textContent =
                    "🟢 Server + AI waa diyaar";

            } else {

                serverStatus.textContent =
                    "🟡 Server waa online, laakiin AI API lama dejin";

            }

        } else {

            serverStatus.textContent =
                "🔴 Server-ka cilad ayaa jirta";

        }


    } catch(error) {

        console.error(
            "HEALTH ERROR:",
            error
        );


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
   START
========================================= */

document.addEventListener(
    "DOMContentLoaded",
    function() {

        checkServerHealth();

        loadChats();
        /* =========================================
   REGISTER
========================================= */

const registerForm =
    document.getElementById("registerForm");

if (registerForm) {

    registerForm.addEventListener(
        "submit",
        async function(event) {

            event.preventDefault();

            const name =
                document
                .getElementById("name")
                .value
                .trim();

            const email =
                document
                .getElementById("email")
                .value
                .trim();

            const password =
                document
                .getElementById("password")
                .value;

            const confirmPassword =
                document
                .getElementById("confirmPassword")
                .value;


            if (!name || !email || !password) {

                alert(
                    "❌ Fadlan buuxi dhammaan xogta."
                );

                return;
            }


            if (password !== confirmPassword) {

                alert(
                    "❌ Labada password isma waafaqayaan."
                );

                return;
            }


            if (password.length < 6) {

                alert(
                    "❌ Password-ku waa inuu ahaadaa ugu yaraan 6 xaraf."
                );

                return;
            }


            try {

                const response =
                    await fetch(
                        "/api/register",
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify({
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
                        "❌ " +
                        (
                            data.error ||
                            "Akoonka lama samayn."
                        )
                    );

                    return;
                }


                if (data.token) {

                    localStorage.setItem(
                        "token",
                        data.token
                    );

                    localStorage.setItem(
                        "user",
                        JSON.stringify(
                            data.user
                        )
                    );

                }


                alert(
                    "✅ Akoonka si guul leh ayaa loo sameeyay."
                );


                window.location.href =
                    "/";


            } catch(error) {

                console.error(
                    "REGISTER ERROR:",
                    error
                );

                alert(
                    "❌ Server-ka lama xiriirin karin."
                );

            }

        }
    );

}


/* =========================================
   LOGIN
========================================= */

const loginForm =
    document.getElementById("loginForm");

if (loginForm) {

    loginForm.addEventListener(
        "submit",
        async function(event) {

            event.preventDefault();


            const email =
                document
                .getElementById("loginEmail")
                .value
                .trim();

            const password =
                document
                .getElementById("loginPassword")
                .value;


            if (!email || !password) {

                alert(
                    "❌ Fadlan geli email iyo password."
                );

                return;
            }


            try {

                const response =
                    await fetch(
                        "/api/login",
                        {
                            method: "POST",

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
                        "❌ " +
                        (
                            data.error ||
                            "Login failed."
                        )
                    );

                    return;
                }


                if (!data.token) {

                    alert(
                        "❌ Token lama helin."
                    );

                    return;
                }


                localStorage.setItem(
                    "token",
                    data.token
                );


                localStorage.setItem(
                    "user",
                    JSON.stringify(
                        data.user
                    )
                );


                alert(
                    "✅ Si guul leh ayaad u gashay."
                );


                window.location.href =
                    "/";

            } catch(error) {

                console.error(
                    "LOGIN ERROR:",
                    error
                );


                alert(
                    "❌ Server-ka lama xiriirin karin."
                );

            }

        }
    );

}

    }
);
