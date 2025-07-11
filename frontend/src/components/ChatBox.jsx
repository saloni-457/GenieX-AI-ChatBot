import { useState, useEffect, useRef } from "react";
import { auth } from "../firebase/config";

export default function ChatBox({ setChatTitles }) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [user, setUserId] = useState(null);
  const messagesRef = useRef(null);
  const [openMenu, setOpenMenu] = useState(null);

  // Track logged-in user ID
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setUserId(user.email); // or user.uid if you use UID in your backend
      }
    });
    return () => unsubscribe();
  }, []);

  // Load latest chat on mount
  useEffect(() => {
    if (!userId) return;
    fetch(`http://localhost:5000/get-chats/${user.uid}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.length > 0) {
          setMessages(data[data.length - 1].messages);
        }
      })
      .catch(console.error);
  }, [userId]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMsg = { sender: "user", text: input };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");

    try {
      const res = await fetch("http://localhost:5000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input }),
      });

      const data = await res.json();
      const botMsg = { sender: "bot", text: data.response };
      const finalMessages = [...newMessages, botMsg];
      setMessages(finalMessages);

      await fetch("http://localhost:5000/save-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          messages: finalMessages,
          timestamp: Date.now(),
        }),
      });

      refreshSidebar(); // update sidebar after saving
    } catch (err) {
      console.error("❌ Error:", err);
    }
  };

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight });
  }, [messages]);

  // Sidebar: Toggle 3-dot menu
  const toggleMenu = (id) => {
    setOpenMenu((prev) => (prev === id ? null : id));
  };

  // Sidebar: Rename a chat
  const handleEdit = (chat) => {
    const newTitle = prompt("Rename chat:", chat.title);
    if (!newTitle) return;

    fetch(`http://localhost:5000/rename-chat/${chat._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle }),
    })
      .then(() => refreshSidebar())
      .catch((err) => console.error("Rename error:", err));
  };

  // Sidebar: Delete a chat
  const handleDelete = (id) => {
    if (!window.confirm("Are you sure you want to delete this chat?")) return;

    fetch(`http://localhost:5000/delete-chat/${id}`, {
      method: "DELETE",
    })
      .then(() => refreshSidebar())
      .catch((err) => console.error("Delete error:", err));
  };

  // Refresh sidebar chat list
  const refreshSidebar = () => {
    if (!userId || !setChatTitles) return;

    fetch(`http://localhost:5000/get-chat-summaries/${user.uid}`)
      .then((res) => res.json())
      .then((data) => setChatTitles(data))
      .catch((err) => console.error("Sidebar refresh failed:", err));
  };

  // Load a chat from sidebar
  const loadChat = (chatId) => {
    fetch(`http://localhost:5000/get-chats/${user.uid}`)
      .then((res) => res.json())
      .then((allChats) => {
        const selected = allChats.find((c) => c._id === chatId);
        if (selected) setMessages(selected.messages);
      });
  };

  return (
    <div className="flex flex-col h-screen p-4 bg-white dark:bg-gptdark text-black dark:text-white">
      <div ref={messagesRef} className="flex-1 overflow-y-auto space-y-2">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`max-w-[75%] px-4 py-2 rounded-lg ${
              msg.sender === "user"
                ? "ml-auto bg-purple-600 text-white"
                : "mr-auto bg-white text-black border dark:bg-botdark dark:text-white"
            }`}
          >
            {msg.text}
          </div>
        ))}
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
    </div>
  );
}
