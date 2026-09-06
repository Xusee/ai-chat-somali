"use strict";

/* =========================================================
   AI CHAT SOMALI - ADMIN APP
   File: public/admin/app.js
   ========================================================= */

/* =========================================================
   API
   ========================================================= */

const API = window.location.origin;

const TOKEN_KEY = "ai_token";
const USER_KEY = "ai_user";

/* =========================================================
   STATE
   ========================================================= */

let currentUser = null;

/* =========================================================
   DOM READY
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  currentUser = getSavedUser();

  bindLoginForm();
  bindAdminButtons();

  if (isDashboardPage()) {
    initDashboard();
  }
});

/* =========================================================
   LOCAL STORAGE
   ========================================================= */

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function getSavedUser() {
  try {
    const user = localStorage.getItem(USER_KEY);

    if (!user) return null;

    return JSON.parse(user);
  } catch (error) {
    console.error("User parse error:", error);
    return null;
  }
}

function saveLogin(data) {
  if (data.token) {
    localStorage.setItem(TOKEN_KEY, data.token);
  }

  if (data.user) {
    localStorage.setItem(
      USER_KEY,
      JSON.stringify(data.user)
    );
  }
}

function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);

  window.location.href = "/admin/";
}

/* =========================================================
   API REQUEST
   ========================================================= */

async function apiRequest(endpoint, options = {}) {
  const token = getToken();

  const headers = {
    ...(options.headers || {})
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (
    options.body &&
    !(options.body instanceof FormData)
  ) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(
    `${API}${endpoint}`,
    {
      ...options,
      headers
    }
  );

  let data = null;

  try {
    data = await response.json();
  } catch (error) {
    data = {
      message: await response.text()
    };
  }

  if (!response.ok) {
    throw new Error(
      data.message ||
      data.error ||
      `Server error: ${response.status}`
    );
  }

  return data;
}

/* =========================================================
   LOGIN
   ========================================================= */

function bindLoginForm() {
  const form =
    document.querySelector("#adminLoginForm") ||
    document.querySelector("#loginForm") ||
    document.querySelector("form");

  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const emailInput =
      form.querySelector('input[type="email"]') ||
      form.querySelector("#email") ||
      document.querySelector("#email");

    const passwordInput =
      form.querySelector('input[type="password"]') ||
      form.querySelector("#password") ||
      document.querySelector("#password");

    const email = emailInput
      ? emailInput.value.trim()
      : "";

    const password = passwordInput
      ? passwordInput.value
      : "";

    if (!email || !password) {
      showMessage(
        "Email ama password waa khaldan yahay.",
        "error"
      );
      return;
    }

    const submitButton =
      form.querySelector('button[type="submit"]');

    const originalText =
      submitButton
        ? submitButton.innerHTML
        : "";

    try {
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Sug...";
      }

      const data = await apiRequest(
        "/api/login",
        {
          method: "POST",
          body: JSON.stringify({
            email,
            password
          })
        }
      );

      if (!data.token) {
        throw new Error(
          "Token lama helin. Server-ka /api/login hubi."
        );
      }

      saveLogin(data);

      showMessage(
        "Login-ku wuu guulaystay.",
        "success"
      );

      setTimeout(() => {
        window.location.href = "/admin/";
      }, 500);

    } catch (error) {
      console.error("Admin login error:", error);

      showMessage(
        error.message ||
        "Login wuu fashilmay.",
        "error"
      );

    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.innerHTML = originalText;
      }
    }
  });
}

/* =========================================================
   CHECK PAGE
   ========================================================= */

function isDashboardPage() {
  return (
    document.querySelector("#dashboard") ||
    document.querySelector("#users") ||
    document.querySelector("#usersSection") ||
    document.querySelector("#chatHistory") ||
    document.querySelector("#knowledge") ||
    document.querySelector(
      '[data-page="dashboard"]'
    )
  );
}

/* =========================================================
   ADMIN DASHBOARD
   ========================================================= */

async function initDashboard() {
  const token = getToken();

  if (!token) {
    showMessage(
      "Fadlan marka hore Admin ahaan u gal.",
      "error"
    );

    return;
  }

  await loadDashboard();
}

/* =========================================================
   BUTTONS
   ========================================================= */

