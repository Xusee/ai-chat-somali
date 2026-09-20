(() => {
    "use strict";

    /* =====================================================
       NASIIB BUSINESS CENTER
       PUBLIC USER APP
    ===================================================== */

    /*
    ========================================================
       API
    ========================================================
    */

    const API_CHAT = "/chat";
    const API_MATCH_IMAGE = "/api/match-image";
    const API_HISTORY = "/api/chats";
    const API_HEALTH = "/api/health";


    /*
    ========================================================
       SETTINGS
    ========================================================
    */

    const MAX_IMAGE_SIZE =
        5 * 1024 * 1024;

    const IMAGE_TYPES = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif"
    ];


    /*
    ========================================================
       DOM HELPER
    ========================================================
    */

    const $ = (id) => {
        return document.getElementById(id);
    };


    const qs = (selector) => {
        return document.querySelector(selector);
    };


    /*
    ========================================================
       STATE
    ========================================================
    */

    let selectedImageFile = null;

    let selectedImageDataUrl = null;

    let isSending = false;

    let isMatchingImage = false;

    let currentAudio = null;

    let currentClientId = null;


    /*
    ========================================================
       CLIENT ID
    ========================================================
    */

    function createClientId() {

        if (
            window.crypto &&
            typeof window.crypto.randomUUID === "function"
        ) {

            return window.crypto.randomUUID();

        }


        return (
            "client-" +
            Date.now() +
            "-" +
            Math.random()
                .toString(36)
                .substring(2, 12)
        );

    }


    function getClientId() {

        let id =
            localStorage.getItem(
                "nasiib_client_id"
            );


        if (!id) {

            id = createClientId();

            localStorage.setItem(
                "nasiib_client_id",
                id
            );

        }


        currentClientId = id;

        return id;

    }


    /*
    ========================================================
       INITIAL CLIENT ID
    ========================================================
    */

    const clientId =
        getClientId();


    /*
    ========================================================
       POSSIBLE DOM ELEMENTS
       App-ku wuxuu aqbalayaa IDs kala duwan.
    ========================================================
    */

    const chatForm =
        $("chatForm") ||
        $("messageForm") ||
        qs("form");


    const messageInput =
        $("messageInput") ||
        $("message") ||
        $("chatInput") ||
        $("prompt");


    const sendButton =
        $("sendButton") ||
        $("sendBtn") ||
        $("send");


    const galleryButton =
        $("galleryButton") ||
        $("galleryBtn") ||
        $("gallery");


    const cameraButton =
        $("cameraButton") ||
        $("cameraBtn") ||
        $("camera");


    const removeImageButton =
        $("removeImageButton") ||
        $("removeImageBtn") ||
        $("removeImage");


    const imagePreviewContainer =
        $("imagePreviewContainer") ||
        $("imagePreview") ||
        $("previewContainer");


    const imagePreview =
        $("imagePreviewImg") ||
        $("previewImage") ||
        $("imagePreview");


    const chatContainer =
        $("chatContainer") ||
        $("chatMessages") ||
        $("messages") ||
        $("chat");


    const historyContainer =
        $("chatHistory") ||
        $("history") ||
        $("historyList");


    const deleteChatButton =
        $("deleteChatButton") ||
        $("deleteChatBtn") ||
        $("clearChat");


    /*
    ========================================================
       DYNAMIC INPUTS
       Haddii HTML-ka uusan input lahayn,
       JS ayaa abuura.
    ========================================================
    */

    let galleryInput = null;

    let cameraInput = null;


    function createHiddenFileInput(
        id,
        captureMode = null
    ) {

        let input =
            document.getElementById(id);


        if (input) {
            return input;
        }


        input =
            document.createElement(
                "input"
            );


        input.type = "file";

        input.id = id;

        input.accept =
            "image/*";


        if (captureMode) {

            input.setAttribute(
                "capture",
                captureMode
            );

        }


        input.style.display =
            "none";


        document.body.appendChild(
            input
        );


        return input;

    }


    function initializeFileInputs() {

        galleryInput =
            createHiddenFileInput(
                "nasiibGalleryInput"
            );


        cameraInput =
            createHiddenFileInput(
                "nasiibCameraInput",
                "environment"
            );


        /*
        Gallery
        */

        if (galleryButton) {

            galleryButton.addEventListener(
                "click",
                (event) => {

                    event.preventDefault();

                    galleryInput.click();

                }
            );

        }


        /*
        Camera
        */

        if (cameraButton) {

            cameraButton.addEventListener(
                "click",
                (event) => {

                    event.preventDefault();

                    cameraInput.click();

                }
            );

        }


        /*
        Gallery change
        */

        galleryInput.addEventListener(
            "change",
            handleFileInput
        );


        /*
        Camera change
        */

        cameraInput.addEventListener(
            "change",
            handleFileInput
        );

    }


    /*
    ========================================================
       FILE INPUT
    ========================================================
    */

    function handleFileInput(event) {

        const files =
            event.target.files;


        if (
            !files ||
            !files.length
        ) {

            return;

        }


        const file =
            files[0];


        selectImage(
            file
        );


        /*
        Allow same image to be selected again.
        */

        event.target.value = "";

    }


    /*
    ========================================================
       IMAGE VALIDATION
    ========================================================
    */

    function validateImageFile(
        file
    ) {

        if (!file) {

            return {
                valid: false,
                message:
                    "Sawir lama helin."
            };

        }


        if (
            !IMAGE_TYPES.includes(
                file.type
            )
        ) {

            return {
                valid: false,
                message:
                    "Fadlan dooro JPG, PNG, WEBP ama GIF."
            };

        }


        if (
            file.size >
            MAX_IMAGE_SIZE
        ) {

            return {
                valid: false,
                message:
                    "Sawirku waa inuu ka yaraadaa 5MB."
            };

        }


        return {
            valid: true
        };

    }


    /*
    ========================================================
       READ IMAGE
    ========================================================
    */

    function readFileAsDataURL(
        file
    ) {

        return new Promise(
            (
                resolve,
                reject
            ) => {

                const reader =
                    new FileReader();


                reader.onload =
                    () => {

                        resolve(
                            reader.result
                        );

                    };


                reader.onerror =
                    () => {

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


    /*
    ========================================================
       SELECT IMAGE
    ========================================================
    */

    async function selectImage(
        file
    ) {

        const validation =
            validateImageFile(
                file
            );


        if (!validation.valid) {

            showError(
                validation.message
            );

            return;

        }


        try {

            selectedImageFile =
                file;


            selectedImageDataUrl =
                await readFileAsDataURL(
                    file
                );


            showImagePreview(
                selectedImageDataUrl
            );


            updateImageStatus(
                "Sawirka waa diyaar."
            );


        } catch (error) {

            console.error(
                error
            );


            clearSelectedImage();


            showError(
                "Sawirka lama akhrin karin."
            );

        }

    }


    /*
    ========================================================
       IMAGE PREVIEW
    ========================================================
    */

    function showImagePreview(
        dataUrl
    ) {

        /*
        If dedicated image element exists
        */

        const previewImg =
            imagePreview ||
            qs(
                ".image-preview img"
            );


        if (previewImg) {

            previewImg.src =
                dataUrl;

            previewImg.style.display =
                "block";

        }


        /*
        If container exists
        */

        if (
            imagePreviewContainer
        ) {

            imagePreviewContainer.style.display =
                "block";

            imagePreviewContainer.classList.add(
                "has-image"
            );

        }


        /*
        If no preview exists,
        create one automatically.
        */

        if (
            !previewImg &&
            !imagePreviewContainer
        ) {

            createAutomaticPreview(
                dataUrl
            );

        }


        /*
        Remove button
        */

        if (
            removeImageButton
        ) {

            removeImageButton.style.display =
                "inline-flex";

        }

    }


    /*
    ========================================================
       AUTOMATIC PREVIEW
    ========================================================
    */

    function createAutomaticPreview(
        dataUrl
    ) {

        let wrapper =
            document.getElementById(
                "nasiibAutoImagePreview"
            );


        if (!wrapper) {

            wrapper =
                document.createElement(
                    "div"
                );


            wrapper.id =
                "nasiibAutoImagePreview";


            wrapper.className =
                "nasiib-auto-image-preview";


            const img =
                document.createElement(
                    "img"
                );


            img.id =
                "nasiibAutoPreviewImage";


            const remove =
                document.createElement(
                    "button"
                );


            remove.type =
                "button";


            remove.textContent =
                "×";


            remove.title =
                "Ka saar sawirka";


            remove.className =
                "nasiib-auto-remove-image";


            remove.addEventListener(
                "click",
                clearSelectedImage
            );


            wrapper.appendChild(
                img
            );


            wrapper.appendChild(
                remove
            );


            /*
            Put before form
            */

            if (chatForm) {

                chatForm.parentNode.insertBefore(
                    wrapper,
                    chatForm
                );

            } else {

                document.body.prepend(
                    wrapper
                );

            }

        }


        const img =
            document.getElementById(
                "nasiibAutoPreviewImage"
            );


        if (img) {

            img.src =
                dataUrl;

        }


        wrapper.style.display =
            "flex";

    }


    /*
    ========================================================
       REMOVE IMAGE
    ========================================================
    */

    function clearSelectedImage() {

        selectedImageFile =
            null;


        selectedImageDataUrl =
            null;


        /*
        Preview image
        */

        const previewImg =
            imagePreview ||
            qs(
                ".image-preview img"
            );


        if (previewImg) {

            previewImg.removeAttribute(
                "src"
            );


            previewImg.style.display =
                "none";

        }


        /*
        Preview container
        */

        if (
            imagePreviewContainer
        ) {

            imagePreviewContainer.style.display =
                "none";

            imagePreviewContainer.classList.remove(
                "has-image"
            );

        }


        /*
        Automatic preview
        */

        const autoPreview =
            document.getElementById(
                "nasiibAutoImagePreview"
            );


        if (autoPreview) {

            autoPreview.style.display =
                "none";

        }


        /*
        Remove button
        */

        if (
            removeImageButton
        ) {

            removeImageButton.style.display =
                "none";

        }


        updateImageStatus(
            ""
        );

    }


    /*
    ========================================================
       REMOVE IMAGE BUTTON
    ========================================================
    */

    if (removeImageButton) {

        removeImageButton.addEventListener(
            "click",
            (event) => {

                event.preventDefault();

                clearSelectedImage();

            }
        );

    }


    /*
    ========================================================
       IMAGE STATUS
    ========================================================
    */

    function updateImageStatus(
        text
    ) {

        const status =
            $("imageStatus") ||
            $("uploadStatus");


        if (status) {

            status.textContent =
                text || "";

        }

    }


    /*
    ========================================================
       SHOW ERROR
    ========================================================
    */

    function showError(
        message
    ) {

        console.error(
            message
        );


        const errorBox =
            $("errorMessage") ||
            $("error");


        if (errorBox) {

            errorBox.textContent =
                message;

            errorBox.style.display =
                "block";


            setTimeout(
                () => {

                    errorBox.style.display =
                        "none";

                },
                5000
            );


            return;

        }


        /*
        Optional custom notification
        */

        showTemporaryNotification(
            message,
            "error"
        );

    }


    /*
    ========================================================
       TEMP NOTIFICATION
    ========================================================
    */

    function showTemporaryNotification(
        message,
        type = "info"
    ) {

        let box =
            document.getElementById(
                "nasiibNotification"
            );


        if (!box) {

            box =
                document.createElement(
                    "div"
                );


            box.id =
                "nasiibNotification";


            box.style.position =
                "fixed";

            box.style.left =
                "50%";

            box.style.bottom =
                "25px";

            box.style.transform =
                "translateX(-50%)";

            box.style.zIndex =
                "99999";

            box.style.padding =
                "12px 18px";

            box.style.borderRadius =
                "12px";

            box.style.background =
                "#202123";

            box.style.color =
                "#fff";

            box.style.maxWidth =
                "90%";

            box.style.fontSize =
                "14px";

            box.style.boxShadow =
                "0 5px 25px rgba(0,0,0,.25)";


            document.body.appendChild(
                box
            );

        }


        box.textContent =
            message;


        box.dataset.type =
            type;


        box.style.display =
            "block";


        clearTimeout(
            box._timer
        );


        box._timer =
            setTimeout(
                () => {

                    box.style.display =
                        "none";

                },
                4000
            );

    }


    /*
    ========================================================
       LOADING
    ========================================================
    */

    function setLoading(
        loading
    ) {

        isSending =
            loading;


        if (sendButton) {

            sendButton.disabled =
                loading;


            if (loading) {

                sendButton.dataset.originalText =
                    sendButton.textContent;


                sendButton.textContent =
                    "⏳";

            } else {

                sendButton.textContent =
                    sendButton.dataset.originalText ||
                    "➤";

            }

        }


        if (messageInput) {

            messageInput.disabled =
                loading;

        }

    }


    /*
    ========================================================
       ESCAPE HTML
    ========================================================
    */

    function escapeHtml(
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


    /*
    ========================================================
       FORMAT MESSAGE
    ========================================================
    */

    function formatMessage(
        value
    ) {

        return escapeHtml(
            value
        )
            .replace(
                /\n/g,
                "<br>"
            );

    }


    /*
    ========================================================
       ADD CHAT MESSAGE
    ========================================================
    */

    function addMessage(
        role,
        text,
        options = {}
    ) {

        /*
        If no chat container exists,
        do nothing silently.
        */

        if (!chatContainer) {

            console.warn(
                "Chat container lama helin."
            );

            return null;

        }


        const messageElement =
            document.createElement(
                "div"
            );


        messageElement.className =
            `message ${role}`;


        messageElement.dataset.role =
            role;


        /*
        USER / ASSISTANT
        */

        let html = "";


        if (
            options.imageUrl
        ) {

            html += `
                <div class="message-image">
                    <img
                        src="${escapeHtml(options.imageUrl)}"
                        alt="Sawir"
                        loading="lazy"
                    >
                </div>
            `;

        }


        if (text) {

            html += `
                <div class="message-text">
                    ${formatMessage(text)}
                </div>
            `;

        }


        messageElement.innerHTML =
            html;


        chatContainer.appendChild(
            messageElement
        );


        scrollChatToBottom();


        return messageElement;

    }


    /*
    ========================================================
       ADD USER MESSAGE WITH IMAGE
    ========================================================
    */

    function addUserMessageWithImage(
        text,
        imageDataUrl
    ) {

        if (!chatContainer) {
            return;
        }


        const messageElement =
            document.createElement(
                "div"
            );


        messageElement.className =
            "message user";


        let html = "";


        if (imageDataUrl) {

            html += `
                <div class="message-image">
                    <img
                        src="${escapeHtml(imageDataUrl)}"
                        alt="Sawir la diray"
                    >
                </div>
            `;

        }


        if (text) {

            html += `
                <div class="message-text">
                    ${formatMessage(text)}
                </div>
            `;

        }


        messageElement.innerHTML =
            html;


        chatContainer.appendChild(
            messageElement
        );


        scrollChatToBottom();

    }


    /*
    ========================================================
       DATABASE IMAGE RESULT
    ========================================================
    */

    function renderDatabaseMatch(
        result
    ) {

        if (!chatContainer) {
            return;
        }


        const wrapper =
            document.createElement(
                "div"
            );


        wrapper.className =
            "message assistant database-match";


        const title =
            result.title ||
            "Database Match";


        const content =
            result.content ||
            "";


        const imageUrl =
            result.image_url ||
            "";


        const audioUrl =
            result.audio_url ||
            "";


        const knowledge =
            result.knowledge ||
            "";


        let html = `

            <div class="database-match-card">

                <div class="database-match-header">
                    <strong>
                        📚 Database-ka waa laga helay
                    </strong>

                    <span class="exact-badge">
                        ✓ EXACT
                    </span>
                </div>

                <div class="database-match-title">
                    ${escapeHtml(title)}
                </div>

        `;


        /*
        Database Image
        */

        if (imageUrl) {

            html += `

                <div class="database-image">
                    <img
                        src="${escapeHtml(imageUrl)}"
                        alt="${escapeHtml(title)}"
                        loading="lazy"
                    >
                </div>

            `;

        }


        /*
        Content
        */

        if (content) {

            html += `

                <div class="database-content">
                    ${formatMessage(content)}
                </div>

            `;

        }


        /*
        Knowledge
        */

        if (knowledge) {

            html += `

                <div class="database-knowledge">
                    <strong>📝 Knowledge:</strong>
                    <div>
                        ${formatMessage(knowledge)}
                    </div>
                </div>

            `;

        }


        /*
        Audio
        */

        if (audioUrl) {

            html += `

                <div class="database-audio">

                    <button
                        type="button"
                        class="play-audio-btn"
                        data-audio-url="${escapeHtml(audioUrl)}"
                    >
                        🔊 ▶️ Dhageyso Codka
                    </button>

                </div>

            `;

        }


        html += `

            </div>

        `;


        wrapper.innerHTML =
            html;


        chatContainer.appendChild(
            wrapper
        );


        /*
        Audio button
        */

        const audioButton =
            wrapper.querySelector(
                ".play-audio-btn"
            );


        if (audioButton) {

            audioButton.addEventListener(
                "click",
                () => {

                    playAudio(
                        audioUrl,
                        audioButton
                    );

                }
            );

        }


        scrollChatToBottom();

    }


    /*
    ========================================================
       DATABASE NOT FOUND
    ========================================================
    */

    function renderDatabaseNotFound(
        result
    ) {

        if (!chatContainer) {
            return;
        }


        const wrapper =
            document.createElement(
                "div"
            );


        wrapper.className =
            "message assistant image-not-found";


        const aiAnswer =
            result?.ai_answer ||
            result?.answer ||
            "";


        wrapper.innerHTML = `

            <div class="image-not-found-card">

                <div class="not-found-title">
                    ❌ Sawirkan Database-ka lagama helin.
                </div>

                <div class="not-found-ai">
                    <strong>🤖 AI ayaa sawirka fasiray:</strong>

                    ${
                        aiAnswer
                            ? `
                                <div class="ai-image-answer">
                                    ${formatMessage(aiAnswer)}
                                </div>
                              `
                            : `
                                <div class="ai-image-answer">
                                    AI fasiraad lama helin.
                                </div>
                              `
                    }

                </div>

            </div>

        `;


        chatContainer.appendChild(
            wrapper
        );


        scrollChatToBottom();

    }


    /*
    ========================================================
       AI CHAT RESPONSE
    ========================================================
    */

    function renderAIResponse(
        result
    ) {

        const answer =
            result?.answer ||
            result?.message ||
            "";


        if (answer) {

            addMessage(
                "assistant",
                answer
            );

        }


        /*
        Knowledge returned by /chat
        */

        if (
            Array.isArray(
                result?.knowledge
            ) &&
            result.knowledge.length
        ) {

            renderKnowledgeResults(
                result.knowledge
            );

        }

    }


    /*
    ========================================================
       KNOWLEDGE RESULTS
    ========================================================
    */

    function renderKnowledgeResults(
        knowledge
    ) {

        if (!chatContainer) {
            return;
        }


        /*
        Don't display huge duplicate cards
        if AI already answered.
        */

        knowledge.forEach(
            item => {

                const card =
                    document.createElement(
                        "div"
                    );


                card.className =
                    "knowledge-result";


                let html = `

                    <div class="knowledge-result-title">
                        📚 ${escapeHtml(
                            item.title ||
                            "Knowledge"
                        )}
                    </div>

                `;


                if (item.image_url) {

                    html += `

                        <img
                            src="${escapeHtml(item.image_url)}"
                            alt=""
                            class="knowledge-result-image"
                            loading="lazy"
                        >

                    `;

                }


                if (item.content) {

                    html += `

                        <div class="knowledge-result-content">
                            ${formatMessage(
                                item.content
                            )}
                        </div>

                    `;

                }


                if (item.audio_url) {

                    html += `

                        <button
                            type="button"
                            class="knowledge-audio-btn"
                            data-audio-url="${escapeHtml(
                                item.audio_url
                            )}"
                        >
                            🔊 ▶️ Dhageyso Codka
                        </button>

                    `;

                }


                card.innerHTML =
                    html;


                chatContainer.appendChild(
                    card
                );


                const audioButton =
                    card.querySelector(
                        ".knowledge-audio-btn"
                    );


                if (audioButton) {

                    audioButton.addEventListener(
                        "click",
                        () => {

                            playAudio(
                                item.audio_url,
                                audioButton
                            );

                        }
                    );

                }

            }
        );


        scrollChatToBottom();

    }


    /*
    ========================================================
       PLAY AUDIO
    ========================================================
    */

    function playAudio(
        url,
        button
    ) {

        if (!url) {
            return;
        }


        try {

            /*
            Stop previous audio
            */

            if (currentAudio) {

                currentAudio.pause();

                currentAudio.currentTime =
                    0;

            }


            currentAudio =
                new Audio(
                    url
                );


            if (button) {

                button.textContent =
                    "⏸️ Jooji Codka";

            }


            currentAudio.play()
                .catch(
                    error => {

                        console.error(
                            error
                        );


                        showError(
                            "Codka lama ciyaari karin."
                        );

                    }
                );


            currentAudio.onended =
                () => {

                    if (button) {

                        button.textContent =
                            "🔊 ▶️ Dhageyso Codka";

                    }

                };


        } catch (error) {

            console.error(
                error
            );


            showError(
                "Audio error."
            );

        }

    }


    /*
    ========================================================
       SCROLL CHAT
    ========================================================
    */

    function scrollChatToBottom() {

        if (!chatContainer) {
            return;
        }


        requestAnimationFrame(
            () => {

                chatContainer.scrollTop =
                    chatContainer.scrollHeight;

            }
        );

    }


    /*
    ========================================================
       MATCH IMAGE
    ========================================================
    */

    async function matchImage(
        file,
        text = ""
    ) {

        if (!file) {

            return null;

        }


        isMatchingImage =
            true;


        updateImageStatus(
            "🔎 Database-ka ayaa sawirka baaraya..."
        );


        const formData =
            new FormData();


        formData.append(
            "image",
            file,
            file.name ||
            "image.jpg"
        );


        if (text) {

            formData.append(
                "text",
                text
            );

        }


        try {

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


            const result =
                await parseJSONResponse(
                    response
                );


            if (!response.ok) {

                throw new Error(
                    result?.message ||
                    "Image matching error."
                );

            }


            return result;

        } finally {

            isMatchingImage =
                false;

        }

    }


    /*
    ========================================================
       SEND CHAT
    ========================================================
    */

    async function sendMessage() {

        if (isSending) {
            return;
        }


        const text =
            messageInput
                ? messageInput.value.trim()
                : "";


        const hasImage =
            Boolean(
                selectedImageFile
            );


        if (
            !text &&
            !hasImage
        ) {

            return;

        }


        setLoading(
            true
        );


        /*
        Save selected values
        before clearing UI.
        */

        const file =
            selectedImageFile;


        const imageDataUrl =
            selectedImageDataUrl;


        /*
        Clear input immediately
        */

        if (messageInput) {

            messageInput.value =
                "";

        }


        /*
        ==============================================
        IMAGE EXISTS
        ==============================================
        */

        if (file) {

            /*
            Show user message
            */

            addUserMessageWithImage(
                text,
                imageDataUrl
            );


            try {

                /*
                1. MATCH DATABASE
                */

                const matchResult =
                    await matchImage(
                        file,
                        text
                    );


                /*
                ======================================
                EXACT DATABASE MATCH
                ======================================
                */

                if (
                    matchResult &&
                    matchResult.found === true &&
                    matchResult.match === "exact"
                ) {

                    renderDatabaseMatch(
                        matchResult
                    );


                    /*
                    If user also wrote text,
                    send text + image to AI.
                    */

                    if (text) {

                        await sendTextAndImageToAI(
                            text,
                            imageDataUrl
                        );

                    }


                }

                /*
                ======================================
                NOT FOUND
                ======================================
                */

                else {

                    renderDatabaseNotFound(
                        matchResult
                    );


                    /*
                    Image + Text:
                    send both to /chat
                    so AI can understand
                    both.
                    */

                    if (text) {

                        await sendTextAndImageToAI(
                            text,
                            imageDataUrl
                        );

                    }

                }


                /*
                Remove selected image
                */

                clearSelectedImage();


                /*
                Reload history
                */

                await loadChatHistory(
                    false
                );


            } catch (error) {

                console.error(
                    "IMAGE SEND ERROR:",
                    error
                );


                showError(
                    error.message ||
                    "Sawirka lama diri karin."
                );

            } finally {

                setLoading(
                    false
                );

                updateImageStatus(
                    ""
                );

            }


            return;

        }


        /*
        ==============================================
        TEXT ONLY
        ==============================================
        */

        addMessage(
            "user",
            text
        );


        try {

            const result =
                await sendTextToAI(
                    text
                );


            renderAIResponse(
                result
            );


            await loadChatHistory(
                false
            );


        } catch (error) {

            console.error(
                "TEXT CHAT ERROR:",
                error
            );


            showError(
                error.message ||
                "Fariinta lama diri karin."
            );

        } finally {

            setLoading(
                false
            );

        }

    }


    /*
    ========================================================
       SEND TEXT ONLY TO AI
    ========================================================
    */

    async function sendTextToAI(
        text
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
                                text

                        })

                }
            );


        const result =
            await parseJSONResponse(
                response
            );


        if (!response.ok) {

            throw new Error(
                result?.message ||
                "Chat request failed."
            );

        }


        return result;

    }


    /*
    ========================================================
       SEND TEXT + IMAGE TO AI
    ========================================================
    */

    async function sendTextAndImageToAI(
        text,
        imageDataUrl
    ) {

        if (!text && !imageDataUrl) {

            return null;

        }


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
                                text || "",

                            image:
                                imageDataUrl || null

                        })

                }
            );


        const result =
            await parseJSONResponse(
                response
            );


        if (!response.ok) {

            throw new Error(
                result?.message ||
                "AI image + text request failed."
            );

        }


        /*
        Render AI response
        */

        renderAIResponse(
            result
        );


        return result;

    }


    /*
    ========================================================
       IMAGE-ONLY FUNCTION
       Waxaa loo isticmaali karaa haddii aad rabto
       image-only inuu kaliya match sameeyo.
    ========================================================
    */

    async function sendImageOnly(
        file
    ) {

        if (!file) {
            return;
        }


        const result =
            await matchImage(
                file
            );


        if (
            result?.found === true &&
            result?.match === "exact"
        ) {

            renderDatabaseMatch(
                result
            );

        } else {

            renderDatabaseNotFound(
                result
            );

        }


        clearSelectedImage();


        await loadChatHistory(
            false
        );


        return result;

    }


    /*
    ========================================================
       JSON RESPONSE PARSER
    ========================================================
    */

    async function parseJSONResponse(
        response
    ) {

        const contentType =
            response.headers.get(
                "content-type"
            ) || "";


        if (
            contentType.includes(
                "application/json"
            )
        ) {

            return await response.json();

        }


        const text =
            await response.text();


        return {

            success:
                response.ok,

            message:
                text ||
                "Server response lama fahmi."

        };

    }


    /*
    ========================================================
       CHAT HISTORY
    ========================================================
    */

    async function loadChatHistory(
        showLoading = true
    ) {

        if (
            !historyContainer
        ) {

            return;

        }


        try {

            if (showLoading) {

                historyContainer.innerHTML =
                    `
                    <div class="history-loading">
                        ⏳ Soo dejinaya...
                    </div>
                    `;

            }


            const response =
                await fetch(
                    `${API_HISTORY}?client_id=${encodeURIComponent(
                        clientId
                    )}`
                );


            const result =
                await parseJSONResponse(
                    response
                );


            if (!response.ok) {

                throw new Error(
                    result?.message ||
                    "History lama soo qaadi karin."
                );

            }


            renderChatHistory(
                result?.chats ||
                []
            );


        } catch (error) {

            console.error(
                "HISTORY ERROR:",
                error
            );


            if (showLoading) {

                historyContainer.innerHTML =
                    `
                    <div class="history-empty">
                        History lama soo qaadi karin.
                    </div>
                    `;

            }

        }

    }


    /*
    ========================================================
       RENDER CHAT HISTORY
    ========================================================
    */

    function renderChatHistory(
        chats
    ) {

        if (!historyContainer) {
            return;
        }


        historyContainer.innerHTML =
            "";


        if (
            !Array.isArray(chats) ||
            !chats.length
        ) {

            historyContainer.innerHTML =
                `
                <div class="history-empty">
                    💬 Weli chat ma jiro.
                </div>
                `;

            return;

        }


        chats.forEach(
            chat => {

                const item =
                    document.createElement(
                        "div"
                    );


                item.className =
                    `history-item ${
                        chat.role || ""
                    }`;


                let text =
                    chat.message ||
                    chat.response ||
                    "";


                if (!text) {

                    text =
                        "🖼️ Sawir";

                }


                item.innerHTML =
                    `
                    <div class="history-role">
                        ${
                            chat.role ===
                            "user"
                                ? "👤 Adiga"
                                : "🤖 AI"
                        }
                    </div>

                    <div class="history-text">
                        ${escapeHtml(
                            text.substring(
                                0,
                                100
                            )
                        )}
                    </div>

                    ${
                        chat.created_at
                            ? `
                                <div class="history-date">
                                    ${formatDate(
                                        chat.created_at
                                    )}
                                </div>
                              `
                            : ""
                    }
                    `;


                historyContainer.appendChild(
                    item
                );

            }
        );

    }


    /*
    ========================================================
       FORMAT DATE
    ========================================================
    */

    function formatDate(
        value
    ) {

        try {

            const date =
                new Date(
                    value
                );


            if (
                Number.isNaN(
                    date.getTime()
                )
            ) {

                return "";

            }


            return date.toLocaleString(
                "so-SO",
                {
                    dateStyle:
                        "short",

                    timeStyle:
                        "short"
                }
            );

        } catch {

            return "";

        }

    }


    /*
    ========================================================
       DELETE CHAT
    ========================================================
    */

    async function deleteChatHistory() {

        const confirmed =
            window.confirm(
                "Ma hubtaa inaad tirtirayso dhammaan Chat History-ga?"
            );


        if (!confirmed) {
            return;
        }


        try {

            const response =
                await fetch(
                    API_HISTORY,
                    {

                        method:
                            "DELETE",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify({

                                client_id:
                                    clientId

                            })

                    }
                );


            const result =
                await parseJSONResponse(
                    response
                );


            if (!response.ok) {

                throw new Error(
                    result?.message ||
                    "Chat lama tirtiri karin."
                );

            }


            /*
            Clear chat screen
            */

            if (chatContainer) {

                chatContainer.innerHTML =
                    "";

            }


            /*
            Clear history
            */

            renderChatHistory(
                []
            );


            showTemporaryNotification(
                "🗑️ Chat History waa la tirtiray.",
                "success"
            );


        } catch (error) {

            console.error(
                error
            );


            showError(
                error.message ||
                "Chat lama tirtiri karin."
            );

        }

    }


    /*
    ========================================================
       DELETE BUTTON
    ========================================================
    */

    if (deleteChatButton) {

        deleteChatButton.addEventListener(
            "click",
            deleteChatHistory
        );

    }


    /*
    ========================================================
       ENTER = SEND
       SHIFT + ENTER = NEW LINE
    ========================================================
    */

    if (messageInput) {

        messageInput.addEventListener(
            "keydown",
            (event) => {

                /*
                Enter only
                */

                if (
                    event.key ===
                    "Enter" &&
                    !event.shiftKey
                ) {

                    event.preventDefault();


                    sendMessage();

                }


                /*
                Shift + Enter
                */

                if (
                    event.key ===
                    "Enter" &&
                    event.shiftKey
                ) {

                    /*
                    Browser default:
                    New line.

                    We intentionally do not
                    preventDefault().
                    */

                }

            }
        );

    }


    /*
    ========================================================
       SEND BUTTON
    ========================================================
    */

    if (sendButton) {

        sendButton.addEventListener(
            "click",
            (event) => {

                event.preventDefault();

                sendMessage();

            }
        );

    }


    /*
    ========================================================
       FORM SUBMIT
    ========================================================
    */

    if (chatForm) {

        chatForm.addEventListener(
            "submit",
            (event) => {

                event.preventDefault();

                sendMessage();

            }
        );

    }


    /*
    ========================================================
       PASTE IMAGE
    ========================================================
    */

    document.addEventListener(
        "paste",
        (event) => {

            const items =
                event.clipboardData?.items;


            if (!items) {
                return;
            }


            for (
                const item of items
            ) {

                if (
                    item.type &&
                    item.type.startsWith(
                        "image/"
                    )
                ) {

                    const file =
                        item.getAsFile();


                    if (file) {

                        selectImage(
                            file
                        );

                    }


                    break;

                }

            }

        }
    );


    /*
    ========================================================
       DRAG & DROP IMAGE
    ========================================================
    */

    function initializeDragDrop() {

        const dropTarget =
            chatContainer ||
            document.body;


        if (!dropTarget) {
            return;
        }


        [
            "dragenter",
            "dragover"
        ].forEach(
            eventName => {

                dropTarget.addEventListener(
                    eventName,
                    (event) => {

                        event.preventDefault();

                        event.stopPropagation();

                        dropTarget.classList.add(
                            "drag-over"
                        );

                    }
                );

            }
        );


        [
            "dragleave",
            "drop"
        ].forEach(
            eventName => {

                dropTarget.addEventListener(
                    eventName,
                    (event) => {

                        event.preventDefault();

                        event.stopPropagation();

                        dropTarget.classList.remove(
                            "drag-over"
                        );

                    }
                );

            }
        );


        dropTarget.addEventListener(
            "drop",
            (event) => {

                const files =
                    event.dataTransfer?.files;


                if (
                    !files ||
                    !files.length
                ) {

                    return;

                }


                const image =
                    Array.from(
                        files
                    ).find(
                        file =>
                            file.type.startsWith(
                                "image/"
                            )
                    );


                if (image) {

                    selectImage(
                        image
                    );

                }

            }
        );

    }


    /*
    ========================================================
       MOBILE RESPONSIVE HANDLING
    ========================================================
    */

    function initializeMobileHandling() {

        const setViewportHeight =
            () => {

                const vh =
                    window.innerHeight *
                    0.01;


                document.documentElement.style.setProperty(
                    "--app-vh",
                    `${vh}px`
                );

            };


        setViewportHeight();


        window.addEventListener(
            "resize",
            setViewportHeight
        );


        window.addEventListener(
            "orientationchange",
            () => {

                setTimeout(
                    setViewportHeight,
                    250
                );

            }
        );


        /*
        Mobile keyboard handling
        */

        if (
            window.visualViewport
        ) {

            window.visualViewport.addEventListener(
                "resize",
                () => {

                    document.body.classList.add(
                        "keyboard-visible"
                    );


                    scrollChatToBottom();

                }
            );

        }

    }


    /*
    ========================================================
       MOBILE IMAGE CAMERA/GALLERY
    ========================================================
    */

    function initializeMobileImageButtons() {

        /*
        Add fallback buttons if HTML doesn't
        have gallery/camera buttons.
        */

        if (
            !galleryButton &&
            !cameraButton
        ) {

            createAutomaticMediaButtons();

        }

    }


    /*
    ========================================================
       AUTOMATIC MEDIA BUTTONS
    ========================================================
    */

    function createAutomaticMediaButtons() {

        const container =
            document.createElement(
                "div"
            );


        container.id =
            "nasiibMediaButtons";


        container.className =
            "nasiib-media-buttons";


        const gallery =
            document.createElement(
                "button"
            );


        gallery.type =
            "button";


        gallery.id =
            "nasiibDynamicGalleryButton";


        gallery.innerHTML =
            "🖼️ Gallery";


        gallery.addEventListener(
            "click",
            () => {

                galleryInput.click();

            }
        );


        const camera =
            document.createElement(
                "button"
            );


        camera.type =
            "button";


        camera.id =
            "nasiibDynamicCameraButton";


        camera.innerHTML =
            "📷 Camera";


        camera.addEventListener(
            "click",
            () => {

                cameraInput.click();

            }
        );


        container.appendChild(
            gallery
        );


        container.appendChild(
            camera
        );


        if (chatForm) {

            chatForm.parentNode.insertBefore(
                container,
                chatForm
            );

        } else {

            document.body.prepend(
                container
            );

        }

    }


    /*
    ========================================================
       HEALTH CHECK
    ========================================================
    */

    async function checkServerHealth() {

        try {

            const response =
                await fetch(
                    API_HEALTH,
                    {
                        method:
                            "GET"
                    }
                );


            const result =
                await parseJSONResponse(
                    response
                );


            if (
                result?.success
            ) {

                console.log(
                    "✅ Server:",
                    result.status
                );


                console.log(
                    "📚 Knowledge:",
                    result.knowledge_count
                );


                console.log(
                    "💬 Chats:",
                    result.chat_count
                );

            }

        } catch (error) {

            console.warn(
                "⚠️ Server health check failed:",
                error.message
            );

        }

    }


    /*
    ========================================================
       AUTO TEXTAREA RESIZE
    ========================================================
    */

    function initializeTextareaResize() {

        if (!messageInput) {
            return;
        }


        const resize =
            () => {

                /*
                Only textarea
                */

                if (
                    messageInput.tagName
                        .toLowerCase() !==
                    "textarea"
                ) {

                    return;

                }


                messageInput.style.height =
                    "auto";


                const maxHeight =
                    window.innerWidth <= 600
                        ? 120
                        : 180;


                messageInput.style.height =
                    Math.min(
                        messageInput.scrollHeight,
                        maxHeight
                    ) + "px";

            };


        messageInput.addEventListener(
            "input",
            resize
        );


        resize();

    }


    /*
    ========================================================
       AUTO INSERT IMAGE PREVIEW CSS
       Haddii style.css uusan lahayn
       classes-kan, JS ayaa ku daraya.
    ========================================================
    */

    function injectFallbackStyles() {

        if (
            document.getElementById(
                "nasiibAppFallbackStyles"
            )
        ) {

            return;

        }


        const style =
            document.createElement(
                "style"
            );


        style.id =
            "nasiibAppFallbackStyles";


        style.textContent = `

            .nasiib-auto-image-preview {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 8px;
                margin: 8px 0;
                position: relative;
                width: fit-content;
                max-width: 90%;
                border-radius: 14px;
                background: rgba(127,127,127,.12);
            }

            .nasiib-auto-image-preview img {
                width: 90px;
                height: 90px;
                object-fit: cover;
                border-radius: 10px;
                display: block;
            }

            .nasiib-auto-remove-image {
                width: 32px;
                height: 32px;
                border: 0;
                border-radius: 50%;
                cursor: pointer;
                background: #d33;
                color: white;
                font-size: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .database-match-card,
            .image-not-found-card,
            .knowledge-result {
                margin: 10px 0;
                padding: 14px;
                border-radius: 15px;
                background: rgba(127,127,127,.10);
            }

            .database-match-header {
                display: flex;
                justify-content: space-between;
                gap: 10px;
                align-items: center;
                margin-bottom: 10px;
            }

            .exact-badge {
                padding: 4px 8px;
                border-radius: 20px;
                font-size: 11px;
                font-weight: 700;
                background: #10a37f;
                color: #fff;
            }

            .database-match-title,
            .knowledge-result-title {
                font-weight: 700;
                font-size: 17px;
                margin-bottom: 10px;
            }

            .database-image img,
            .knowledge-result-image {
                display: block;
                width: 100%;
                max-width: 420px;
                max-height: 420px;
                object-fit: contain;
                border-radius: 12px;
                margin: 8px 0;
            }

            .database-content,
            .database-knowledge,
            .knowledge-result-content {
                line-height: 1.6;
                margin-top: 10px;
            }

            .database-audio {
                margin-top: 14px;
            }

            .play-audio-btn,
            .knowledge-audio-btn {
                border: 0;
                border-radius: 10px;
                padding: 10px 14px;
                cursor: pointer;
                font-weight: 600;
            }

            .not-found-title {
                font-weight: 700;
                margin-bottom: 10px;
            }

            .ai-image-answer {
                margin-top: 8px;
                line-height: 1.6;
            }

            .nasiib-media-buttons {
                display: flex;
                gap: 8px;
                margin: 8px 0;
                flex-wrap: wrap;
            }

            .nasiib-media-buttons button {
                border: 0;
                border-radius: 10px;
                padding: 9px 12px;
                cursor: pointer;
            }

            .history-item {
                padding: 9px;
                margin-bottom: 6px;
                border-radius: 10px;
                cursor: default;
            }

            .history-role {
                font-size: 12px;
                opacity: .7;
                margin-bottom: 3px;
            }

            .history-text {
                overflow: hidden;
                text-overflow: ellipsis;
            }

            .history-date {
                font-size: 10px;
                opacity: .55;
                margin-top: 3px;
            }

            .history-empty,
            .history-loading {
                padding: 12px;
                text-align: center;
                opacity: .65;
            }

            .message-image img {
                max-width: min(320px, 80vw);
                max-height: 320px;
                object-fit: contain;
                border-radius: 14px;
                margin-bottom: 8px;
            }

            .message-text {
                line-height: 1.6;
                word-break: break-word;
            }

            .drag-over {
                outline: 2px dashed #10a37f;
                outline-offset: -4px;
            }

            @media (max-width: 600px) {

                .database-match-card,
                .image-not-found-card,
                .knowledge-result {
                    padding: 11px;
                    border-radius: 12px;
                }

                .database-image img,
                .knowledge-result-image {
                    max-height: 280px;
                }

                .message-image img {
                    max-width: 75vw;
                    max-height: 280px;
                }

                .database-match-title,
                .knowledge-result-title {
                    font-size: 15px;
                }

                .nasiib-auto-image-preview img {
                    width: 70px;
                    height: 70px;
                }

            }

        `;


        document.head.appendChild(
            style
        );

    }


    /*
    ========================================================
       SAVE CLIENT ID GLOBALLY
    ========================================================
    */

    window.NasiibChat = {

        clientId,

        sendMessage,

        selectImage,

        clearSelectedImage,

        matchImage,

        sendImageOnly,

        loadChatHistory,

        deleteChatHistory,

        checkServerHealth

    };


    /*
    ========================================================
       INITIALIZE
    ========================================================
    */

    function initializeApp() {

        console.log(
            "===================================="
        );

        console.log(
            "🇸🇴 NASIIB BUSINESS CENTER"
        );

        console.log(
            "👤 Public User"
        );

        console.log(
            "Client ID:",
            clientId
        );

        console.log(
            "===================================="
        );


        /*
        CSS
        */

        injectFallbackStyles();


        /*
        File inputs
        */

        initializeFileInputs();


        /*
        Mobile
        */

        initializeMobileHandling();


        /*
        Drag & Drop
        */

        initializeDragDrop();


        /*
        Automatic buttons
        */

        initializeMobileImageButtons();


        /*
        Textarea
        */

        initializeTextareaResize();


        /*
        History
        */

        loadChatHistory(
            true
        );


        /*
        Server
        */

        checkServerHealth();

    }


    /*
    ========================================================
       DOM READY
    ========================================================
    */

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            initializeApp
        );

    } else {

        initializeApp();

    }

})();
