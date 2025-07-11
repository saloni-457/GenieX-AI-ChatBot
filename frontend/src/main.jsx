// ⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛ IMPORTS & INITIAL SETUP ⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛

import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import jsPDF from "jspdf";

import html2pdf from 'html2pdf.js';


import { auth, signInWithGoogle } from "./firebase/config";


// ⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛ UTILITY: TIME AGO FUNCTION ⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛



function timeAgo(timestamp) {
  const now = Date.now();
  const seconds = Math.floor((now - timestamp) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}


// ⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛ MAIN APP COMPONENT START ⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛

  const App = () => {
  const [input, setInput] = useState("");
  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [chatTitles, setChatTitles] = useState([]);
  const [openMenu, setOpenMenu] = useState(null);
  const [rightNavOpen, setRightNavOpen] = useState(false);
  const [leftNavOpen, setLeftNavOpen] = useState(true);
  const messagesEndRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeChatId, setActiveChatId] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState("en");
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [speakingMessageIndex, setSpeakingMessageIndex] = useState(null);

  const [isSpeaking, setIsSpeaking] = useState(false); // 🗣️ Track speaking
  const [speechSupported, setSpeechSupported] = useState(false);

  const [selectedFolder, setSelectedFolder] = useState("Default");
  const folders = ["All", "Default", "Work", "Personal", "Learning"];

// speech to text 
const startListening = () => {
  if (!('webkitSpeechRecognition' in window)) {
    alert("Speech recognition not supported in this browser.");
    return;
  }

  const recognition = new window.webkitSpeechRecognition();
  recognition.lang = selectedLanguage === 'hi' ? 'hi-IN' : selectedLanguage === 'es' ? 'es-ES' : 'en-US';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  setIsListening(true); // ✅ show "Listening..." when starts

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    setInput(transcript);
  };

  recognition.onerror = (event) => {
    console.error('Speech recognition error:', event.error);
    setIsListening(false); // ✅ stop listening on error
  };

  recognition.onend = () => {
    setIsListening(false); // ✅ hide "Listening..." when done
  };

  recognition.start();
};

const BASE_URL = import.meta.env.VITE_BACKEND_URL;

// text to speech
const speakText = (text, index = null) => {
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = selectedLanguage === 'hi' ? 'hi-IN' : selectedLanguage === 'es' ? 'es-ES' : 'en-US';
  utterance.rate = 1;
  utterance.pitch = 1;

  utterance.onstart = () => {
    setIsSpeaking(true);
    setSpeakingMessageIndex(index);
  };
  utterance.onend = () => {
    setIsSpeaking(false);
    setSpeakingMessageIndex(null);
  };
  utterance.onerror = () => {
    setIsSpeaking(false);
    setSpeakingMessageIndex(null);
  };

  window.speechSynthesis.speak(utterance);
};



