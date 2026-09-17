/* =====================================================
   ADMIN KNOWLEDGE MANAGER
===================================================== */

let knowledgeData = [];

let selectedAudio = null;
let selectedImage = null;

let mediaRecorder = null;
let audioChunks = [];

const audioInput =
    document.getElementById("audioInput");

const imageInput =
    document.getElementById("imageInput");

const cameraInput =
    document.getElementById("cameraInput");


/* =====================================================
   AUTH
===================================================== */

function getToken() {

    return (
        localStorage.getItem("adminToken") ||
        localStorage.getItem("token") ||
        ""
    );
}


function adminHeaders() {

    const token = getToken();

    return {
        Authorization: `Bearer ${token}`
    };
}


/* =====================================================
   LOAD
===================================================== */

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        await loadKnowledge();

        setupInputs();

    }
);


/* =====================================================
   INPUTS
===================================================== */

function setupInputs() {

    audioInput.addEventListener(
        "change",
        event => {

            const file =
                event.target.files[0];

            if (!file) return;

            selectedAudio = file;

            showAudio(file);

        }
    );


    imageInput.addEventListener(
        "change",
        event => {

            const file =
                event.target.files[0];

            if (!file) return;

            selectedImage = file;

            showImage(file);

        }
    );


    cameraInput.addEventListener(
        "change",
        event => {

            const file =
                event.target.files[0];

            if (!file) return;

            selectedImage = file;

            showImage(file);

        }
    );

}


/* =====================================================
   AUDIO PREVIEW
===================================================== */

function showAudio(file) {

    const box =
        document.getElementById(
            "audioPreview"
        );

    const url =
        URL.createObjectURL(file);

    box.innerHTML = `
        <audio
            controls
            src="${url}">
        </audio>

        <p>
            🎙️ ${escapeHtml(file.name)}
        </p>
    `;
}


/* =====================================================
   IMAGE PREVIEW
===================================================== */

function showImage(file) {

    const box =
        document.getElementById(
            "imagePreview"
        );

    const url =
        URL.createObjectURL(file);

    box.innerHTML = `
        <img src="${url}" alt="Preview">

        <p>
            🖼️ ${escapeHtml(file.name)}
        </p>
    `;
}


/* =====================================================
   RECORD AUDIO
===================================================== */

async function startRecording() {

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
            await navigator.mediaDevices
                .getUserMedia({
                    audio: true
                });


        audioChunks = [];


        mediaRecorder =
            new MediaRecorder(stream);


        mediaRecorder.ondataavailable =
            event => {

                if (
                    event.data.size > 0
                ) {

                    audioChunks.push(
                        event.data
                    );

                }
            };


        mediaRecorder.onstop =
            () => {

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
                        track =>
                            track.stop()
                    );

            };


        mediaRecorder.start();

        alert(
            "🎙️ Codka waa la duubayaa. Mar kale riix si loo joojiyo."
        );

    } catch (error) {

        alert(
            "❌ Camera/Microphone lama heli karo."
        );

        console.error(error);

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


    result.textContent =
        "⏳ Codka ayaa loo beddelayaa qoraal...";


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


        if (!response.ok) {

            throw new Error(
                data.error ||
                "Transcription failed"
            );

        }


        result.textContent =
            data.text || "";


        if (data.text) {

            const content =
                document.getElementById(
                    "content"
                );

            if (!content.value.trim()) {

                content.value =
                    data.text;

            } else {

                content.value +=
                    "\n\n" +
                    data.text;

            }
        }

    } catch (error) {

        result.textContent =
            "❌ " + error.message;

    }
}


