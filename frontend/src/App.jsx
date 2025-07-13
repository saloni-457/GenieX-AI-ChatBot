import { useEffect, useState } from "react";
import { auth, provider } from "./firebase/config";
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";

import ChatBox from "./components/ChatBox";
import "./index.css";

export default function App() {
  const [user, setUser] = useState(null);
  const [loadingIntro, setLoadingIntro] = useState(true); // NEW: Startup loading state


    useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);


  useEffect(() => {
    const storedTheme = localStorage.getItem("theme");
    if (storedTheme === "dark") {
      document.body.classList.add("dark");
      document.getElementById("theme-toggle").checked = true;
    } 
    
    // Auto-hide startup screen
    const timer = setTimeout(() => {
      setLoadingIntro(false);
    }, 2500); // 2.5 seconds

    return () => clearTimeout(timer);
  }, []);



  const toggleTheme = (e) => {
    const isDark = e.target.checked;
    document.body.classList.toggle("dark", isDark);
    localStorage.setItem("theme", isDark ? "dark" : "light");
  };


  const login = () =>
    signInWithPopup(auth, provider)
      .then((res) => setUser(res.user))
      .catch((err) => alert("Login error: " + err.message));

  const logout = () => {
    signOut(auth);
    setUser(null);
  };


    // ⭐ STEP 1: Show Intro Screen First
  if (loadingIntro) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-purple-400 to-blue-400 text-white z-50">
        <h1 className="text-5xl font-bold mb-4 animate-pulse">✨ Starting GenieX...</h1>
        <p className="text-lg">Your smart assistant is getting ready</p>
      </div>
    );
  }


  
  return (
    <div className="bg-white text-black dark:bg-gptdark dark:text-white min-h-screen">
      {/* Header */}
      <header className="relative flex justify-between items-center px-6 py-3 shadow bg-white text-black dark:bg-navdark dark:text-white">
        <div className="w-32"></div>
        <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center gap-2">
          <img src="/generative.png" alt="logo" className="w-8 h-8 object-contain" />
          <h1 className="text-xl font-bold">GenieX</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm font-mono">{user?.email}</span>
          {!user ? (
            <button onClick={login} className="bg-purple-600 text-white px-3 py-1 rounded hover:bg-purple-700">
              Sign in
            </button>
          ) : (
            <button onClick={logout} className="bg-purple-600 text-white px-3 py-1 rounded hover:bg-purple-700">
              Logout
            </button>
          )}
          <label className="relative inline-flex items-center cursor-pointer">

{/* ------------------------------------------
            connects DB 
------------------------------------------ */}
            <input
              type="checkbox"
              id="theme-toggle"
              className="sr-only peer"
              onChange={toggleTheme}
            />
            <div className="w-11 h-6 bg-gray-400 rounded-full peer-checked:bg-userdarkhover"></div>
            <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-full"></div>
          </label>
        </div>
      </header>

      {/* Chat Area */}
      {user ? (
        <ChatBox />
      ) : (
        <div className="flex justify-center items-center h-[80vh] text-lg">Please sign in to continue.</div>
      )}
    </div>
  );

}