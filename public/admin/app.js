/* =====================================================
   NASIIB BUSINESS CENTER
   ADMIN KNOWLEDGE MANAGER
   COMPLETE ADMIN.JS
===================================================== */


/* =====================================================
   GLOBAL VARIABLES
===================================================== */

let knowledgeData = [];

let selectedAudio = null;

let selectedImage = null;

let mediaRecorder = null;

let audioChunks = [];


/* =====================================================
   DOM ELEMENTS
===================================================== */

const loginPage =
    document.getElementById("loginPage");

const adminPanel =
    document.getElementById("adminPanel");

const loginForm =
    document.getElementById("loginForm");

const emailInput =
    document.getElementById("email");

const passwordInput =
    document.getElementById("password");

const loginButton =
    document.getElementById("loginButton");

const loginMessage =
    document.getElementById("loginMessage");

const audioInput =
    document.getElementById("audioInput");

const imageInput =
    document.getElementById("imageInput");

const cameraInput =
    document.getElementById("cameraInput");

const knowledgeForm =
    document.getElementById("knowledgeForm");


/* =====================================================
   TOKEN
===================================================== */

function getToken() {

    return (
        localStorage.getItem("adminToken") ||
        ""
    );
}


/* =====================================================
   ADMIN HEADERS
===================================================== */

function adminHeaders() {

    const token =
        getToken();


    return {

        "Authorization":
            `Bearer ${token}`

    };
}


/* =====================================================
   SHOW LOGIN
===================================================== */

function showLogin() {

    if (loginPage) {

        loginPage.classList.remove(
            "hidden"
        );

    }


    if (adminPanel) {

        adminPanel.classList.add(
            "hidden"
        );

    }

}


/* =====================================================
   SHOW ADMIN PANEL
===================================================== */

function showAdminPanel() {

    if (loginPage) {

        loginPage.classList.add(
            "hidden"
        );

    }


    if (adminPanel) {

        adminPanel.classList.remove(
            "hidden"
        );

    }

}


/* =====================================================
   CLEAR TOKEN
===================================================== */

function clearAdminToken() {

    localStorage.removeItem(
        "adminToken"
    );

}


/* =====================================================
   LOGIN MESSAGE
===================================================== */

function showLoginMessage(
    message,
    type = ""
) {

    if (!loginMessage) return;


    loginMessage.textContent =
        message;


    loginMessage.className =
        "login-message " + type;

}


/* =====================================================
   ADMIN LOGIN
===================================================== */

async function adminLogin(event) {

    event.preventDefault();


    const email =
        emailInput
            ? emailInput.value.trim()
            : "";


    const password =
        passwordInput
            ? passwordInput.value
            : "";


    if (!email) {

        showLoginMessage(
            "❌ Fadlan geli Email.",
            "error"
        );

        return;
    }


    if (!password) {

        showLoginMessage(
            "❌ Fadlan geli Password.",
            "error"
        );

        return;
    }


    if (loginButton) {

        loginButton.disabled = true;

        loginButton.textContent =
            "⏳ Soo gelaya...";

    }


    showLoginMessage(
        "⏳ Admin-ka waa la hubinayaa...",
        ""
    );


    try {

        /* =================================================
           POST /api/login
        ================================================= */

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


        /* =================================================
           LOGIN ERROR
        ================================================= */

        if (!response.ok) {

            throw new Error(
                data.error ||
                "Email ama Password waa khalad."
            );

        }


        /* =================================================
           TOKEN CHECK
        ================================================= */

        if (!data.token) {

            throw new Error(
                "❌ Server-ku Token ma soo celin."
            );

        }


        /* =================================================
           SAVE TOKEN
        ================================================= */

        localStorage.setItem(
            "adminToken",
            data.token
        );


        /* =================================================
           SUCCESS
        ================================================= */

        showLoginMessage(
            "✅ Login waa lagu guuleystay.",
            "success"
        );


        /* =================================================
           VERIFY TOKEN
        ================================================= */

        const verified =
            await verifyAdminToken();


        if (!verified) {

            throw new Error(
                "❌ Admin Token lama xaqiijin."
            );

        }


        /* =================================================
           OPEN ADMIN PANEL
        ================================================= */

        showAdminPanel();


        await loadKnowledge();


    } catch (error) {

        console.error(
            "ADMIN LOGIN ERROR:",
            error
        );


        clearAdminToken();


        showLoginMessage(
            "❌ " + error.message,
            "error"
        );


    } finally {

        if (loginButton) {

            loginButton.disabled =
                false;

            loginButton.textContent =
                "🔐 Soo Gal";

        }

    }

}


