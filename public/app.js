// ==========================================
// AI CHAT SOMALI
// public/app.js
// Text + Image + Chat History
// ==========================================


// ==========================================
// VARIABLES
// ==========================================

let imageBase64 = null;

let isSending = false;


// ==========================================
// ELEMENTS
// ==========================================

const messageInput =
  document.getElementById("messageInput");

const sendButton =
  document.getElementById("sendButton");

const chatMessages =
  document.getElementById("chatMessages");

const imageInput =
  document.getElementById("imageInput");

const imagePreview =
  document.getElementById("imagePreview");

const previewImage =
  document.getElementById("previewImage");

const removeImageButton =
  document.getElementById("removeImage");

const clearChatButton =
  document.getElementById("clearChat");


// ==========================================
// APP START
// ==========================================

document.addEventListener(
  "DOMContentLoaded",
  () => {

    console.log(
      "🤖 AI Chat Somali started"
    );

    console.log({
      messageInput,
      sendButton,
      chatMessages,
      imageInput
    });


    // Load saved history
    loadChatHistory();


    // Check server
    checkServer();


    // Focus input
    if (messageInput) {

      messageInput.focus();

    }

  }
);


// ==========================================
// SERVER HEALTH CHECK
// ==========================================

async function checkServer() {

  try {

    const response =
      await fetch(
        "/api/health"
      );


    const data =
      await response.json();


    console.log(
      "✅ Server connected:",
      data
    );


  } catch (error) {

    console.error(
      "❌ Server connection error:",
      error
    );

  }

}


// ==========================================
// IMAGE SELECT
// ==========================================

if (imageInput) {

  imageInput.addEventListener(
    "change",
    async (event) => {

      const file =
        event.target.files[0];


      if (!file) {

        return;

      }


      // Check image
      if (
        !file.type.startsWith(
          "image/"
        )
      ) {

        alert(
          "❌ Fadlan dooro sawir sax ah."
        );

        imageInput.value =
          "";

        return;

      }


      // Max size 10MB
      const maxSize =
        10 *
        1024 *
        1024;


      if (
        file.size >
        maxSize
      ) {

        alert(
          "❌ Sawirku aad buu u weyn yahay. Dooro sawir ka yar 10MB."
        );

        imageInput.value =
          "";

        return;

      }


      try {

        console.log(
          "📷 Image selected:",
          file.name
        );


        imageBase64 =
          await convertImageToBase64(
            file
          );


        console.log(
          "✅ Image converted successfully"
        );


        showImagePreview(
          imageBase64
        );


      } catch (error) {

        console.error(
          "❌ IMAGE ERROR:",
          error
        );


        alert(
          "Sawirka lama akhrin karin."
        );

      }

    }
  );

}


// ==========================================
// CONVERT IMAGE TO BASE64
// ==========================================

function convertImageToBase64(
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
              "Sawirka lama beddeli karin."
            )

          );

        };


      reader.readAsDataURL(
        file
      );

    }
  );

}


// ==========================================
// SHOW IMAGE PREVIEW
// ==========================================

function showImagePreview(
  image
) {

  if (
    previewImage
  ) {

    previewImage.src =
      image;

  }


  if (
    imagePreview
  ) {

    imagePreview.style.display =
      "block";

  }

}


// ==========================================
// REMOVE IMAGE BUTTON
// ==========================================

if (
  removeImageButton
) {

  removeImageButton.addEventListener(
    "click",
    (
      event
    ) => {

      event.preventDefault();

      removeSelectedImage();

    }
  );

}


// ==========================================
// REMOVE SELECTED IMAGE
// ==========================================

function removeSelectedImage() {

  imageBase64 =
    null;


  if (
    imageInput
  ) {

    imageInput.value =
      "";

  }


  if (
    previewImage
  ) {

    previewImage.src =
      "";

  }


  if (
    imagePreview
  ) {

    imagePreview.style.display =
      "none";

  }


  console.log(
    "🗑️ Image removed"
  );

}


// ==========================================
// SEND BUTTON
// ==========================================

if (
  sendButton
) {

  sendButton.addEventListener(
    "click",
    async (
      event
    ) => {

      event.preventDefault();

      console.log(
        "📤 Send button clicked"
      );


      await sendMessage();

    }
  );

} else {

  console.error(
    "❌ sendButton lama helin. Hubi id='sendButton'"
  );

}


// ==========================================
// ENTER TO SEND
// ==========================================

