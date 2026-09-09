/* =========================================
   AI CHAT SOMALI - APP.JS
========================================= */


const API_URL = "/chat";


/* =========================================
   GET HTML ELEMENTS
========================================= */

const messageInput = document.getElementById("messageInput");
const sendButton = document.getElementById("sendButton");

async function sendMessage() {
  const message = messageInput.value.trim();

  if (!message) return;

  sendButton.disabled = true;

  try {
    const response = await fetch("/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: message
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Server error");
    }

    console.log("AI:", data);

    messageInput.value = "";

  } catch (error) {
    console.error(error);
    alert("Dirista fariinta way fashilantay: " + error.message);
  } finally {
    sendButton.disabled = false;
  }
}

sendButton.addEventListener("click", sendMessage);

messageInput.addEventListener("keydown", function (event) {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    sendMessage();
  }
});

/* =========================================
   VARIABLES
========================================= */

let selectedImage = null;

let isSending = false;

const MAX_IMAGE_SIZE =
  5 * 1024 * 1024;


/* =========================================
   IMAGE UPLOAD
========================================= */

if (imageInput) {

  imageInput.addEventListener(
    "change",

    async function (event) {

      const file =
        event.target.files[0];


      if (!file) {

        return;

      }


      /* CHECK IMAGE */

      if (
        !file.type.startsWith(
          "image/"
        )
      ) {

        showError(
          "Fadlan dooro sawir sax ah."
        );

        imageInput.value =
          "";

        return;

      }


      /* CHECK SIZE */

      if (
        file.size >
        MAX_IMAGE_SIZE
      ) {

        showError(
          "Sawirka aad ayuu u weyn yahay. Ugu badnaan waa 5MB."
        );

        imageInput.value =
          "";

        return;

      }


      try {

        selectedImage =
          await convertImageToBase64(
            file
          );


        showImagePreview(
          selectedImage
        );


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
        function () {

          resolve(
            reader.result
          );

        };


      reader.onerror =
        function () {

          reject(
            new Error(
              "Image conversion failed"
            )
          );

        };


      reader.readAsDataURL(
        file
      );

    }

  );

}


/* =========================================
   SHOW IMAGE PREVIEW
========================================= */

function showImagePreview(
  image
) {

  if (!imagePreview) {

    return;

  }


  imagePreview.innerHTML =
    `
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

  selectedImage =
    null;


  if (imageInput) {

    imageInput.value =
      "";

  }


  if (imagePreview) {

    imagePreview.innerHTML =
      "";

  }

}


/* =========================================
   SEND MESSAGE
========================================= */

async function sendMessage() {

  if (isSending) {

    return;

  }


  const message =
    messageInput
      ? messageInput.value.trim()
      : "";


  /* EMPTY */

  if (
    !message &&
    !selectedImage
  ) {

    showError(
      "Fadlan qor su'aal ama soo geli sawir."
    );

    return;

  }


  isSending =
    true;


  updateSendButton(
    true
  );


  /* SAVE IMAGE */

  const currentImage =
    selectedImage;


  /* SHOW USER MESSAGE */

  addUserMessage(
    message,
    currentImage
  );


  /* CLEAR INPUT */

  if (messageInput) {

    messageInput.value =
      "";

  }


  removeSelectedImage();


  /* SHOW TYPING */

  const typingId =
    showTyping();


  try {

    const controller =
      new AbortController();


    const timeout =
      setTimeout(

        () => {

          controller.abort();

        },

        30000

      );


    /* FETCH */

    const response =
      await fetch(

        API_URL,

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

            }),

          signal:
            controller.signal

        }

      );


    clearTimeout(
      timeout
    );


    let data;


    try {

      data =
        await response.json();

    } catch (error) {

      throw new Error(
        "Server-ka jawaab sax ah ma soo celin."
      );

    }


    removeTyping(
      typingId
    );


    /* SERVER ERROR */

    if (!response.ok) {

      throw new Error(

        data?.error ||

        "Server-ka ayaa khalad soo celiyay."

      );

    }


    /* GET AI ANSWER */

    const answer =
      data?.answer;


    /* EMPTY AI FALLBACK */

    if (

      !answer ||

      typeof answer !==
      "string" ||

      answer.trim().length === 0

    ) {

      addAIMessage(

        "Waan ka xumahay, AI-gu jawaab madhan ayuu soo celiyay. Fadlan isku day mar kale."

      );

    } else {

      addAIMessage(
        answer.trim()
      );

    }


  } catch (error) {

    removeTyping(
      typingId
    );


    console.error(
      "Chat Error:",
      error
    );


    if (
      error.name ===
      "AbortError"
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

    isSending =
      false;


    updateSendButton(
      false
    );

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
    document.createElement(
      "div"
    );


  wrapper.className =
    "message user-message";


  let html =
    "";


  if (image) {

    html +=
      `
      <img
        src="${image}"
        class="chat-image"
        alt="Sawirka isticmaalaha"
      >
      `;

  }


  if (message) {

    html +=
      `
      <div class="message-text">
        ${escapeHTML(message)}
      </div>
      `;

  }


  wrapper.innerHTML =
    html;


  chatContainer.appendChild(
    wrapper
  );


  scrollToBottom();

}


/* =========================================
   AI MESSAGE
========================================= */

function addAIMessage(
  message
) {

  if (!chatContainer) {

    return;

  }


  const wrapper =
    document.createElement(
      "div"
    );


  wrapper.className =
    "message ai-message";


  wrapper.innerHTML =
    `
    <div class="ai-header">
      🤖 AI Chat Somali
    </div>

    <div class="message-text">
      ${formatText(message)}
    </div>
    `;


  chatContainer.appendChild(
    wrapper
  );


  scrollToBottom();

}


/* =========================================
   ERROR MESSAGE
========================================= */

function addErrorMessage(
  message
) {

  if (!chatContainer) {

    alert(message);

    return;

  }


  const wrapper =
    document.createElement(
      "div"
    );


  wrapper.className =
    "message error-message";


  wrapper.textContent =
    message;


  chatContainer.appendChild(
    wrapper
  );


  scrollToBottom();

}


/* =========================================
   SHOW ERROR
========================================= */

function showError(
  message
) {

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
    "typing-" +
    Date.now();


  const typing =
    document.createElement(
      "div"
    );


  typing.id =
    id;


  typing.className =
    "message ai-message typing-message";


  typing.innerHTML =
    `
    <div>
      🤖 AI Chat Somali
    </div>

    <div class="typing-dots">

      <span>●</span>
      <span>●</span>
      <span>●</span>

    </div>
    `;


  chatContainer.appendChild(
    typing
  );


  scrollToBottom();


  return id;

}


/* =========================================
   REMOVE TYPING
========================================= */

function removeTyping(
  id
) {

  if (!id) {

    return;

  }


  const typing =
    document.getElementById(
      id
    );


  if (typing) {

    typing.remove();

  }

}


/* =========================================
   SEND BUTTON STATE
========================================= */

function updateSendButton(
  loading
) {

  if (!sendButton) {

    return;

  }


  sendButton.disabled =
    loading;


  if (loading) {

    sendButton.textContent =
      "⏳ Sug...";

  } else {

    sendButton.textContent =
      "➤ Dir";

  }

}


/* =========================================
   ENTER TO SEND
========================================= */

if (messageInput) {

  messageInput.addEventListener(

    "keydown",

    function (event) {

      if (

        event.key ===
        "Enter" &&

        !event.shiftKey

      ) {

        event.preventDefault();

        sendMessage();

      }

    }

  );

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
   LOAD CHAT HISTORY
========================================= */

async function loadChats() {

  try {

    const response =
      await fetch(
        "/api/chats"
      );


    const data =
      await response.json();


    if (

      !response.ok ||

      !data.success ||

      !Array.isArray(
        data.chats
      )

    ) {

      return;

    }


    /* REVERSE BECAUSE SERVER RETURNS NEWEST FIRST */

    const chats =
      [...data.chats]
        .reverse();


    chats.forEach(

      chat => {

        addUserMessage(

          chat.message,

          chat.image

        );


        if (chat.answer) {

          addAIMessage(
            chat.answer
          );

        }

      }

    );


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

              method:
                "DELETE"

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

          "❌ " +

          error.message

        );

      }

    }

  );

}


/* =========================================
   FORMAT TEXT
========================================= */

function formatText(
  text
) {

  return escapeHTML(
    text
  ).replace(

    /\n/g,

    "<br>"

  );

}


/* =========================================
   ESCAPE HTML
========================================= */

function escapeHTML(
  text
) {

  const div =
    document.createElement(
      "div"
    );


  div.textContent =
    text;


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