/* =====================================================
   VERIFY ADMIN TOKEN
===================================================== */

async function verifyAdminToken() {

    const token =
        getToken();


    if (!token) {

        return false;

    }


    try {

        const response =
            await fetch(
                "/api/admin/me",
                {
                    method: "GET",

                    headers:
                        adminHeaders()
                }
            );


        if (
            response.status === 401 ||
            response.status === 403
        ) {

            clearAdminToken();

            return false;

        }


        if (!response.ok) {

            return false;

        }


        const data =
            await response.json();


        /*
         * Server-ka waa inuu xaqiijiyay
         * in user-ku yahay Admin.
         */

        if (
            data &&
            data.user &&
            data.user.role &&
            data.user.role !== "admin"
        ) {

            clearAdminToken();

            return false;

        }


        return true;


    } catch (error) {

        console.error(
            "TOKEN VERIFY ERROR:",
            error
        );

        return false;

    }

}


/* =====================================================
   INITIALIZE APP
===================================================== */

document.addEventListener(
    "DOMContentLoaded",
    async function () {

        /*
         * Login form
         */

        if (loginForm) {

            loginForm.addEventListener(
                "submit",
                adminLogin
            );

        }


        /*
         * Haddii token jiro,
         * xaqiiji.
         */

        const token =
            getToken();


        if (!token) {

            showLogin();

            return;

        }


        const valid =
            await verifyAdminToken();


        if (!valid) {

            showLogin();

            return;

        }


        /*
         * Token sax yahay.
         */

        showAdminPanel();


        setupInputs();


        await loadKnowledge();

    }
);


/* =====================================================
   SETUP INPUTS
===================================================== */

function setupInputs() {


    /* =================================================
       AUDIO INPUT
    ================================================== */

    if (audioInput) {

        audioInput.addEventListener(
            "change",
            function (event) {

                const file =
                    event.target.files[0];


                if (!file) return;


                selectedAudio =
                    file;


                showAudio(
                    file
                );

            }
        );

    }


    /* =================================================
       IMAGE INPUT
    ================================================== */

    if (imageInput) {

        imageInput.addEventListener(
            "change",
            function (event) {

                const file =
                    event.target.files[0];


                if (!file) return;


                selectedImage =
                    file;


                showImage(
                    file
                );

            }
        );

    }


    /* =================================================
       CAMERA INPUT
    ================================================== */

    if (cameraInput) {

        cameraInput.addEventListener(
            "change",
            function (event) {

                const file =
                    event.target.files[0];


                if (!file) return;


                selectedImage =
                    file;


                showImage(
                    file
                );

            }
        );

    }

}


/* =====================================================
   SHOW AUDIO
===================================================== */

function showAudio(file) {

    const box =
        document.getElementById(
            "audioPreview"
        );


    if (!box) return;


    const url =
        URL.createObjectURL(
            file
        );


    box.innerHTML = `

        <audio
            controls
            src="${url}"
        ></audio>

        <p>
            🎙️ ${escapeHtml(file.name)}
        </p>

    `;

}


/* =====================================================
   SHOW IMAGE
===================================================== */

function showImage(file) {

    const box =
        document.getElementById(
            "imagePreview"
        );


    if (!box) return;


    const url =
        URL.createObjectURL(
            file
        );


    box.innerHTML = `

        <img
            src="${url}"
            alt="Preview"
        >

        <p>
            🖼️ ${escapeHtml(file.name)}
        </p>

    `;

}


/* =====================================================
   AUDIO RECORDING
===================================================== */

