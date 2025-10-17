import { useState, useEffect, useRef } from "react";
import { auth } from "../firebase/config";
import ListeningOverlay from "./ListeningOverlay";

export default function ChatBox({ setChatTitles, BASE_URL, selectedLanguage, selectedFolder }) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [user, setUser] = useState(null);
  const [activeChatId, setActiveChatId] = useState(null);
  const [openMenu, setOpenMenu] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const stopListening = () => setIsListening(false);

  const messagesRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Track logged-in user
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => {
      if (u) setUser(u);
    });
    return () => unsubscribe();
  }, []);

    // ✅ Auto-scroll
  // useEffect(() => {
  //   messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight });
  // }, [messages]);

  // both are same

  useEffect(() => {
  messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);



  // Load latest chat on mount
  useEffect(() => {
    if (!user) return;
    fetch(`${BASE_URL}/get-chat-summaries/${user.uid}`)
      .then((res) => res.json())
      .then((data) => {
        
        if (data.length > 0) {
          const lastChatId = data[data.length - 1]._id;
          setActiveChatId(lastChatId);

          // fetch full chat messages
          fetch(`${BASE_URL}/get-chat/${lastChatId}`)
            .then(res => res.json())
            .then(chat => setMessages(chat.messages || []));
        }

      })
      .catch(console.error);
  }, [user]);

  // ✅ Refresh sidebar chat list
  const refreshSidebar = () => {
    if (!user || !setChatTitles) return;
    fetch(`${BASE_URL}/get-chat-summaries/${user.uid}`)
      .then((res) => res.json())
      .then((data) => {
        const unique = Array.from(new Map(data.map(item => [item._id, item])).values());
        setChatTitles(unique);
      })
      .catch((err) => console.error("Sidebar refresh failed:", err));
  };


const openChat = async (chatId) => {
  const res = await fetch(`${BASE_URL}/get-chat/${chatId}`);
  const chat = await res.json();
  if (!chat.error) {
    setMessages(chat.messages);
    setActiveChatId(chat._id);
  }
};

  // ✅ Centralized Save


//   const saveCurrentChat = async (finalMessages = messages) => {
//   if (!user) return;

//   const validMessages = finalMessages.filter(m => m.content && m.content.trim() !== "");
//   if (validMessages.length === 0) return;

//   try {
//     const payload = {
//       userId: user.uid,
//       messages: finalMessages,
//       timestamp: Date.now(),
//       folder: selectedFolder || "Default",
//     };

//     // ✅ include chatId if editing an existing chat
//     if (activeChatId) payload.chatId = activeChatId;

//     // ✅ single unified endpoint for both new + existing chats
//     const saveRes = await fetch(`${BASE_URL}/save-chat`, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify(payload),
//     });

//     const saved = await saveRes.json();

//     if (!saveRes.ok) {
//       console.error("Error saving chat:", saved.error || saved.message);
//       return;
//     }

//     // ✅ Update activeChatId only if it's a new chat
//     if (!activeChatId && saved.chatId) {
//       setActiveChatId(saved.chatId);
//     }

//     await refreshSidebar();
//   } catch (err) {
//     console.error("Error saving chat:", err);
//   }
// };




const saveCurrentChat = async () => {
  if (!activeChatId || !user) return;

  try {
    console.log("💾 Updating existing chat:", activeChatId);
    const response = await fetch(`${BASE_URL}/update-chat/${activeChatId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: user.uid,
        messages,
        timestamp: Date.now(),
      }),
    });

    const data = await response.json();
    console.log("✅ Chat updated:", data);
  } catch (error) {
    console.error("❌ Error saving chat:", error);
  }
};


// const saveCurrentChat = async (finalMessages = messages) => {
//   if (!user) return;

//   // ✅ Allow both content/text fields
//   const validMessages = finalMessages.filter(
//     (m) => (m.content && m.content.trim() !== "") || (m.text && m.text.trim() !== "")
//   );
//   if (validMessages.length === 0) return;

//   try {
//     const formattedMessages = finalMessages.map((m) => ({
//       role: m.role || (m.sender === "user" ? "user" : "assistant"),
//       content: m.content || m.text,
//       timestamp: m.timestamp || Date.now(),
//     }));

//     let endpoint = `${BASE_URL}/save-chat`;
//     let method = "POST";
//     let payload = {
//       userId: user.uid,
//       messages: formattedMessages,
//       timestamp: Date.now(),
//       folder: selectedFolder || "Default",
//     };

//     // 🧠 If we're editing an existing chat, update it instead of recreating
//     if (activeChatId) {
//       endpoint = `${BASE_URL}/update-chat/${activeChatId}`;
//       method = "PUT";
//     }

//     const res = await fetch(endpoint, {
//       method,
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify(payload),
//     });

//     const data = await res.json();
//     console.log("💾 saveCurrentChat() response:", data, "endpoint:", endpoint);

//     if (!res.ok) {
//       console.error("❌ Error saving chat:", data.error || data.message);
//       return;
//     }

//     // ✅ If new chat created, update activeChatId
//     if (!activeChatId && data.chatId) {
//       setActiveChatId(data.chatId);
//     }

//     await refreshSidebar();
//   } catch (err) {
//     console.error("❌ Error in saveCurrentChat:", err);
//   }
// };


// const editMessage = async (msgId, newContent) => {
//   const updated = messages.map(m =>
//     m.id === msgId ? { ...m, content: newContent, edited: true } : m
//   );
//   setMessages(updated);
//   await saveCurrentChat(updated); // push to DB
// };

const editMessage = async (msgId, newContent) => {
  const msgIndex = messages.findIndex(m => m.id === msgId);
  if (msgIndex === -1) return;

  const updatedMessages = messages.map((m, i) =>
    i === msgIndex ? { ...m, content: newContent, edited: true } : m
  );

  // Keep all messages before edited one
  const truncatedHistory = updatedMessages.slice(0, msgIndex + 1);

  // Save edited version
  setMessages(truncatedHistory);
  await saveCurrentChat(truncatedHistory);

  // Reprocess conversation from edited message onward
  const res = await fetch(`${BASE_URL}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId: user.uid,
      messages: truncatedHistory,
      language: selectedLanguage,
    }),
  });

  const data = await res.json();
  const aiMessage = { role: "assistant", content: data.response, timestamp: Date.now() };
  const finalMessages = [...truncatedHistory, aiMessage];
  setMessages(finalMessages);
  await saveCurrentChat(finalMessages);
};






  // ✅ Send message
  const sendMessage = async () => {
    if (!user || !input.trim()) return;

    const newMessage = { id: uuidv4(), role: "user", content: input, timestamp: Date.now() };
    const updatedMessages = [...messages, newMessage];
    setMessages(updatedMessages);
    setInput("");

    try {
      const res = await fetch(`${BASE_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.uid,
          messages: updatedMessages,
          language: selectedLanguage,
        }),
      });

      const data = await res.json();
      // const aiMessage = { role: "assistant", content: data.reply, timestamp: Date.now() };
      const aiMessage = {  id: uuidv4(), role: "assistant", content: data.response, timestamp: Date.now() };
      const finalMessages = [...updatedMessages, aiMessage];
      setMessages(finalMessages);

      await saveCurrentChat(finalMessages);
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  // ✅ New Chat
// const handleNewChat = () => {
//   setMessages([]);            // clear chat window
//   setActiveChatId(null);      // reset active chat
//   // setSelectedChatId(null);    // reset sidebar selection
// };

const handleNewChat = async () => {
  if (!user) return;

  // Save previous chat before resetting
  await saveCurrentChat();

  setMessages([]);
  setActiveChatId(null);

  // Create a blank new chat entry
  const res = await fetch(`${BASE_URL}/save-chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId: user.uid,
      messages: [],
      folder: selectedFolder || "Default",
      timestamp: Date.now(),
    }),
  });

  const data = await res.json();
  setActiveChatId(data.chatId);
  await refreshSidebar();
};



  // ✅ Load chat from sidebar
