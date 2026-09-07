// ==========================================
// AI CHAT SOMALI - public/app.js
// Text + Image Upload Support
// ==========================================


// ==========================================
// ELEMENTS
// ==========================================

const messageInput = document.getElementById("messageInput");
const sendButton = document.getElementById("sendButton");
const chatMessages = document.getElementById("chatMessages");

const imageInput = document.getElementById("imageInput");
const imagePreview = document.getElementById("imagePreview");
const previewImage = document.getElementById("previewImage");
const removeImageButton = document.getElementById("removeImage");


// ==========================================
// VARIABLES
// ==========================================

let imageBase64 = null;
let selectedImageName = null;
let isSending = false;


// ==========================================
// APP START
// ==========================================

document.addEventListener("DOMContentLoaded", () => {

  console.log("AI Chat Somali app.js loaded");

  loadChatHistory();

});


// ==========================================
// IMAGE SELECT
// ==========================================

if (imageInput) {

  imageInput.addEventListener("change", async (event) => {

    const file = event.target.files[0];

    if (!file) {
      return;
    }


    // Hubi inuu yahay sawir
    if (!file.type.startsWith("image/")) {

      alert("Fadlan dooro sawir sax ah.");

      imageInput.value = "";

      return;

    }


    // Maximum 10MB
    const maxSize = 10 * 1024 * 1024;

    if (file.size > maxSize) {

      alert("Sawirku aad buu u weyn yahay. Dooro sawir ka yar 10MB.");

      imageInput.value = "";

      return;

    }


    try {

      selectedImageName = file.name;


      // Sawirka Base64 u beddel
      imageBase64 = await convertImageToBase64(file);


      console.log(
        "IMAGE SELECTED:",
        selectedImageName
      );


      // Preview muuji
      showImagePreview(imageBase64);


    } catch (error) {

      console.error(
        "IMAGE ERROR:",
        error
      );


      alert(
        "Sawirka lama akhrin karin."
      );

    }

  });

}


// ==========================================
// CONVERT IMAGE TO BASE64
// ==========================================

function convertImageToBase64(file) {

  return new Promise((resolve, reject) => {

    const reader = new FileReader();


    reader.onload = () => {

      resolve(reader.result);

    };


    reader.onerror = () => {

      reject(
        new Error(
          "Sawirka lama beddeli karin."
        )
      );

    };


    reader.readAsDataURL(file);

  });

}


// ==========================================
// SHOW IMAGE PREVIEW
// ==========================================

function showImagePreview(image) {

  if (previewImage) {

    previewImage.src = image;

  }


  if (imagePreview) {

    imagePreview.style.display = "block";

  }

}


// ==========================================
// REMOVE IMAGE BUTTON
// ==========================================

if (removeImageButton) {

  removeImageButton.addEventListener(
    "click",
    () => {

      removeSelectedImage();

    }
  );

}


// ==========================================
// REMOVE SELECTED IMAGE
// ==========================================

function removeSelectedImage() {

  imageBase64 = null;

  selectedImageName = null;


  if (imageInput) {

    imageInput.value = "";

  }


  if (previewImage) {

    previewImage.src = "";

  }


  if (imagePreview) {

    imagePreview.style.display = "none";

  }


  console.log(
    "IMAGE REMOVED"
  );

}


// ==========================================
// SEND BUTTON
// ==========================================

if (sendButton) {

  sendButton.addEventListener(
    "click",
    () => {

      sendMessage();

    }
  );

}


// ==========================================
// ENTER TO SEND
// ==========================================