async function startRecording() {

    /*
     * Haddii recording socdo,
     * jooji.
     */

    if (mediaRecorder) {

        if (
            mediaRecorder.state ===
            "recording"
        ) {

            mediaRecorder.stop();

            return;

        }

    }


    try {

        const stream =
            await navigator
                .mediaDevices
                .getUserMedia({
                    audio: true
                });


        audioChunks = [];


        mediaRecorder =
            new MediaRecorder(
                stream
            );


        mediaRecorder.ondataavailable =
            function (event) {

                if (
                    event.data &&
                    event.data.size > 0
                ) {

                    audioChunks.push(
                        event.data
                    );

                }

            };


        mediaRecorder.onstop =
            function () {

                const blob =
                    new Blob(
                        audioChunks,
                        {
                            type:
                                "audio/webm"
                        }
                    );


                selectedAudio =
                    new File(
                        [blob],
                        `recording-${Date.now()}.webm`,
                        {
                            type:
                                "audio/webm"
                        }
                    );


                showAudio(
                    selectedAudio
                );


                stream
                    .getTracks()
                    .forEach(
                        track => {
                            track.stop();
                        }
                    );


                mediaRecorder =
                    null;

            };


        mediaRecorder.start();


        alert(
            "🎙️ Codka waa la duubayaa.\n\nMar kale riix 'Duub Cod' si aad u joojiso."
        );


    } catch (error) {

        console.error(
            "RECORDING ERROR:",
            error
        );


        alert(
            "❌ Microphone lama heli karo."
        );

    }

}


/* =====================================================
   TRANSCRIBE AUDIO
===================================================== */

async function transcribeAudio() {

    if (!selectedAudio) {

        alert(
            "❌ Marka hore dooro ama duub cod."
        );

        return;

    }


    const result =
        document.getElementById(
            "transcriptionResult"
        );


    if (result) {

        result.textContent =
            "⏳ Codka qoraal ayaa loo beddelayaa...";

    }


    const formData =
        new FormData();


    formData.append(
        "audio",
        selectedAudio
    );


    try {

        const response =
            await fetch(
                "/api/admin/knowledge/transcribe",
                {
                    method: "POST",

                    headers:
                        adminHeaders(),

                    body:
                        formData
                }
            );


        const data =
            await response.json();


        if (
            response.status === 401 ||
            response.status === 403
        ) {

            handleUnauthorized();

            return;

        }


        if (!response.ok) {

            throw new Error(
                data.error ||
                "Transcription failed."
            );

        }


        if (result) {

            result.textContent =
                data.text || "";

        }


        /*
         * Qoraalka content ku dar.
         */

        if (data.text) {

            const content =
                document.getElementById(
                    "content"
                );


            if (content) {

                if (
                    !content.value.trim()
                ) {

                    content.value =
                        data.text;

                } else {

                    content.value +=
                        "\n\n" +
                        data.text;

                }

            }

        }


    } catch (error) {

        console.error(
            "TRANSCRIPTION ERROR:",
            error
        );


        if (result) {

            result.textContent =
                "❌ " +
                error.message;

        }

    }

}


/* =====================================================
   INTERPRET IMAGE
===================================================== */

async function interpretImage() {

    if (!selectedImage) {

        alert(
            "❌ Marka hore dooro sawir."
        );

        return;

    }


    const result =
        document.getElementById(
            "imageResult"
        );


    if (result) {

        result.textContent =
            "⏳ AI ayaa sawirka fasiraya...";

    }


    const formData =
        new FormData();


    formData.append(
        "image",
        selectedImage
    );


    try {

        const response =
            await fetch(
                "/api/admin/knowledge/interpret-image",
                {
                    method: "POST",

                    headers:
                        adminHeaders(),

                    body:
                        formData
                }
            );


        const data =
            await response.json();


        if (
            response.status === 401 ||
            response.status === 403
        ) {

            handleUnauthorized();

            return;

        }


        if (!response.ok) {

            throw new Error(
                data.error ||
                "Image interpretation failed."
            );

        }


        if (result) {

            result.textContent =
                data.text || "";

        }


        if (data.text) {

            const content =
                document.getElementById(
                    "content"
                );


            if (content) {

                if (
                    !content.value.trim()
                ) {

                    content.value =
                        data.text;

                }

            }

        }


    } catch (error) {

        console.error(
            "IMAGE INTERPRETATION ERROR:",
            error
        );


        if (result) {

            result.textContent =
                "❌ " +
                error.message;

        }

    }

}


