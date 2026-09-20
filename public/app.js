(() => {
  "use strict";

  /* =========================================================
     NASIIB BUSINESS CENTER
     PUBLIC USER APP
     LOGIN LOOMA BAAHNA
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

  const safeJson = async (response) => {
    try {
      return await response.json();
    } catch {
      return {};
    }
  };

  /* =========================================================
     CLIENT ID
  ========================================================= */

  let clientId =
    localStorage.getItem("nasiibClientId");

  if (!clientId) {
    clientId =
      "client_" +
      Date.now() +
      "_" +
      Math.random()
        .toString(36)
        .slice(2, 12);

    localStorage.setItem(
      "nasiibClientId",
      clientId
    );
  }

  /* =========================================================
     STATE
  ========================================================= */

  let selectedImageFile = null;
  let selectedImageBase64 = null;
  let sending = false;

  /* =========================================================
     ELEMENTS
  ========================================================= */

  const chatBox = $("chatBox");
  const chatInner = $("chatInner");

  const messageInput =
    $("messageInput");

  const galleryInput =
    $("galleryInput");

  const cameraInput =
    $("cameraInput");

  const previewBox =
    $("previewBox");

  const previewImage =
    $("previewImage");

  const removeImageBtn =
    $("removeImageBtn");

  const errorBox =
    $("errorBox");

  const themeSelect =
    $("themeSelect");

  const deleteChatBtn =
    $("deleteChatBtn");

  const menuBtn =
    $("menuBtn");

  const sidebar =
    $("sidebar");

  const overlay =
    $("overlay");

  const historyList =
    $("historyList");

  const newChatBtn =
    $("newChatBtn");

  const statusDot =
    $("statusDot");

  const statusText =
    $("statusText");

  /* =========================================================
     ERROR
  ========================================================= */

  function showError(message) {
    if (!errorBox) return;

    errorBox.textContent =
      message || "";

    errorBox.hidden =
      !message;
  }

  function clearError() {
    showError("");
  }

  /* =========================================================
     STATUS
  ========================================================= */

  function setStatus(
    text,
    online = null
  ) {
    if (statusText) {
      statusText.textContent =
        text;
    }

    if (statusDot) {
      statusDot.classList.remove(
        "online",
        "offline"
      );

      if (online === true) {
        statusDot.classList.add(
          "online"
        );
      }

      if (online === false) {
        statusDot.classList.add(
          "offline"
        );
      }
    }
  }

  /* =========================================================
     WELCOME
  ========================================================= */

  function removeWelcome() {
    const welcome =
      $("welcome");

    if (welcome) {
      welcome.remove();
    }
  }

  /* =========================================================
     SCROLL
  ========================================================= */

  function scrollChat() {
    if (!chatBox) return;

    requestAnimationFrame(() => {
      chatBox.scrollTop =
        chatBox.scrollHeight;
    });
  }

  /* =========================================================
     ADD MESSAGE
  ========================================================= */

  function addMessage(
    text,
    type = "assistant",
    options = {}
  ) {
    if (!chatInner) return;

    removeWelcome();

    const message =
      document.createElement("div");

    message.className =
      `message ${type}`;

    /* Avatar */

    const avatar =
      document.createElement("div");

    avatar.className =
      "avatar";

    avatar.textContent =
      type === "user"
        ? "👤"
        : "👳";

    /* Content */

    const content =
      document.createElement("div");

    content.className =
      "message-content";

    /* Name */

    const name =
      document.createElement("div");

    name.className =
      "message-name";

    name.textContent =
      type === "user"
        ? "Adiga"
        : "NASIIB AI";

    /* Bubble */

    const bubble =
      document.createElement("div");

    bubble.className =
      "bubble";

    /* =====================================================
       TITLE
    ===================================================== */

    if (options.title) {
      const title =
        document.createElement("strong");

      title.textContent =
        options.title;

      title.style.display =
        "block";

      title.style.marginBottom =
        "8px";

      bubble.appendChild(title);
    }

    /* =====================================================
       IMAGE
    ===================================================== */

    if (options.image_url) {
      const img =
        document.createElement("img");

      img.className =
        "message-image";

      img.src =
        options.image_url;

      img.alt =
        options.title ||
        "Database Image";

      img.loading =
        "lazy";

      bubble.appendChild(img);
    }

    /* =====================================================
       TEXT
    ===================================================== */

    if (text) {
      const textNode =
        document.createElement("div");

      textNode.textContent =
        text;

      bubble.appendChild(
        textNode
      );
    }

    /* =====================================================
       AUDIO
    ===================================================== */

    if (options.audio_url) {
      const audioBox =
        document.createElement("div");

      audioBox.style.marginTop =
        "10px";

      const audioTitle =
        document.createElement("div");

      audioTitle.textContent =
        "🔊 ▶️ Dhageyso Codka";

      audioTitle.style.fontWeight =
        "700";

      audioTitle.style.marginBottom =
        "5px";

      const audio =
        document.createElement("audio");

      audio.controls =
        true;

      audio.preload =
        "metadata";

      audio.src =
        options.audio_url;

      audio.style.width =
        "100%";

      audioBox.appendChild(
        audioTitle
      );

      audioBox.appendChild(
        audio
      );

      bubble.appendChild(
        audioBox
      );
    }

    content.appendChild(
      name
    );

    content.appendChild(
      bubble
    );

    message.appendChild(
      avatar
    );

    message.appendChild(
      content
    );

    chatInner.appendChild(
      message
    );

    scrollChat();
  }

  /* =========================================================
     TYPING
  ========================================================= */

  function showTyping() {
    removeTyping();

    if (!chatInner) return;

    removeWelcome();

    const message =
      document.createElement("div");

    message.id =
      "typingMessage";

    message.className =
      "message assistant";

    const avatar =
      document.createElement("div");

    avatar.className =
      "avatar";

    avatar.textContent =
      "👳";

    const content =
      document.createElement("div");

    content.className =
      "message-content";

    const name =
      document.createElement("div");

    name.className =
      "message-name";

    name.textContent =
      "NASIIB AI";

    const typing =
      document.createElement("div");

    typing.className =
      "typing";

    typing.innerHTML =
      "Waan qorayaa <span>.</span><span>.</span><span>.</span>";

    content.appendChild(
      name
    );

    content.appendChild(
      typing
    );

    message.appendChild(
      avatar
    );

    message.appendChild(
      content
    );

    chatInner.appendChild(
      message
    );

    scrollChat();
  }

  function removeTyping() {
    const typing =
      $("typingMessage");

    if (typing) {
      typing.remove();
    }
  }

  /* =========================================================
     FILE → BASE64
  ========================================================= */

  function fileToBase64(file) {
    return new Promise(
      (resolve, reject) => {
        const reader =
          new FileReader();

        reader.onload = () =>
          resolve(
            reader.result
          );

        reader.onerror =
          reject;

        reader.readAsDataURL(
          file
        );
      }
    );
  }

  /* =========================================================
     IMAGE PREVIEW
  ========================================================= */

  function showPreview(file) {
    if (
      !previewBox ||
      !previewImage
    ) {
      return;
    }

    const objectUrl =
      URL.createObjectURL(
        file
      );

    previewImage.src =
      objectUrl;

    previewBox.classList.add(
      "show"
    );
  }

  /* =========================================================
     REMOVE IMAGE
  ========================================================= */

  function removeSelectedImage() {
    selectedImageFile =
      null;

    selectedImageBase64 =
      null;

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

    if (galleryInput) {
      galleryInput.value =
        "";
    }

    if (cameraInput) {
      cameraInput.value =
        "";
    }
  }

  /* =========================================================
     IMAGE SELECTED
  ========================================================= */

  async function handleImage(
    file
  ) {
    clearError();

    if (!file) {
      return;
    }

    if (
      !file.type.startsWith(
        "image/"
      )
    ) {
      showError(
        "❌ Fadlan dooro sawir sax ah."
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

    try {
      selectedImageFile =
        file;

      selectedImageBase64 =
        await fileToBase64(
          file
        );

      showPreview(
        file
      );

      setStatus(
        "🖼️ Sawirka waa diyaar.",
        true
      );

    } catch (error) {
      console.error(
        error
      );

      removeSelectedImage();

      showError(
        "❌ Sawirka lama akhrin karin."
      );
    }
  }

  /* =========================================================
     GALLERY
  ========================================================= */

  function openGallery() {
    if (!galleryInput) {
      createImageInputs();

      if (!galleryInput) {
        showError(
          "❌ Gallery lama helin."
        );

        return;
      }
    }

    galleryInput.value =
      "";

    galleryInput.click();
  }

  /* =========================================================
     CAMERA
  ========================================================= */

  function openCamera() {
    if (!cameraInput) {
      createImageInputs();

      if (!cameraInput) {
        showError(
          "❌ Camera lama helin."
        );

        return;
      }
    }

    cameraInput.value =
      "";

    cameraInput.click();
  }

  /* =========================================================
     CREATE INPUTS IF HTML DOES NOT HAVE THEM
  ========================================================= */

  function createImageInputs() {
    let gallery =
      $("galleryInput");

    let camera =
      $("cameraInput");

    if (!gallery) {
      gallery =
        document.createElement(
          "input"
        );

      gallery.type =
        "file";

      gallery.id =
        "galleryInput";

      gallery.accept =
        "image/*";

      gallery.style.display =
        "none";

      document.body.appendChild(
        gallery
      );

      gallery.addEventListener(
        "change",
        (event) => {
          handleImage(
            event.target.files?.[0]
          );
        }
      );
    }

    if (!camera) {
      camera =
        document.createElement(
          "input"
        );

      camera.type =
        "file";

      camera.id =
        "cameraInput";

      camera.accept =
        "image/*";

      camera.capture =
        "environment";

      camera.style.display =
        "none";

      document.body.appendChild(
        camera
      );

      camera.addEventListener(
        "change",
        (event) => {
          handleImage(
            event.target.files?.[0]
          );
        }
      );
    }
  }

  /* =========================================================
     DATABASE IMAGE MATCH
  ========================================================= */

  async function matchDatabaseImage(
    file
  ) {
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
          method: "POST",
          body: formData
        }
      );

    const data =
      await safeJson(
        response
      );

    return {
      ok: response.ok,
      status: response.status,
      data
    };
  }

  /* =========================================================
     SHOW DATABASE RESULT
  ========================================================= */

  function showDatabaseResult(
    data
  ) {
    if (!data) return;

    const knowledge =
      data.knowledge ||
      {};

    const title =
      data.title ||
      knowledge.title ||
      "Database";

    const content =
      data.content ||
      knowledge.content ||
      "";

    const imageUrl =
      data.image_url ||
      knowledge.image_url ||
      "";

    const audioUrl =
      data.audio_url ||
      knowledge.audio_url ||
      "";

    addMessage(
      content,
      "assistant",
      {
        title:
          "📚 " + title,

        image_url:
          imageUrl,

        audio_url:
          audioUrl
      }
    );
  }

  /* =========================================================
     IMAGE NOT FOUND
  ========================================================= */

  function showNotFound() {
    addMessage(
      "❌ Sawirkan Database-ka lagama helin.",
      "assistant"
    );
  }

  /* =========================================================
     GET AI TEXT
  ========================================================= */

  function getAIResponse(
    data
  ) {
    if (!data) {
      return "";
    }

    return (
      data.response ||
      data.reply ||
      data.answer ||
      data.message ||
      data.content ||
      data.text ||
      ""
    );
  }

  /* =========================================================
     SEND TO /chat
  ========================================================= */

  async function sendToChatAPI(
    text,
    imageBase64
  ) {
    const payload = {
      clientId:
        clientId,

      message:
        text || ""
    };

    if (imageBase64) {
      payload.image =
        imageBase64;
    }

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
            JSON.stringify(
              payload
            )
        }
      );

    const data =
      await safeJson(
        response
      );

    if (!response.ok) {
      throw new Error(
        data.error ||
        data.message ||
        "AI server error."
      );
    }

    return data;
  }

  /* =========================================================
     IMAGE-ONLY FLOW
     
     1. Database match
     2. Haddii la helo → DB result
     3. Haddii la waayo → AI Vision
  ========================================================= */

  async function sendImageOnly() {
    const file =
      selectedImageFile;

    const imageBase64 =
      selectedImageBase64;

    if (!file) {
      return;
    }

    setStatus(
      "🔎 Database-ka ayaa la hubinayaa..."
    );

    let match = null;

    try {
      match =
        await matchDatabaseImage(
          file
        );
    } catch (error) {
      console.warn(
        "Database image match error:",
        error
      );
    }

    /* =====================================================
       FOUND
    ===================================================== */

    if (
      match &&
      match.data &&
      match.data.found === true
    ) {
      showDatabaseResult(
        match.data
      );

      setStatus(
        "✅ Sawirka Database-ka waa laga helay.",
        true
      );

      removeSelectedImage();

      await loadHistory();

      return;
    }

    /* =====================================================
       NOT FOUND
       
       MUHIIM:
       Haddii Database-ka laga waayo,
       HA JOOJIN.
       U DIR VISION AI.
    ===================================================== */

    showNotFound();

    setStatus(
      "👁️ Sawirka Database-ka lagama helin — AI ayaa fasiraya..."
    );

    showTyping();

    try {
      const aiData =
        await sendToChatAPI(
          "Fadlan sawirkan si faahfaahsan u fasir oo sharax waxa ku jira. Jawaabta ku bixi Af Soomaali.",
          imageBase64
        );

      removeTyping();

      const aiText =
        getAIResponse(
          aiData
        );

      if (aiText) {
        addMessage(
          aiText,
          "assistant"
        );
      } else {
        addMessage(
          "❌ AI jawaab kama soo celin sawirka.",
          "assistant"
        );
      }

      setStatus(
        "✅ AI ayaa sawirka fasirtay.",
        true
      );

    } catch (error) {
      removeTyping();

      console.error(
        "Vision AI error:",
        error
      );

      addMessage(
        "❌ Sawirka Database-ka lagama helin fadlan harera ka jar sawirka, sidoo kale AI ma fasiri karin sawirka.\n\n" +
        error.message,
        "assistant"
      );

      setStatus(
        "❌ AI Vision error.",
        false
      );
    }

    removeSelectedImage();

    await loadHistory();
  }

  /* =========================================================
     IMAGE + TEXT FLOW
     
     1. Database match
     2. Haddii found → muuji DB
     3. Haddii not found → muuji message
     4. Kadib image + text → Vision AI
  ========================================================= */

  async function sendImageAndText(
    text
  ) {
    const file =
      selectedImageFile;

    const imageBase64 =
      selectedImageBase64;

    if (!file) {
      return;
    }

    /* Database */

    setStatus(
      "🔎 Database-ka ayaa la hubinayaa..."
    );

    try {
      const match =
        await matchDatabaseImage(
          file
        );

      if (
        match.data &&
        match.data.found === true
      ) {
        showDatabaseResult(
          match.data
        );
      } else {
        showNotFound();
      }

    } catch (error) {
      console.warn(
        "Image match failed:",
        error
      );

      showNotFound();
    }

    /* Vision AI */

    showTyping();

    setStatus(
      "👁️ Vision AI ayaa sawirka iyo qoraalka fasiraya..."
    );

    try {
      const aiData =
        await sendToChatAPI(
          text,
          imageBase64
        );

      removeTyping();

      const aiText =
        getAIResponse(
          aiData
        );

      if (aiText) {
        addMessage(
          aiText,
          "assistant"
        );
      } else {
        addMessage(
          "❌ AI jawaab kama soo celin.",
          "assistant"
        );
      }

      setStatus(
        "✅ Waa la dhammeeyay.",
        true
      );

    } catch (error) {
      removeTyping();

      console.error(
        "Image + text AI error:",
        error
      );

      addMessage(
        "❌ AI ma fasiri karin sawirka iyo qoraalka.\n\n" +
        error.message,
        "assistant"
      );

      setStatus(
        "❌ AI error.",
        false
      );
    }

    removeSelectedImage();

    await loadHistory();
  }

  /* =========================================================
     TEXT ONLY
  ========================================================= */

  async function sendTextOnly(
    text
  ) {
    showTyping();

    setStatus(
      "👳 AI ayaa ka jawaabaya..."
    );

    try {
      const data =
        await sendToChatAPI(
          text,
          null
        );

      removeTyping();

      const aiText =
        getAIResponse(
          data
        );

      if (aiText) {
        addMessage(
          aiText,
          "assistant"
        );
      } else {
        addMessage(
          "❌ AI jawaab kama soo celin.",
          "assistant"
        );
      }

      setStatus(
        "● Online",
        true
      );

    } catch (error) {
      removeTyping();

      console.error(
        "Text chat error:",
        error
      );

      addMessage(
        "❌ Fariinta lama diri karin.\n\n" +
        error.message,
        "assistant"
      );

      setStatus(
        "● Offline / Error",
        false
      );
    }

    await loadHistory();
  }

  /* =========================================================
     SEND MESSAGE
  ========================================================= */

  async function sendMessage() {
    if (sending) {
      return;
    }

    clearError();

    const text =
      messageInput
        ? messageInput.value.trim()
        : "";

    const hasImage =
      !!selectedImageFile;

    if (!text && !hasImage) {
      return;
    }

    sending = true;

    try {
      /* =====================================================
         USER MESSAGE
      ===================================================== */

      if (text) {
        addMessage(
          text,
          "user"
        );
      }

      if (hasImage) {
        addMessage(
          "🖼️ Sawir ayaa la diray.",
          "user"
        );
      }

      if (messageInput) {
        messageInput.value =
          "";

        autoResizeTextarea();
      }

      /* =====================================================
         IMAGE ONLY
      ===================================================== */

      if (
        hasImage &&
        !text
      ) {
        await sendImageOnly();

        return;
      }

      /* =====================================================
         IMAGE + TEXT
      ===================================================== */

      if (
        hasImage &&
        text
      ) {
        await sendImageAndText(
          text
        );

        return;
      }

      /* =====================================================
         TEXT ONLY
      ===================================================== */

      await sendTextOnly(
        text
      );

    } finally {
      sending = false;
    }
  }

  /* =========================================================
     CHAT HISTORY
  ========================================================= */

  async function loadHistory() {
    if (!historyList) {
      return;
    }

    try {
      const url =
        `${API_HISTORY}?clientId=${encodeURIComponent(clientId)}`;

      const response =
        await fetch(url);

      const data =
        await safeJson(
          response
        );

      if (!response.ok) {
        return;
      }

      const chats =
        Array.isArray(data)
          ? data
          : (
              data.chats ||
              data.history ||
              []
            );

      historyList.innerHTML =
        "";

      if (!chats.length) {
        const empty =
          document.createElement(
            "div"
          );

        empty.className =
          "history-item";

        empty.textContent =
          "Chat-yadii hore halkan ayay ka muuqanayaan.";

        historyList.appendChild(
          empty
        );

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
              chat.content ||
              chat.prompt ||
              "Chat";

            item.textContent =
              String(text)
                .replace(
                  /\s+/g,
                  " "
                )
                .slice(
                  0,
                  80
                );

            historyList.appendChild(
              item
            );
          }
        );

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
    const ok =
      window.confirm(
        "Ma rabtaa inaad tirtirto dhammaan Chat History-ga?"
      );

    if (!ok) {
      return;
    }

    try {
      setStatus(
        "🗑️ Chat-ka ayaa la tirtirayaa..."
      );

      const url =
        `${API_HISTORY}?clientId=${encodeURIComponent(clientId)}`;

      const response =
        await fetch(
          url,
          {
            method:
              "DELETE"
          }
        );

      const data =
        await safeJson(
          response
        );

      if (!response.ok) {
        throw new Error(
          data.error ||
          data.message ||
          "Delete failed."
        );
      }

      /* Clear visible chat */

      if (chatInner) {
        chatInner.innerHTML =
          "";
      }

      /* Welcome */

      const welcome =
        document.createElement(
          "div"
        );

      welcome.className =
        "welcome";

      welcome.id =
        "welcome";

      welcome.innerHTML = `
        <div class="welcome-icon">
          👳
        </div>

        <h2>
          Ku soo dhawoow
          NASIIB BUSINESS CENTER 
        </h2>

        <p>
          Weydii su'aal Af Soomaali ah.
          Waxaad diri kartaa qoraal,
          sawir, CABDILAHI XUSEEN.
        </p>
      `;

      if (chatInner) {
        chatInner.appendChild(
          welcome
        );
      }

      await loadHistory();

      setStatus(
        "● Online",
        true
      );

    } catch (error) {
      console.error(
        error
      );

      showError(
        "❌ Chat-ka lama tirtirin: " +
        error.message
      );
    }
  }

  /* =========================================================
     NEW CHAT
  ========================================================= */

  function newChat() {
    if (chatInner) {
      chatInner.innerHTML =
        "";
    }

    const welcome =
      document.createElement(
        "div"
      );

    welcome.className =
      "welcome";

    welcome.id =
      "welcome";

    welcome.innerHTML = `
      <div class="welcome-icon">
        👳
      </div>

      <h2>
        Ku soo dhawoow
        NASIIB BUSINESS CENTER <abbr titale="DR maxamuud bodhari">DMB</abbr>
      </h2>

      <p>
        Weydii su'aal Af Soomaali ah.
        Waxaad diri kartaa qoraal,
        sawir ,<abbr titale="fadlan sawirku ha ahaado inta cad oo kaliya ka jar 
          hadii aad screenshot ku qaaday ka jar hareeraha">fadlan</abbr> .
      </p>
    `;

    if (chatInner) {
      chatInner.appendChild(
        welcome
      );
    }

    removeSelectedImage();

    if (messageInput) {
      messageInput.value =
        "";

      autoResizeTextarea();

      messageInput.focus();
    }

    closeMobileMenu();
  }

  /* =========================================================
     ENTER / SHIFT ENTER
  ========================================================= */

  function setupKeyboard() {
    if (!messageInput) {
      return;
    }

    messageInput.addEventListener(
      "keydown",
      (event) => {
        if (
          event.key === "Enter" &&
          !event.shiftKey
        ) {
          event.preventDefault();

          sendMessage();

          return;
        }

        /*
          Shift + Enter
          = New Line
        */
      }
    );

    messageInput.addEventListener(
      "input",
      autoResizeTextarea
    );
  }

  /* =========================================================
     TEXTAREA AUTO RESIZE
  ========================================================= */

  function autoResizeTextarea() {
    if (!messageInput) {
      return;
    }

    messageInput.style.height =
      "auto";

    const height =
      Math.min(
        messageInput.scrollHeight,
        150
      );

    messageInput.style.height =
      `${height}px`;
  }

  /* =========================================================
     THEME
     
     System
     Light
     Dark
  ========================================================= */

  function getSavedTheme() {
    const saved =
      localStorage.getItem(
        "nasiibTheme"
      );

    if (
      saved === "dark" ||
      saved === "light" ||
      saved === "system"
    ) {
      return saved;
    }

    return "system";
  }

  function systemIsDark() {
    return (
      window.matchMedia &&
      window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches
    );
  }

  function applyTheme(
    theme
  ) {
    if (!document.body) {
      return;
    }

    let dark =
      false;

    if (
      theme === "dark"
    ) {
      dark = true;
    }

    if (
      theme === "system"
    ) {
      dark =
        systemIsDark();
    }

    /*
      HTML-kaaga wuxuu isticmaalaa:
      body.dark
    */

    document.body.classList.toggle(
      "dark",
      dark
    );

    document.body.dataset.theme =
      theme;

    localStorage.setItem(
      "nasiibTheme",
      theme
    );

    if (themeSelect) {
      themeSelect.value =
        theme;
    }
  }

  function setupTheme() {
    const theme =
      getSavedTheme();

    applyTheme(
      theme
    );

    if (themeSelect) {
      themeSelect.addEventListener(
        "change",
        () => {
          applyTheme(
            themeSelect.value
          );
        }
      );
    }

    /*
      System theme changes
    */

    if (
      window.matchMedia
    ) {
      const media =
        window.matchMedia(
          "(prefers-color-scheme: dark)"
        );

      const listener =
        () => {
          const saved =
            getSavedTheme();

          if (
            saved ===
            "system"
          ) {
            applyTheme(
              "system"
            );
          }
        };

      if (
        media.addEventListener
      ) {
        media.addEventListener(
          "change",
          listener
        );
      } else if (
        media.addListener
      ) {
        media.addListener(
          listener
        );
      }
    }
  }

  /* =========================================================
     MOBILE MENU
  ========================================================= */

  function openMobileMenu() {
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

  function closeMobileMenu() {
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

  function setupMobile() {
    if (menuBtn) {
      menuBtn.addEventListener(
        "click",
        () => {
          if (
            sidebar &&
            sidebar.classList.contains(
              "open"
            )
          ) {
            closeMobileMenu();
          } else {
            openMobileMenu();
          }
        }
      );
    }

    if (overlay) {
      overlay.addEventListener(
        "click",
        closeMobileMenu
      );
    }
  }

  /* =========================================================
     BUTTON EVENTS
  ========================================================= */

  function setupButtons() {
    /*
      Gallery
    */

    if (galleryInput) {
      galleryInput.addEventListener(
        "change",
        (event) => {
          handleImage(
            event.target.files?.[0]
          );
        }
      );
    }

    /*
      Camera
    */

    if (cameraInput) {
      cameraInput.addEventListener(
        "change",
        (event) => {
          handleImage(
            event.target.files?.[0]
          );
        }
      );
    }

    /*
      Remove
    */

    if (removeImageBtn) {
      removeImageBtn.addEventListener(
        "click",
        removeSelectedImage
      );
    }

    /*
      Delete
    */

    if (deleteChatBtn) {
      deleteChatBtn.addEventListener(
        "click",
        deleteChat
      );
    }

    /*
      New Chat
    */

    if (newChatBtn) {
      newChatBtn.addEventListener(
        "click",
        newChat
      );
    }

    /*
      Image buttons can be labels in HTML.
      Their inputs already handle change.
    */

    /*
      Send button:
      HTML-ka hoose waxaa laga raadinayaa
      IDs kala duwan si app-ku u noqdo flexible.
    */

    const sendButton =
      $("sendBtn") ||
      $("sendButton");

    if (sendButton) {
      sendButton.addEventListener(
        "click",
        sendMessage
      );
    }
  }

  /* =========================================================
     CREATE SEND BUTTON IF MISSING
  ========================================================= */

  function createSendButtonIfMissing() {
    if (
      $("sendBtn") ||
      $("sendButton")
    ) {
      return;
    }

    const inputRow =
      document.querySelector(
        ".input-row"
      );

    if (!inputRow) {
      return;
    }

    const button =
      document.createElement(
        "button"
      );

    button.id =
      "sendBtn";

    button.type =
      "button";

    button.className =
      "send-btn";

    button.title =
      "Dir";

    button.setAttribute(
      "aria-label",
      "Dir"
    );

    button.textContent =
      "➤";

    inputRow.appendChild(
      button
    );

    button.addEventListener(
      "click",
      sendMessage
    );
  }

  /* =========================================================
     HEALTH
  ========================================================= */

  async function checkHealth() {
    try {
      const response =
        await fetch(
          API_HEALTH
        );

      const data =
        await safeJson(
          response
        );

      if (!response.ok) {
        throw new Error(
          data.error ||
          "Server offline"
        );
      }

      setStatus(
        "● Online",
        true
      );

      return true;

    } catch (error) {
      console.error(
        "Health error:",
        error
      );

      setStatus(
        "● Offline",
        false
      );

      return false;
    }
  }

  /* =========================================================
     DRAG & DROP IMAGE
  ========================================================= */

  function setupDragDrop() {
    if (!chatBox) {
      return;
    }

    chatBox.addEventListener(
      "dragover",
      (event) => {
        event.preventDefault();
      }
    );

    chatBox.addEventListener(
      "drop",
      (event) => {
        event.preventDefault();

        const file =
          event.dataTransfer
            ?.files?.[0];

        if (file) {
          handleImage(
            file
          );
        }
      }
    );
  }

  /* =========================================================
     PASTE IMAGE
  ========================================================= */

  function setupPasteImage() {
    document.addEventListener(
      "paste",
      (event) => {
        const items =
          event.clipboardData
            ?.items;

        if (!items) {
          return;
        }

        for (
          const item of items
        ) {
          if (
            item.type.startsWith(
              "image/"
            )
          ) {
            const file =
              item.getAsFile();

            if (file) {
              handleImage(
                file
              );
            }

            break;
          }
        }
      }
    );
  }

  /* =========================================================
     MOBILE VIEWPORT
  ========================================================= */

  function setupViewport() {
    const setVh =
      () => {
        document.documentElement.style.setProperty(
          "--vh",
          `${window.innerHeight * 0.01}px`
        );
      };

    setVh();

    window.addEventListener(
      "resize",
      setVh
    );

    window.addEventListener(
      "orientationchange",
      () => {
        setTimeout(
          setVh,
          250
        );
      }
    );
  }

  /* =========================================================
     INITIALIZE
  ========================================================= */

  async function init() {
    console.log(
      "NASIIB BUSINESS CENTER app.js started"
    );

    /*
      Haddii HTML-ku leeyahay
      galleryInput/cameraInput,
      events ayaa lagu xirayaa.
      Haddii aysan jirin, waa la abuuri karaa.
    */

    createImageInputs();

    setupButtons();

    createSendButtonIfMissing();

    setupKeyboard();

    setupTheme();

    setupMobile();

    setupDragDrop();

    setupPasteImage();

    setupViewport();

    autoResizeTextarea();

    setStatus(
      "Hubinaya..."
    );

    await checkHealth();

    await loadHistory();

    console.log(
      "Client ID:",
      clientId
    );
  }

  /* =========================================================
     GLOBAL
  ========================================================= */

  window.NasiibApp = {
    sendMessage,
    openGallery,
    openCamera,
    removeSelectedImage,
    loadHistory,
    deleteChat,
    newChat,
    applyTheme,
    getClientId:
      () => clientId
  };

  /* =========================================================
     START
  ========================================================= */

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      init
    );
  } else {
    init();
  }

})();
