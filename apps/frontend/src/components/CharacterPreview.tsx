"use client";

import { useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";
import type { CharacterConfig } from "@/lib/character";
import { PlayerModel } from "./PlayerModel";

interface CharacterPreviewProps {
  character: CharacterConfig;
}

export function CharacterPreview({ character }: CharacterPreviewProps) {
  const headRef = useRef<THREE.Group>(null);

  return (
    <Canvas shadows onCreated={({ gl }) => gl.setClearColor("#111827")}>
      <PerspectiveCamera makeDefault position={[0, 1.05, 2.3]} fov={40} />
      <OrbitControls
        enablePan={false}
        enableZoom={false}
        minPolarAngle={Math.PI / 4}
        maxPolarAngle={Math.PI / 1.8}
        target={[0, 0.95, 0]}
      />

      <ambientLight intensity={0.6} />
      <directionalLight
        position={[3, 5, 4]}
        intensity={1.1}
        castShadow
        shadow-mapSize={[512, 512]}
      />
      <hemisphereLight args={["#87ceeb", "#362312", 0.35]} />

      {/* Pedestal */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <circleGeometry args={[0.9, 32]} />
        <meshStandardMaterial color="#1f2937" />
      </mesh>

      <PlayerModel headRef={headRef} colorIndex={0} character={character} />
    </Canvas>
  );
}