/* =====================================================
   AUDIO + IMAGE INTERPRETATION
===================================================== */

async function interpretAll() {

    if (
        !selectedAudio &&
        !selectedImage
    ) {

        alert(
            "❌ Geli cod ama sawir."
        );

        return;

    }


    const result =
        document.getElementById(
            "combinedResult"
        );


    if (result) {

        result.textContent =
            "⏳ AI ayaa Cod + Sawir isku fasiraya...";

    }


    const formData =
        new FormData();


    if (selectedAudio) {

        formData.append(
            "audio",
            selectedAudio
        );

    }


    if (selectedImage) {

        formData.append(
            "image",
            selectedImage
        );

    }


    try {

        const response =
            await fetch(
                "/api/admin/knowledge/interpret-all",
                {
                    method: "POST",

                    headers:
                        adminHeaders(),

                    body:
                        formData
                }
            );


        const data =
            await response.json();


        if (
            response.status === 401 ||
            response.status === 403
        ) {

            handleUnauthorized();

            return;

        }


        if (!response.ok) {

            throw new Error(
                data.error ||
                "Interpretation failed."
            );

        }


        if (result) {

            result.textContent =
                data.text || "";

        }


        if (data.text) {

            const content =
                document.getElementById(
                    "content"
                );


            if (content) {

                if (
                    !content.value.trim()
                ) {

                    content.value =
                        data.text;

                } else {

                    content.value +=
                        "\n\n" +
                        data.text;

                }

            }

        }


    } catch (error) {

        console.error(
            "COMBINED ERROR:",
            error
        );


        if (result) {

            result.textContent =
                "❌ " +
                error.message;

        }

    }

}


/* =====================================================
   SAVE KNOWLEDGE
===================================================== */

if (knowledgeForm) {

    knowledgeForm.addEventListener(
        "submit",
        saveKnowledge
    );

}


async function saveKnowledge(event) {

    event.preventDefault();


    const titleElement =
        document.getElementById(
            "title"
        );


    const contentElement =
        document.getElementById(
            "content"
        );


    const title =
        titleElement
            ? titleElement.value.trim()
            : "";


    const content =
        contentElement
            ? contentElement.value.trim()
            : "";


    if (
        !title &&
        !content &&
        !selectedAudio &&
        !selectedImage
    ) {

        alert(
            "❌ Xog geli marka hore."
        );

        return;

    }


    const formData =
        new FormData();


    formData.append(
        "title",
        title
    );


    formData.append(
        "content",
        content
    );


    if (selectedAudio) {

        formData.append(
            "audio",
            selectedAudio
        );

    }


    if (selectedImage) {

        formData.append(
            "image",
            selectedImage
        );

    }


    try {

        const response =
            await fetch(
                "/api/admin/knowledge",
                {
                    method: "POST",

                    headers:
                        adminHeaders(),

                    body:
                        formData
                }
            );


        const data =
            await response.json();


        if (
            response.status === 401 ||
            response.status === 403
        ) {

            handleUnauthorized();

            return;

        }


        if (!response.ok) {

            throw new Error(
                data.error ||
                "Save failed."
            );

        }


        alert(
            "✅ Knowledge Database-ka waa lagu daray."
        );


        resetForm();


        await loadKnowledge();


        showSection(
            "knowledge"
        );


    } catch (error) {

        console.error(
            "SAVE KNOWLEDGE ERROR:",
            error
        );


        alert(
            "❌ " +
            error.message
        );

    }

}


/* =====================================================
   LOAD KNOWLEDGE
===================================================== */

