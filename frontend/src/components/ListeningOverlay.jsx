import React from "react";

export default function ListeningOverlay({ transcript, onCancel, onPause }) {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col justify-between items-center text-center px-6 py-10 bg-gradient-to-br from-orange-200 via-pink-300 to-pink-500 text-black transition-all duration-500">
      {/* 🔊 Listening Status */}
      <div className="text-sm text-gray-800 font-medium animate-pulse mt-8">Listening...</div>

      {/* 🔊 Vertical Bars Animation */}
      <div className="flex justify-center items-center mt-4 mb-6 gap-2 h-32">
        <div className="w-2 h-10 bg-white rounded-full animate-wave delay-0" />
        <div className="w-2 h-16 bg-white rounded-full animate-wave delay-100" />
        <div className="w-2 h-20 bg-white rounded-full animate-wave delay-200" />
        <div className="w-2 h-16 bg-white rounded-full animate-wave delay-300" />
        <div className="w-2 h-10 bg-white rounded-full animate-wave delay-400" />
      </div>

      {/* 🎙️ Transcribed Text */}
      <div className="text-lg font-medium text-black leading-relaxed px-4">
        {transcript ? transcript : "Say something..."}
      </div>

      {/* 🎤 Control Buttons */}
      <div className="mt-auto flex justify-between items-center gap-8 mb-6">
        {/* Pause Button */}
        <button
          onClick={onPause}
          className="bg-white text-orange-500 shadow-md px-4 py-2 rounded-full text-xl font-bold"
        >
          ⏸
        </button>

        {/* Mic Button (just static glowing) */}
        <div className="bg-orange-400 w-16 h-16 flex items-center justify-center rounded-full shadow-lg animate-pulse">
          <span className="text-white text-2xl">🎤</span>
        </div>

        {/* Cancel Button */}
        <button
          onClick={onCancel}
          className="bg-white text-red-500 shadow-md px-4 py-2 rounded-full text-xl font-bold"
        >
          ❌
        </button>
      </div>
    </div>
  );
}
