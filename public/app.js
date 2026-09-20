(() => {
  "use strict";

  /* =========================================================
     NASIIB BUSINESS CENTER
     PUBLIC USER APP
     Login looma baahna
  ========================================================= */

  const API_CHAT = "/chat";
  const API_MATCH_IMAGE = "/api/match-image";
  const API_HISTORY = "/api/chats";
  const API_HEALTH = "/api/health";

  const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

  /* =========================================================
     HELPERS
  ========================================================= */

  const $ = (id) => document.getElementById(id);

  const createId = () =>
    "client_" +
    Date.now() +
    "_" +
    Math.random().toString(36).substring(2, 12);

  /* =========================================================
     CLIENT ID
  ========================================================= */

  let clientId = localStorage.getItem("nasiibClientId");

  if (!clientId) {
    clientId = createId();
    localStorage.setItem("nasiibClientId", clientId);
  }

  /* =========================================================
     STATE
  ========================================================= */

  let selectedImageFile = null;
  let selectedImageData = null;
  let isSending = false;

  /* =========================================================
     CREATE MISSING HTML ELEMENTS
  ========================================================= */

  function createDynamicInputs() {
    let galleryInput = $("galleryInput");

    if (!galleryInput) {
      galleryInput = document.createElement("input");

      galleryInput.type = "file";
      galleryInput.id = "galleryInput";
      galleryInput.accept = "image/*";
      galleryInput.style.display = "none";

      document.body.appendChild(galleryInput);
    }

    let cameraInput = $("cameraInput");

    if (!cameraInput) {
      cameraInput = document.createElement("input");

      cameraInput.type = "file";
      cameraInput.id = "cameraInput";
      cameraInput.accept = "image/*";
      cameraInput.capture = "environment";
      cameraInput.style.display = "none";

      document.body.appendChild(cameraInput);
    }

    galleryInput.addEventListener("change", handleImageInput);
    cameraInput.addEventListener("change", handleImageInput);
  }

  /* =========================================================
     FIND BUTTONS
  ========================================================= */

  function findGalleryButton() {
    return (
      $("galleryBtn") ||
      $("galleryButton") ||
      document.querySelector("[data-action='gallery']")
    );
  }

  function findCameraButton() {
    return (
      $("cameraBtn") ||
      $("cameraButton") ||
      document.querySelector("[data-action='camera']")
    );
  }

  function findSendButton() {
    return (
      $("sendBtn") ||
      $("sendButton") ||
      document.querySelector("[data-action='send']")
    );
  }

  function findDeleteButton() {
    return (
      $("deleteChatBtn") ||
      $("clearChatBtn") ||
      document.querySelector("[data-action='delete-chat']")
    );
  }

  /* =========================================================
     CHAT ELEMENT
  ========================================================= */

  function getChatContainer() {
    return (
      $("chatMessages") ||
      $("messages") ||
      $("chat") ||
      document.querySelector(".chat-messages") ||
      document.querySelector(".messages")
    );
  }

  function getInput() {
    return (
      $("messageInput") ||
      $("chatInput") ||
      $("prompt") ||
      document.querySelector("textarea")
    );
  }

  /* =========================================================
     STATUS
  ========================================================= */

  function showStatus(message, type = "") {
    let status = $("status");

    if (!status) {
      status = document.createElement("div");
      status.id = "status";

      status.style.padding = "6px 10px";
      status.style.fontSize = "13px";
      status.style.textAlign = "center";

      const header =
        document.querySelector("header") ||
        document.body.firstElementChild;

      if (header) {
        header.appendChild(status);
      } else {
        document.body.prepend(status);
      }
    }

    status.textContent = message;

    status.className = "status " + type;
  }

  /* =========================================================
     CHAT MESSAGE
  ========================================================= */

  function addMessage(text, sender = "assistant", options = {}) {
    const container = getChatContainer();

    if (!container) return;

    const message = document.createElement("div");

    message.className =
      "chat-message " +
      (sender === "user" ? "user-message" : "assistant-message");

    message.style.margin = "8px 0";
    message.style.padding = "10px 12px";
    message.style.borderRadius = "12px";
    message.style.maxWidth = "90%";
    message.style.wordBreak = "break-word";

    if (sender === "user") {
      message.style.marginLeft = "auto";
    }

    if (options.title) {
      const title = document.createElement("strong");

      title.textContent = options.title;

      title.style.display = "block";
      title.style.marginBottom = "6px";

      message.appendChild(title);
    }

    if (text) {
      const content = document.createElement("div");

      content.textContent = text;

      message.appendChild(content);
    }

    /* =====================================================
       DATABASE IMAGE
    ===================================================== */

    if (options.image_url) {
      const image = document.createElement("img");

      image.src = options.image_url;
      image.alt = options.title || "Database Image";
      image.loading = "lazy";

      image.style.display = "block";
      image.style.width = "100%";
      image.style.maxWidth = "400px";
      image.style.maxHeight = "400px";
      image.style.objectFit = "contain";
      image.style.marginTop = "10px";
      image.style.borderRadius = "10px";

      message.appendChild(image);
    }

    /* =====================================================
       AUDIO
    ===================================================== */

    if (options.audio_url) {
      const audioBox = document.createElement("div");

      audioBox.style.marginTop = "10px";

      const label = document.createElement("div");

      label.textContent = "🔊 ▶️ Dhageyso Codka";

      label.style.fontWeight = "bold";
      label.style.marginBottom = "5px";

      const audio = document.createElement("audio");

      audio.controls = true;
      audio.preload = "metadata";
      audio.src = options.audio_url;

      audio.style.width = "100%";

      audioBox.appendChild(label);
      audioBox.appendChild(audio);

      message.appendChild(audioBox);
    }

    container.appendChild(message);

    container.scrollTop = container.scrollHeight;
  }

  /* =========================================================
     DATABASE KNOWLEDGE RESULT
  ========================================================= */

  function showKnowledgeResult(result) {
    if (!result) return;

    const knowledge = result.knowledge || {};

    const title =
      result.title ||
      knowledge.title ||
      "Database Knowledge";

    const content =
      result.content ||
      knowledge.content ||
      "";

    const image_url =
      result.image_url ||
      knowledge.image_url ||
      "";

    const audio_url =
      result.audio_url ||
      knowledge.audio_url ||
      "";

    addMessage(
      content,
      "assistant",
      {
        title: "📚 " + title,
        image_url,
        audio_url
      }
    );
  }

  /* =========================================================
     NOT FOUND
  ========================================================= */

  function showImageNotFound() {
    addMessage(
      "❌ Sawirkan Database-ka lagama helin.",
      "assistant"
    );
  }

  /* =========================================================
     IMAGE PREVIEW
  ========================================================= */

  function getPreviewContainer() {
    return (
      $("imagePreview") ||
      $("previewContainer") ||
      $("imagePreviewContainer")
    );
  }

  function showImagePreview(file) {
    removeImagePreview();

    const container = getPreviewContainer();

    if (!container) return;

    container.innerHTML = "";

    container.style.display = "block";

    const wrapper = document.createElement("div");

    wrapper.style.position = "relative";
    wrapper.style.display = "inline-block";
    wrapper.style.maxWidth = "100%";

    const img = document.createElement("img");

    img.src = URL.createObjectURL(file);
    img.alt = "Image Preview";

    img.style.width = "100%";
    img.style.maxWidth = "300px";
    img.style.maxHeight = "300px";
    img.style.objectFit = "contain";
    img.style.borderRadius = "12px";
    img.style.display = "block";

    const removeButton = document.createElement("button");

    removeButton.type = "button";
    removeButton.textContent = "❌ Remove Image";

    removeButton.style.marginTop = "6px";
    removeButton.style.cursor = "pointer";

    removeButton.addEventListener("click", removeSelectedImage);

    wrapper.appendChild(img);
    wrapper.appendChild(removeButton);

    container.appendChild(wrapper);
  }

  function removeImagePreview() {
    const container = getPreviewContainer();

    if (container) {
      container.innerHTML = "";
      container.style.display = "none";
    }
  }

  /* =========================================================
     REMOVE IMAGE
  ========================================================= */

  function removeSelectedImage() {
    selectedImageFile = null;
    selectedImageData = null;

    removeImagePreview();

    const gallery = $("galleryInput");
    const camera = $("cameraInput");

    if (gallery) gallery.value = "";
    if (camera) camera.value = "";

    showStatus("Sawirka waa laga saaray.");
  }

  /* =========================================================
     FILE → BASE64
  ========================================================= */

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        resolve(reader.result);
      };

      reader.onerror = reject;

      reader.readAsDataURL(file);
    });
  }

  /* =========================================================
     IMAGE INPUT
  ========================================================= */

  async function handleImageInput(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showStatus("❌ Fadlan dooro sawir.", "error");

      event.target.value = "";

      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      showStatus(
        "❌ Sawirka wuxuu ka weyn yahay 5MB.",
        "error"
      );

      event.target.value = "";

      return;
    }

    selectedImageFile = file;

    try {
      selectedImageData = await fileToBase64(file);

      showImagePreview(file);

      showStatus("🖼️ Sawirka waa diyaar.");
    } catch (error) {
      console.error(error);

      selectedImageFile = null;
      selectedImageData = null;

      showStatus(
        "❌ Sawirka lama akhrin karin.",
        "error"
      );
    }
  }

  /* =========================================================
     GALLERY
  ========================================================= */

  function openGallery() {
    const input = $("galleryInput");

    if (!input) return;

    input.value = "";

    input.click();
  }

  /* =========================================================
     CAMERA
  ========================================================= */

  function openCamera() {
    const input = $("cameraInput");

    if (!input) return;

    input.value = "";

    input.click();
  }

  /* =========================================================
     EXACT DATABASE IMAGE MATCH
  ========================================================= */

  async function matchDatabaseImage(file) {
    const formData = new FormData();

    formData.append("image", file);

    const response = await fetch(API_MATCH_IMAGE, {
      method: "POST",
      body: formData
    });

    let data = null;

    try {
      data = await response.json();
    } catch {
      data = null;
    }

    return {
      response,
      data
    };
  }

  /* =========================================================
     SEND CHAT TO AI
  ========================================================= */

  async function sendToAI(text, imageData = null) {
    const body = {
      clientId,
      message: text || ""
    };

    if (imageData) {
      body.image = imageData;
    }

    const response = await fetch(API_CHAT, {
      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify(body)
    });

    let data;

    try {
      data = await response.json();
    } catch {
      throw new Error("Server-ku JSON sax ah ma soo celin.");
    }

    if (!response.ok) {
      throw new Error(
        data?.error ||
        data?.message ||
        "Chat request failed."
      );
    }

    return data;
  }

  /* =========================================================
     EXTRACT AI RESPONSE
  ========================================================= */

  function getAIText(data) {
    if (!data) return "";

    return (
      data.response ||
      data.answer ||
      data.message ||
      data.content ||
      data.text ||
      data.reply ||
      ""
    );
  }

  /* =========================================================
     SEND MESSAGE
  ========================================================= */

  async function sendMessage() {
    if (isSending) return;

    const input = getInput();

    if (!input) return;

    const text = input.value.trim();

    const hasImage = !!selectedImageFile;

    if (!text && !hasImage) {
      return;
    }

    isSending = true;

    try {
      /* =====================================================
         SHOW USER MESSAGE
      ===================================================== */

      if (text) {
        addMessage(text, "user");
      }

      if (hasImage) {
        addMessage(
          "🖼️ Sawir ayaa la diray.",
          "user"
        );
      }

      input.value = "";

      showStatus("⏳ Fariinta waa la dirayaa...");

      /* =====================================================
         IMAGE-ONLY
      ===================================================== */

      if (hasImage && !text) {
        const file = selectedImageFile;

        const result = await matchDatabaseImage(file);

        if (
          result.data &&
          result.data.found === true
        ) {
          showKnowledgeResult(result.data);

          showStatus(
            "✅ Sawirka Database-ka waa laga helay."
          );
        } else {
          showImageNotFound();

          showStatus(
            "Sawirka Database-ka lagama helin."
          );
        }

        removeSelectedImage();

        await loadHistory();

        return;
      }

      /* =====================================================
         IMAGE + TEXT
      ===================================================== */

      if (hasImage && text) {
        const imageFile = selectedImageFile;
        const imageData = selectedImageData;

        /* First exact database match */

        let matchResult = null;

        try {
          matchResult = await matchDatabaseImage(
            imageFile
          );
        } catch (error) {
          console.warn(
            "Image match failed:",
            error
          );
        }

        if (
          matchResult?.data?.found === true
        ) {
          showKnowledgeResult(
            matchResult.data
          );
        }

        /* Then send image + text to Vision AI */

        showStatus(
          "👁️ Vision AI ayaa sawirka eegaya..."
        );

        const aiData = await sendToAI(
          text,
          imageData
        );

        const aiText = getAIText(aiData);

        if (aiText) {
          addMessage(
            aiText,
            "assistant"
          );
        }

        removeSelectedImage();

        await loadHistory();

        return;
      }

      /* =====================================================
         TEXT ONLY
      ===================================================== */

      const data = await sendToAI(text);

      const responseText = getAIText(data);

      if (responseText) {
        addMessage(
          responseText,
          "assistant"
        );
      } else {
        addMessage(
          "❌ AI jawaab kama soo celin.",
          "assistant"
        );
      }

      showStatus("✅ Waa la diray.");

      await loadHistory();

    } catch (error) {
      console.error(
        "SEND ERROR:",
        error
      );

      addMessage(
        "❌ Khalad ayaa dhacay: " +
        error.message,
        "assistant"
      );

      showStatus(
        "❌ Fariinta lama diri karin.",
        "error"
      );

    } finally {
      isSending = false;
    }
  }

  /* =========================================================
     CHAT HISTORY
  ========================================================= */

  async function loadHistory() {
    try {
      const url =
        API_HISTORY +
        "?clientId=" +
        encodeURIComponent(clientId);

      const response = await fetch(url);

      if (!response.ok) return;

      const data = await response.json();

      const chats =
        Array.isArray(data)
          ? data
          : data.chats || [];

      if (!chats.length) return;

      /* Do not duplicate current messages.
         History is available through local app state/server. */
      return chats;

    } catch (error) {
      console.warn(
        "History error:",
        error
      );
    }
  }

  /* =========================================================
     DELETE CHAT
  ========================================================= */

  async function deleteChat() {
    const confirmed = window.confirm(
      "Ma rabtaa inaad tirtirto Chat History-ga?"
    );

    if (!confirmed) return;

    try {
      const response = await fetch(
        API_HISTORY +
          "?clientId=" +
          encodeURIComponent(clientId),
        {
          method: "DELETE"
        }
      );

      let data = {};

      try {
        data = await response.json();
      } catch {}

      if (!response.ok) {
        throw new Error(
          data.error ||
          "Chat-ka lama tirtiri karin."
        );
      }

      const container =
        getChatContainer();

      if (container) {
        container.innerHTML = "";
      }

      addMessage(
        "🗑️ Chat History waa la tirtiray.",
        "assistant"
      );

      showStatus(
        "✅ Chat waa la tirtiray."
      );

    } catch (error) {
      console.error(error);

      showStatus(
        "❌ Chat lama tirtirin.",
        "error"
      );
    }
  }

  /* =========================================================
     DARK / LIGHT MODE
  ========================================================= */

  function applyTheme(theme) {
    const body = document.body;

    if (!body) return;

    if (theme === "dark") {
      body.classList.add("dark-mode");
      body.classList.remove("light-mode");
    } else {
      body.classList.add("light-mode");
      body.classList.remove("dark-mode");
    }

    localStorage.setItem(
      "nasiibTheme",
      theme
    );

    updateThemeButton(theme);
  }

  function getSavedTheme() {
    const saved =
      localStorage.getItem(
        "nasiibTheme"
      );

    if (
      saved === "dark" ||
      saved === "light"
    ) {
      return saved;
    }

    /* System preference */

    if (
      window.matchMedia &&
      window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches
    ) {
      return "dark";
    }

    return "light";
  }

  function updateThemeButton(theme) {
    let button =
      $("themeBtn") ||
      $("themeButton") ||
      document.querySelector(
        "[data-action='theme']"
      );

    if (!button) return;

    if (theme === "dark") {
      button.textContent = "☀️";
      button.title = "Light Mode";
      button.setAttribute(
        "aria-label",
        "Light Mode"
      );
    } else {
      button.textContent = "🌙";
      button.title = "Dark Mode";
      button.setAttribute(
        "aria-label",
        "Dark Mode"
      );
    }
  }

  function toggleTheme() {
    const current =
      document.body.classList.contains(
        "dark-mode"
      )
        ? "dark"
        : "light";

    applyTheme(
      current === "dark"
        ? "light"
        : "dark"
    );
  }

  /* =========================================================
     CREATE THEME BUTTON IF HTML DOES NOT HAVE ONE
  ========================================================= */

  function createThemeButton() {
    let button =
      $("themeBtn") ||
      $("themeButton") ||
      document.querySelector(
        "[data-action='theme']"
      );

    if (!button) {
      button =
        document.createElement("button");

      button.id = "themeBtn";
      button.type = "button";

      button.style.position = "fixed";
      button.style.top = "12px";
      button.style.right = "12px";
      button.style.zIndex = "9999";

      button.style.width = "42px";
      button.style.height = "42px";

      button.style.borderRadius = "50%";
      button.style.border = "1px solid rgba(127,127,127,.3)";

      button.style.cursor = "pointer";

      button.style.fontSize = "19px";

      button.style.background =
        "var(--theme-button-bg, #ffffff)";

      button.style.color =
        "var(--theme-button-color, #222)";

      document.body.appendChild(button);
    }

    button.addEventListener(
      "click",
      toggleTheme
    );

    updateThemeButton(
      getSavedTheme()
    );
  }

  /* =========================================================
     THEME CSS
     App.js ayaa iskiis u gelinaya CSS-ka
  ========================================================= */

  function injectThemeCSS() {
    if ($("nasiibThemeCSS")) return;

    const style =
      document.createElement("style");

    style.id = "nasiibThemeCSS";

    style.textContent = `
      :root {
        --bg: #f7f7f8;
        --surface: #ffffff;
        --surface-2: #f0f0f0;
        --text: #202123;
        --muted: #6b7280;
        --border: #dddddd;
        --primary: #10a37f;
        --danger: #dc2626;
        --user-bg: #10a37f;
        --user-text: #ffffff;
        --assistant-bg: #ffffff;
      }

      body.light-mode {
        background: var(--bg);
        color: var(--text);
      }

      body.dark-mode {
        --bg: #171717;
        --surface: #212121;
        --surface-2: #2b2b2b;
        --text: #f5f5f5;
        --muted: #a3a3a3;
        --border: #404040;
        --primary: #10a37f;
        --user-bg: #10a37f;
        --user-text: #ffffff;
        --assistant-bg: #262626;

        background: var(--bg) !important;
        color: var(--text) !important;
      }

      body.dark-mode input,
      body.dark-mode textarea,
      body.dark-mode select {
        background: #2b2b2b !important;
        color: #f5f5f5 !important;
        border-color: #444 !important;
      }

      body.dark-mode button {
        color: #f5f5f5;
      }

      body.dark-mode
      .chat-message {
        border-color: #404040;
      }

      body.dark-mode
      .assistant-message {
        background: var(--assistant-bg);
        color: var(--text);
      }

      body.dark-mode
      .user-message {
        background: var(--user-bg);
        color: var(--user-text);
      }

      body.light-mode
      .assistant-message {
        background: #ffffff;
        color: #202123;
      }

      body.light-mode
      .user-message {
        background: #10a37f;
        color: #ffffff;
      }

      #imagePreview img {
        background: var(--surface-2);
      }

      audio {
        max-width: 100%;
      }

      @media (max-width: 600px) {
        body {
          width: 100%;
          overflow-x: hidden;
        }

        #themeBtn {
          top: 8px !important;
          right: 8px !important;
          width: 38px !important;
          height: 38px !important;
          font-size: 17px !important;
        }

        .chat-message {
          max-width: 94% !important;
          font-size: 14px;
        }

        textarea {
          font-size: 16px !important;
        }

        button {
          min-height: 40px;
        }

        img {
          max-width: 100%;
        }
      }
    `;

    document.head.appendChild(style);
  }

  /* =========================================================
     BUTTON EVENTS
  ========================================================= */

  function setupButtons() {
    const gallery = findGalleryButton();

    if (gallery) {
      gallery.addEventListener(
        "click",
        openGallery
      );
    }

    const camera = findCameraButton();

    if (camera) {
      camera.addEventListener(
        "click",
        openCamera
      );
    }

    const send = findSendButton();

    if (send) {
      send.addEventListener(
        "click",
        sendMessage
      );
    }

    const deleteButton =
      findDeleteButton();

    if (deleteButton) {
      deleteButton.addEventListener(
        "click",
        deleteChat
      );
    }
  }

  /* =========================================================
     ENTER / SHIFT+ENTER
  ========================================================= */

  function setupInput() {
    const input = getInput();

    if (!input) return;

    input.addEventListener(
      "keydown",
      (event) => {
        if (
          event.key === "Enter" &&
          !event.shiftKey
        ) {
          event.preventDefault();

          sendMessage();
        }

        /* Shift + Enter = new line */
      }
    );
  }

  /* =========================================================
     HEALTH CHECK
  ========================================================= */

  async function checkHealth() {
    try {
      const response =
        await fetch(API_HEALTH);

      if (!response.ok) {
        showStatus(
          "⚠️ Server-ku ma shaqaynayo.",
          "error"
        );

        return false;
      }

      return true;

    } catch (error) {
      console.warn(
        "Health check:",
        error
      );

      showStatus(
        "⚠️ Server lama xiriirin.",
        "error"
      );

      return false;
    }
  }

  /* =========================================================
     MOBILE HANDLING
  ========================================================= */

  function setupMobileHandling() {
    function setViewportHeight() {
      document.documentElement.style.setProperty(
        "--vh",
        `${window.innerHeight * 0.01}px`
      );
    }

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
  }

  /* =========================================================
     PREVENT DRAG/DROP NAVIGATION
  ========================================================= */

  function setupDragDrop() {
    document.addEventListener(
      "dragover",
      (event) => {
        event.preventDefault();
      }
    );

    document.addEventListener(
      "drop",
      (event) => {
        event.preventDefault();

        const file =
          event.dataTransfer?.files?.[0];

        if (
          file &&
          file.type.startsWith("image/")
        ) {
          selectedImageFile = file;

          fileToBase64(file)
            .then((data) => {
              selectedImageData = data;

              showImagePreview(file);
            })
            .catch(console.error);
        }
      }
    );
  }

  /* =========================================================
     INITIALIZE
  ========================================================= */

  async function init() {
    injectThemeCSS();

    createDynamicInputs();

    createThemeButton();

    applyTheme(
      getSavedTheme()
    );

    setupButtons();

    setupInput();

    setupMobileHandling();

    setupDragDrop();

    showStatus(
      "👤 Public User — Login looma baahna."
    );

    await checkHealth();
  }

  /* =========================================================
     GLOBAL API
  ========================================================= */

  window.NasiibApp = {
    sendMessage,
    openGallery,
    openCamera,
    removeSelectedImage,
    loadHistory,
    deleteChat,
    toggleTheme,
    applyTheme,
    getClientId: () => clientId
  };

  /* =========================================================
     START
  ========================================================= */

  if (
    document.readyState === "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      init
    );
  } else {
    init();
  }

})();