async function loadKnowledge() {

    const list =
        document.getElementById(
            "knowledgeList"
        );


    const token =
        getToken();


    if (!token) {

        showLogin();

        return;

    }


    try {

        if (list) {

            list.innerHTML = `
                <div class="loading">
                    ⏳ Knowledge Database ayaa la soo gelinayaa...
                </div>
            `;

        }


        const response =
            await fetch(
                "/api/admin/knowledge",
                {
                    method: "GET",

                    headers:
                        adminHeaders()
                }
            );


        const data =
            await response.json();


        /* =================================================
           TOKEN EXPIRED
        ================================================== */

        if (
            response.status === 401 ||
            response.status === 403
        ) {

            handleUnauthorized();

            return;

        }


        if (!response.ok) {

            throw new Error(
                data.error ||
                "Knowledge Database lama soo qaadi karin."
            );

        }


        /*
         * Server wuxuu soo celin karaa:
         *
         * []
         *
         * ama:
         *
         * { knowledge: [] }
         */

        if (Array.isArray(data)) {

            knowledgeData =
                data;

        } else {

            knowledgeData =
                data.knowledge ||
                [];

        }


        renderKnowledge(
            knowledgeData
        );


        updateStats();


    } catch (error) {

        console.error(
            "LOAD KNOWLEDGE ERROR:",
            error
        );


        if (list) {

            list.innerHTML = `
                <div class="knowledge-item">
                    ❌ ${escapeHtml(
                        error.message
                    )}
                </div>
            `;

        }

    }

}


/* =====================================================
   RENDER KNOWLEDGE
===================================================== */

function renderKnowledge(items) {

    const list =
        document.getElementById(
            "knowledgeList"
        );


    if (!list) return;


    if (
        !Array.isArray(items) ||
        items.length === 0
    ) {

        list.innerHTML = `
            <div class="knowledge-item">
                📭 Database-ku wali waa madhan yahay.
            </div>
        `;

        return;

    }


    list.innerHTML =
        items
            .map(
                item => {

                    let media = "";


                    /* =============================
                       IMAGE
                    ============================= */

                    if (
                        item.image_url
                    ) {

                        media += `

                            <div class="knowledge-media">

                                <img
                                    src="${escapeAttribute(
                                        item.image_url
                                    )}"
                                    alt="Knowledge image"
                                >

                            </div>

                        `;

                    }


                    /* =============================
                       AUDIO
                    ============================= */

                    if (
                        item.audio_url
                    ) {

                        media += `

                            <div class="knowledge-media">

                                <audio
                                    controls
                                    src="${escapeAttribute(
                                        item.audio_url
                                    )}"
                                ></audio>

                            </div>

                        `;

                    }


                    return `

                        <article
                            class="knowledge-item"
                        >

                            <div class="knowledge-header">

                                <div>

                                    <h3>
                                        ${escapeHtml(
                                            item.title ||
                                            "Knowledge"
                                        )}
                                    </h3>

                                    <div class="knowledge-date">

                                        ${escapeHtml(
                                            item.created_at ||
                                            ""
                                        )}

                                    </div>

                                </div>

                            </div>


                            <div class="knowledge-content">

                                ${escapeHtml(
                                    item.content ||
                                    ""
                                )}

                            </div>


                            ${media}


                            <div class="item-actions">

                                <button
                                    type="button"
                                    class="edit-btn"
                                    onclick="editKnowledge(${Number(
                                        item.id
                                    )})"
                                >
                                    ✏️ Edit
                                </button>


                                <button
                                    type="button"
                                    class="delete-btn"
                                    onclick="deleteKnowledge(${Number(
                                        item.id
                                    )})"
                                >
                                    🗑️ Delete
                                </button>

                            </div>

                        </article>

                    `;

                }
            )
            .join("");

}


/* =====================================================
   SEARCH
===================================================== */

function searchKnowledge() {

    const input =
        document.getElementById(
            "searchInput"
        );


    if (!input) return;


    const query =
        input.value
            .toLowerCase()
            .trim();


    const filtered =
        knowledgeData.filter(
            item => {

                const text =
                    (
                        item.title ||
                        ""
                    ) +
                    " " +
                    (
                        item.content ||
                        ""
                    );


                return text
                    .toLowerCase()
                    .includes(
                        query
                    );

            }
        );


    renderKnowledge(
        filtered
    );

}


/* =====================================================
   STATISTICS
===================================================== */

