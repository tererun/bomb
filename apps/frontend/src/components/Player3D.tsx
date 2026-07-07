"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { PlayerModel } from "./PlayerModel";

interface Player3DProps {
  position: [number, number, number];
  rotation: [number, number, number];
  name: string;
  colorIndex: number;
  isCurrentTurn: boolean;
  hasBomb: boolean;
  isConnected: boolean;
  headRotation: { x: number; y: number };
  hideStatus?: boolean;
  skinTexture?: string | null;
}

export function Player3D({
  position,
  rotation,
  name,
  colorIndex,
  isCurrentTurn,
  hasBomb,
  isConnected,
  headRotation,
  hideStatus = false,
  skinTexture,
}: Player3DProps) {
  const groupRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const targetHeadRotation = useRef({ x: 0, y: 0 });

  // Returns the shortest signed angle from `from` to `to`, wrapped to [-PI, PI].
  // Without this, a target jumping between ~0 and ~2PI (e.g. facing forward)
  // makes the head spin all the way around during interpolation.
  const shortestAngleDiff = (from: number, to: number) => {
    const diff = THREE.MathUtils.euclideanModulo(to - from + Math.PI, Math.PI * 2) - Math.PI;
    return diff;
  };

  useFrame(() => {
    if (headRef.current) {
      targetHeadRotation.current = headRotation;
      headRef.current.rotation.x += shortestAngleDiff(headRef.current.rotation.x, targetHeadRotation.current.x) * 0.15;
      headRef.current.rotation.y += shortestAngleDiff(headRef.current.rotation.y, targetHeadRotation.current.y) * 0.15;
    }
  });

  return (
    <group ref={groupRef} position={position} rotation={rotation} scale={2}>
      <PlayerModel
        headRef={headRef}
        colorIndex={colorIndex}
        skinTexture={skinTexture}
        isConnected={isConnected}
        hasBomb={hasBomb}
      />

      {/* Name tag using HTML */}
      <Html position={[0, 1.8, 0]} center distanceFactor={8} zIndexRange={[10, 0]}>
        <div 
          className={`px-3 py-1 rounded text-white text-sm font-bold whitespace-nowrap ${
            hideStatus ? "bg-gray-700" : isCurrentTurn ? "bg-green-600" : hasBomb ? "bg-orange-600" : "bg-gray-700"
          }`}
        >
          {!hideStatus && hasBomb && "💣 "}{name}{!isConnected && " ⚠"}
        </div>
      </Html>
    </group>
  );
}