function bindAdminButtons() {

  /* USERS */

  const usersButton =
    document.querySelector("#usersBtn") ||
    findButtonByText("Users");

  if (usersButton) {
    usersButton.addEventListener("click", () => {
      loadUsers();
    });
  }


  /* CHAT HISTORY */

  const chatsButton =
    document.querySelector("#chatsBtn") ||
    document.querySelector("#historyBtn") ||
    findButtonByText("Chat History");

  if (chatsButton) {
    chatsButton.addEventListener("click", () => {
      loadChats();
    });
  }


  /* KNOWLEDGE */

  const knowledgeButton =
    document.querySelector("#knowledgeBtn") ||
    findButtonByText("Knowledge");

  if (knowledgeButton) {
    knowledgeButton.addEventListener(
      "click",
      () => {
        loadKnowledge();
      }
    );
  }


  /* DELETE ALL CHATS */

  const deleteButton =
    document.querySelector("#deleteAllChatsBtn") ||
    findButtonByText("Delete All Chats");

  if (deleteButton) {
    deleteButton.addEventListener(
      "click",
      async () => {
        await deleteAllChats();
      }
    );
  }


  /* LOGOUT */

  const logoutButton =
    document.querySelector("#logoutBtn") ||
    findButtonByText("Logout") ||
    findButtonByText("Ka bax");

  if (logoutButton) {
    logoutButton.addEventListener(
      "click",
      logout
    );
  }
}

/* =========================================================
   LOAD DASHBOARD
   ========================================================= */

async function loadDashboard() {
  try {

    showMessage(
      "Admin Dashboard loading...",
      "info"
    );

    await Promise.all([
      loadUsers(),
      loadChats(),
      loadKnowledge()
    ]);

  } catch (error) {
    console.error(error);
  }
}

/* =========================================================
   USERS
   ========================================================= */

async function loadUsers() {
  try {

    const data = await apiRequest(
      "/api/admin/users"
    );

    const users =
      Array.isArray(data)
        ? data
        : (
            data.users ||
            data.data ||
            []
          );

    renderUsers(users);

  } catch (error) {

    console.error(
      "Users error:",
      error
    );

    showEndpointError(
      "/api/admin/users",
      error
    );
  }
}

function renderUsers(users) {

  const container =
    document.querySelector("#users") ||
    document.querySelector("#usersList") ||
    document.querySelector("#usersSection");

  if (!container) return;

  if (!Array.isArray(users) || users.length === 0) {
    container.innerHTML = `
      <h2>👥 Users</h2>
      <p>Weli users lama helin.</p>
    `;

    return;
  }

  let html = `
    <h2>👥 Users</h2>

    <div class="admin-table-wrapper">
      <table class="admin-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Magaca</th>
            <th>Email</th>
            <th>Role</th>
          </tr>
        </thead>

        <tbody>
  `;

  users.forEach((user) => {

    html += `
      <tr>
        <td>${escapeHtml(user.id || "-")}</td>

        <td>
          ${escapeHtml(
            user.name ||
            user.username ||
            "-"
          )}
        </td>

        <td>
          ${escapeHtml(
            user.email || "-"
          )}
        </td>

        <td>
          ${escapeHtml(
            user.role || "user"
          )}
        </td>
      </tr>
    `;
  });

  html += `
        </tbody>
      </table>
    </div>
  `;

  container.innerHTML = html;
}

/* =========================================================
   CHAT HISTORY
   ========================================================= */

async function loadChats() {
  try {

    const data = await apiRequest(
      "/api/admin/chats"
    );

    const chats =
      Array.isArray(data)
        ? data
        : (
            data.chats ||
            data.data ||
            []
          );

    renderChats(chats);

  } catch (error) {

    /*
      Haddii server-ka uusan lahayn
      /api/admin/chats, isku day endpoint-ka
      caadiga ah.
    */

    try {

      const data = await apiRequest(
        "/api/chats"
      );

      const chats =
        Array.isArray(data)
          ? data
          : (
              data.chats ||
              data.data ||
              []
            );

      renderChats(chats);

    } catch (secondError) {

      console.error(
        "Chats error:",
        secondError
      );

      showEndpointError(
        "/api/admin/chats",
        secondError
      );
    }
  }
}

function renderChats(chats) {

  const container =
    document.querySelector("#chatHistory") ||
    document.querySelector("#chats") ||
    document.querySelector("#chatsList");

  if (!container) return;

  if (!Array.isArray(chats) || chats.length === 0) {

    container.innerHTML = `
      <h2>💬 Chat History</h2>
      <p>Wax chat history ah lama helin.</p>
    `;

    return;
  }

  let html = `
    <h2>💬 Chat History</h2>
    <div class="chat-history-list">
  `;

  chats.forEach((chat) => {

    const message =
      chat.message ||
      chat.content ||
      chat.question ||
      "-";

    const answer =
      chat.answer ||
      chat.response ||
      chat.reply ||
      "";

    html += `
      <div class="admin-chat-card">

        <strong>
          👤 ${escapeHtml(
            chat.email ||
            chat.user_email ||
            "User"
          )}
        </strong>

        <p>
          <b>Su'aal:</b>
          ${escapeHtml(message)}
        </p>

        ${
          answer
            ? `
              <p>
                <b>Jawaab:</b>
                ${escapeHtml(answer)}
              </p>
            `
            : ""
        }

      </div>
    `;
  });

  html += `
    </div>
  `;

  container.innerHTML = html;
}

