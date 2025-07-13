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


// useEffect(() => {
//   const unsubscribe = onAuthStateChanged(auth, setUser);
//   return () => unsubscribe();
// }, []);


const [loading, setLoading] = useState(true); // <-- Add this

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

useEffect(() => {
  const timer = setTimeout(() => setLoadingIntro(false), 10000);
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
// if (loadingIntro) {
//   return (
//     <div className="fixed inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-purple-400 to-blue-400 text-white z-50">
//       <h1 className="text-5xl font-bold mb-4 animate-pulse">✨ Starting GenieX...</h1>
//       <p className="text-lg">Our smart assistant is getting ready</p>
//     </div>
//   );
// }
// if (loadingIntro) {
//   return (
//     <div className="fixed inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-purple-600 via-indigo-500 to-blue-500 text-white z-[9999] transition-opacity duration-1000">
//       <h1 className="text-5xl font-bold mb-4 animate-bounce">✨ Starting GenieX...</h1>
//       <div className="flex gap-1 text-2xl animate-pulse">
//         <span>.</span>
//         <span>.</span>
//         <span>.</span>
//       </div>
//     </div>
//   );
// }


if (loadingIntro) {
  return (
    <div
      className="fixed inset-0 bg-gradient-to-br from-[#f0f0ff] via-white to-[#f4faff] flex flex-col items-center justify-center z-[9999]"
      onClick={() => setLoadingIntro(false)} // Tap to dismiss
    >
      <img
        src="/chat-box.png"
        alt="GenieX Bot"
        className="w-44 h-44 mb-4 animate-bounce"
      />
      <h1 className="text-3xl sm:text-4xl font-bold text-center text-gray-800">
        Your ✨<span className="text-blue-500">AI Companion</span> for Everyday
      </h1>
      <div className="text-gray-500 mt-4 text-sm">(Tap anywhere to continue)</div>
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
        <div className="flex justify-center items-center h-[80vh] text-lg animate-bounce">
          Please sign in to continue.
        </div>
      )}

    </div>
  );

}