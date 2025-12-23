"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Capsule, Html } from "@react-three/drei";
import * as THREE from "three";

interface Player3DProps {
  position: [number, number, number];
  rotation: [number, number, number];
  name: string;
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

  const texture = useMemo(() => {
    if (!skinTexture) return null;
    const loader = new THREE.TextureLoader();
    const tex = loader.load(skinTexture);
    tex.minFilter = THREE.NearestFilter;
    tex.magFilter = THREE.NearestFilter;
    return tex;
  }, [skinTexture]);

  const headMaterials = useMemo(() => {
    const sideColor = isConnected ? "#e8c4a0" : "#888888";
    const sideMaterial = new THREE.MeshStandardMaterial({
      color: sideColor,
      roughness: 0.8,
      metalness: 0.1,
    });

    if (texture) {
      const frontMaterial = new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 0.8,
        metalness: 0.1,
      });
      return [
        sideMaterial, sideMaterial, sideMaterial, sideMaterial,
        frontMaterial, sideMaterial,
      ];
    }
    return [sideMaterial, sideMaterial, sideMaterial, sideMaterial, sideMaterial, sideMaterial];
  }, [texture, isConnected]);

  useFrame(() => {
    if (headRef.current) {
      targetHeadRotation.current = headRotation;
      headRef.current.rotation.x += (targetHeadRotation.current.x - headRef.current.rotation.x) * 0.15;
      headRef.current.rotation.y += (targetHeadRotation.current.y - headRef.current.rotation.y) * 0.15;
    }
  });

  const bodyColor = isConnected ? "#4a90d9" : "#666666";

  return (
    <group ref={groupRef} position={position} rotation={rotation} scale={2}>
      {/* Body */}
      <Capsule
        args={[0.25, 0.6, 8, 16]}
        position={[0, 0.6, 0]}
        castShadow
      >
        <meshStandardMaterial
          color={bodyColor}
          roughness={0.6}
          metalness={0.2}
        />
      </Capsule>

      {/* Head group - rotates based on server data */}
      <group ref={headRef} position={[0, 1.3, 0]}>
        <mesh castShadow material={headMaterials}>
          <boxGeometry args={[0.4, 0.4, 0.4]} />
        </mesh>

        {!skinTexture && (
          <>
            <mesh position={[0.08, 0.05, 0.21]}>
              <sphereGeometry args={[0.04, 8, 8]} />
              <meshBasicMaterial color={isConnected ? "#000000" : "#444444"} />
            </mesh>
            <mesh position={[-0.08, 0.05, 0.21]}>
              <sphereGeometry args={[0.04, 8, 8]} />
              <meshBasicMaterial color={isConnected ? "#000000" : "#444444"} />
            </mesh>
          </>
        )}
      </group>

      {/* Arms */}
      <Capsule
        args={[0.08, 0.3, 4, 8]}
        position={[0.35, 0.7, 0]}
        rotation={[0, 0, -Math.PI / 4]}
        castShadow
      >
        <meshStandardMaterial color={bodyColor} roughness={0.6} />
      </Capsule>
      <Capsule
        args={[0.08, 0.3, 4, 8]}
        position={[-0.35, 0.7, 0]}
        rotation={[0, 0, Math.PI / 4]}
        castShadow
      >
        <meshStandardMaterial color={bodyColor} roughness={0.6} />
      </Capsule>

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
