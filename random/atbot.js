import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";

// Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyCdPliqfHrf2QDKedB3XSDn4cvFIU6rz40",
  authDomain: "geniex-d6c8c.firebaseapp.com",
  projectId: "geniex-d6c8c",
  storageBucket: "geniex-d6c8c.appspot.com",
  messagingSenderId: "982353981292",
  appId: "1:982353981292:web:54a071a2e5018f661bcd49"
};

// Init Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// ✅ Send Message
async function sendMessage() {
  const input = document.getElementById("user_input");
  const userInput = input.value.trim();
  if (!userInput) return;

  // User Message UI
  const userMsg = document.createElement("div");
  userMsg.className = "self-end px-4 py-2 rounded-lg max-w-[70%] text-white bg-purple-600 hover:bg-purple-700 border-purple-800 shadow-sm dark:bg-[#3b3b4f]";
  // userMsg.className = "self-end px-5 py-3 rounded-lg max-w-[75%] bg-purple-700 text-white border border-purple-800 shadow-sm";

  userMsg.textContent = userInput;
  document.getElementById("messages").appendChild(userMsg);
  input.value = "";

  try {
    const res = await fetch("http://127.0.0.1:5000/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: userInput }),
    });
    const data = await res.json();

    // const botMsg = document.createElement("div");
    // botMsg.className = "self-start px-4 py-2 rounded-lg max-w-[70%] bg-white text-black border border-gray-300 shadow-sm dark:bg-botdark dark:text-white dark:border-gray-600";

    // botMsg.textContent = data.response || data.error || "No response.";
    // document.getElementById("messages").appendChild(botMsg);
    const botMessage = document.createElement("div");
botMessage.className = "self-start px-4 py-3 rounded-lg max-w-[80%] bg-white text-black border border-gray-300 dark:bg-botdark dark:text-white dark:border-gray-600";
document.getElementById("messages").appendChild(botMessage);
typeBotMessage(data.response || data.error, botMessage);
// document.getElementById("messages").scrollTop = document.getElementById("messages").scrollHeight;

  } catch (error) {
    console.error("Error:", error);
  }
}

// Typing animation for bot message
function typeBotMessage(text, container) {
  let index = 0;
  const speed = 30; // typing speed in ms
  container.textContent = ""; // Clear in case reused
  const interval = setInterval(() => {
    if (index < text.length) {
      container.textContent += text.charAt(index);
      index++;
    } else {
      clearInterval(interval);
    }
  }, speed);
}

// ✅ Theme Toggle
function toggleTheme() {
  const body = document.body;
  const toggle = document.getElementById("theme-toggle");
  if (toggle.checked) {
    body.classList.add("dark");
    localStorage.setItem("theme", "dark");
  } else {
    body.classList.remove("dark");
    localStorage.setItem("theme", "light");
  }
}

// ✅ Auth UI
function updateUIOnLogin() {
  const email = localStorage.getItem("userEmail");
  document.getElementById("user-email").textContent = email || "";
  document.getElementById("login-btn").style.display = email ? "none" : "inline-block";
  document.getElementById("logout-btn").style.display = email ? "inline-block" : "none";
}

// ✅ Auth Functions
function signIn() {
  signInWithPopup(auth, provider)
    .then((result) => {
      localStorage.setItem("userEmail", result.user.email);
      updateUIOnLogin();
    })
    .catch((error) => {
      alert("Login failed: " + error.message);
    });
}

function logout() {
  signOut(auth).then(() => {
    localStorage.removeItem("userEmail");
    updateUIOnLogin();
  });
}

// ✅ On DOM Load
window.addEventListener("DOMContentLoaded", () => {
  updateUIOnLogin();

  // Theme preference
  if (localStorage.getItem("theme") === "dark") {
    document.body.classList.add("dark");
    document.getElementById("theme-toggle").checked = true;
  }

  // ✅ Enter key support
  const inputBox = document.getElementById("user_input");
  inputBox.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      sendMessage();
    }
  });
});


// ✅ Expose functions to window (important for inline onclick)
window.sendMessage = sendMessage;
window.toggleTheme = toggleTheme;
window.signIn = signIn;
window.logout = logout;