/* =========================================================
   KNOWLEDGE
   ========================================================= */

async function loadKnowledge() {

  try {

    const data = await apiRequest(
      "/api/admin/knowledge"
    );

    const knowledge =
      Array.isArray(data)
        ? data
        : (
            data.knowledge ||
            data.data ||
            []
          );

    renderKnowledge(knowledge);

  } catch (error) {

    console.error(
      "Knowledge error:",
      error
    );

    showEndpointError(
      "/api/admin/knowledge",
      error
    );
  }
}

function renderKnowledge(items) {

  const container =
    document.querySelector("#knowledge") ||
    document.querySelector("#knowledgeList") ||
    document.querySelector("#knowledgeSection");

  if (!container) return;

  if (
    !Array.isArray(items) ||
    items.length === 0
  ) {

    container.innerHTML = `
      <h2>🧠 Knowledge</h2>
      <p>Knowledge data lama helin.</p>
    `;

    return;
  }

  let html = `
    <h2>🧠 Knowledge</h2>

    <div class="knowledge-list">
  `;

  items.forEach((item) => {

    html += `
      <div class="knowledge-card">

        <h3>
          ${escapeHtml(
            item.title ||
            item.name ||
            "Knowledge"
          )}
        </h3>

        <p>
          ${escapeHtml(
            item.content ||
            item.text ||
            item.description ||
            ""
          )}
        </p>

      </div>
    `;
  });

  html += `
    </div>
  `;

  container.innerHTML = html;
}

/* =========================================================
   DELETE ALL CHATS
   ========================================================= */

async function deleteAllChats() {

  const confirmed = confirm(
    "Ma hubtaa inaad tirtirayso dhammaan chats-ka?"
  );

  if (!confirmed) return;

  try {

    await apiRequest(
      "/api/admin/chats",
      {
        method: "DELETE"
      }
    );

    showMessage(
      "Dhammaan chats-ka waa la tirtiray.",
      "success"
    );

    await loadChats();

  } catch (error) {

    /*
      Fallback endpoint
    */

    try {

      await apiRequest(
        "/api/chats",
        {
          method: "DELETE"
        }
      );

      showMessage(
        "Dhammaan chats-ka waa la tirtiray.",
        "success"
      );

      await loadChats();

    } catch (secondError) {

      showMessage(
        secondError.message ||
        "Chats lama tirtiri karin.",
        "error"
      );
    }
  }
}

/* =========================================================
   ERROR DISPLAY
   ========================================================= */

function showEndpointError(
  endpoint,
  error
) {

  const message =
    error.message ||
    "Unknown error";

  showMessage(
    `Endpoint error: ${endpoint} — ${message}`,
    "error"
  );
}

function showMessage(
  message,
  type = "info"
) {

  let box =
    document.querySelector("#adminMessage");

  if (!box) {

    box = document.createElement("div");

    box.id = "adminMessage";

    box.style.position = "fixed";
    box.style.top = "20px";
    box.style.right = "20px";
    box.style.zIndex = "9999";
    box.style.padding = "15px 20px";
    box.style.borderRadius = "10px";
    box.style.maxWidth = "400px";
    box.style.boxShadow =
      "0 5px 20px rgba(0,0,0,0.2)";

    document.body.appendChild(box);
  }

  box.textContent = message;

  if (type === "success") {
    box.style.background = "#d1fae5";
    box.style.color = "#065f46";
  }

  if (type === "error") {
    box.style.background = "#fee2e2";
    box.style.color = "#991b1b";
  }

  if (type === "info") {
    box.style.background = "#dbeafe";
    box.style.color = "#1e3a8a";
  }

  box.style.display = "block";

  clearTimeout(
    showMessage.timeout
  );

  showMessage.timeout =
    setTimeout(() => {

      box.style.display = "none";

    }, 5000);
}

/* =========================================================
   FIND BUTTON BY TEXT
   ========================================================= */

function findButtonByText(text) {

  const elements =
    document.querySelectorAll(
      "button, a"
    );

  for (const element of elements) {

    const value =
      element.textContent
        .trim()
        .toLowerCase();

    if (
      value.includes(
        text.toLowerCase()
      )
    ) {
      return element;
    }
  }

  return null;
}

/* =========================================================
   ESCAPE HTML
   ========================================================= */

function escapeHtml(value) {

  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  const div =
    document.createElement("div");

  div.textContent =
    String(value);

  return div.innerHTML;
}

/* =========================================================
   GLOBAL FUNCTIONS
   ========================================================= */

window.adminAPI = {
  loadUsers,
  loadChats,
  loadKnowledge,
  deleteAllChats,
  logout
};

console.log(
  "cabdilahi xuseen app.js loaded successfully"
);