const stopListening = () => {
  window.webkitSpeechRecognition && window.webkitSpeechRecognition.abort?.();
  setIsListening(false);
};

 // ⬛ MENU TOGGLE HANDLER ⬛

  const toggleMenu = (id) => {
    setOpenMenu((prev) => (prev === id ? null : id));
  };

  // ⬛ CHAT TITLE EDIT HANDLER ⬛


  const handleEdit = (chat) => {
    const newTitle = prompt("Rename chat:", chat.title);
    if (!newTitle) return;

    fetch(`${BASE_URL}/rename-chat/${chat._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle }),
    })
      .then(() => refreshSidebar())
      .catch((err) => console.error("Rename error:", err));
  };

    // ⬛ CHAT DELETE HANDLER ⬛

  const handleDelete = (id) => {
    if (!window.confirm("Are you sure you want to delete this chat?")) return;

    fetch(`${BASE_URL}/delete-chat/${id}`, {
      method: "DELETE",
    })
      .then(() => refreshSidebar())
      .catch((err) => console.error("Delete error:", err));
  };

    // ⬛ REFRESH SIDEBAR DATA ⬛

  const refreshSidebar = () => {
    fetch(`${BASE_URL}/get-chat-summaries/${user.uid}`)
      .then((res) => res.json())
      .then((data) => setChatTitles(data));
  };


  const loadChat = (chatId) => {
  console.log("Clicked Chat ID:", chatId);
  console.log("User:", user);

  if (!user || !user.uid) {
    alert("User not authenticated yet. Please wait...");
    return;
  }

  setActiveChatId(chatId);

  fetch(`${BASE_URL}/get-chats/${user.uid}`)
    .then((res) => res.json())
    .then((allChats) => {
      const selected = allChats.find((c) => c._id === chatId);
      if (selected) {
        console.log("Loaded Messages:", selected.messages);
        setMessages(selected.messages);
      } else {
        console.warn("No chat found with this ID.");
      }
    })
    .catch((err) => console.error("Error loading chat:", err));
};
  // ⬛ ON MOUNT: THEME SETUP ⬛
  
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
      document.body.classList.add("dark");
    }
  }, []);

    // Speech to text 
    useEffect(() => {
  if ('speechSynthesis' in window && 'webkitSpeechRecognition' in window) {
    setSpeechSupported(true);
  }
}, []);

    // ⬛ TOGGLE THEME HANDLER ⬛


  const toggleTheme = (e) => {
    const isDark = e.target.checked;
    document.body.classList.toggle("dark", isDark);
    localStorage.setItem("theme", isDark ? "dark" : "light");
  };

            
  // ---------------------------------------------------
  //                 handler Function
  // ---------------------------------------------------


    const handleMoveToFolder = (chat, newFolder) => {
    if (!newFolder) return;

    fetch(`${BASE_URL}/update-folder/${chat._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folder: newFolder }),
    })
      .then(() => refreshSidebar())
      .catch((err) => console.error("Move folder error:", err));
  };
// ⬛ USER AUTH STATE LISTENER ⬛

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

    // ⬛ WHEN USER IS SET, FETCH SIDEBAR ⬛

  useEffect(() => {
    if (!user) return;
    refreshSidebar();
  }, [user]);

    // ⬛ AUTO SCROLL TO BOTTOM ON NEW MESSAGE ⬛

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

    // ⬛ SEND MESSAGE HANDLER ⬛
    folder: selectedFolder || "Default"


const sendMessage = async () => {
  if (!input.trim()) return;

  const newMessages = [...messages, { sender: "user", text: input }];
  setMessages(newMessages);
  setInput("");
  setIsTyping(true);

  const safeFolder = selectedFolder || "Default";

  try {
    const res = await fetch(`${BASE_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: input,
        language: selectedLanguage
      }),
    });

    const data = await res.json();
    setIsTyping(false);

    const finalMessages = [...newMessages, { sender: "bot", text: data.response }];
    setMessages(finalMessages);

    // ✅ TTS: Speak bot reply if voice is enabled
    if (voiceEnabled) {
      speakText(data.response);
    }

    if (user && finalMessages.length > 1) {
      await fetch(`${BASE_URL}/save-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.uid,
          messages: finalMessages,
          timestamp: Date.now(),
          folder: safeFolder
        }),
      });
      refreshSidebar();
    }

  } catch (err) {
    setIsTyping(false);
    const finalMessages = [...newMessages, { sender: "bot", text: "Something went wrong. Please try again." }];
    setMessages(finalMessages);
    console.error("❌ Error during sendMessage:", err);
  }
};


const exportChatAsPDF = () => {
  if (messages.length === 0) {
    alert("No messages to export.");
    return;
  }

  const element = document.createElement("div");

  element.innerHTML = `
    <h2 style="text-align:center;">GenieX Chat Export</h2>
    <hr />
    ${messages
      .map((msg) => {
        const sender = msg.sender === "user" ? "👤 You" : "🤖 GenieX";
        const color = msg.sender === "user" ? "#222" : "#4b0082";
        return `<p><strong style="color:${color};">${sender}:</strong> ${msg.text}</p>`;
      })
      .join("")}
  `;

  html2pdf()
    .from(element)
    .set({
      margin: 10,
      filename: `chat_${Date.now()}.pdf`,
      html2canvas: { scale: 2 },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    })
    .save();
};



// ⬛ Dynamic folder icon selection
const folderIcons = {
  All: "select.png",
  Work: "/trello.png",
  Personal: "/bag.png",
  Learning: "/study.png",
  Default: "/user.png",
};

const folderIcon = folderIcons[selectedFolder] || "/icons/default.png";


