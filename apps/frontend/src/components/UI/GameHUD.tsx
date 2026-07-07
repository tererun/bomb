"use client";

import type { GameState, DiceResult } from "@/lib/socket";

interface GameHUDProps {
  gameState: GameState;
  myName: string;
  isMyTurn: boolean;
  isHost: boolean;
  isRolling: boolean;
  roomId: string;
  onStartGame: () => void;
  onRollDice: () => void;
  diceResult: DiceResult | null;
}

export function GameHUD({
  gameState,
  myName,
  isMyTurn,
  isHost,
  isRolling,
  roomId,
  onStartGame,
  onRollDice,
  diceResult,
}: GameHUDProps) {
  const currentPlayer = gameState.players[gameState.currentTurnIndex];

  return (
    <>
      {/* Top Left - Room ID (small) */}
      <div className="absolute top-4 left-4 z-10">
        <div className="bg-black/50 px-3 py-1 rounded text-sm">
          <span className="text-gray-400">Room: </span>
          <span className="text-white font-mono">{roomId}</span>
        </div>
      </div>



      {/* Bottom Center - Action Button */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10">
        {gameState.phase === "waiting" && (
          <div className="text-center">
            <div className="text-white/80 text-sm mb-3">
              {gameState.players.length}人参加中
            </div>
            {isHost && gameState.players.length >= 2 ? (
              <button
                onClick={onStartGame}
                className="px-10 py-4 bg-green-500 hover:bg-green-600 text-white text-xl font-bold rounded-full shadow-lg transition-all hover:scale-105"
              >
                ▶ ゲーム開始
              </button>
            ) : (
              <div className="px-6 py-3 bg-black/50 text-white/70 rounded-full">
                {gameState.players.length < 2 ? "プレイヤーを待っています..." : "ホストの開始を待っています..."}
              </div>
            )}
          </div>
        )}

        {gameState.phase === "playing" && !isRolling && (
          <div className="text-center">
            {isMyTurn ? (
              <button
                onClick={onRollDice}
                className="px-12 py-5 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white text-2xl font-bold rounded-full shadow-lg transition-all hover:scale-105"
              >
                🎲 振る
              </button>
            ) : (
              <div className="px-6 py-3 bg-black/50 text-white rounded-full">
                <span className="text-yellow-400">{currentPlayer?.name}</span> のターン
              </div>
            )}
          </div>
        )}

        {gameState.phase === "finished" && (
          <div className="text-center">
            <div className="text-4xl mb-4">
              {gameState.loser === myName ? "💀" : "🎉"}
            </div>
            <div className="mb-4">
              <div className="inline-block bg-red-600/90 px-8 py-3 rounded-2xl shadow-lg mb-3">
                <span className="text-3xl font-bold text-white">
                  💣 <span className="text-yellow-300">{gameState.loser}</span> の負け！
                </span>
              </div>
              <div className="text-xl font-bold text-white">
                {gameState.loser === myName
                  ? "あなたの負けです..."
                  : "あなたは生き残りました！"}
              </div>
            </div>
            <button
              onClick={() => window.location.href = "/"}
              className="px-8 py-3 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-full transition-all"
            >
              ロビーに戻る
            </button>
          </div>
        )}
      </div>
    </>
  );
}