if (
  messageInput
) {

  messageInput.addEventListener(
    "keydown",
    async (
      event
    ) => {

      // Enter = Send
      // Shift + Enter = New line

      if (

        event.key ===
          "Enter" &&

        !event.shiftKey

      ) {

        event.preventDefault();


        console.log(
          "⌨️ Enter pressed"
        );


        await sendMessage();

      }

    }
  );

} else {

  console.error(
    "❌ messageInput lama helin. Hubi id='messageInput'"
  );

}


// ==========================================
// SEND MESSAGE
// ==========================================

async function sendMessage() {


  // Prevent double sending

  if (
    isSending
  ) {

    return;

  }


  const message =

    messageInput

      ? messageInput
          .value
          .trim()

      : "";


  // Save current image

  const currentImage =
    imageBase64;


  console.log(
    "📨 Message data:",
    {

      message:
        message,

      hasImage:
        !!currentImage

    }
  );


  // Check input

  if (

    !message &&

    !currentImage

  ) {

    alert(
      "Fadlan qor fariin ama dooro sawir."
    );

    return;

  }


  // Start sending

  isSending =
    true;


  setSendingState(
    true
  );


  // Add user message immediately

  addMessageToChat(

    "user",

    message,

    currentImage

  );


  // Clear textarea

  if (
    messageInput
  ) {

    messageInput.value =
      "";

  }


  // Clear selected image

  removeSelectedImage();


  // Show loading

  const loadingId =
    showLoadingMessage();


  try {


    console.log(
      "🌐 POST /chat"
    );


    // ======================================
    // SEND TO SERVER
    // ======================================

    const response =
      await fetch(

        "/chat",

        {

          method:
            "POST",


          headers: {

            "Content-Type":
              "application/json"

          },


          body:
            JSON.stringify({

              message:
                message,

              image:
                currentImage

            })

        }

      );


    console.log(
      "📡 Response status:",
      response.status
    );


    // Parse JSON

    let data;


    try {

      data =
        await response.json();

    } catch (
      jsonError
    ) {

      throw new Error(
        "Server-ka jawaab JSON sax ah ma soo celin."
      );

    }


    // Remove loading

    removeLoadingMessage(
      loadingId
    );


    // Server error

    if (
      !response.ok
    ) {

      console.error(
        "❌ SERVER ERROR:",
        data
      );


      throw new Error(

        data.error ||

        data.details ||

        "Server-ka ayaa khalad soo celiyay."

      );

    }


    console.log(
      "🤖 AI RESPONSE:",
      data
    );


    // Get reply

    const aiReply =

      data.reply ||

      data.response ||

      data.message ||

      "Waan ka xumahay, jawaab lama helin.";


    // Add AI response

    addMessageToChat(

      "assistant",

      aiReply,

      null

    );


  } catch (
    error
  ) {


    console.error(
      "❌ CHAT ERROR:",
      error
    );


    // Remove loading

    removeLoadingMessage(
      loadingId
    );


    // Show error

    addMessageToChat(

      "assistant",

      "❌ Waxaa dhacay khalad: " +
      error.message,

      null

    );


  } finally {


    isSending =
      false;


    setSendingState(
      false
    );


    // Focus input

    if (
      messageInput
    ) {

      messageInput.focus();

    }

  }

}


// ==========================================
// ADD MESSAGE TO CHAT
// ==========================================

function addMessageToChat(

  role,

  text = "",

  image = null

) {


  if (
    !chatMessages
  ) {

    console.error(
      "❌ chatMessages lama helin."
    );

    return;

  }


  const messageElement =
    document.createElement(
      "div"
    );


  messageElement.className =
    `message ${role}`;


  const bubble =
    document.createElement(
      "div"
    );


  bubble.className =
    "message-bubble";


  // ========================================
  // IMAGE
  // ========================================

  if (
    image
  ) {

    const imageElement =
      document.createElement(
        "img"
      );


    imageElement.src =
      image;


    imageElement.className =
      "chat-image";


    imageElement.alt =
      "Sawirka isticmaalaha";


    imageElement.loading =
      "lazy";


    bubble.appendChild(
      imageElement
    );

  }


  // ========================================
  // TEXT
  // ========================================

  if (
    text
  ) {

    const textElement =
      document.createElement(
        "div"
      );


    textElement.className =
      "message-text";


    // Safe text
    textElement.textContent =
      text;


    bubble.appendChild(
      textElement
    );

  }


  messageElement.appendChild(
    bubble
  );


  chatMessages.appendChild(
    messageElement
  );


  scrollToBottom();


  saveChatHistory();

}


// ==========================================
// SHOW LOADING
// ==========================================