const loadChat = async (chatId) => {
  await saveCurrentChat(); 
  const res = await fetch(`${BASE_URL}/get-chat/${chatId}`);
  const selected = await res.json();
  if (!selected.error) {
    setMessages(selected.messages);
    setActiveChatId(chatId);
  }
};



  return (
    <div className="flex flex-col h-screen p-4 bg-white dark:bg-gptdark text-black dark:text-white">
      <div ref={messagesRef} className="flex-1 overflow-y-auto space-y-2">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`max-w-[75%] px-4 py-2 rounded-lg ${
              msg.role === "user"
                ? "ml-auto bg-purple-600 text-white"
                : "mr-auto bg-white text-black border dark:bg-botdark dark:text-white"
            }`}
            style={{ whiteSpace: "pre-wrap", lineHeight: "1.6", marginBottom: "12px" }}
          >
            {msg.content}
            {msg.edited && <span className="text-xs opacity-60 ml-2">(edited)</span>}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="flex mt-4 gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Type your message..."
          className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:bg-botdark dark:text-white"
        />
        <button
          onClick={sendMessage}
          className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
        >
          ➤
        </button>
      </div>

      {/* 🎙 If you have STT/TTS */}
      {typeof isListening !== "undefined" && isListening && (
        <ListeningOverlay
          transcript={input}
          onCancel={stopListening}
          onPause={() => {
            window.speechSynthesis.cancel();
            stopListening();
          }}
        />
      )}
    </div>
  );
}