if (!user) {
  return (
    <div className="flex items-center justify-center h-screen bg-lightBg dark:bg-gptdark">
      <button
        onClick={signInWithGoogle} // 🔑 Your Google login function
        className="bg-gradient-to-r from-[#9a7dff] to-[#4b5dff] text-white px-6 py-3 rounded-full shadow-lg hover:opacity-90 transition-all duration-300"
      >
        Sign In with Google
      </button>
    </div>
  );
}
  return (
    <div className="bg-lightBg text-lightText dark:bg-gptdark dark:text-white min-h-screen font-sans transition-colors duration-500">
      <div className="flex h-screen relative">
        {/* Sidebar Toggle Button with Logo */}
<button
  onClick={() => setLeftNavOpen(!leftNavOpen)}
  
  className="absolute top-3 left-3 z-50 p-2 rounded-full bg-white dark:bg-gray-800 shadow-md hover:scale-105 transition-transform duration-200"
  title="Toggle Sidebar"
>
  
  <img
    src={leftNavOpen ? "/slidebar-left.png" : "/slidebar-left.png"}
    alt="Toggle Sidebar"
    className="w-6 h-6" 
    // className="w-6 h-6 transform transition-transform duration-300 group-hover:rotate-180"

  />
</button>

{/* Sidebar Toggle Image Button */}
<button
  onClick={() => setLeftNavOpen(!leftNavOpen)}
  className="absolute top-3 left-3 z-50 p-2 rounded-full bg-white dark:bg-gray-800 shadow-md hover:scale-105 transition-transform duration-200"
  title="Toggle Sidebar"
>
  <img
    src={leftNavOpen ? "/slidebar-left.png" : "/slidebar-left.png"}     
    alt="Toggle Sidebar"
    className="w-6 h-6"
  />
</button>

{/* Sidebar */}
{leftNavOpen && (
  <aside className="w-64 pt-14 p-4 overflow-y-auto border-r border-gray-300 dark:border-gray-700 shadow-xl transition-all duration-500 ease-in-out bg-[#e1e7ff] dark:bg-[#1e1e2e]">
    

  


{/* 📁 Folder Label (selectedFolder) - Horizontal */}
<div className="flex flex-row items-center gap-2 mb-4 mt-2 ">
  <img src={folderIcon} alt="Folder Icon" className="w-5 h-5 opacity-70" />
  <span className="text-sm font-semibold text-gray-700 dark:text-white tracking-wide">
    {selectedFolder}
  </span>
</div>


    {/* 🔍 Search Bar */}
<div className="mt-4 flex items-center gap-2 bg-white dark:bg-gray-800 px-3 py-2 rounded-lg shadow-sm mb-4">
      <img src="/magnifying-glass.png" alt="Search" className="w-4 h-4 opacity-60" />
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)} // <-- 🔁 This line
        placeholder="Search chats."
        className="flex-1 text-sm bg-transparent outline-none text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
      />

    </div>

    {/* Chats heading */}
<h2 className="text-xl font-bold mb-3 flex items-center gap-2 text-gray-800 dark:text-white animate-slide-in-left">
  Chats

  <img
  src="/live-chat.png"
  alt="chat icon"
  className="w-5 h-5 align-middle"
/>

</h2>

    {/* 💬 Chat List */}
    {user && (<ul className="space-y-2">
      {
chatTitles
  .filter(chat =>
    chat.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
  (selectedFolder === "All" || (chat.folder || "Default") === selectedFolder)
  )

    .map((chat) => (
      <li
      
        key={chat._id} 
        
        className={`flex justify-between items-center group px-3 py-2 rounded-lg transition-all duration-300
          ${activeChatId === chat._id
            ? 'bg-purple-600 text-white'
            : 'text-gray-800 dark:text-white hover:bg-purple-600 hover:text-white'}
            
        `}
        
      >

      {/* <div onClick={() => loadChat(chat._id)} className="cursor-pointer flex-1 truncate capitalize">
        <div>{chat.title}</div>
        <span className="text-xs text-gray-500">{timeAgo(chat.timestamp)}</span>
      </div> */}


        <span
          onClick={() => loadChat(chat._id)}
          className="cursor-pointer flex-1 truncate capitalize group relative"
        >
          {chat.title}
          <span
            className="text-xs text-gray-400 opacity-0 group-hover:opacity-100 ml-2 inline-block transition-opacity duration-300"
            title={`Sent at ${new Date(chat.timestamp).toLocaleString()}`}
          >
            {timeAgo(chat.timestamp)}
          </span>

        </span>

          {/* <span
            onClick={() => loadChat(chat._id)}
            className="cursor-pointer flex-1 truncate capitalize"
          >
            {chat.title}
          </span> */}
          <div className="relative">
            <button
    className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 px-2 text-gray-500 dark:text-gray-300 hover:text-white"
              onClick={() => toggleMenu(chat._id)}
              title="Options"
            >
              ⋯
            </button>
            {openMenu === chat._id && (
              <div className="absolute right-0 z-10 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 shadow rounded mt-2 p-1 w-28">
                <button
                  onClick={() => handleEdit(chat)}
        className="block w-full text-left text-sm px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-600"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(chat._id)}
                  className="block w-full text-left text-sm px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-600 text-red-600"
                >
                  Delete
                </button>
              <div className="relative group">
                <button className="block w-full text-left text-sm px-2 py-1 text-blue-600 hover:bg-gray-100 dark:hover:bg-gray-600">
                  Move to Folder ▸
                </button>

                <div className="absolute left-full top-0 ml-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded shadow-md z-10 opacity-0 group-hover:opacity-100 group-hover:block pointer-events-auto transition-all duration-200">
                  {folders.map((folder) => (
                    <button
                      key={folder}
                      onClick={() => handleMoveToFolder(chat, folder)}
                      className="block w-full text-left px-3 py-1 text-sm hover:bg-gray-100 dark:hover:bg-gray-600"
                    >
                      {folder}
                    </button>
                  ))}
                </div>
              </div>




              </div>
            )}
          </div>
        </li>
      ))}
        {/* ✅ Show when no chats in current folder */}
  {
    chatTitles.filter(chat =>
      chat.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
      (selectedFolder === "All" || (chat.folder || "Default") === selectedFolder)
    ).length === 0 && (
      <div className="text-sm text-gray-500 dark:text-gray-400 text-center mt-4">
        No chats found in this folder.
      </div>
    )
  }
    </ul>)}
  </aside>
)}

