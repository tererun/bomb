"use client";

import type { Player } from "@/lib/socket";

interface PlayerSelectProps {
  players: Player[];
  onSelect: (playerName: string) => void;
}

export function PlayerSelect({ players, onSelect }: PlayerSelectProps) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4">
        <h2 className="text-2xl font-bold text-white text-center mb-2">
          🎯 爆弾を押し付ける！
        </h2>
        <p className="text-gray-400 text-center mb-6">
          誰に爆弾を渡しますか？
        </p>
        <div className="space-y-3">
          {players.map((player) => (
            <button
              key={player.name}
              onClick={() => onSelect(player.name)}
              className="w-full py-4 px-6 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all flex items-center justify-center gap-2"
            >
              <span className="text-2xl">👤</span>
              <span>{player.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
