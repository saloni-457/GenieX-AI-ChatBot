import { useState, useEffect, useRef } from "react";
import { auth } from "../firebase/config";
import ListeningOverlay from "./ListeningOverlay"; // ✅ Path assumed correct

export default function ChatBox({ setChatTitles, BASE_URL, selectedLanguage, selectedFolder }) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [user, setUser] = useState(null); // firebase user
  const [activeChatId, setActiveChatId] = useState(null); // track which chat is open
  const [openMenu, setOpenMenu] = useState(null);

  const messagesRef = useRef(null);
  const messagesEndRef = useRef(null);

  // 🟢 (Fix) These need to exist if ListeningOverlay is used
  const [isListening, setIsListening] = useState(false);
  const stopListening = () => setIsListening(false);

  // Track logged-in user
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) setUser(user);
    });
    return () => unsubscribe();
  }, []);

  // Load latest chat on mount
  useEffect(() => {
    if (!user) return;
    fetch(`${BASE_URL}/get-chats/${user.uid}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.length > 0) {
          setMessages(data[data.length - 1].messages);
          setActiveChatId(data[data.length - 1]._id);
        }
      })
      .catch(console.error);
  }, [user, BASE_URL]);

  // 🟢 saveCurrentChat moved outside sendMessage
  const saveCurrentChat = async (finalMessages = messages) => {
    if (!user || finalMessages.length === 0) return;

    try {
      if (activeChatId) {
        // update existing chat
        await fetch(`${BASE_URL}/update-chat/${activeChatId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user.uid,
            messages: finalMessages,
            timestamp: Date.now(),
            folder: selectedFolder || "Default",
          }),
        });
      } else {
        // create new chat
        const res = await fetch(`${BASE_URL}/save-chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user.uid,
            messages: finalMessages,
            timestamp: Date.now(),
            folder: selectedFolder || "Default",
          }),
        });
        const saved = await res.json();
        setActiveChatId(saved.chatId);
      }
      refreshSidebar();
    } catch (err) {
      console.error("Error saving chat:", err);
    }
  };

  // Send a message
  const sendMessage = async () => {
    if (!user || !input.trim()) return;

    const newMessage = { role: "user", content: input, timestamp: Date.now() };
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
      // const aiMessage = { role: "assistant", content: data.response };

      const aiMessage = { role: "assistant", content: data.response, timestamp: Date.now() };
      const finalMessages = [...updatedMessages, aiMessage];
      setMessages(finalMessages);

      await saveCurrentChat(finalMessages);
    } catch (err) {
      console.error("❌ Error:", err);
    }
  };

  // Auto-scroll to bottom
  useEffect(() => {
    messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight });
  }, [messages]);

  // Sidebar: Toggle 3-dot menu
  const toggleMenu = (id) => {
    setOpenMenu((prev) => (prev === id ? null : id));
  };

  // 🟢 async added here
  const handleNewChat = async () => {
    await saveCurrentChat();
    setMessages([]);
    setActiveChatId(null);
    refreshSidebar();
  };

  // Rename chat
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

  // Delete chat
  const handleDelete = (id) => {
    if (!window.confirm("Are you sure you want to delete this chat?")) return;

    fetch(`${BASE_URL}/delete-chat/${id}`, {
      method: "DELETE",
    })
      .then(() => refreshSidebar())
      .catch((err) => console.error("Delete error:", err));
  };

  // Refresh sidebar chat list
  const refreshSidebar = () => {
    if (!user || !setChatTitles) return;

    fetch(`${BASE_URL}/get-chat-summaries/${user.uid}`)
      .then((res) => res.json())
      .then((data) => {
        const unique = Array.from(new Map(data.map((item) => [item._id, item])).values());
        setChatTitles(unique);
      })
      .catch((err) => console.error("Sidebar refresh failed:", err));
  };

  // Load chat
  const loadChat = async (chatId) => {
    await saveCurrentChat();

    fetch(`${BASE_URL}/get-chats/${user.uid}`)
      .then((res) => res.json())
      .then((data) => {
        const chat = data.find((c) => c._id === chatId);
        if (chat) {
          setMessages(chat.messages || []);
          setActiveChatId(chat._id);
        }
      });
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
            style={{
              whiteSpace: "pre-wrap",
              lineHeight: "1.6",
              marginBottom: "12px",
            }}
          >
            {msg.content}
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

      {isListening && (
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