{/* {speechSupported && (
  <div className="flex items-center gap-3 mb-4 ml-4">
     🎤 Mic Button (Animated if listening) 
    <button
      onClick={isListening ? stopListening : startListening}
      className={`p-3 rounded-full text-white shadow transition-all duration-300
        ${isListening ? 'bg-red-500 animate-pulse' : 'bg-blue-500 hover:bg-blue-600'}`}
      title={isListening ? "Stop Listening" : "Start Listening"}
    >
      🎤
    </button>

    🔇 Voice Toggle 
    <button
      onClick={() => setVoiceEnabled(!voiceEnabled)}
      className="text-sm px-4 py-2 bg-gray-300 dark:bg-gray-800 rounded shadow hover:bg-gray-400 dark:hover:bg-gray-700 transition-all"
    >
      {voiceEnabled ? "🔊 Voice ON" : "🔇 Voice OFF"}
    </button>

    🔊 Test Voice 
    <button
      onClick={() => speakText("Hello! I'm GenieX. How can I help you today?")}
      className="p-3 rounded-full bg-green-500 text-white hover:bg-green-600 transition-all"
      title="Test GenieX Voice"
    >
      🔊
    </button>
  </div>
)} */}


        {/* Main Chat Area */}
      <main className={`flex flex-col flex-1 p-6 justify-between transition-all duration-300 ease-in-out 
        ${rightNavOpen ? "mr-64" : ""}  // 👈 leaves space for right nav
      `}>
          {/* Top Navbar */}
          <div className="text-center mb-4 bg-gradient-to-r from-[#a27bff] to-[#5b6eff] dark:bg-[#2d2b3a] py-3 rounded shadow-md animate-fade-in">
            <div className="inline-flex items-center gap-3">
              <img src="/generative.png" alt="GenieX" className="w-6 h-6" />
              <h1 className="text-xl font-bold text-white tracking-wide">GenieX</h1>
            </div>
          </div>

          {/* Messages */}
          <div id="messages" className="flex flex-col gap-4 overflow-y-auto flex-1 px-4 transition-all duration-300">
            {isListening && (
              <div className="self-start px-4 py-2 rounded-2xl max-w-[70%] bg-yellow-100 text-yellow-900 shadow">
                🎙 Listening...
              </div>
            )}

            {messages.length === 0 ? (
              <div className="text-center text-gray-400 dark:text-gray-500 animate-pulse">Start Conversation</div>
            ) : (

              messages.map((msg, i) => (
                <div
                  key={i}
                  className={`transition-opacity duration-300 animate-slide-up flex items-start gap-2 ${
                    msg.sender === "user"
                      ? "self-end px-4 py-2 rounded-2xl max-w-[70%] text-black bg-white border"
                      : "self-start px-4 py-2 rounded-2xl max-w-[70%] text-white bg-[#7b4eff]"
                  }`}
                >
                  <span className="flex-1">{msg.text}</span>

                  {/* 🔊 Button for bot messages */}
                  {msg.sender === "bot" && (
                    <>
                      {speakingMessageIndex === i ? (
                        <button
                          onClick={() => {
                            window.speechSynthesis.cancel();
                            setIsSpeaking(false);
                            setSpeakingMessageIndex(null);
                          }}
                          className="ml-2 text-sm text-red-300 hover:text-red-100"
                          title="Stop speaking"
                        >
                          🔇
                        </button>
                      ) : (
                        <button
                          onClick={() => speakText(msg.text, i)}
                          className="ml-2 text-sm text-white opacity-70 hover:opacity-100"
                          title="Speak this message"
                        >
                          🔊
                        </button>
                      )}
                    </>
                  )}
                </div>
              ))


              // messages.map((msg, i) => (
              //   <div
              //     key={i}
              //     className={`transition-opacity duration-300 animate-slide-up ${
              //       msg.sender === "user"
              //         ? "self-end px-4 py-2 rounded-2xl max-w-[70%] text-black bg-white border"
              //         : "self-start px-4 py-2 rounded-2xl max-w-[70%] text-white bg-[#7b4eff]"
              //     }`}
              //   >
              //     {msg.text}
              //   </div>
              // ))
            )}
            {isTyping && (
              <div className="self-start px-4 py-2 rounded-2xl max-w-[70%] text-white bg-[#7b4eff] animate-pulse">
                GenieX is typing<span className="animate-bounce">...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}

<div className="flex gap-2 mt-4 transition-all duration-200 items-center">
  {/* 🎤 Mic Button */}
  <button
    onClick={isListening ? stopListening : startListening}
    className={`p-2 rounded-full text-white shadow transition-all duration-300
      ${isListening ? "bg-red-500 animate-pulse" : "bg-blue-500 hover:bg-blue-600"}`}
    title={isListening ? "Stop Listening" : "Start Listening"}
  >
    🎤
  </button>

  {/* 🔊 or 🔇 Button (TTS Toggle) */}
  {isSpeaking ? (
    <button
      onClick={() => {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
      }}
      className="p-2 rounded-full bg-red-600 text-white hover:bg-red-700 transition-all"
      title="Stop GenieX Voice"
    >
      🔇
    </button>
  ) : (
    <button
    onClick={() => {
      const lastBotMsg = [...messages].reverse().find(msg => msg.sender === "bot");
      if (lastBotMsg) {
        speakText(lastBotMsg.text);
      } else {
        alert("No bot message to speak yet.");
      }
    }}
      className="p-2 rounded-full bg-green-500 text-white hover:bg-green-600 transition-all"
      title="Test GenieX Voice"
    >
      🔊
    </button>
  )}

  {/* Input with optional listening animation */}
  <div className="relative flex-1">
    <input
      type="text"
      value={input}
      onChange={(e) => setInput(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") sendMessage();
      }}
      placeholder={isListening ? "🎙 Listening..." : "Type your message..."}
      className={`w-full px-4 py-2 rounded-2xl border border-lightBorder bg-white text-black dark:bg-botdark dark:text-white transition-all duration-300 ${
        isListening ? "pl-10 text-purple-600 font-semibold" : ""
      }`}
    />

    {/* 🎙️ Animated dots if listening */}
    {isListening && (
      <div className="absolute left-3 top-1/2 transform -translate-y-1/2 flex items-center gap-1 animate-pulse">
        <div className="w-1 h-3 bg-purple-500 rounded-full animate-bounce"></div>
        <div className="w-1 h-5 bg-purple-500 rounded-full animate-bounce delay-100"></div>
        <div className="w-1 h-4 bg-purple-500 rounded-full animate-bounce delay-200"></div>
      </div>
    )}
  </div>

  {/* Send ➤ Button */}
  <button
    onClick={sendMessage}
    className="bg-[#7b4eff] text-white px-4 py-2 rounded-2xl hover:bg-[#673de6] transition-all duration-300"
  >
    ➤
  </button>
</div>

          {/* <div className="flex gap-2 mt-4 transition-all duration-200 items-center">
   🎤 Mic Button 
  <button
    onClick={isListening ? stopListening : startListening}
    className={`p-2 rounded-full text-white shadow transition-all duration-300
      ${isListening ? "bg-red-500 animate-pulse" : "bg-blue-500 hover:bg-blue-600"}`}
    title={isListening ? "Stop Listening" : "Start Listening"}
  >
    🎤
  </button>

   🔊 TTS Test Button 
  <button
    onClick={() => speakText("Hello! I'm GenieX. How can I help you today?")}
    className="p-2 rounded-full bg-green-500 text-white hover:bg-green-600 transition-all"
    title="Test GenieX Voice"
  >
    🔊
  </button>

   📝 Input Field with Recording UI 
  <div className="relative flex-1">
    <input
      type="text"
      value={input}
      onChange={(e) => setInput(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") sendMessage();
      }}
      placeholder={isListening ? "🎙 Listening..." : "Type your message..."}
      className={`w-full px-4 py-2 rounded-2xl border border-lightBorder bg-white text-black dark:bg-botdark dark:text-white transition-all duration-300 ${
        isListening ? "pl-10 text-purple-600 font-semibold" : ""
      }`}
    />

     🎙️ Waveform Animation 
    {isListening && (
      <div className="absolute left-3 top-1/2 transform -translate-y-1/2 flex items-center gap-1 animate-pulse">
        <div className="w-1 h-3 bg-purple-500 rounded-full animate-bounce"></div>
        <div className="w-1 h-5 bg-purple-500 rounded-full animate-bounce delay-100"></div>
        <div className="w-1 h-4 bg-purple-500 rounded-full animate-bounce delay-200"></div>
      </div>
    )}
  </div>

   Send ➤ Button 
  <button
    onClick={sendMessage}
    className="bg-[#7b4eff] text-white px-4 py-2 rounded-2xl hover:bg-[#673de6] transition-all duration-300"
  >
    ➤
  </button>
</div> */}

          {/* <div className="flex gap-2 mt-4 transition-all duration-200">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") sendMessage();
              }}
              placeholder="Type your message..."
              className="flex-1 px-4 py-2 rounded-2xl border border-lightBorder bg-white text-black dark:bg-botdark dark:text-white transition-all duration-300"
            />
            <button
              onClick={sendMessage}
              className="bg-[#7b4eff] text-white px-4 py-2 rounded-2xl hover:bg-[#673de6] transition-all duration-300"
            >
              ➤
            </button>
          </div> */}
        </main>

{/* setActiveChatId(null);  */}
        {/* Right Slider Nav */}
<div
  className={`fixed top-0 right-0 h-full w-64 bg-[#e1e7ff] dark:bg-[#1e1e2e] border-l border-gray-300 dark:border-gray-700 
    transition-transform duration-300 ease-in-out z-40 
    ${rightNavOpen ? "translate-x-0" : "translate-x-full"}`}
>
          <div className="p-4 flex flex-col h-full animate-fade-in">

  {/* 🔝 Top Buttons Section */}
  <div className="flex-grow">
    
              <button
                onClick={() => {
                  setMessages([]);
                   setActiveChatId(null); 
                  refreshSidebar();
                }}
                className="bg-gradient-to-r from-[#9a7dff] to-[#4b5dff] text-white px-4 py-2 mb-4 rounded hover:opacity-90 w-full transition-all duration-300"
              >
                + New Chat
              </button>

            {/* -----------------------------
                  EXPORT CHAT 
        ------------------------------------- */}

              <button
                  onClick={exportChatAsPDF}
                  className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white px-4 py-2 mb-4 rounded hover:opacity-90 w-full transition-all duration-300"
                >
                  📝 Export Chat
                </button>


        <div className="mb-4">
              <label className="block text-sm font-medium mb-1 text-gray-800 dark:text-white">Folder</label>
              <select
                value={selectedFolder}
                onChange={(e) => {
                  setSelectedFolder(e.target.value);
                  refreshSidebar(); // optionally filter chats by folder
                }}
                className="w-full px-3 py-2 rounded border dark:bg-gray-800 dark:text-white"
              >
                {folders.map((folder) => (
                  <option key={folder} value={folder}>
                    {folder}
                  </option>
                ))}
              </select>

        </div>

              <label className="inline-flex items-center cursor-pointer w-full mb-6">
                   {/* ----------------------------------------------------------------------
                                 Selecting Language
              ------------------------------------------------------------------------------ */}
                <input type="checkbox" id="theme-toggle" className="sr-only peer" onChange={toggleTheme} />
                              <div className="mb-4">
                <label className="block text-sm font-medium mb-1 text-gray-800 dark:text-white">Language</label>
                <select
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  className="w-full px-3 py-2 rounded border dark:bg-gray-800 dark:text-white"
                >
                  <option value="en">English</option>
                  <option value="hi">Hindi</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>  
                  <option value="de">German</option> 
                </select>
              </div>

                <div className="w-11 h-6 bg-gray-400 rounded-full peer-checked:bg-purple-600 relative">
                  <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-full"></div>
                </div>
                <span className="ml-3 text-sm">Dark Mode</span>
              </label>
            </div>
                       {/* ✅ Logged in Info */}
          {user ? (
  <>
    {/* ✅ Logged in Info */}
    <div className="text-sm text-gray-700 dark:text-white mb-4 break-words font-mono">
      <span className="block text-xs">Logged in as:</span>
      {user?.email}
      <div className="mt-2 text-xs text-purple-700 dark:text-purple-300">Enjoy your smart assistant ✨</div>
    </div>

    {/* ✅ Logout Button */}
<button
  onClick={() => {
    auth.signOut();
    setChatTitles([]);
    setMessages([]);
    setActiveChatId(null);
    setLeftNavOpen(false);
    setRightNavOpen(false);
  }}
  className="bg-gradient-to-r from-[#9a7dff] to-[#4b5dff] text-white px-4 py-2 rounded hover:opacity-90 w-full transition-all duration-300 text-sm"
>
  Logout
</button>

  </>
) : (
  <button
    onClick={signInWithGoogle}
    className="bg-gradient-to-r from-[#9a7dff] to-[#4b5dff] text-white px-4 py-2 rounded hover:opacity-90 w-full transition-all duration-300 text-sm"
  >
    Sign In with Google
  </button>
)}


          </div>
        </div>

      {rightNavOpen ? (
        <button
          onClick={() => setRightNavOpen(false)}
          className="absolute top-[65px] right-[280px] bg-[#f8f8f8] text-white px-3 py-2 rounded-full shadow-lg  dark:bg-gray-800 hover:bg-[#cfcfea] transition-all duration-300 z-50"
          title="Close Menu"
        >
          <img
            src="/closed_sl.png"  //  your ❌ icon here
            alt="Close Menu"
            className="w-5 h-5"
          />
        </button>
      ) : (
        <button
          onClick={() => setRightNavOpen(true)}
          className="fixed top-4 right-4 bg-[#f9f9fa] text-white px-3 py-2 rounded-full shadow-lg  dark:bg-gray-800  hover:bg-[#fefefe] transition-all duration-300 z-50"
          title="Open Menu"
        >
          <img
            src="/opened_sl.png"  //  your ☰ icon here
            alt="Open Menu"
            className="w-5 h-5"
          />
        </button>
      )}
      


      </div>
    </div>
  );
};

// const root = ReactDOM.createRoot(document.getElementById("root"));
// root.render(
//   <React.StrictMode>
//     <App />
//   </React.StrictMode>
// );


const container = document.getElementById("root");

if (!container._reactRootContainer) {
  const root = ReactDOM.createRoot(container);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
