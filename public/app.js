document.addEventListener("DOMContentLoaded", () => {

  console.log("✅ AI Chat Somali app.js started");

  // =====================================
  // ELEMENTS
  // =====================================

  const messageInput =
    document.querySelector("#messageInput") ||
    document.querySelector("#message") ||
    document.querySelector("textarea") ||
    document.querySelector('input[type="text"]');

  const sendButton =
    document.querySelector("#sendBtn") ||
    document.querySelector("#sendButton") ||
    document.querySelector(".send-btn") ||
    document.querySelector('button[type="submit"]');

  const chatContainer =
    document.querySelector("#chatMessages") ||
    document.querySelector("#messages") ||
    document.querySelector(".messages") ||
    document.querySelector(".chat-messages");

  console.log("Input:", messageInput);
  console.log("Send button:", sendButton);
  console.log("Chat container:", chatContainer);


  // =====================================
  // IMAGE STATE
  // =====================================

  let selectedImage = null;


  // =====================================
  // GET TOKEN
  // =====================================

  function getToken() {

    return (
      localStorage.getItem("token") ||
      localStorage.getItem("authToken") ||
      ""
    );

  }


  // =====================================
  // ADD MESSAGE
  // =====================================

  function addMessage(text, type = "user") {

    if (!chatContainer) {

      console.error(
        "❌ Chat container lama helin"
      );

      return null;

    }

    const messageDiv =
      document.createElement("div");

    messageDiv.className =
      `message ${type}`;

    const content =
      document.createElement("div");

    content.className =
      "message-content";

    content.textContent =
      text;

    messageDiv.appendChild(
      content
    );

    chatContainer.appendChild(
      messageDiv
    );

    scrollToBottom();

    return messageDiv;

  }


  // =====================================
  // ADD IMAGE MESSAGE
  // =====================================

  function addImageMessage(imageSrc) {

    if (!chatContainer) {
      return;
    }

    const messageDiv =
      document.createElement("div");

    messageDiv.className =
      "message user";

    const image =
      document.createElement("img");

    image.src =
      imageSrc;

    image.className =
      "chat-image";

    image.style.maxWidth =
      "250px";

    image.style.borderRadius =
      "10px";

    messageDiv.appendChild(
      image
    );

    chatContainer.appendChild(
      messageDiv
    );

    scrollToBottom();

  }


  // =====================================
  // SCROLL
  // =====================================

  function scrollToBottom() {

    if (!chatContainer) {
      return;
    }

    chatContainer.scrollTop =
      chatContainer.scrollHeight;

  }


  // =====================================
  // LOADING
  // =====================================

  function addLoadingMessage() {

    if (!chatContainer) {
      return null;
    }

    const loadingDiv =
      document.createElement("div");

    loadingDiv.className =
      "message assistant loading";

    loadingDiv.innerHTML =
      `
      <div class="message-content">
        AI ayaa ka jawaabaya...
      </div>
      `;

    chatContainer.appendChild(
      loadingDiv
    );

    scrollToBottom();

    return loadingDiv;

  }


  // =====================================
  // SEND MESSAGE
  // =====================================

  async function sendMessage() {

    console.log("📤 sendMessage() started");


    if (!messageInput) {

      alert(
        "Message input lama helin. Hubi id-ka HTML."
      );

      return;

    }


    const message =
      messageInput.value.trim();


    if (
      !message &&
      !selectedImage
    ) {

      return;

    }


    // Disable button

    if (sendButton) {

      sendButton.disabled =
        true;

    }


    // User message

    if (message) {

      addMessage(
        message,
        "user"
      );

    }


    // Image message

    if (selectedImage) {

      addImageMessage(
        selectedImage
      );

    }


    // Clear input

    messageInput.value =
      "";

    messageInput.style.height =
      "auto";


    // Loading

    const loadingMessage =
      addLoadingMessage();


    try {

      const token =
        getToken();


      const headers = {

        "Content-Type":
          "application/json"

      };


      if (token) {

        headers.Authorization =
          `Bearer ${token}`;

      }


      console.log(
        "🌐 Sending request to /chat"
      );


      const response =
        await fetch(

          "/chat",

          {

            method:
              "POST",

            headers:

              headers,

            body:
              JSON.stringify({

                message:

                  message ||

                  "",

                image:

                  selectedImage ||

                  null

              })

          }

        );


      console.log(
        "📥 Response status:",
        response.status
      );


      let data;


      try {

        data =
          await response.json();

      } catch (jsonError) {

        throw new Error(
          "Server-ku JSON sax ah ma soo celin."
        );

      }


      console.log(
        "📦 Server response:",
        data
      );


      // Remove loading

      if (loadingMessage) {

        loadingMessage.remove();

      }


      // Error response

      if (!response.ok) {

        throw new Error(

          data.error ||

          `Server error: ${response.status}`

        );

      }


      // AI Reply

      const reply =

        data.reply ||

        "Waan ka xumahay, jawaab lama helin.";


      addMessage(
        reply,
        "assistant"
      );


      // Clear image

      selectedImage =
        null;


    } catch (error) {

      console.error(
        "❌ CHAT ERROR:",
        error
      );


      if (loadingMessage) {

        loadingMessage.remove();

      }


      addMessage(

        "❌ Khalad ayaa dhacay: " +
        error.message,

        "assistant"

      );


    } finally {

      if (sendButton) {

        sendButton.disabled =
          false;

      }


      if (messageInput) {

        messageInput.focus();

      }

    }

  }


  // =====================================
  // SEND BUTTON CLICK
  // =====================================

  if (sendButton) {

    sendButton.addEventListener(

      "click",

      (event) => {

        event.preventDefault();

        console.log(
          "🖱️ Send button clicked"
        );

        sendMessage();

      }

    );

  } else {

    console.warn(
      "⚠️ Send button lama helin"
    );

  }


  // =====================================
  // ENTER KEY
  // =====================================

  if (messageInput) {

    messageInput.addEventListener(

      "keydown",

      (event) => {

        if (

          event.key === "Enter" &&

          !event.shiftKey

        ) {

          event.preventDefault();

          console.log(
            "⌨️ Enter pressed"
          );

          sendMessage();

        }

      }

    );

  } else {

    console.warn(
      "⚠️ Message input lama helin"
    );

  }


  // =====================================
  // AUTO RESIZE TEXTAREA
  // =====================================

  if (
    messageInput &&
    messageInput.tagName ===
      "TEXTAREA"
  ) {

    messageInput.addEventListener(

      "input",

      () => {

        messageInput.style.height =
          "auto";

        messageInput.style.height =
          Math.min(

            messageInput.scrollHeight,

            180

          ) + "px";

      }

    );

  }


  // =====================================
  // IMAGE INPUT
  // =====================================

  const imageInput =
    document.querySelector("#imageInput") ||
    document.querySelector(
      'input[type="file"]'
    );


  if (imageInput) {

    imageInput.addEventListener(

      "change",

      (event) => {

        const file =
          event.target.files[0];


        if (!file) {

          return;

        }


        const reader =
          new FileReader();


        reader.onload =
          (readerEvent) => {

            selectedImage =
              readerEvent.target.result;

            console.log(
              "🖼️ Image selected"
            );

          };


        reader.readAsDataURL(
          file
        );

      }

    );

  }


  // =====================================
  // SERVER HEALTH CHECK
  // =====================================

  async function checkServer() {

    try {

      const response =
        await fetch(
          "/api/health"
        );


      const data =
        await response.json();


      console.log(
        "🟢 Server online:",
        data
      );


    } catch (error) {

      console.error(
        "🔴 Server offline:",
        error
      );

    }

  }


  checkServer();


  console.log(
    "🤖 AI Chat Somali ready"
  );

});
