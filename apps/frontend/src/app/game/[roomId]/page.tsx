"use client";

import { use, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { getSocket, connectSocket, type GameState, type DiceResult, type Player } from "@/lib/socket";
import { GameHUD } from "@/components/UI/GameHUD";
import { PlayerSelect } from "@/components/UI/PlayerSelect";
import { VolumeSlider } from "@/components/UI/VolumeSlider";
import { DiceCup } from "@/components/DiceCup";
import * as sounds from "@/lib/sounds";

const GameScene = dynamic(() => import("@/components/GameScene").then(mod => mod.GameScene), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-900">
      <div className="text-white text-xl">Loading 3D Scene...</div>
    </div>
  ),
});

interface PageProps {
  params: Promise<{ roomId: string }>;
}

export default function GamePage({ params }: PageProps) {
  const { roomId } = use(params);
  const router = useRouter();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [myName, setMyName] = useState<string>("");
  const [diceResult, setDiceResult] = useState<DiceResult | null>(null);
  const [showDice, setShowDice] = useState(false);
  const [isRolling, setIsRolling] = useState(false);
  const [showDiceCup, setShowDiceCup] = useState(false);
  const [waitingForPass, setWaitingForPass] = useState(false);
  const [notification, setNotification] = useState<string>("");
  const [showExplosion, setShowExplosion] = useState(false);
  const [animatingBombIndex, setAnimatingBombIndex] = useState<number | null>(null);
  const [diceThrowerId, setDiceThrowerId] = useState<number | null>(null);

  const showNotification = useCallback((message: string, duration = 3000) => {
    setNotification(message);
    setTimeout(() => setNotification(""), duration);
  }, []);

  useEffect(() => {
    const savedName = localStorage.getItem("bombGame_playerName");

    if (!savedName) {
      router.push("/");
      return;
    }

    setMyName(savedName);
    connectSocket();
    const socket = getSocket();

    // Check if already connected to this room (e.g., after creating)
    // If not, join the room
    const handleJoin = () => {
      socket.emit("joinRoom", roomId, savedName, (response) => {
        if (!response.success) {
          alert(response.error || "Failed to join room");
          router.push("/");
        }
      });
    };

    // Wait for socket to be connected before joining
    if (socket.connected) {
      handleJoin();
    } else {
      socket.once("connect", handleJoin);
    }

    socket.on("roomState", (state) => {
      setGameState(state);
    });

    socket.on("diceResult", (result) => {
      // Record who threw the dice before state updates
      setGameState((prev) => {
        if (prev) {
          setDiceThrowerId(prev.currentTurnIndex);
        }
        return prev;
      });
      
      setDiceResult(result);
      setShowDice(true);
      setIsRolling(false);
      sounds.playDiceResult();

      if (result.effect === "reverse") {
        showNotification("🔄 回転方向が逆転！", 2000);
        sounds.playReverse();
      } else if (result.effect === "halve") {
        showNotification("💥 爆弾のHPが半分に！", 2000);
        sounds.playHalve();
      } else if (result.effect === "pass") {
        // Pass sound will play when bomb is passed
      }

      setTimeout(() => {
        setShowDice(false);
        setDiceThrowerId(null);
      }, 2000);
    });

    socket.on("playerJoined", (player) => {
      showNotification(`${player.name} が参加しました`);
      sounds.playPlayerJoin();
    });

    socket.on("playerLeft", (playerName) => {
      showNotification(`${playerName} が退出しました`);
    });

    socket.on("playerReconnected", (playerName) => {
      showNotification(`${playerName} が再接続しました`);
      sounds.playPlayerJoin();
    });

    socket.on("gameStarted", () => {
      showNotification("ゲーム開始！", 2000);
      sounds.playGameStart();
    });

    socket.on("turnChanged", (playerName) => {
      if (playerName === savedName) {
        showNotification("あなたのターンです！", 1500);
        sounds.playYourTurn();
      } else {
        sounds.playTurnChange();
      }
    });

    socket.on("waitingForPassChoice", (playerName) => {
      if (playerName === savedName) {
        setWaitingForPass(true);
      }
    });

    socket.on("bombExploded", () => {
      // Explosion is now handled in bombMoved animation
    });

    socket.on("bombMoved", (data) => {
      const { steps, explodedAtStep } = data;
      
      if (steps.length === 0) {
        sounds.playBombPass();
        return;
      }

      // Animate bomb moving step by step
      let stepIndex = 0;
      const animateStep = () => {
        if (stepIndex < steps.length) {
          setAnimatingBombIndex(steps[stepIndex]);
          sounds.playBombPass();
          
          // Check if explosion happens at this step
          if (explodedAtStep !== -1 && stepIndex === explodedAtStep) {
            // Explode after a short delay at this position
            setTimeout(() => {
              setAnimatingBombIndex(null);
              setShowExplosion(true);
              sounds.playExplosion();
              
              // Play win/lose sound immediately
              setGameState((prev) => {
                if (prev?.loser === savedName) {
                  sounds.playLose();
                } else if (prev?.winner === savedName) {
                  sounds.playWin();
                }
                return prev;
              });
              
              setTimeout(() => {
                setShowExplosion(false);
              }, 2000);
            }, 300);
            return;
          }
          
          stepIndex++;
          setTimeout(animateStep, 400);
        } else {
          setAnimatingBombIndex(null);
        }
      };
      
      animateStep();
    });

    socket.on("directionChanged", (direction) => {
      const dirText = direction === 1 ? "右回り" : "左回り";
      showNotification(`方向転換: ${dirText}`, 2000);
    });

    socket.on("playerHeadRotation", (data) => {
      setGameState((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          players: prev.players.map((p) =>
            p.name === data.playerName
              ? { ...p, headRotation: data.rotation }
              : p
          ),
        };
      });
    });

    return () => {
      socket.off("roomState");
      socket.off("diceResult");
      socket.off("playerJoined");
      socket.off("playerLeft");
      socket.off("playerReconnected");
      socket.off("gameStarted");
      socket.off("turnChanged");
      socket.off("waitingForPassChoice");
      socket.off("bombExploded");
      socket.off("bombMoved");
      socket.off("directionChanged");
      socket.off("playerHeadRotation");
    };
  }, [roomId, router, showNotification]);

  const handleStartGame = () => {
    const socket = getSocket();
    socket.emit("startGame", (response) => {
      if (!response.success) {
        alert(response.error);
      }
    });
  };

  const handleRollDice = () => {
    if (isRolling) return;
    setShowDiceCup(true);
  };

  const handleDiceCupRelease = () => {
    setShowDiceCup(false);
    setIsRolling(true);
    const socket = getSocket();
    socket.emit("rollDice", (response) => {
      if (!response.success) {
        setIsRolling(false);
        alert(response.error);
      }
    });
  };

  const handleDiceCupCancel = () => {
    setShowDiceCup(false);
  };

  const handlePassBomb = (targetName: string) => {
    const socket = getSocket();
    socket.emit("passBomb", targetName, (response) => {
      if (response.success) {
        setWaitingForPass(false);
      } else {
        alert(response.error);
      }
    });
  };

  const isMyTurn = gameState?.players[gameState.currentTurnIndex]?.name === myName;
  const myPlayer = gameState?.players.find(p => p.name === myName);
  const isHost = myPlayer?.isHost ?? false;

  if (!gameState) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">接続中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 relative overflow-hidden">
      {/* Volume Slider */}
      <VolumeSlider />

      {/* 3D Game Scene */}
      <div className="absolute inset-0">
        <GameScene
          gameState={gameState}
          myName={myName}
          diceResult={showDice ? diceResult : null}
          showExplosion={showExplosion}
          animatingBombIndex={animatingBombIndex}
          diceThrowerId={diceThrowerId}
        />
      </div>

      {/* HUD Overlay */}
      <GameHUD
        gameState={gameState}
        myName={myName}
        isMyTurn={isMyTurn}
        isHost={isHost}
        isRolling={isRolling || animatingBombIndex !== null}
        roomId={roomId}
        onStartGame={handleStartGame}
        onRollDice={handleRollDice}
        diceResult={showDice ? diceResult : null}
      />

      {/* Notification */}
      {notification && (
        <div className="absolute top-1/3 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50">
          <div className="bg-black/80 px-8 py-4 rounded-xl text-white text-2xl font-bold animate-pulse">
            {notification}
          </div>
        </div>
      )}

      {/* Pass Bomb Modal */}
      {waitingForPass && (
        <PlayerSelect
          players={gameState.players.filter(p => p.name !== myName && p.isAlive)}
          onSelect={handlePassBomb}
        />
      )}

      {/* Explosion Effect */}
      {showExplosion && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-red-500/30 animate-pulse">
          <div className="text-center">
            <div className="text-9xl mb-4">💥</div>
            <div className="text-4xl font-bold text-white">
              {gameState.loser === myName ? "あなたの負け！" : `${gameState.loser} の負け！`}
            </div>
          </div>
        </div>
      )}

      {/* Dice Cup */}
      {showDiceCup && (
        <DiceCup 
          onRelease={handleDiceCupRelease} 
          onCancel={handleDiceCupCancel}
        />
      )}
    </div>
  );
}
