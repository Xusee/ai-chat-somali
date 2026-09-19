/* =========================================================
   NASIIB BUSINESS CENTER
   PUBLIC APP.JS
========================================================= */

(() => {

    "use strict";

    /* =====================================================
       API
    ===================================================== */

    const API_CHAT =
        "/chat";

    const API_MATCH_IMAGE =
        "/api/match-image";

    const API_HISTORY =
        "/api/chats";

    const API_HEALTH =
        "/api/health";


    /* =====================================================
       SETTINGS
    ===================================================== */

    const MAX_IMAGE_SIZE =
        10 * 1024 * 1024;


    /* =====================================================
       CLIENT ID
       Public user - Login looma baahna
    ===================================================== */

    function getClientId() {

        let clientId =
            localStorage.getItem(
                "nasiibClientId"
            );

        if (!clientId) {

            clientId =
                "client-" +
                Date.now() +
                "-" +
                Math.random()
                    .toString(36)
                    .substring(2, 12);

            localStorage.setItem(
                "nasiibClientId",
                clientId
            );

        }

        return clientId;
    }


    const clientId =
        getClientId();


    /* =====================================================
       DOM HELPER
    ===================================================== */

    const $ = (id) =>
        document.getElementById(id);


    function firstElement(
        ids
    ) {

        for (
            const id of ids
        ) {

            const element =
                $(id);

            if (element) {
                return element;
            }

        }

        return null;
    }


    /* =====================================================
       DOM ELEMENTS
    ===================================================== */

    let messageInput =
        firstElement([
            "messageInput",
            "chatInput",
            "promptInput",
            "message",
            "userMessage",
            "textInput"
        ]);


    let sendButton =
        firstElement([
            "sendButton",
            "sendBtn",
            "sendMessage",
            "send"
        ]);


    let galleryButton =
        firstElement([
            "galleryButton",
            "galleryBtn",
            "gallery"
        ]);


    let cameraButton =
        firstElement([
            "cameraButton",
            "cameraBtn",
            "camera"
        ]);


    let galleryInput =
        firstElement([
            "galleryInput",
            "galleryFile",
            "imageInput",
            "fileInput"
        ]);


    let cameraInput =
        firstElement([
            "cameraInput",
            "cameraFile",
            "cameraFileInput"
        ]);


    let imagePreview =
        firstElement([
            "imagePreview",
            "previewImage",
            "selectedImage"
        ]);


    let imagePreviewContainer =
        firstElement([
            "imagePreviewContainer",
            "previewContainer",
            "imagePreviewBox"
        ]);


    let removeImageButton =
        firstElement([
            "removeImageButton",
            "removeImageBtn",
            "removeImage"
        ]);


    let messagesContainer =
        firstElement([
            "chatMessages",
            "messages",
            "chatArea",
            "chatContainer",
            "conversation"
        ]);


    let clearChatButton =
        firstElement([
            "clearChatButton",
            "clearChatBtn",
            "deleteChat",
            "deleteChats"
        ]);


    let statusElement =
        firstElement([
            "statusMessage",
            "chatStatus",
            "status"
        ]);


    /* =====================================================
       STATE
    ===================================================== */

    let selectedImageFile =
        null;


    let selectedImageData =
        null;


    let isSending =
        false;


    /* =====================================================
       CREATE MISSING CHAT CONTAINER
    ===================================================== */

    function ensureMessagesContainer() {

        if (messagesContainer) {
            return messagesContainer;
        }

        messagesContainer =
            document.createElement(
                "div"
            );

        messagesContainer.id =
            "chatMessages";

        messagesContainer.className =
            "chat-messages";

        document.body.appendChild(
            messagesContainer
        );

        return messagesContainer;
    }


    /* =====================================================
       CREATE MISSING PREVIEW
    ===================================================== */

    function ensurePreviewContainer() {

        if (imagePreviewContainer) {
            return imagePreviewContainer;
        }

        imagePreviewContainer =
            document.createElement(
                "div"
            );

        imagePreviewContainer.id =
            "imagePreviewContainer";

        imagePreviewContainer.className =
            "image-preview-container";

        if (messageInput) {

            messageInput
                .parentElement
                ?.appendChild(
                    imagePreviewContainer
                );

        } else {

            document.body.appendChild(
                imagePreviewContainer
            );

        }

        return imagePreviewContainer;
    }


    /* =====================================================
       CREATE HIDDEN FILE INPUT
    ===================================================== */

    function createHiddenInput(
        type
    ) {

        const input =
            document.createElement(
                "input"
            );

        input.type =
            "file";

        input.accept =
            "image/*";

        input.style.display =
            "none";


        if (type === "camera") {

            input.setAttribute(
                "capture",
                "environment"
            );

        }


        document.body.appendChild(
            input
        );


        input.addEventListener(
            "change",
            function () {

                handleImageSelected(
                    this.files?.[0]
                );

            }
        );


        return input;
    }


    /* =====================================================
       GALLERY
    ===================================================== */

    function openGallery() {

        if (!galleryInput) {

            galleryInput =
                createHiddenInput(
                    "gallery"
                );

        }

        galleryInput.value =
            "";

        galleryInput.click();
    }


    /* =====================================================
       CAMERA
    ===================================================== */

    function openCamera() {

        if (!cameraInput) {

            cameraInput =
                createHiddenInput(
                    "camera"
                );

        }

        cameraInput.value =
            "";

        cameraInput.click();
    }


    /* =====================================================
       IMAGE SELECTED
    ===================================================== */

    function handleImageSelected(
        file
    ) {

        if (!file) {
            return;
        }


        if (
            !file.type.startsWith(
                "image/"
            )
        ) {

            showStatus(
                "❌ Fadlan sawir dooro.",
                true
            );

            return;
        }


        if (
            file.size >
            MAX_IMAGE_SIZE
        ) {

            showStatus(
                "❌ Sawirku waa ka weyn yahay 10MB.",
                true
            );

            return;
        }


        selectedImageFile =
            file;


        const reader =
            new FileReader();


        reader.onload =
            function (event) {

                selectedImageData =
                    event.target.result;

                showImagePreview(
                    selectedImageData
                );

            };


        reader.onerror =
            function () {

                showStatus(
                    "❌ Sawirka lama akhrin karin.",
                    true
                );

            };


        reader.readAsDataURL(
            file
        );

    }


    /* =====================================================
       IMAGE PREVIEW
    ===================================================== */

    function showImagePreview(
        src
    ) {

        const container =
            ensurePreviewContainer();


        container.innerHTML =
            "";


        const wrapper =
            document.createElement(
                "div"
            );

        wrapper.className =
            "selected-image-wrapper";


        const img =
            document.createElement(
                "img"
            );

        img.className =
            "selected-image-preview";

        img.src =
            src;

        img.alt =
            "Sawir la doortay";


        const remove =
            document.createElement(
                "button"
            );

        remove.type =
            "button";

        remove.className =
            "remove-image-button";

        remove.innerHTML =
            "✕";

        remove.title =
            "Ka saar sawirka";


        remove.addEventListener(
            "click",
            removeSelectedImage
        );


        wrapper.appendChild(
            img
        );

        wrapper.appendChild(
            remove
        );

        container.appendChild(
            wrapper
        );

        container.style.display =
            "block";

    }


    /* =====================================================
       REMOVE IMAGE
    ===================================================== */

    function removeSelectedImage() {

        selectedImageFile =
            null;

        selectedImageData =
            null;


        if (
            galleryInput
        ) {

            galleryInput.value =
                "";

        }


        if (
            cameraInput
        ) {

            cameraInput.value =
                "";

        }


        if (
            imagePreview
        ) {

            imagePreview.src =
                "";

            imagePreview.style.display =
                "none";

        }


        if (
            imagePreviewContainer
        ) {

            imagePreviewContainer.innerHTML =
                "";

            imagePreviewContainer.style.display =
                "none";

        }


        showStatus(
            "Sawirka waa laga saaray.",
            false
        );

    }


    /* =====================================================
       STATUS
    ===================================================== */

    function showStatus(
        message,
        isError = false
    ) {

        if (!statusElement) {
            return;
        }

        statusElement.textContent =
            message;

        statusElement.classList.toggle(
            "error",
            Boolean(isError)
        );

    }


    /* =====================================================
       ESCAPE HTML
    ===================================================== */

    function escapeHTML(
        value
    ) {

        return String(
            value ?? ""
        )
            .replace(
                /&/g,
                "&amp;"
            )
            .replace(
                /</g,
                "&lt;"
            )
            .replace(
                />/g,
                "&gt;"
            )
            .replace(
                /"/g,
                "&quot;"
            )
            .replace(
                /'/g,
                "&#039;"
            );

    }


    /* =====================================================
       FORMAT TEXT
    ===================================================== */

    function formatText(
        text
    ) {

        return escapeHTML(
            text
        )
            .replace(
                /\n/g,
                "<br>"
            );

    }


    /* =====================================================
       SCROLL
    ===================================================== */

    function scrollToBottom() {

        const container =
            ensureMessagesContainer();

        container.scrollTop =
            container.scrollHeight;

    }


    /* =====================================================
       ADD USER MESSAGE
    ===================================================== */

    function addUserMessage(
        text,
        image
    ) {

        const container =
            ensureMessagesContainer();


        const message =
            document.createElement(
                "div"
            );

        message.className =
            "chat-message user-message";


        let html =
            `<div class="message-role">Adiga</div>`;


        if (text) {

            html +=
                `<div class="message-text">${formatText(text)}</div>`;

        }


        if (image) {

            html +=
                `
                <div class="message-image">
                    <img
                        src="${image}"
                        alt="Sawirka isticmaalaha"
                    >
                </div>
                `;

        }


        message.innerHTML =
            html;


        container.appendChild(
            message
        );


        scrollToBottom();

    }


    /* =====================================================
       ADD AI MESSAGE
    ===================================================== */

    function addAIMessage(
        text
    ) {

        const container =
            ensureMessagesContainer();


        const message =
            document.createElement(
                "div"
            );

        message.className =
            "chat-message ai-message";


        message.innerHTML =
            `
            <div class="message-role">
                NASIIB AI
            </div>

            <div class="message-text">
                ${formatText(text)}
            </div>
            `;


        container.appendChild(
            message
        );


        scrollToBottom();

    }


    /* =====================================================
       LOADING MESSAGE
    ===================================================== */

    function addLoadingMessage() {

        const container =
            ensureMessagesContainer();


        const message =
            document.createElement(
                "div"
            );

        message.className =
            "chat-message ai-message loading-message";


        message.innerHTML =
            `
            <div class="message-role">
                NASIIB AI
            </div>

            <div class="message-text">
                ⏳ Waan shaqaynayaa...
            </div>
            `;


        container.appendChild(
            message
        );


        scrollToBottom();


        return message;

    }


    /* =====================================================
       DATABASE IMAGE RESULT
    ===================================================== */

    function addDatabaseResult(
        data
    ) {

        const container =
            ensureMessagesContainer();


        const message =
            document.createElement(
                "div"
            );

        message.className =
            "chat-message database-message";


        const title =
            data.title ||
            data.knowledge?.title ||
            "Database";


        const content =
            data.content ||
            data.knowledge?.content ||
            "";


        const imageUrl =
            data.image_url ||
            data.knowledge?.image_url ||
            "";


        const audioUrl =
            data.audio_url ||
            data.knowledge?.audio_url ||
            "";


        let html =
            `
            <div class="message-role">
                📚 Database
            </div>

            <div class="database-result">
            `;


        if (title) {

            html +=
                `
                <h3>
                    ${escapeHTML(title)}
                </h3>
                `;

        }


        if (content) {

            html +=
                `
                <div class="database-content">
                    ${formatText(content)}
                </div>
                `;

        }


        if (imageUrl) {

            html +=
                `
                <div class="database-image">
                    <img
                        src="${escapeHTML(imageUrl)}"
                        alt="${escapeHTML(title)}"
                        loading="lazy"
                    >
                </div>
                `;

        }


        if (audioUrl) {

            html +=
                `
                <div class="database-audio">

                    <div class="audio-title">
                        🔊 ▶️ Dhageyso Codka
                    </div>

                    <audio
                        controls
                        preload="none"
                        src="${escapeHTML(audioUrl)}"
                    >
                    </audio>

                </div>
                `;

        }


        html +=
            `
            </div>
            `;


        message.innerHTML =
            html;


        container.appendChild(
            message
        );


        scrollToBottom();

    }


    /* =====================================================
       IMAGE NOT FOUND
    ===================================================== */

    function addImageNotFound() {

        const container =
            ensureMessagesContainer();


        const message =
            document.createElement(
                "div"
            );

        message.className =
            "chat-message error-message";


        message.innerHTML =
            `
            <div class="message-role">
                📚 Database
            </div>

            <div class="message-text">
                ❌ Sawirkan Database-ka lagama helin.
            </div>
            `;


        container.appendChild(
            message
        );


        scrollToBottom();

    }


    /* =====================================================
       MATCH IMAGE
    ===================================================== */

    async function matchImage(
        file
    ) {

        if (!file) {

            return {
                success: false,
                found: false
            };

        }


        const formData =
            new FormData();


        formData.append(
            "image",
            file
        );


        const response =
            await fetch(
                API_MATCH_IMAGE,
                {
                    method:
                        "POST",

                    body:
                        formData
                }
            );


        let data = null;


        try {

            data =
                await response.json();

        } catch {

            data = {
                success: false
            };

        }


        if (
            response.ok &&
            data?.found
        ) {

            return data;

        }


        if (
            response.status ===
            404
        ) {

            return {

                success:
                    false,

                found:
                    false,

                message:
                    "❌ Sawirkan Database-ka lagama helin."

            };

        }


        throw new Error(
            data?.error ||
            "Sawirka lama hubin karin."
        );

    }


    /* =====================================================
       SEND TO CHAT API
    ===================================================== */

    async function sendToChat(
        text,
        image
    ) {

        const response =
            await fetch(
                API_CHAT,
                {

                    method:
                        "POST",

                    headers: {

                        "Content-Type":
                            "application/json"

                    },

                    body:
                        JSON.stringify({

                            client_id:
                                clientId,

                            message:
                                text,

                            image:
                                image || ""

                        })

                }
            );


        let data = null;


        try {

            data =
                await response.json();

        } catch {

            data = null;

        }


        if (!response.ok) {

            throw new Error(
                data?.error ||
                "Chat request ayaa fashilmay."
            );

        }


        return data;

    }


    /* =====================================================
       SEND MESSAGE
    ===================================================== */

    async function sendMessage() {

        if (isSending) {
            return;
        }


        const text =
            messageInput
                ? messageInput.value.trim()
                : "";


        const image =
            selectedImageData;


        if (!text && !image) {

            showStatus(
                "Qor fariin ama dooro sawir.",
                true
            );

            return;
        }


        isSending =
            true;


        if (sendButton) {

            sendButton.disabled =
                true;

        }


        addUserMessage(
            text,
            image
        );


        if (messageInput) {

            messageInput.value =
                "";

        }


        showStatus(
            "⏳ Waan hubinayaa...",
            false
        );


        try {

            /*
             * ==========================================
             * IMAGE ONLY
             * ==========================================
             */

            if (
                image &&
                !text
            ) {

                const result =
                    await matchImage(
                        selectedImageFile
                    );


                if (
                    result.found
                ) {

                    addDatabaseResult(
                        result
                    );

                    showStatus(
                        "✅ Sawirka Database-ka waa laga helay.",
                        false
                    );

                } else {

                    addImageNotFound();

                    showStatus(
                        "❌ Sawirkan Database-ka lagama helin.",
                        true
                    );

                }


                removeSelectedImage();


                return;
            }


            /*
             * ==========================================
             * TEXT + IMAGE
             * ==========================================
             */

            if (
                image &&
                text
            ) {

                let matchResult =
                    null;


                try {

                    matchResult =
                        await matchImage(
                            selectedImageFile
                        );

                } catch (
                    imageError
                ) {

                    console.warn(
                        "Image match error:",
                        imageError
                    );

                }


                if (
                    matchResult &&
                    matchResult.found
                ) {

                    addDatabaseResult(
                        matchResult
                    );

                }


                const loading =
                    addLoadingMessage();


                const data =
                    await sendToChat(
                        text,
                        image
                    );


                loading.remove();


                addAIMessage(
                    data.response ||
                    data.message ||
                    "Jawaab lama helin."
                );


                removeSelectedImage();


                showStatus(
                    "✅ Waa la diray.",
                    false
                );


                return;
            }


            /*
             * ==========================================
             * TEXT ONLY
             * ==========================================
             */

            const loading =
                addLoadingMessage();


            const data =
                await sendToChat(
                    text,
                    ""
                );


            loading.remove();


            addAIMessage(
                data.response ||
                data.message ||
                "Jawaab lama helin."
            );


            showStatus(
                "✅ Waa la diray.",
                false
            );

        } catch (error) {

            console.error(
                "SEND ERROR:",
                error
            );


            addAIMessage(
                "❌ " +
                (
                    error.message ||
                    "Wax khalad ah ayaa dhacay."
                )
            );


            showStatus(
                "❌ " +
                (
                    error.message ||
                    "Fariinta lama diri karin."
                ),
                true
            );

        } finally {

            isSending =
                false;


            if (sendButton) {

                sendButton.disabled =
                    false;

            }

        }

    }


    /* =====================================================
       LOAD CHAT HISTORY
    ===================================================== */

    async function loadChatHistory() {

        try {

            const response =
                await fetch(
                    `${API_HISTORY}?client_id=${encodeURIComponent(clientId)}`
                );


            if (!response.ok) {
                return;
            }


            const data =
                await response.json();


            const chats =
                data.chats ||
                [];


            const container =
                ensureMessagesContainer();


            container.innerHTML =
                "";


            chats.forEach(
                (chat) => {

                    if (
                        chat.message ||
                        chat.image
                    ) {

                        addUserMessage(
                            chat.message ||
                            "",
                            chat.image ||
                            null
                        );

                    }


                    if (
                        chat.response
                    ) {

                        addAIMessage(
                            chat.response
                        );

                    }

                }
            );


            scrollToBottom();

        } catch (error) {

            console.warn(
                "History error:",
                error
            );

        }

    }


    /* =====================================================
       DELETE CHAT HISTORY
    ===================================================== */

    async function deleteChatHistory() {

        const confirmed =
            window.confirm(
                "Ma hubtaa inaad tirtirayso dhammaan Chat History?"
            );


        if (!confirmed) {
            return;
        }


        try {

            const response =
                await fetch(
                    `${API_HISTORY}?client_id=${encodeURIComponent(clientId)}`,
                    {
                        method:
                            "DELETE"
                    }
                );


            const data =
                await response.json();


            if (!response.ok) {

                throw new Error(
                    data?.error ||
                    "Chat history lama tirtiri karin."
                );

            }


            const container =
                ensureMessagesContainer();


            container.innerHTML =
                "";


            showStatus(
                "🗑️ Chat history waa la tirtiray.",
                false
            );

        } catch (error) {

            console.error(
                "DELETE HISTORY ERROR:",
                error
            );


            showStatus(
                "❌ " +
                error.message,
                true
            );

        }

    }


    /* =====================================================
       GALLERY CHANGE
    ===================================================== */

    function bindGalleryInput() {

        if (!galleryInput) {
            return;
        }


        galleryInput.addEventListener(
            "change",
            function () {

                handleImageSelected(
                    this.files?.[0]
                );

            }
        );

    }


    /* =====================================================
       CAMERA CHANGE
    ===================================================== */

    function bindCameraInput() {

        if (!cameraInput) {
            return;
        }


        cameraInput.addEventListener(
            "change",
            function () {

                handleImageSelected(
                    this.files?.[0]
                );

            }
        );

    }


    /* =====================================================
       BUTTON EVENTS
    ===================================================== */

    function bindEvents() {

        if (sendButton) {

            sendButton.addEventListener(
                "click",
                sendMessage
            );

        }


        if (galleryButton) {

            galleryButton.addEventListener(
                "click",
                function (event) {

                    event.preventDefault();

                    openGallery();

                }
            );

        }


        if (cameraButton) {

            cameraButton.addEventListener(
                "click",
                function (event) {

                    event.preventDefault();

                    openCamera();

                }
            );

        }


        if (removeImageButton) {

            removeImageButton.addEventListener(
                "click",
                removeSelectedImage
            );

        }


        if (clearChatButton) {

            clearChatButton.addEventListener(
                "click",
                deleteChatHistory
            );

        }


        bindGalleryInput();

        bindCameraInput();


        /* =================================================
           ENTER -> SEND
           SHIFT + ENTER -> NEW LINE
        ================================================= */

        if (messageInput) {

            messageInput.addEventListener(
                "keydown",
                function (event) {

                    if (
                        event.key ===
                        "Enter"
                    ) {

                        if (
                            event.shiftKey
                        ) {

                            /*
                             * Shift + Enter
                             * = New line
                             */

                            return;
                        }


                        /*
                         * Enter
                         * = Send
                         */

                        event.preventDefault();

                        sendMessage();

                    }

                }
            );

        }

    }


    /* =====================================================
       HEALTH CHECK
    ===================================================== */

    async function checkHealth() {

        try {

            const response =
                await fetch(
                    API_HEALTH
                );


            const data =
                await response.json();


            if (
                data.status ===
                "online"
            ) {

                showStatus(
                    "🟢 Server online",
                    false
                );

            }

        } catch {

            showStatus(
                "🔴 Server-ka lama xiriirin.",
                true
            );

        }

    }


    /* =====================================================
       INITIALIZE
    ===================================================== */

    function initialize() {

        /*
         * DOM-ka dib ayaa loo raadinayaa
         * haddii script-ku ku jiro HEAD.
         */

        messageInput =
            messageInput ||
            firstElement([
                "messageInput",
                "chatInput",
                "promptInput",
                "message",
                "userMessage",
                "textInput"
            ]);


        sendButton =
            sendButton ||
            firstElement([
                "sendButton",
                "sendBtn",
                "sendMessage",
                "send"
            ]);


        galleryButton =
            galleryButton ||
            firstElement([
                "galleryButton",
                "galleryBtn",
                "gallery"
            ]);


        cameraButton =
            cameraButton ||
            firstElement([
                "cameraButton",
                "cameraBtn",
                "camera"
            ]);


        galleryInput =
            galleryInput ||
            firstElement([
                "galleryInput",
                "galleryFile",
                "imageInput",
                "fileInput"
            ]);


        cameraInput =
            cameraInput ||
            firstElement([
                "cameraInput",
                "cameraFile",
                "cameraFileInput"
            ]);


        imagePreview =
            imagePreview ||
            firstElement([
                "imagePreview",
                "previewImage",
                "selectedImage"
            ]);


        imagePreviewContainer =
            imagePreviewContainer ||
            firstElement([
                "imagePreviewContainer",
                "previewContainer",
                "imagePreviewBox"
            ]);


        removeImageButton =
            removeImageButton ||
            firstElement([
                "removeImageButton",
                "removeImageBtn",
                "removeImage"
            ]);


        messagesContainer =
            messagesContainer ||
            firstElement([
                "chatMessages",
                "messages",
                "chatArea",
                "chatContainer",
                "conversation"
            ]);


        clearChatButton =
            clearChatButton ||
            firstElement([
                "clearChatButton",
                "clearChatBtn",
                "deleteChat",
                "deleteChats"
            ]);


        statusElement =
            statusElement ||
            firstElement([
                "statusMessage",
                "chatStatus",
                "status"
            ]);


        bindEvents();

        loadChatHistory();

        checkHealth();

    }


    /* =====================================================
       DOM READY
    ===================================================== */

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            initialize
        );

    } else {

        initialize();

    }


    /* =====================================================
       PUBLIC API
    ===================================================== */

    window.NasiibApp = {

        sendMessage,

        openGallery,

        openCamera,

        removeSelectedImage,

        loadChatHistory,

        deleteChatHistory,

        matchImage,

        getClientId() {

            return clientId;

        }

    };


})();
