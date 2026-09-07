// ==========================================
// AI CHAT SOMALI - public/app.js
// Text + Image Upload Support
// ==========================================


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


// ==========================================
// VARIABLES
// ==========================================

let imageBase64 = null;
let selectedImageName = null;

let isSending = false;


// ==========================================
// LOAD CHAT HISTORY
// ==========================================

document.addEventListener("DOMContentLoaded", () => {

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

    // Hubi inuu sawir yahay
    if (!file.type.startsWith("image/")) {

      alert("Fadlan dooro sawir sax ah.");

      imageInput.value = "";

      return;
    }

    // Xadka sawirka
    const maxSize = 10 * 1024 * 1024;

    if (file.size > maxSize) {

      alert("Sawirku aad buu u weyn yahay. Dooro sawir ka yar 10MB.");

      imageInput.value = "";

      return;
    }

    try {

      selectedImageName = file.name;

      imageBase64 = await convertImageToBase64(file);

      showImagePreview(imageBase64);

    } catch (error) {

      console.error("IMAGE ERROR:", error);

      alert("Sawirka lama akhrin karin.");

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
        new Error("Sawirka lama beddeli karin.")
      );

    };

    reader.readAsDataURL(file);

  });

}


// ==========================================
// SHOW IMAGE PREVIEW
// ==========================================

function showImagePreview(image) {

  if (imagePreview) {

    imagePreview.style.display = "block";

  }

  if (previewImage) {

    previewImage.src = image;

  }

}


// ==========================================
// REMOVE IMAGE
// ==========================================

if (removeImageButton) {

  removeImageButton.addEventListener("click", () => {

    removeSelectedImage();

  });

}


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

}


// ==========================================
// SEND BUTTON
// ==========================================

if (sendButton) {

  sendButton.addEventListener("click", () => {

    sendMessage();

  });

}


// ==========================================
// ENTER TO SEND
// ==========================================

if (messageInput) {

  messageInput.addEventListener("keydown", (event) => {

    // Enter = Send
    // Shift + Enter = New line

    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {

      event.preventDefault();

      sendMessage();

    }

  });

}


// ==========================================
// SEND MESSAGE
// ==========================================

async function sendMessage() {

  // Ha dirin labo mar
  if (isSending) {

    return;

  }


  const message =
    messageInput
      ? messageInput.value.trim()
      : "";


  // Hubi qoraal ama sawir
  if (!message && !imageBase64) {

    alert("Fadlan qor fariin ama dooro sawir.");

    return;

  }


  isSending = true;

  setSendingState(true);


  // Kaydi sawirka hadda
  const currentImage =
    imageBase64;


  // USER MESSAGE
  addMessageToChat(
    "user",
    message,
    currentImage
  );


  // Clear input
  if (messageInput) {

    messageInput.value = "";

  }


  // Remove selected image
  removeSelectedImage();


  // Loading message
  const loadingId =
    showLoadingMessage();


  try {


    // ==========================================
    // SEND TO SERVER
    // ==========================================

    const response =
      await fetch("/chat", {

        method: "POST",

        headers: {

          "Content-Type":
            "application/json"

        },

        body:
          JSON.stringify({

            message: message,

            image: currentImage

          })

      });


    // Remove loading
    removeLoadingMessage(
      loadingId
    );


    // Parse response
    let data;


    try {

      data =
        await response.json();

    } catch (jsonError) {

      throw new Error(
        "Server-ka jawaab sax ah ma soo celin."
      );

    }


    // Server error
    if (!response.ok) {

      throw new Error(

        data.error ||

        "Server-ka ayaa khalad soo celiyay."

      );

    }


    // AI response
    const aiReply =

      data.reply ||

      data.response ||

      data.message ||

      "Jawaab lama helin.";


    // Add AI message
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


    // Remove loading
    removeLoadingMessage(
      loadingId
    );


    addMessageToChat(
      "assistant",

      "❌ Waxaa dhacay khalad: " +

      error.message,

      null
    );


  } finally {


    isSending = false;

    setSendingState(false);


  }

}


// ==========================================
// ADD MESSAGE TO CHAT
// ==========================================

function addMessageToChat(

  role,

  text,

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
    `message ${role}`;


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


    // XSS safe
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


  // Save history
  saveChatHistory();


}


// ==========================================
// LOADING MESSAGE
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


  loadingElement.innerHTML = `

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


    // Haddii history jiro
    // nadiifi chat-ka
    if (messages.length > 0) {

      chatMessages.innerHTML =
        "";

    }


    messages.forEach(
      (item) => {


        addMessageToChat(
          item.role,

          item.text,

          item.image
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

    chatMessages.innerHTML = "";

  }


}


// ==========================================
// APP START
// ==========================================

console.log(
  "AI Chat Somali app.js loaded"
);