/* =====================================================
   IMAGE INTERPRETATION
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


    result.textContent =
        "⏳ AI ayaa sawirka fasiraya...";


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


        if (!response.ok) {

            throw new Error(
                data.error ||
                "Image interpretation failed"
            );

        }


        result.textContent =
            data.text || "";


        if (data.text) {

            const content =
                document.getElementById(
                    "content"
                );

            if (!content.value.trim()) {

                content.value =
                    data.text;

            }

        }

    } catch (error) {

        result.textContent =
            "❌ " + error.message;

    }
}


/* =====================================================
   AUDIO + IMAGE
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


    result.textContent =
        "⏳ AI ayaa xogta isku fasiraya...";


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


        if (!response.ok) {

            throw new Error(
                data.error ||
                "Interpretation failed"
            );

        }


        result.textContent =
            data.text || "";


        if (data.text) {

            const content =
                document.getElementById(
                    "content"
                );


            if (!content.value.trim()) {

                content.value =
                    data.text;

            } else {

                content.value +=
                    "\n\n" +
                    data.text;

            }

        }

    } catch (error) {

        result.textContent =
            "❌ " + error.message;

    }
}


/* =====================================================
   SAVE KNOWLEDGE
===================================================== */

document
    .getElementById(
        "knowledgeForm"
    )
    .addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            const title =
                document
                    .getElementById(
                        "title"
                    )
                    .value
                    .trim();


            const content =
                document
                    .getElementById(
                        "content"
                    )
                    .value
                    .trim();


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


                if (!response.ok) {

                    throw new Error(
                        data.error ||
                        "Save failed"
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

                alert(
                    "❌ " +
                    error.message
                );

            }

        }
    );


/* =====================================================
   LOAD KNOWLEDGE
===================================================== */

async function loadKnowledge() {

    const list =
        document.getElementById(
            "knowledgeList"
        );


    try {

        const response =
            await fetch(
                "/api/admin/knowledge",
                {
                    headers:
                        adminHeaders()
                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.error ||
                "Failed"
            );

        }


        knowledgeData =
            data;


        renderKnowledge(
            knowledgeData
        );

        updateStats();

    } catch (error) {

        list.innerHTML = `
            <div class="knowledge-item">
                ❌ ${escapeHtml(error.message)}
            </div>
        `;

    }
}


/* =====================================================
   RENDER
===================================================== */

function renderKnowledge(items) {

    const list =
        document.getElementById(
            "knowledgeList"
        );


    if (!items.length) {

        list.innerHTML = `
            <div class="knowledge-item">
                📭 Database-ku wali waa madhan yahay.
            </div>
        `;

        return;
    }


    list.innerHTML =
        items
            .map(item => {

                let media = "";


                if (item.image_url) {

                    media += `
                        <div class="knowledge-media">
                            <img
                                src="${item.image_url}"
                                alt="Knowledge image"
                            >
                        </div>
                    `;

                }


                if (item.audio_url) {

                    media += `
                        <div class="knowledge-media">
                            <audio
                                controls
                                src="${item.audio_url}">
                            </audio>
                        </div>
                    `;

                }


                return `
                    <article
                        class="knowledge-item"
                        data-search="
                            ${escapeHtml(
                                item.title || ""
                            )}
                            ${escapeHtml(
                                item.content || ""
                            )}
                        "
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
                                item.content || ""
                            )}
                        </div>


                        ${media}


                        <div class="item-actions">

                            <button
                                class="edit-btn"
                                onclick="editKnowledge(
                                    ${item.id}
                                )"
                            >
                                ✏️ Edit
                            </button>

                            <button
                                class="delete-btn"
                                onclick="deleteKnowledge(
                                    ${item.id}
                                )"
                            >
                                🗑️ Delete
                            </button>

                        </div>

                    </article>
                `;

            })
            .join("");
}


/* =====================================================
   SEARCH
===================================================== */

function searchKnowledge() {

    const query =
        document
            .getElementById(
                "searchInput"
            )
            .value
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
                    .includes(query);

            }
        );


    renderKnowledge(
        filtered
    );
}


/* =====================================================
   STATS
===================================================== */

function updateStats() {

    document
        .getElementById(
            "totalKnowledge"
        )
        .textContent =
            knowledgeData.length;


    document
        .getElementById(
            "totalAudio"
        )
        .textContent =
            knowledgeData.filter(
                x => x.audio_url
            ).length;


    document
        .getElementById(
            "totalImages"
        )
        .textContent =
            knowledgeData.filter(
                x => x.image_url
            ).length;
}


/* =====================================================
   DELETE
===================================================== */