function showLoadingMessage() {


  if (
    !chatMessages
  ) {

    return null;

  }


  const loadingId =
    "loading-" +
    Date.now();


  const loadingElement =
    document.createElement(
      "div"
    );


  loadingElement.id =
    loadingId;


  loadingElement.className =
    "message assistant loading-message";


  loadingElement.innerHTML =
    `

      <div class="message-bubble">

        <div class="typing-indicator">

          <span></span>

          <span></span>

          <span></span>

        </div>

        <div class="loading-text">

          AI Chat Somali ayaa ka fikiraya...

        </div>

      </div>

    `;


  chatMessages.appendChild(
    loadingElement
  );


  scrollToBottom();


  return loadingId;

}


// ==========================================
// REMOVE LOADING
// ==========================================

function removeLoadingMessage(
  loadingId
) {

  if (
    !loadingId
  ) {

    return;

  }


  const loadingElement =
    document.getElementById(
      loadingId
    );


  if (
    loadingElement
  ) {

    loadingElement.remove();

  }

}


// ==========================================
// SENDING STATE
// ==========================================

function setSendingState(
  sending
) {


  if (
    !sendButton
  ) {

    return;

  }


  sendButton.disabled =
    sending;


  if (
    sending
  ) {

    sendButton.style.opacity =
      "0.6";


    sendButton.style.cursor =
      "not-allowed";

  } else {

    sendButton.style.opacity =
      "1";


    sendButton.style.cursor =
      "pointer";

  }

}


// ==========================================
// SCROLL TO BOTTOM
// ==========================================

function scrollToBottom() {


  if (
    !chatMessages
  ) {

    return;

  }


  setTimeout(

    () => {

      chatMessages.scrollTop =
        chatMessages.scrollHeight;

    },

    50

  );

}


// ==========================================
// SAVE CHAT HISTORY
// ==========================================

function saveChatHistory() {


  if (
    !chatMessages
  ) {

    return;

  }


  try {


    const messages =
      [];


    const messageElements =
      chatMessages.querySelectorAll(
        ".message:not(.loading-message)"
      );


    messageElements.forEach(
      (
        element
      ) => {


        const role =

          element.classList.contains(
            "user"
          )

            ? "user"

            : "assistant";


        const textElement =
          element.querySelector(
            ".message-text"
          );


        const imageElement =
          element.querySelector(
            ".chat-image"
          );


        messages.push({

          role:
            role,


          text:

            textElement

              ? textElement.textContent

              : "",


          image:

            imageElement

              ? imageElement.src

              : null

        });

      }
    );


    localStorage.setItem(

      "ai-chat-somali-history",

      JSON.stringify(
        messages
      )

    );


  } catch (
    error
  ) {

    console.warn(
      "History lama kaydin karin:",
      error
    );

  }

}


// ==========================================
// LOAD CHAT HISTORY
// ==========================================

function loadChatHistory() {


  if (
    !chatMessages
  ) {

    return;

  }


  try {


    const savedHistory =
      localStorage.getItem(
        "ai-chat-somali-history"
      );


    if (
      !savedHistory
    ) {

      return;

    }


    const messages =
      JSON.parse(
        savedHistory
      );


    if (
      !Array.isArray(
        messages
      )
    ) {

      return;

    }


    if (
      messages.length >
      0
    ) {

      chatMessages.innerHTML =
        "";

    }


    messages.forEach(
      (
        item
      ) => {

        addMessageToChat(
          item.role,
          item.text,
          item.image
        );

      }
    );


    scrollToBottom();


  } catch (
    error
  ) {

    console.warn(
      "History lama soo celin karin:",
      error
    );

  }

}


// ==========================================
// CLEAR CHAT
// ==========================================

function clearChatHistory() {


  localStorage.removeItem(
    "ai-chat-somali-history"
  );


  if (
    chatMessages
  ) {

    chatMessages.innerHTML =
      "";

  }


  console.log(
    "🗑️ Chat history cleared"
  );

}


// ==========================================
// CLEAR CHAT BUTTON
// ==========================================

if (
  clearChatButton
) {

  clearChatButton.addEventListener(
    "click",
    (
      event
    ) => {

      event.preventDefault();


      const confirmClear =
        confirm(
          "Ma hubtaa inaad tirtirayso dhammaan chat-ka?"
        );


      if (
        confirmClear
      ) {

        clearChatHistory();

      }

    }
  );

}


// ==========================================
// GLOBAL FUNCTIONS
// ==========================================

window.sendMessage =
  sendMessage;

window.removeSelectedImage =
  removeSelectedImage;

window.clearChatHistory =
  clearChatHistory;


// ==========================================
// APP READY
// ==========================================

console.log(
  "✅ public/app.js loaded successfully"
);