if (messageInput) {

  messageInput.addEventListener(
    "keydown",
    (event) => {

      // ENTER = SEND
      // SHIFT + ENTER = NEW LINE

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


// ==========================================
// SEND MESSAGE
// ==========================================

async function sendMessage() {

  // Ha dirin laba request
  if (isSending) {

    return;

  }


  // Qaado qoraalka
  const message =

    messageInput

      ? messageInput.value.trim()

      : "";


  // Qaado sawirka
  const currentImage = imageBase64;


  // Hubi inuu jiro qoraal ama sawir
  if (!message && !currentImage) {

    alert(
      "Fadlan qor su'aal ama dooro sawir."
    );

    return;

  }


  // Bilow sending
  isSending = true;

  setSendingState(true);


  // ==========================================
  // USER MESSAGE
  // ==========================================

  addMessageToChat(
    "user",
    message,
    currentImage
  );


  // Nadiifi text input
  if (messageInput) {

    messageInput.value = "";

  }


  // Nadiifi image input
  removeSelectedImage();


  // Loading
  const loadingId = showLoadingMessage();


  try {


    // ==========================================
    // SEND TO SERVER
    // ==========================================

    console.log(
      "SENDING CHAT:",
      {
        hasMessage: !!message,
        hasImage: !!currentImage
      }
    );


    const response = await fetch(
      "/chat",
      {

        method: "POST",


        headers: {

          "Content-Type":
            "application/json"

        },


        // ======================================
        // TEXT ONLY
        // IMAGE ONLY
        // TEXT + IMAGE
        // ======================================

        body: JSON.stringify({

          message:
            message || "",


          image:
            currentImage || null

        })

      }
    );


    // Remove loading
    removeLoadingMessage(
      loadingId
    );


    // ==========================================
    // PARSE RESPONSE
    // ==========================================

    let data;


    try {

      data =
        await response.json();

    } catch (jsonError) {

      console.error(
        "JSON ERROR:",
        jsonError
      );


      throw new Error(
        "Server-ka jawaab sax ah ma soo celin."
      );

    }


    console.log(
      "SERVER RESPONSE:",
      data
    );


    // ==========================================
    // SERVER ERROR
    // ==========================================

    if (!response.ok) {

      throw new Error(

        data.error ||

        data.message ||

        "Server-ka ayaa khalad soo celiyay."

      );

    }


    // ==========================================
    // AI REPLY
    // ==========================================

    const aiReply =

      data.reply ||

      data.response ||

      data.message ||

      "Jawaab lama helin.";


    // Add AI response
    addMessageToChat(
      "assistant",
      aiReply,
      null
    );


  } catch (error) {


    console.error(
      "CHAT ERROR:",
      error
    );


    // Loading ka saar
    removeLoadingMessage(
      loadingId
    );


    // Error message
    addMessageToChat(

      "assistant",

      "❌ Waxaa dhacay khalad: " +

      error.message,

      null

    );


  } finally {


    // Sending dhameeyay
    isSending = false;

    setSendingState(false);


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


  if (!chatMessages) {

    console.error(
      "chatMessages lama helin."
    );

    return;

  }


  const messageElement =
    document.createElement("div");


  messageElement.className =
    messageElement.className = `message ${role}`;


  const bubble =
    document.createElement("div");


  bubble.className =
    "message-bubble";


  // ==========================================
  // ADD IMAGE
  // ==========================================

  if (image) {


    const imageElement =
      document.createElement("img");


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


  // ==========================================
  // ADD TEXT
  // ==========================================

  if (text) {


    const textElement =
      document.createElement("div");


    textElement.className =
      "message-text";


    // XSS SAFE
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


  // History kaydi
  saveChatHistory();

}


// ==========================================
// SHOW LOADING
// ==========================================

function showLoadingMessage() {


  if (!chatMessages) {

    return null;

  }


  const loadingId =
    "loading-" + Date.now();


  const loadingElement =
    document.createElement("div");


  loadingElement.id =
    loadingId;


  loadingElement.className =
    "message assistant loading-message";


  const bubble =
    document.createElement("div");


  bubble.className =
    "message-bubble";


  const loadingText =
    document.createElement("div");


  loadingText.className =
    "loading-text";


  loadingText.textContent =
    "🤖 AI Chat Somali ayaa ka fikiraya...";


  bubble.appendChild(
    loadingText
  );


  loadingElement.appendChild(
    bubble
  );


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


  if (!loadingId) {

    return;

  }


  const loadingElement =
    document.getElementById(
      loadingId
    );


  if (loadingElement) {

    loadingElement.remove();

  }

}


// ==========================================
// SENDING STATE
// ==========================================

function setSendingState(
  sending
) {


  if (!sendButton) {

    return;

  }


  sendButton.disabled =
    sending;


  if (sending) {

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
// SCROLL CHAT
// ==========================================

function scrollToBottom() {


  if (!chatMessages) {

    return;

  }


  setTimeout(() => {

    chatMessages.scrollTop =
      chatMessages.scrollHeight;

  }, 50);

}


// ==========================================
// SAVE CHAT HISTORY
// ==========================================

function saveChatHistory() {


  if (!chatMessages) {

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
      (element) => {


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


  } catch (error) {


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


  if (!chatMessages) {

    return;

  }


  try {


    const savedHistory =
      localStorage.getItem(
        "ai-chat-somali-history"
      );


    if (!savedHistory) {

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


    // Chat nadiifi
    chatMessages.innerHTML =
      "";


    messages.forEach(
      (item) => {

        addMessageToChat(

          item.role,

          item.text || "",

          item.image || null

        );

      }
    );


  } catch (error) {


    console.warn(
      "History lama soo celin karin:",
      error
    );

  }

}


// ==========================================
// CLEAR CHAT HISTORY
// ==========================================

function clearChatHistory() {


  localStorage.removeItem(
    "ai-chat-somali-history"
  );


  if (chatMessages) {

    chatMessages.innerHTML =
      "";

  }


  console.log(
    "CHAT HISTORY CLEARED"
  );

}