function updateStats() {

    const totalKnowledge =
        document.getElementById(
            "totalKnowledge"
        );


    const totalAudio =
        document.getElementById(
            "totalAudio"
        );


    const totalImages =
        document.getElementById(
            "totalImages"
        );


    if (totalKnowledge) {

        totalKnowledge.textContent =
            knowledgeData.length;

    }


    if (totalAudio) {

        totalAudio.textContent =
            knowledgeData.filter(
                item =>
                    Boolean(
                        item.audio_url
                    )
            ).length;

    }


    if (totalImages) {

        totalImages.textContent =
            knowledgeData.filter(
                item =>
                    Boolean(
                        item.image_url
                    )
            ).length;

    }

}


/* =====================================================
   DELETE KNOWLEDGE
===================================================== */

async function deleteKnowledge(id) {

    const confirmed =
        confirm(
            "⚠️ Ma hubtaa inaad tirtirayso xogtan?"
        );


    if (!confirmed) {

        return;

    }


    try {

        const response =
            await fetch(
                `/api/admin/knowledge/${id}`,
                {
                    method: "DELETE",

                    headers:
                        adminHeaders()
                }
            );


        const data =
            await response.json();


        if (
            response.status === 401 ||
            response.status === 403
        ) {

            handleUnauthorized();

            return;

        }


        if (!response.ok) {

            throw new Error(
                data.error ||
                "Delete failed."
            );

        }


        alert(
            "✅ Xogta waa la tirtiray."
        );


        await loadKnowledge();


    } catch (error) {

        console.error(
            "DELETE ERROR:",
            error
        );


        alert(
            "❌ " +
            error.message
        );

    }

}


/* =====================================================
   EDIT KNOWLEDGE
===================================================== */

function editKnowledge(id) {

    const item =
        knowledgeData.find(
            x =>
                Number(x.id) ===
                Number(id)
        );


    if (!item) {

        alert(
            "❌ Xogta lama helin."
        );

        return;

    }


    const editId =
        document.getElementById(
            "editId"
        );


    const editTitle =
        document.getElementById(
            "editTitle"
        );


    const editContent =
        document.getElementById(
            "editContent"
        );


    const editModal =
        document.getElementById(
            "editModal"
        );


    if (editId) {

        editId.value =
            item.id;

    }


    if (editTitle) {

        editTitle.value =
            item.title ||
            "";

    }


    if (editContent) {

        editContent.value =
            item.content ||
            "";

    }


    if (editModal) {

        editModal.classList.remove(
            "hidden"
        );

    }

}


/* =====================================================
   CLOSE EDIT
===================================================== */

function closeEdit() {

    const modal =
        document.getElementById(
            "editModal"
        );


    if (modal) {

        modal.classList.add(
            "hidden"
        );

    }

}


/* =====================================================
   SAVE EDIT
===================================================== */

async function saveEdit() {

    const idElement =
        document.getElementById(
            "editId"
        );


    const titleElement =
        document.getElementById(
            "editTitle"
        );


    const contentElement =
        document.getElementById(
            "editContent"
        );


    const id =
        idElement
            ? idElement.value
            : "";


    const title =
        titleElement
            ? titleElement.value.trim()
            : "";


    const content =
        contentElement
            ? contentElement.value.trim()
            : "";


    if (!id) {

        alert(
            "❌ ID-ga xogta lama helin."
        );

        return;

    }


    try {

        const response =
            await fetch(
                `/api/admin/knowledge/${id}`,
                {
                    method: "PUT",

                    headers: {

                        ...adminHeaders(),

                        "Content-Type":
                            "application/json"

                    },

                    body:
                        JSON.stringify({
                            title,
                            content
                        })

                }
            );


        const data =
            await response.json();


        if (
            response.status === 401 ||
            response.status === 403
        ) {

            handleUnauthorized();

            return;

        }


        if (!response.ok) {

            throw new Error(
                data.error ||
                "Edit failed."
            );

        }


        alert(
            "✅ Xogta waa la cusboonaysiiyay."
        );


        closeEdit();


        await loadKnowledge();


    } catch (error) {

        console.error(
            "EDIT ERROR:",
            error
        );


        alert(
            "❌ " +
            error.message
        );

    }

}


