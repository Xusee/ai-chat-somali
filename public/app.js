/* =========================================
   AI CHAT SOMALI - APP.JS
========================================= */

const API_URL = "/chat";
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB


/* =========================================
   GET HTML ELEMENTS
========================================= */

const messageInput =
  document.getElementById("messageInput");

const sendButton =
  document.getElementById("sendButton");

const imageInput =
  document.getElementById("imageInput");

const imagePreview =
  document.getElementById("imagePreview");

const chatContainer =
  document.getElementById("chatContainer");

const clearChatsButton =
  document.getElementById("clearChatsButton");


/* =========================================
   VARIABLES
========================================= */

let selectedImage = null;

let isSending = false;


/* =========================================
   IMAGE UPLOAD
========================================= */

if (imageInput) {

  imageInput.addEventListener(
    "change",
    async function (event) {

      const file = event.target.files[0];

      if (!file) {
        return;
      }


      /* CHECK IMAGE TYPE */

      if (!file.type.startsWith("image/")) {

        showError(
          "Fadlan dooro sawir sax ah."
        );

        imageInput.value = "";

        return;
      }


      /* CHECK IMAGE SIZE */

      if (file.size > MAX_IMAGE_SIZE) {

        showError(
          "Sawirka aad ayuu u weyn yahay. Ugu badnaan waa 5MB."
        );

        imageInput.value = "";

        return;
      }


      try {

        selectedImage =
          await convertImageToBase64(file);

        showImagePreview(selectedImage);

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
    (resolve, reject) => {

      const reader =
        new FileReader();


      reader.onload =
        function () {

          resolve(reader.result);

        };


      reader.onerror =
        function () {

          reject(
            new Error(
              "Sawirka lama beddeli karin."
            )
          );

        };


      reader.readAsDataURL(file);

    }
  );

}


/* =========================================
   SHOW IMAGE PREVIEW
========================================= */

function showImagePreview(image) {

  if (!imagePreview) {
    return;
  }


  imagePreview.innerHTML = `
    <div class="image-preview-box">

      <img
        src="${image}"
        alt="Sawirka la doortay"
        class="preview-image"
      >

      <button
        type="button"
        id="removeImageButton"
        class="remove-image-button"
      >
        ✕
      </button>

    </div>
  `;


  const removeButton =
    document.getElementById(
      "removeImageButton"
    );


  if (removeButton) {

    removeButton.addEventListener(
      "click",
      removeSelectedImage
    );

  }

}


/* =========================================
   REMOVE IMAGE
========================================= */

function removeSelectedImage() {

  selectedImage = null;


  if (imageInput) {

    imageInput.value = "";

  }


  if (imagePreview) {

    imagePreview.innerHTML = "";

  }

}


/* =========================================
   SEND MESSAGE
========================================= */

async function sendMessage() {

  /* PREVENT DOUBLE SEND */

  if (isSending) {
    return;
  }


  const message =
    messageInput
      ? messageInput.value.trim()
      : "";


  /* EMPTY MESSAGE */

  if (!message && !selectedImage) {

    showError(
      "Fadlan qor su'aal ama soo geli sawir."
    );

    return;
  }


  isSending = true;


  updateSendButton(true);


  /* SAVE IMAGE BEFORE CLEARING */

  const currentImage =
    selectedImage;


  /* SHOW USER MESSAGE */

  addUserMessage(
    message,
    currentImage
  );


  /* CLEAR MESSAGE */

  if (messageInput) {

    messageInput.value = "";

  }


  removeSelectedImage();


  /* SHOW TYPING */

  const typingId =
    showTyping();


  let timeout;


  try {

    const controller =
      new AbortController();


    /* 30 SECOND TIMEOUT */

    timeout = setTimeout(
      () => controller.abort(),
      30000
    );


    const response =
      await fetch(
        API_URL,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify({
              message: message,
              image: currentImage
            }),

          signal:
            controller.signal
        }
      );


    clearTimeout(timeout);


    let data;


    try {

      data =
        await response.json();

    } catch {

      throw new Error(
        "Server-ka jawaab JSON sax ah ma soo celin."
      );

    }


    removeTyping(typingId);


    /* SERVER ERROR */

    if (!response.ok) {

      throw new Error(
        data?.error ||
        "Server-ka ayaa khalad soo celiyay."
      );

    }


    /* GET ANSWER */

    const answer =
      data?.answer;


    /* EMPTY AI RESPONSE */

    if (
      !answer ||
      typeof answer !== "string" ||
      answer.trim().length === 0
    ) {

      addAIMessage(
        "Waan ka xumahay, AI-gu jawaab madhan ayuu soo celiyay. Fadlan mar kale isku day."
      );

    } else {

      addAIMessage(
        answer.trim()
      );

    }


  } catch (error) {

    clearTimeout(timeout);


    removeTyping(typingId);


    console.error(
      "Chat Error:",
      error
    );


    if (
      error.name === "AbortError"
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

    isSending = false;

    updateSendButton(false);

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
    document.createElement("div");


  wrapper.className =
    "message user-message";


  let html = "";


  /* IMAGE */

  if (image) {

    html += `
      <img
        src="${image}"
        class="chat-image"
        alt="Sawirka isticmaalaha"
      >
    `;

  }


  /* MESSAGE */

  if (message) {

    html += `
      <div class="message-text">
        ${escapeHTML(message)}
      </div>
    `;

  }


  wrapper.innerHTML = html;


  chatContainer.appendChild(wrapper);


  scrollToBottom();

}


/* =========================================
   AI MESSAGE
========================================= */

function addAIMessage(message) {

  if (!chatContainer) {

    console.log(
      "AI:",
      message
    );

    return;
  }


  const wrapper =
    document.createElement("div");


  wrapper.className =
    "message ai-message";


  wrapper.innerHTML = `

    <div class="ai-header">
      🤖 AI Chat Somali
    </div>

    <div class="message-text">
      ${formatText(message)}
    </div>

  `;


  chatContainer.appendChild(wrapper);


  scrollToBottom();

}


/* =========================================
   ERROR MESSAGE
========================================= */

function addErrorMessage(message) {

  if (!chatContainer) {

    alert(message);

    return;
  }


  const wrapper =
    document.createElement("div");


  wrapper.className =
    "message error-message";


  wrapper.textContent =
    message;


  chatContainer.appendChild(wrapper);


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
    "typing-" + Date.now();


  const typing =
    document.createElement("div");


  typing.id = id;


  typing.className =
    "message ai-message typing-message";


  typing.innerHTML = `

    <div class="ai-header">
      🤖 AI Chat Somali
    </div>

    <div class="typing-dots">
      <span>●</span>
      <span>●</span>
      <span>●</span>
    </div>

  `;


  chatContainer.appendChild(typing);


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
    document.getElementById(id);


  if (typing) {

    typing.remove();

  }

}


/* =========================================
   SEND BUTTON STATE
========================================= */

function updateSendButton(loading) {

  if (!sendButton) {
    return;
  }


  sendButton.disabled =
    loading;


  if (loading) {

    sendButton.innerHTML =
      "⏳ Sug...";

  } else {

    sendButton.innerHTML =
      "➤ Dir";

  }

}


/* =========================================
   SEND BUTTON CLICK
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
   LOAD CHAT HISTORY
========================================= */

async function loadChats() {

  try {

    const response =
      await fetch("/api/chats");


    const data =
      await response.json();


    if (
      !response.ok ||
      !data.success ||
      !Array.isArray(data.chats)
    ) {

      return;

    }


    const chats =
      [...data.chats].reverse();


    chats.forEach(chat => {

      addUserMessage(
        chat.message || "",
        chat.image || null
      );


      if (chat.answer) {

        addAIMessage(
          chat.answer
        );

      }

    });


  } catch (error) {

    console.warn(
      "History error:",
      error.message
    );

  }

}


/* =========================================
   DELETE CHAT HISTORY
========================================= */

if (clearChatsButton) {

  clearChatsButton.addEventListener(
    "click",
    async function () {

      try {

        const response =
          await fetch(
            "/api/chats",
            {
              method: "DELETE"
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


        if (chatContainer) {

          chatContainer.innerHTML =
            "";

        }


        addAIMessage(
          "Chat history waa la tirtiray. Sideen kuu caawin karaa?"
        );


      } catch (error) {

        addErrorMessage(
          "❌ " + error.message
        );

      }

    }
  );

}


/* =========================================
   FORMAT TEXT
========================================= */

function formatText(text) {

  return escapeHTML(text)
    .replace(
      /\n/g,
      "<br>"
    );

}


/* =========================================
   ESCAPE HTML
========================================= */

function escapeHTML(text) {

  const div =
    document.createElement("div");


  div.textContent =
    String(text || "");


  return div.innerHTML;

}


/* =========================================
   SCROLL TO BOTTOM
========================================= */

function scrollToBottom() {

  if (!chatContainer) {
    return;
  }


  chatContainer.scrollTo({
    top:
      chatContainer.scrollHeight,

    behavior:
      "smooth"
  });

}


/* =========================================
   START APP
========================================= */

document.addEventListener(
  "DOMContentLoaded",
  function () {

    loadChats();

  }
);
