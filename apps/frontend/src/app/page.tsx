"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSocket, connectSocket } from "@/lib/socket";
import { SkinCanvas } from "@/components/SkinCanvas";

export default function Home() {
  const router = useRouter();
  const [playerName, setPlayerName] = useState("");
  const [roomId, setRoomId] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [skin, setSkin] = useState<string | null>(null);

  useEffect(() => {
    connectSocket();
    const savedName = localStorage.getItem("bombGame_playerName");
    if (savedName) {
      setPlayerName(savedName);
    }
    const savedSkin = localStorage.getItem("bombGame_skin");
    if (savedSkin) {
      setSkin(savedSkin);
    }
  }, []);

  const handleSaveSkin = (dataUrl: string) => {
    setSkin(dataUrl);
    localStorage.setItem("bombGame_skin", dataUrl);
  };

  const handleCreateRoom = () => {
    if (!playerName.trim()) {
      setError("名前を入力してください");
      return;
    }

    setIsLoading(true);
    setError("");
    const socket = getSocket();

    socket.emit("createRoom", playerName.trim(), skin, (response) => {
      setIsLoading(false);
      if (response.success && response.roomId) {
        localStorage.setItem("bombGame_playerName", playerName.trim());
        localStorage.setItem("bombGame_roomId", response.roomId);
        router.push(`/game/${response.roomId}`);
      } else {
        setError(response.error || "ルームの作成に失敗しました");
      }
    });
  };

  const handleJoinRoom = () => {
    if (!playerName.trim()) {
      setError("名前を入力してください");
      return;
    }
    if (!roomId.trim()) {
      setError("ルームIDを入力してください");
      return;
    }

    setIsLoading(true);
    setError("");
    const socket = getSocket();

    socket.emit("joinRoom", roomId.trim().toUpperCase(), playerName.trim(), skin, (response) => {
      setIsLoading(false);
      if (response.success) {
        localStorage.setItem("bombGame_playerName", playerName.trim());
        localStorage.setItem("bombGame_roomId", roomId.trim().toUpperCase());
        router.push(`/game/${roomId.trim().toUpperCase()}`);
      } else {
        setError(response.error || "ルームへの参加に失敗しました");
      }
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black flex items-center justify-center p-4">
      <div className="flex gap-6 items-start">
        <div className="bg-gray-800 rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <h1 className="text-4xl font-bold text-center mb-2 text-white">
          💣 爆弾回しゲーム
        </h1>
        <p className="text-gray-400 text-center mb-8">
          ダイスを振って爆弾を回せ！
        </p>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              プレイヤー名
            </label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="名前を入力"
              maxLength={20}
            />
          </div>

          <button
            onClick={handleCreateRoom}
            disabled={isLoading}
            className="w-full py-4 bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold rounded-lg hover:from-orange-600 hover:to-red-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "作成中..." : "新しいルームを作成"}
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-600"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-800 text-gray-400">または</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              ルームID
            </label>
            <input
              type="text"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value.toUpperCase())}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase"
              placeholder="ルームIDを入力"
              maxLength={6}
            />
          </div>

          <button
            onClick={handleJoinRoom}
            disabled={isLoading}
            className="w-full py-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "参加中..." : "ルームに参加"}
          </button>

          {error && (
            <div className="p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-400 text-center">
              {error}
            </div>
          )}
        </div>

        <div className="mt-8 p-4 bg-gray-700/50 rounded-lg">
            <h2 className="text-lg font-bold text-white mb-2">ルール</h2>
            <ul className="text-sm text-gray-300 space-y-1">
              <li>• ダイス2個の合計だけ爆弾が右回りに移動</li>
              <li>• 爆弾のHPが0になったら爆発！持ってた人の負け</li>
              <li>• <span className="text-yellow-400">4-4</span>: 回転方向が逆転</li>
              <li>• <span className="text-green-400">1-1</span>: 好きな人に押し付け</li>
              <li>• <span className="text-red-400">6-6</span>: 爆弾のHPが半分に！</li>
            </ul>
          </div>
        </div>

        <SkinCanvas onSave={handleSaveSkin} initialSkin={skin} />
      </div>
    </div>
  );
}