/* =====================================================
   RESET FORM
===================================================== */

function resetForm() {

    if (knowledgeForm) {

        knowledgeForm.reset();

    }


    selectedAudio =
        null;


    selectedImage =
        null;


    if (
        mediaRecorder &&
        mediaRecorder.state ===
        "recording"
    ) {

        mediaRecorder.stop();

    }


    mediaRecorder =
        null;


    audioChunks =
        [];


    const audioPreview =
        document.getElementById(
            "audioPreview"
        );


    const imagePreview =
        document.getElementById(
            "imagePreview"
        );


    const transcriptionResult =
        document.getElementById(
            "transcriptionResult"
        );


    const imageResult =
        document.getElementById(
            "imageResult"
        );


    const combinedResult =
        document.getElementById(
            "combinedResult"
        );


    if (audioPreview) {

        audioPreview.innerHTML =
            "";

    }


    if (imagePreview) {

        imagePreview.innerHTML =
            "";

    }


    if (transcriptionResult) {

        transcriptionResult.textContent =
            "";

    }


    if (imageResult) {

        imageResult.textContent =
            "";

    }


    if (combinedResult) {

        combinedResult.textContent =
            "";

    }

}


/* =====================================================
   SECTIONS
===================================================== */

function showSection(section) {

    const knowledgeSection =
        document.getElementById(
            "knowledgeSection"
        );


    const addSection =
        document.getElementById(
            "addSection"
        );


    if (
        !knowledgeSection ||
        !addSection
    ) {

        return;

    }


    knowledgeSection.classList.add(
        "hidden"
    );


    addSection.classList.add(
        "hidden"
    );


    if (
        section ===
        "knowledge"
    ) {

        knowledgeSection.classList.remove(
            "hidden"
        );

    }


    if (
        section ===
        "add"
    ) {

        addSection.classList.remove(
            "hidden"
        );

    }


    /*
     * Mobile sidebar xir.
     */

    const sidebar =
        document.querySelector(
            ".sidebar"
        );


    if (sidebar) {

        sidebar.classList.remove(
            "open"
        );

    }

}


/* =====================================================
   MOBILE SIDEBAR
===================================================== */

function toggleSidebar() {

    const sidebar =
        document.querySelector(
            ".sidebar"
        );


    if (!sidebar) return;


    sidebar.classList.toggle(
        "open"
    );

}


/* =====================================================
   LOGOUT
===================================================== */

function adminLogout() {

    clearAdminToken();


    knowledgeData =
        [];


    selectedAudio =
        null;


    selectedImage =
        null;


    window.location.href =
        "/admin/";

}


/* =====================================================
   UNAUTHORIZED
===================================================== */

function handleUnauthorized() {

    clearAdminToken();


    alert(
        "⚠️ Admin Login-ka wuu dhacay ama lama xaqiijin.\n\nFadlan mar kale Soo Gal."
    );


    showLogin();

}


/* =====================================================
   ESCAPE HTML
===================================================== */

function escapeHtml(value) {

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
   ESCAPE ATTRIBUTE
===================================================== */

function escapeAttribute(value) {

    return escapeHtml(
        value
    );

}


/* =====================================================
   MAKE FUNCTIONS GLOBAL
===================================================== */

window.adminLogin =
    adminLogin;

window.verifyAdminToken =
    verifyAdminToken;

window.startRecording =
    startRecording;

window.transcribeAudio =
    transcribeAudio;

window.interpretImage =
    interpretImage;

window.interpretAll =
    interpretAll;

window.saveKnowledge =
    saveKnowledge;

window.loadKnowledge =
    loadKnowledge;

window.renderKnowledge =
    renderKnowledge;

window.searchKnowledge =
    searchKnowledge;

window.updateStats =
    updateStats;

window.deleteKnowledge =
    deleteKnowledge;

window.editKnowledge =
    editKnowledge;

window.closeEdit =
    closeEdit;

window.saveEdit =
    saveEdit;

window.resetForm =
    resetForm;

window.showSection =
    showSection;

window.toggleSidebar =
    toggleSidebar;

window.adminLogout =
    adminLogout;
