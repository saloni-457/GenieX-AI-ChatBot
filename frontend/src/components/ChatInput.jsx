import { useState } from "react";
import { Send } from "lucide-react";

export default function ChatInput({ onSend }) {
  const [message, setMessage] = useState("");
  const [bloom, setBloom] = useState(false);

  // Handle both click and Enter
  const handleSend = () => {
    if (!message.trim()) return;
    onSend(message);
    setMessage("");

    // Trigger bloom animation
    setBloom(true);
    setTimeout(() => setBloom(false), 700);
  };

  // ✅ Detect Enter key press
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault(); // prevent new line
      handleSend(); // same as clicking Send
    }
  };

  return (
    <div
      className={`relative flex items-center bg-white dark:bg-gray-900 rounded-2xl shadow-md p-2 transition-all 
        ${bloom ? "animate-bloom border border-purple-400" : ""}`}
    >
      <input
        className="flex-1 bg-transparent px-4 py-2 text-gray-800 dark:text-gray-200 outline-none"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown} // ✅ listens for Enter
        placeholder="Type your message..."
      />
      <button
        onClick={handleSend}
        className="p-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow hover:scale-110 transition"
      >
        <Send size={20} />
      </button>
    </div>
  );
}
