(() => {
  "use strict";

  /* =====================================================
     NASIIB BUSINESS CENTER
     PUBLIC USER APP
  ===================================================== */

  const API_CHAT = "/chat";
  const API_MATCH_IMAGE = "/api/match-image";
  const API_HISTORY = "/api/chats";
  const API_HEALTH = "/api/health";

  const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

  const $ = (id) => document.getElementById(id);

  /* =====================================================
     ELEMENTS
  ===================================================== */

  const chatBox = $("chatBox");
  const chatInner = $("chatInner");
  const welcome = $("welcome");

  const messageInput = $("messageInput");
  const sendBtn = $("sendBtn");

  const galleryInput = $("galleryInput");
  const cameraInput = $("cameraInput");

  const previewBox = $("previewBox");
  const previewImage = $("previewImage");
  const removeImageBtn = $("removeImageBtn");

  const errorBox = $("errorBox");
  const historyList = $("historyList");

  const newChatBtn = $("newChatBtn");
  const deleteChatBtn = $("deleteChatBtn");

  const themeSelect = $("themeSelect");

  const statusDot = $("statusDot");
  const statusText = $("statusText");

  const sidebar = $("sidebar");
  const menuBtn = $("menuBtn");
  const overlay = $("overlay");


  /* =====================================================
     CHECK ELEMENTS
  ===================================================== */

  if (
    !chatBox ||
    !chatInner ||
    !messageInput ||
    !sendBtn ||
    !galleryInput ||
    !cameraInput
  ) {
    console.error(
      "❌ NASIIB APP: Qaar ka mid ah HTML elements lama helin."
    );

    return;
  }


  /* =====================================================
     CLIENT ID
     PUBLIC USER
     LOGIN MA JIRO
  ===================================================== */

  let clientId =
    localStorage.getItem("nasiib_client_id");

  if (!clientId) {

    clientId =
      (
        window.crypto &&
        typeof window.crypto.randomUUID === "function"
      )
        ? window.crypto.randomUUID()
        : "client-" +
          Date.now() +
          "-" +
          Math.random()
            .toString(36)
            .slice(2);

    localStorage.setItem(
      "nasiib_client_id",
      clientId
    );
  }


  /* =====================================================
     STATE
  ===================================================== */

  let currentImage = null;
  let currentImageName = "";

  let sending = false;


  /* =====================================================
     ESCAPE HTML
  ===================================================== */

  function escapeHtml(value) {

    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }


  /* =====================================================
     SAFE URL
  ===================================================== */

  function safeUrl(url) {

    if (!url) {
      return "";
    }

    const value =
      String(url).trim();

    /*
      Server-kaaga wuxuu soo celiyaa
      /uploads/knowledge/filename
    */

    if (value.startsWith("/")) {
      return value;
    }

    /*
      Haddii URL buuxa yahay
    */

    try {

      const parsed =
        new URL(
          value,
          window.location.origin
        );

      if (
        parsed.protocol === "http:" ||
        parsed.protocol === "https:"
      ) {
        return parsed.href;
      }

    } catch {
      return "";
    }

    return "";
  }


  /* =====================================================
     ERROR
  ===================================================== */

  function showError(message) {

    if (!errorBox) {
      return;
    }

    errorBox.textContent =
      message || "";

    errorBox.hidden = false;
  }


  function clearError() {

    if (!errorBox) {
      return;
    }

    errorBox.textContent = "";

    errorBox.hidden = true;
  }


  /* =====================================================
     SCROLL
  ===================================================== */

  function scrollBottom() {

    requestAnimationFrame(() => {

      chatBox.scrollTop =
        chatBox.scrollHeight;

    });
  }


  /* =====================================================
     REMOVE WELCOME
  ===================================================== */

  function removeWelcome() {

    const currentWelcome =
      $("welcome");

    if (currentWelcome) {
      currentWelcome.remove();
    }
  }


  /* =====================================================
     ADD USER MESSAGE
  ===================================================== */

  function addUserMessage(
    text,
    image
  ) {

    removeWelcome();

    const wrapper =
      document.createElement("div");

    wrapper.className =
      "message user";

    const imageHtml =
      image
        ? `
          <img
            class="message-image"
            src="${escapeHtml(image)}"
            alt="Sawirka User-ka"
          >
        `
        : "";

    wrapper.innerHTML = `
      <div class="avatar">👤</div>

      <div class="message-content">

        <div class="message-name">
          Adiga
        </div>

        <div class="bubble">

          ${imageHtml}

          ${
            text
              ? escapeHtml(text)
              : ""
          }

        </div>

      </div>
    `;

    chatInner.appendChild(wrapper);

    scrollBottom();
  }


  /* =====================================================
     ADD AI TEXT MESSAGE
  ===================================================== */

  function addAssistantMessage(
    text
  ) {

    removeWelcome();

    const wrapper =
      document.createElement("div");

    wrapper.className =
      "message assistant";

    wrapper.innerHTML = `
      <div class="avatar">
        👳
      </div>

      <div class="message-content">

        <div class="message-name">
          AI
        </div>

        <div class="bubble">
          ${escapeHtml(text || "")}
        </div>

      </div>
    `;

    chatInner.appendChild(wrapper);

    scrollBottom();
  }


  /* =====================================================
     ADD DATABASE IMAGE RESULT
  ===================================================== */

  function addDatabaseResult(
    knowledge
  ) {

    removeWelcome();

    const wrapper =
      document.createElement("div");

    wrapper.className =
      "message assistant database-result";


    const title =
      knowledge?.title || "";


    const content =
      knowledge?.content || "";


    const imageUrl =
      safeUrl(
        knowledge?.image_url
      );


    const audioUrl =
      safeUrl(
        knowledge?.audio_url
      );


    let imageHtml = "";

    if (imageUrl) {

      imageHtml = `
        <img
          class="message-image database-image"
          src="${escapeHtml(imageUrl)}"
          alt="${escapeHtml(title || "Sawir Database")}"
        >
      `;

    }


    let audioHtml = "";

    if (audioUrl) {

      audioHtml = `
        <div class="database-audio">

          <div class="audio-title">
            🔊 Dhageyso Codka
          </div>

          <audio
            class="knowledge-audio"
            controls
            preload="metadata"
            src="${escapeHtml(audioUrl)}"
          >
          </audio>

        </div>
      `;

    }


    if (!audioUrl) {

      audioHtml = `
        <div class="no-audio">
          🔇 Cod laguma kaydin entry-gan.
        </div>
      `;

    }


    wrapper.innerHTML = `
      <div class="avatar">
        👳
      </div>

      <div class="message-content">

        <div class="message-name">
          AI
        </div>

        <div class="bubble database-bubble">

          <div class="match-success">
            ✅ Sawirka Database-ka waa laga helay.
          </div>

          ${
            title
              ? `
                <h3 class="knowledge-title">
                  ${escapeHtml(title)}
                </h3>
              `
              : ""
          }

          ${imageHtml}

          ${
            content
              ? `
                <div class="knowledge-content">
                  ${escapeHtml(content)}
                </div>
              `
              : ""
          }

          ${audioHtml}

        </div>

      </div>
    `;


    chatInner.appendChild(wrapper);

    scrollBottom();


    /*
      Haddii audio jiro,
      player-ka diyaari.
    */

    const audio =
      wrapper.querySelector(
        ".knowledge-audio"
      );

    if (audio) {

      audio.addEventListener(
        "error",
        () => {

          const audioBox =
            wrapper.querySelector(
              ".database-audio"
            );

          if (audioBox) {

            audioBox.innerHTML = `
              <div class="no-audio">
                ❌ Codka lama ciyaari karin.
              </div>
            `;

          }

        }
      );

    }
  }


  /* =====================================================
     ADD IMAGE NOT FOUND
  ===================================================== */

  function addImageNotFoundMessage() {

    removeWelcome();

    const wrapper =
      document.createElement("div");

    wrapper.className =
      "message assistant";


    wrapper.innerHTML = `
      <div class="avatar">
        👳
      </div>

      <div class="message-content">

        <div class="message-name">
          AI
        </div>

        <div class="bubble image-not-found">
          👉🏻 alaabtani mataalo meherada fadlan sawirada ay meheradu soo dhigtay mid kamida soo dooro.
        </div>

      </div>
    `;


    chatInner.appendChild(wrapper);

    scrollBottom();
  }


  /* =====================================================
     TYPING
  ===================================================== */

  function addTyping() {

    removeWelcome();

    const old =
      $("typingMessage");

    if (old) {
      old.remove();
    }


    const wrapper =
      document.createElement("div");

    wrapper.className =
      "message assistant";

    wrapper.id =
      "typingMessage";


    wrapper.innerHTML = `
      <div class="avatar">
        👳
      </div>

      <div class="message-content">

        <div class="message-name">
          AI
        </div>

        <div class="typing">
          Wuu qorayaa
          <span>●</span>
          <span>●</span>
          <span>●</span>
        </div>

      </div>
    `;


    chatInner.appendChild(wrapper);

    scrollBottom();
  }


  function removeTyping() {

    const typing =
      $("typingMessage");

    if (typing) {
      typing.remove();
    }
  }


  /* =====================================================
     IMAGE PREVIEW
  ===================================================== */

  function setImage(file) {

    clearError();

    if (!file) {
      return;
    }


    if (
      !file.type ||
      !file.type.startsWith("image/")
    ) {

      showError(
        "❌ Fadlan dooro sawir."
      );

      return;
    }


    if (
      file.size >
      MAX_IMAGE_SIZE
    ) {

      showError(
        "❌ Sawirku waa inuu ka yaraadaa 5MB."
      );

      return;
    }


    const reader =
      new FileReader();


    reader.onload =
      () => {

        currentImage =
          reader.result;

        currentImageName =
          file.name ||
          "image";


        if (previewImage) {

          previewImage.src =
            currentImage;

        }


        if (previewBox) {

          previewBox.classList.add(
            "show"
          );

        }

      };


    reader.onerror =
      () => {

        showError(
          "❌ Sawirka lama akhrin karin."
        );

      };


    reader.readAsDataURL(file);
  }


  /* =====================================================
     REMOVE IMAGE
  ===================================================== */

  function removeImage() {

    currentImage = null;

    currentImageName = "";


    if (previewImage) {

      previewImage.removeAttribute(
        "src"
      );

    }


    if (previewBox) {

      previewBox.classList.remove(
        "show"
      );

    }


    galleryInput.value = "";

    cameraInput.value = "";
  }


  /* =====================================================
     AUTO RESIZE TEXTAREA
  ===================================================== */

  function autoResize() {

    messageInput.style.height =
      "auto";

    messageInput.style.height =
      Math.min(
        messageInput.scrollHeight,
        150
      ) + "px";
  }


  /* =====================================================
     SENDING STATE
  ===================================================== */

  function setSending(
    value
  ) {

    sending =
      value;


    sendBtn.disabled =
      value;

    messageInput.disabled =
      value;

    galleryInput.disabled =
      value;

    cameraInput.disabled =
      value;

  }


  /* =====================================================
     DATA URL → BLOB
  ===================================================== */

  function dataUrlToBlob(
    dataUrl
  ) {

    const parts =
      String(dataUrl)
        .split(",");


    if (parts.length !== 2) {

      throw new Error(
        "Sawirka format-kiisu sax ma aha."
      );

    }


    const header =
      parts[0];

    const data =
      parts[1];


    const match =
      header.match(
        /data:(.*?);base64/
      );


    const mimeType =
      match
        ? match[1]
        : "image/jpeg";


    const binary =
      atob(data);


    const length =
      binary.length;


    const bytes =
      new Uint8Array(
        length
      );


    for (
      let i = 0;
      i < length;
      i++
    ) {

      bytes[i] =
        binary.charCodeAt(i);

    }


    return new Blob(
      [bytes],
      {
        type: mimeType
      }
    );

  }


  /* =====================================================
     IMAGE → DATABASE MATCH
  ===================================================== */

  async function matchImageInDatabase(
    imageDataUrl
  ) {

    if (!imageDataUrl) {

      throw new Error(
        "Sawir lama helin."
      );

    }


    const blob =
      dataUrlToBlob(
        imageDataUrl
      );


    const formData =
      new FormData();


    formData.append(
      "image",
      blob,
      currentImageName ||
      "user-image.jpg"
    );


    const response =
      await fetch(
        API_MATCH_IMAGE,
        {
          method: "POST",
          body: formData,
          cache: "no-store"
        }
      );


    const data =
      await response
        .json()
        .catch(
          () => ({})
        );


    /*
      404 = sawirka lama helin
    */

    if (
      response.status === 404
    ) {

      return {
        found: false,
        data
      };

    }


    if (!response.ok) {

      throw new Error(
        data.error ||
        data.message ||
        `Image Match Error: ${response.status}`
      );

    }


    return {
      found:
        data.found === true,

      data
    };

  }


  /* =====================================================
     SEND NORMAL TEXT CHAT
  ===================================================== */

  async function sendTextChat(
    message
  ) {

    const response =
      await fetch(
        API_CHAT,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify({
              message:
                message,

              image:
                null,

              clientId:
                clientId
            })
        }
      );


    const data =
      await response
        .json()
        .catch(
          () => ({})
        );


    if (!response.ok) {

      throw new Error(
        data.error ||
        data.message ||
        `Server Error: ${response.status}`
      );

    }


    return data;
  }


  /* =====================================================
     MAIN SEND
  ===================================================== */

  async function sendMessage() {

    if (sending) {
      return;
    }


    const message =
      messageInput.value.trim();


    if (
      !message &&
      !currentImage
    ) {

      showError(
        "❌ Qor fariin ama dooro sawir."
      );

      messageInput.focus();

      return;
    }


    clearError();


    const sentText =
      message;


    const sentImage =
      currentImage;


    const sentImageName =
      currentImageName;


    /*
      User message muuqaalka
    */

    addUserMessage(
      sentText,
      sentImage
    );


    /*
      Input nadiifi
    */

    messageInput.value = "";

    autoResize();


    setSending(true);

    addTyping();


    try {

      /* =================================================
         1. SAWIR HADDII JIRO
         ================================================= */

      if (sentImage) {

        /*
          Marka hore Database-ka raadso.

          MUHIIM:
          /chat looma dirayo sawirka.
        */

        currentImageName =
          sentImageName;


        const result =
          await matchImageInDatabase(
            sentImage
          );


        removeTyping();


        /* ===============================================
           MATCH FOUND
        =============================================== */

        if (
          result.found === true &&
          result.data?.knowledge
        ) {

          addDatabaseResult(
            result.data.knowledge
          );


          /*
            Sawirka hadda la isticmaalay
            ka saar composer-ka.
          */

          removeImage();


          await loadHistory();


          return;
        }


        /* ===============================================
           IMAGE NOT FOUND
        =============================================== */

        addImageNotFoundMessage();

        removeImage();

        await loadHistory();

        return;
      }


      /* =================================================
         2. TEXT ONLY
         ================================================= */

      const data =
        await sendTextChat(
          sentText
        );


      removeTyping();


      const aiResponse =
        data.response ||
        data.answer ||
        data.message ||
        "NASIIB jawaab kama soo celin.";


      addAssistantMessage(
        aiResponse
      );


      await loadHistory();


    } catch (error) {

      console.error(
        "❌ SEND ERROR:",
        error
      );


      removeTyping();


      addAssistantMessage(
        "❌ Khalad ayaa dhacay: " +
        (
          error.message ||
          "Server lama heli karo."
        )
      );

    } finally {

      /*
        Composer-ka nadiifi.
      */

      removeImage();


      setSending(false);

      messageInput.focus();

      scrollBottom();
    }

  }


  /* =====================================================
     LOAD CHAT HISTORY
  ===================================================== */

  async function loadHistory() {

    try {

      const response =
        await fetch(
          `${API_HISTORY}?clientId=${encodeURIComponent(clientId)}`,
          {
            cache: "no-store"
          }
        );


      if (!response.ok) {
        return;
      }


      const data =
        await response
          .json()
          .catch(
            () => []
          );


      const chats =
        Array.isArray(data)
          ? data
          : Array.isArray(data.chats)
            ? data.chats
            : [];


      if (!historyList) {
        return;
      }


      historyList.innerHTML =
        "";


      if (!chats.length) {

        historyList.innerHTML =
          `
            <div class="history-item">
              Chat-yadii hore halkan ayay ka muuqanayaan.
            </div>
          `;

        return;
      }


      chats
        .slice()
        .reverse()
        .forEach(
          (chat) => {

            const item =
              document.createElement(
                "div"
              );


            item.className =
              "history-item";


            const text =
              chat.message ||
              chat.response ||
              "Chat";


            item.textContent =
              String(text)
                .replace(/\s+/g, " ")
                .slice(0, 70);


            historyList.appendChild(
              item
            );

          }
        );


    } catch (error) {

      console.warn(
        "⚠️ History lama soo qaadin:",
        error
      );

    }

  }


  /* =====================================================
     DELETE ALL CHATS
  ===================================================== */

  async function deleteAllChats() {

    const ok =
      window.confirm(
        "Ma hubtaa inaad tirtirayso dhammaan taariikhda Chat-ka?"
      );


    if (!ok) {
      return;
    }


    clearError();


    try {

      const response =
        await fetch(
          API_HISTORY,
          {
            method: "DELETE",

            headers: {
              "Content-Type":
                "application/json"
            },

            body:
              JSON.stringify({
                clientId:
                  clientId
              })
          }
        );


      const data =
        await response
          .json()
          .catch(
            () => ({})
          );


      if (!response.ok) {

        throw new Error(
          data.error ||
          "Chat-ka lama tirtirin."
        );

      }


      chatInner.innerHTML =
        `
          <div class="welcome" id="welcome">

            <div class="welcome-icon">
              👳
            </div>

            <h2>
              Chat cusub
            </h2>

            <p>
              Qor fariintaada si aad ula hadasho AI.
            </p>

          </div>
        `;


      if (historyList) {

        historyList.innerHTML =
          `
            <div class="history-item">
              Chat-yadii hore halkan ayay ka muuqanayaan.
            </div>
          `;

      }


      messageInput.focus();


    } catch (error) {

      showError(
        error.message ||
        "Chat-ka lama tirtirin."
      );

    }

  }


  /* =====================================================
     NEW CHAT
  ===================================================== */

  function newChat() {

    chatInner.innerHTML =
      `
        <div class="welcome" id="welcome">

          <div class="welcome-icon">
            👳
          </div>

          <h2>
            Chat cusub
          </h2>

          <p>
            Qor fariintaada si aad ula hadasho AI.
          </p>

        </div>
      `;


    clearError();

    removeImage();

    messageInput.value = "";

    autoResize();

    messageInput.focus();

    closeSidebar();

  }


  /* =====================================================
     SERVER HEALTH
  ===================================================== */

  async function checkHealth() {

    try {

      const response =
        await fetch(
          API_HEALTH,
          {
            cache: "no-store"
          }
        );


      if (!response.ok) {
        throw new Error();
      }


      if (statusDot) {

        statusDot.classList.add(
          "online"
        );

        statusDot.classList.remove(
          "offline"
        );

      }


      if (statusText) {

        statusText.textContent =
          "Online";

      }


    } catch {

      if (statusDot) {

        statusDot.classList.add(
          "offline"
        );

        statusDot.classList.remove(
          "online"
        );

      }


      if (statusText) {

        statusText.textContent =
          "Offline";

      }

    }

  }


  /* =====================================================
     THEME
  ===================================================== */

  function applyTheme(
    theme
  ) {

    let selected =
      theme;


    if (
      selected === "system"
    ) {

      selected =
        window.matchMedia(
          "(prefers-color-scheme: dark)"
        ).matches
          ? "dark"
          : "light";

    }


    document.body.classList.toggle(
      "dark",
      selected === "dark"
    );

  }


  function saveTheme(
    theme
  ) {

    localStorage.setItem(
      "nasiib_theme",
      theme
    );


    if (themeSelect) {

      themeSelect.value =
        theme;

    }


    applyTheme(theme);

  }


  function initTheme() {

    if (!themeSelect) {
      return;
    }


    const saved =
      localStorage.getItem(
        "nasiib_theme"
      ) ||
      "system";


    themeSelect.value =
      saved;


    applyTheme(
      saved
    );


    const media =
      window.matchMedia(
        "(prefers-color-scheme: dark)"
      );


    media.addEventListener?.(
      "change",
      () => {

        if (
          (
            localStorage.getItem(
              "nasiib_theme"
            ) ||
            "system"
          ) === "system"
        ) {

          applyTheme(
            "system"
          );

        }

      }
    );

  }


  /* =====================================================
     MOBILE SIDEBAR
  ===================================================== */

  function openSidebar() {

    if (sidebar) {

      sidebar.classList.add(
        "open"
      );

    }


    if (overlay) {

      overlay.classList.add(
        "show"
      );

    }

  }


  function closeSidebar() {

    if (sidebar) {

      sidebar.classList.remove(
        "open"
      );

    }


    if (overlay) {

      overlay.classList.remove(
        "show"
      );

    }

  }


  /* =====================================================
     DATABASE RESULT CSS
  ===================================================== */

  function addDatabaseStyles() {

    if (
      document.getElementById(
        "nasiib-database-audio-style"
      )
    ) {

      return;
    }


    const style =
      document.createElement(
        "style"
      );


    style.id =
      "nasiib-database-audio-style";


    style.textContent = `

      .database-bubble {
        overflow: hidden;
      }

      .match-success {
        font-weight: 700;
        margin-bottom: 12px;
      }

      .knowledge-title {
        margin: 0 0 10px;
        font-size: 20px;
        line-height: 1.35;
      }

      .knowledge-content {
        white-space: pre-wrap;
        line-height: 1.7;
        margin-bottom: 14px;
      }

      .database-image {
        max-width: min(500px, 100%);
        max-height: 430px;
        width: auto;
        object-fit: contain;
        display: block;
        margin: 10px 0 15px;
        border-radius: 12px;
      }

      .database-audio {
        margin-top: 14px;
        padding: 12px;
        border-radius: 12px;
        background: var(--surface-2);
        border: 1px solid var(--border);
      }

      .audio-title {
        font-weight: 700;
        margin-bottom: 8px;
      }

      .knowledge-audio {
        display: block;
        width: 100%;
        max-width: 500px;
        height: 42px;
      }

      .no-audio {
        margin-top: 12px;
        padding: 10px;
        border-radius: 10px;
        background: var(--surface-2);
        color: var(--muted);
        font-size: 13px;
      }

      .image-not-found {
        border-color: #dc3545;
      }

      @media (max-width: 760px) {

        .knowledge-title {
          font-size: 18px;
        }

        .knowledge-content {
          font-size: 14px;
        }

        .database-image {
          max-height: 330px;
        }

        .database-audio {
          padding: 10px;
        }

        .knowledge-audio {
          height: 40px;
        }

      }

    `;


    document.head.appendChild(
      style
    );

  }


  /* =====================================================
     EVENTS
  ===================================================== */

  galleryInput.addEventListener(
    "change",
    (event) => {

      setImage(
        event.target.files?.[0]
      );

    }
  );


  cameraInput.addEventListener(
    "change",
    (event) => {

      setImage(
        event.target.files?.[0]
      );

    }
  );


  if (removeImageBtn) {

    removeImageBtn.addEventListener(
      "click",
      removeImage
    );

  }


  sendBtn.addEventListener(
    "click",
    sendMessage
  );


  if (newChatBtn) {

    newChatBtn.addEventListener(
      "click",
      newChat
    );

  }


  if (deleteChatBtn) {

    deleteChatBtn.addEventListener(
      "click",
      deleteAllChats
    );

  }


  if (menuBtn) {

    menuBtn.addEventListener(
      "click",
      openSidebar
    );

  }


  if (overlay) {

    overlay.addEventListener(
      "click",
      closeSidebar
    );

  }


  if (themeSelect) {

    themeSelect.addEventListener(
      "change",
      (event) => {

        saveTheme(
          event.target.value
        );

      }
    );

  }


  messageInput.addEventListener(
    "input",
    autoResize
  );


  messageInput.addEventListener(
    "keydown",
    (event) => {

      if (
        event.key === "Enter" &&
        !event.shiftKey
      ) {

        event.preventDefault();

        sendMessage();

      }

    }
  );


  document
    .querySelector(
      ".admin-link"
    )
    ?.addEventListener(
      "click",
      closeSidebar
    );


  /* =====================================================
     INITIALIZE
  ===================================================== */

  addDatabaseStyles();

  initTheme();

  autoResize();

  loadHistory();

  checkHealth();


  /* =====================================================
     HEALTH CHECK
  ===================================================== */

  setInterval(
    checkHealth,
    30000
  );


  console.log(
    "✅ NASIIB BUSINESS CENTER public/app.js loaded."
  );

})();
