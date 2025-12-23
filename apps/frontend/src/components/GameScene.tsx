"use client";

import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { useMemo, Suspense, useRef } from "react";
import type { GameState, DiceResult } from "@/lib/socket";
import { Table } from "./Table";
import { Bomb3D } from "./Bomb3D";
import { Player3D } from "./Player3D";
import { Dice3D } from "./Dice3D";
import { MyAvatar } from "./MyAvatar";
import * as THREE from "three";

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

  const damagePercent = (gameState.bomb.damage / gameState.bomb.maxHp) * 100;
  const bombColor = damagePercent >= gameState.colorThresholds.red
    ? "red"
    : damagePercent >= gameState.colorThresholds.yellow
    ? "yellow"
    : "black";

  return (
    <Canvas shadows onCreated={({ gl }) => { gl.setClearColor('#1a1a2e'); }}>
      <Suspense fallback={null}>
        <PerspectiveCamera
          makeDefault
          position={cameraPosition}
          fov={70}
          near={0.1}
          far={100}
        />
        {/* Camera rotates around the player's head position (like turning your head) */}
        <OrbitControls
          enablePan={false}
          enableZoom={false}
          minPolarAngle={Math.PI / 3}
          maxPolarAngle={Math.PI / 2.1}
          target={[cameraPosition[0], cameraPosition[1], cameraPosition[2] - 0.1]}
          rotateSpeed={0.5}
        />

        {/* Lighting */}
        <ambientLight intensity={0.5} />
        <directionalLight
          position={[5, 10, 5]}
          intensity={1}
          castShadow
          shadow-mapSize={[1024, 1024]}
        />
        <pointLight position={[0, 5, 0]} intensity={0.5} />
        <hemisphereLight args={['#87ceeb', '#362312', 0.3]} />

        {/* Floor */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
          <planeGeometry args={[30, 30]} />
          <meshStandardMaterial color="#1a1a2e" />
        </mesh>

        {/* Table */}
        <Table />

        {/* My Avatar (visible body, head rotates with camera) */}
        <MyAvatar 
          position={myPosition}
          isCurrentTurn={myIndex === gameState.currentTurnIndex && gameState.phase === "playing"}
          hasBomb={myIndex === gameState.bombHolderIndex}
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
              isCurrentTurn={isCurrentTurn && gameState.phase === "playing"}
              hasBomb={hasBomb}
              isConnected={player.socketId !== null}
              headRotation={player.headRotation || { x: 0, y: 0 }}
              hideStatus={isAnimating}
              skinTexture={player.skin}
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
