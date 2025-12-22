"use client";

import { useState, useEffect } from "react";
import { getVolume, setVolume, initVolume } from "@/lib/sounds";

export function VolumeSlider() {
  const [volume, setVolumeState] = useState(0.5);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    initVolume();
    setVolumeState(getVolume());
  }, []);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolumeState(newVolume);
    setVolume(newVolume);
  };

  return (
    <div className="absolute top-4 right-16 z-10">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-8 h-8 bg-black/50 rounded-full flex items-center justify-center text-sm hover:bg-black/70 transition-all"
      >
        {volume === 0 ? "🔇" : volume < 0.5 ? "🔉" : "🔊"}
      </button>
      
      {isOpen && (
        <div className="absolute top-10 right-0 bg-black/80 rounded-lg p-3 w-36">
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={handleVolumeChange}
            className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-orange-500"
          />
          <div className="text-center text-gray-400 text-xs mt-1">
            {Math.round(volume * 100)}%
          </div>
        </div>
      )}
    </div>
  );
}
