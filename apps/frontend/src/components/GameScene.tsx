"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { useMemo, Suspense } from "react";
import type { GameState, DiceResult } from "@/lib/socket";
import { Table } from "./Table";
import { Bomb3D } from "./Bomb3D";
import { Player3D } from "./Player3D";
import { Dice3D } from "./Dice3D";
import { MyAvatar } from "./MyAvatar";
import { Environment3D } from "./Environment3D";
import { getStage } from "@/lib/environments";

interface GameSceneProps {
  gameState: GameState;
  myName: string;
  diceResult: DiceResult | null;
  showExplosion: boolean;
  animatingBombIndex?: number | null;
  diceThrowerId?: number | null;
}

export function GameScene({ gameState, myName, diceResult, showExplosion, animatingBombIndex, diceThrowerId }: GameSceneProps) {
  const myIndex = gameState.players.findIndex(p => p.name === myName);
  const tableRadius = 3;

  // My position at the table (scale 2x, so head height is ~2.6)
  const myPosition = useMemo((): [number, number, number] => {
    const myAngle = 0;
    const x = Math.sin(myAngle) * tableRadius;
    const z = Math.cos(myAngle) * tableRadius;
    return [x, 0, z];
  }, []);

  // Camera position: at my face height (player scale is 2x, head at ~2.6)
  const cameraPosition = useMemo((): [number, number, number] => {
    return [myPosition[0], 2.6, myPosition[2]];
  }, [myPosition]);

  const playerPositions = useMemo(() => {
    const positions: { x: number; z: number; angle: number }[] = [];
    const playerCount = gameState.players.length;
    if (playerCount === 0) return positions;
    
    for (let i = 0; i < playerCount; i++) {
      // Calculate relative index from my perspective
      // My position is at angle 0, others are distributed around
      const relativeIndex = (i - myIndex + playerCount) % playerCount;
      // Angle: player 0 (me) is at front (angle=0), others go around clockwise
      const angle = (relativeIndex / playerCount) * Math.PI * 2;
      const x = Math.sin(angle) * tableRadius;
      const z = Math.cos(angle) * tableRadius;
      positions.push({ x, z, angle });
    }
    return positions;
  }, [gameState.players.length, myIndex]);

  const bombPosition = useMemo(() => {
    if (playerPositions.length === 0) return { x: 0, z: 0 };
    // Use animating index if available, otherwise use actual bomb holder
    const targetIndex = animatingBombIndex !== null && animatingBombIndex !== undefined 
      ? animatingBombIndex 
      : gameState.bombHolderIndex;
    const holderPos = playerPositions[targetIndex];
    if (!holderPos) return { x: 0, z: 0 };
    // Place bomb slightly in front of the holder (towards center)
    const angle = holderPos.angle;
    const bombRadius = tableRadius * 0.5;
    return {
      x: Math.sin(angle) * bombRadius,
      z: Math.cos(angle) * bombRadius,
    };
  }, [gameState.bombHolderIndex, playerPositions, animatingBombIndex]);

  const stage = getStage(gameState.environment?.stageId);

  const damagePercent = (gameState.bomb.damage / gameState.bomb.maxHp) * 100;
  const bombColor = damagePercent >= gameState.colorThresholds.red
    ? "red"
    : damagePercent >= gameState.colorThresholds.yellow
    ? "yellow"
    : "black";

  return (
    <Canvas shadows onCreated={({ gl }) => { gl.setClearColor('#1a1a2e'); }}>
      <Suspense fallback={null}>
        {/* Skybox, ground, lighting and stage decorations (changes every match) */}
        <Environment3D
          stageId={gameState.environment?.stageId}
          seed={gameState.environment?.seed}
        />
        <PerspectiveCamera
          makeDefault
          position={cameraPosition}
          fov={70}
          near={0.1}
          far={100}
        />
        {/* Camera rotates around the player's head position (like turning your head).
            Polar angle limits allow looking well above the horizon and down at the table. */}
        <OrbitControls
          enablePan={false}
          enableZoom={false}
          minPolarAngle={Math.PI * 0.12}
          maxPolarAngle={Math.PI * 0.78}
          target={[cameraPosition[0], cameraPosition[1], cameraPosition[2] - 0.1]}
          rotateSpeed={0.7}
        />

        {/* Table */}
        <Table theme={stage.table} />

        {/* My Avatar (visible body, head rotates with camera) */}
        <MyAvatar 
          position={myPosition}
          colorIndex={myIndex}
          isCurrentTurn={myIndex === gameState.currentTurnIndex && gameState.phase === "playing"}
          hasBomb={myIndex === gameState.bombHolderIndex}
          character={gameState.players[myIndex]?.character}
        />

        {/* Other Players */}
        {gameState.players.map((player, index) => {
          if (index === myIndex) return null;
          const pos = playerPositions[index];
          if (!pos) return null;
          
          const isCurrentTurn = index === gameState.currentTurnIndex;
          const hasBomb = index === gameState.bombHolderIndex;
          const isAnimating = animatingBombIndex !== null && animatingBombIndex !== undefined;
          
          return (
            <Player3D
              key={player.name}
              position={[pos.x, 0, pos.z]}
              rotation={[0, pos.angle + Math.PI, 0]}
              name={player.name}
              colorIndex={index}
              isCurrentTurn={isCurrentTurn && gameState.phase === "playing"}
              hasBomb={hasBomb}
              isConnected={player.socketId !== null}
              headRotation={player.headRotation || { x: 0, y: 0 }}
              hideStatus={isAnimating}
              character={player.character}
            />
          );
        })}

        {/* Bomb */}
        <Bomb3D
          position={[bombPosition.x, 1.8, bombPosition.z]}
          color={bombColor}
          isExploding={showExplosion}
          damagePercent={damagePercent}
        />

        {/* Dice */}
        {diceResult && (() => {
          // Use diceThrowerId to get the correct thrower position
          const throwerId = diceThrowerId ?? gameState.currentTurnIndex;
          const isMyThrow = throwerId === myIndex;
          const fromPos: [number, number, number] = isMyThrow
            ? [0, 1.5, tableRadius * 0.8] // From camera/my position
            : (() => {
                const throwerPos = playerPositions[throwerId];
                return throwerPos 
                  ? [throwerPos.x * 0.6, 2, throwerPos.z * 0.6]
                  : [0, 2, 0];
              })();
          return (
            <Dice3D
              dice1={diceResult.dice1}
              dice2={diceResult.dice2}
              position={[0, 1.5, 0]}
              fromPosition={fromPos}
            />
          );
        })()}
      </Suspense>
    </Canvas>
  );
}
