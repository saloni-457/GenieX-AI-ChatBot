import { useEffect, useState } from "react";
import { auth, provider } from "./firebase/config";
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import React, { useState, useEffect } from "react";


import ChatBox from "./components/ChatBox";
import "./index.css";

export default function App() {
  const [user, setUser] = useState(null);
  const [loadingIntro, setLoadingIntro] = useState(true);
  const [loading, setLoading] = useState(true);

  const [showSplash, setShowSplash] = useState(true); // 🔄 show splash on load

if (loadingIntro) {
  console.log("Splash screen visible");

  return (
    <div
      onClick={() => setLoadingIntro(false)}
      className="fixed inset-0 flex flex-col items-center justify-center text-gray-800 bg-gradient-to-br from-[#fdfbfb] via-[#ebedfa] to-[#d8ecf3] dark:from-[#1a1a2e] dark:to-[#1a1a2e] z-[9999] transition-all duration-700 ease-in-out"
    >
      {/* Bot */}
      <div className="relative mb-8 animate-fade-in">
        <img
          src="/bot_img.png" //  bot image 
          alt="AI Bot"
          className="w-44 h-44 sm:w-52 sm:h-52 mx-auto"
        />
        
        {/* Speech bubble */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 sm:-left-20 sm:translate-x-0 bg-white shadow-md px-4 py-2 rounded-xl text-sm font-medium text-gray-800 flex items-center gap-2 animate-bounce">
          Hey there! 👋 Need a boost?
        </div>
      </div>

      {/* Headline */}
      <h1 className="text-3xl sm:text-5xl font-bold text-center leading-snug">
        Your <span className="text-blue-400">✨ AI</span> Companion<br />for <span className="text-gray-700">Everyday</span>
      </h1>

      {/* to continue */}
      <p className="mt-6 text-sm sm:text-base text-gray-500 italic animate-pulse">
        Tap anywhere to begin your AI chat journey
      </p>

      {/* Bottom buttons */}
      <div className="absolute bottom-6 w-full flex justify-between px-8">
        <img src="/calendar.png" className="w-6 h-6 opacity-60" alt="History" />
        <img src="/pulse.png" className="w-6 h-6 opacity-60" alt="Mic Pulse" />
      </div>
    </div>
  );
}



useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
    setUser(currentUser || null);
    setLoading(false);  // ✅ Stop loading after Firebase resolves
  });

  return () => unsubscribe();
}, []);


useEffect(() => {
  const storedTheme = localStorage.getItem("theme");
  if (storedTheme === "dark") {
    document.body.classList.add("dark");
    document.getElementById("theme-toggle").checked = true;
  }
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

console.log("loadingIntro:", loadingIntro);


  
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
        <div className="flex justify-center items-center h-[80vh] text-lg animate-bounce">
          Please sign in to continue.
        </div>
      )}

    </div>
  );
}