async function deleteKnowledge(id) {

    if (
        !confirm(
            "Ma hubtaa inaad tirtirayso xogtan?"
        )
    ) {

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


        if (!response.ok) {

            throw new Error(
                data.error ||
                "Delete failed"
            );

        }


        await loadKnowledge();

    } catch (error) {

        alert(
            "❌ " +
            error.message
        );

    }
}


/* =====================================================
   EDIT
===================================================== */

function editKnowledge(id) {

    const item =
        knowledgeData.find(
            x => x.id === id
        );


    if (!item) return;


    document
        .getElementById(
            "editId"
        )
        .value =
            item.id;


    document
        .getElementById(
            "editTitle"
        )
        .value =
            item.title || "";


    document
        .getElementById(
            "editContent"
        )
        .value =
            item.content || "";


    document
        .getElementById(
            "editModal"
        )
        .classList
        .remove("hidden");
}


function closeEdit() {

    document
        .getElementById(
            "editModal"
        )
        .classList
        .add("hidden");
}


async function saveEdit() {

    const id =
        document
            .getElementById(
                "editId"
            )
            .value;


    const title =
        document
            .getElementById(
                "editTitle"
            )
            .value
            .trim();


    const content =
        document
            .getElementById(
                "editContent"
            )
            .value
            .trim();


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


        if (!response.ok) {

            throw new Error(
                data.error ||
                "Edit failed"
            );

        }


        closeEdit();

        await loadKnowledge();

    } catch (error) {

        alert(
            "❌ " +
            error.message
        );

    }
}


/* =====================================================
   RESET
===================================================== */

function resetForm() {

    document
        .getElementById(
            "knowledgeForm"
        )
        .reset();


    selectedAudio = null;

    selectedImage = null;


    document
        .getElementById(
            "audioPreview"
        )
        .innerHTML = "";


    document
        .getElementById(
            "imagePreview"
        )
        .innerHTML = "";


    document
        .getElementById(
            "transcriptionResult"
        )
        .textContent = "";


    document
        .getElementById(
            "imageResult"
        )
        .textContent = "";


    document
        .getElementById(
            "combinedResult"
        )
        .textContent = "";
}


/* =====================================================
   SECTIONS
===================================================== */

function showSection(section) {

    document
        .getElementById(
            "knowledgeSection"
        )
        .classList
        .add("hidden");


    document
        .getElementById(
            "addSection"
        )
        .classList
        .add("hidden");


    if (section === "knowledge") {

        document
            .getElementById(
                "knowledgeSection"
            )
            .classList
            .remove("hidden");

    }


    if (section === "add") {

        document
            .getElementById(
                "addSection"
            )
            .classList
            .remove("hidden");

    }

}


/* =====================================================
   SIDEBAR
===================================================== */

function toggleSidebar() {

    document
        .querySelector(
            ".sidebar"
        )
        .classList
        .toggle("open");

}


/* =====================================================
   LOGOUT
===================================================== */

function adminLogout() {

    localStorage.removeItem(
        "adminToken"
    );

    localStorage.removeItem(
        "token"
    );

    window.location.href =
        "/admin/";
}


/* =====================================================
   ESCAPE HTML
===================================================== */

function escapeHtml(value) {

    return String(value || "")
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
function escapeHtml(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/* =====================================================
   ADD KNOWLEDGE BUTTONS
===================================================== */

document.addEventListener("DOMContentLoaded", () => {

    const addKnowledgeBtn =
        document.getElementById("addKnowledgeBtn");

    if (addKnowledgeBtn) {
        addKnowledgeBtn.addEventListener("click", () => {
            showSection("add");

            const sidebar =
                document.querySelector(".sidebar");

            if (sidebar) {
                sidebar.classList.remove("open");
            }
        });
    }

    const addKnowledgeMainBtn =
        document.getElementById("addKnowledgeMainBtn");

    if (addKnowledgeMainBtn) {
        addKnowledgeMainBtn.addEventListener("click", () => {
            showSection("add");
        });
    }

    const cancelAddBtn =
        document.getElementById("cancelAddBtn");

    if (cancelAddBtn) {
        cancelAddBtn.addEventListener("click", () => {
            resetForm();
            showSection("knowledge");
        });
    }

});
