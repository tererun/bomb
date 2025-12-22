"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Sphere } from "@react-three/drei";
import * as THREE from "three";

interface Bomb3DProps {
  position: [number, number, number];
  color: "black" | "yellow" | "red";
  isExploding: boolean;
  damagePercent: number;
}

export function Bomb3D({ position, color, isExploding, damagePercent }: Bomb3DProps) {
  const groupRef = useRef<THREE.Group>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const sparkRef = useRef<THREE.Mesh>(null);

  const colorMap = {
    black: new THREE.Color(0x1a1a1a),
    yellow: new THREE.Color(0xffd700),
    red: new THREE.Color(0xff2020),
  };

  const glowColorMap = {
    black: new THREE.Color(0x333333),
    yellow: new THREE.Color(0xffaa00),
    red: new THREE.Color(0xff0000),
  };

  useFrame((state) => {
    if (groupRef.current) {
      // Subtle bobbing animation - move entire group
      groupRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2) * 0.03;
      groupRef.current.position.x = position[0];
      groupRef.current.position.z = position[2];
      
      // Shake more when closer to explosion
      if (damagePercent > 50) {
        const shakeIntensity = (damagePercent - 50) / 500;
        groupRef.current.position.x += (Math.random() - 0.5) * shakeIntensity;
        groupRef.current.position.z += (Math.random() - 0.5) * shakeIntensity;
      }

      // Scale pulse for explosion
      if (isExploding) {
        const scale = 1 + Math.sin(state.clock.elapsedTime * 20) * 0.3;
        groupRef.current.scale.setScalar(scale);
      }
    }

    if (glowRef.current) {
      // Pulsing glow
      const pulse = 1 + Math.sin(state.clock.elapsedTime * (color === "red" ? 8 : 3)) * 0.2;
      glowRef.current.scale.setScalar(pulse);
      
      // Glow opacity based on damage
      const material = glowRef.current.material as THREE.MeshBasicMaterial;
      material.opacity = 0.2 + (damagePercent / 200);
    }

    if (sparkRef.current) {
      // Spark flicker animation
      const sparkIntensity = color === "red" ? 1.5 : color === "yellow" ? 1 : 0.5;
      const flicker = Math.sin(state.clock.elapsedTime * 15) * 0.02 * sparkIntensity;
      sparkRef.current.scale.setScalar(1 + flicker);
    }
  });

  if (isExploding) {
    return (
      <group ref={groupRef} position={position}>
        {/* Explosion sphere */}
        <Sphere args={[1.5, 32, 32]}>
          <meshBasicMaterial color={0xff4400} transparent opacity={0.8} />
        </Sphere>
        {/* Outer explosion */}
        <Sphere args={[2.5, 32, 32]}>
          <meshBasicMaterial color={0xffaa00} transparent opacity={0.4} />
        </Sphere>
      </group>
    );
  }

  return (
    <group ref={groupRef} position={position}>
      {/* Main bomb body */}
      <Sphere args={[0.35, 32, 32]} castShadow>
        <meshStandardMaterial
          color={colorMap[color]}
          roughness={0.3}
          metalness={0.7}
          emissive={color !== "black" ? glowColorMap[color] : undefined}
          emissiveIntensity={color === "red" ? 0.5 : color === "yellow" ? 0.3 : 0}
        />
      </Sphere>

      {/* Glow effect */}
      <Sphere args={[0.45, 32, 32]} ref={glowRef}>
        <meshBasicMaterial
          color={glowColorMap[color]}
          transparent
          opacity={0.3}
          side={THREE.BackSide}
        />
      </Sphere>

      {/* Fuse */}
      <group position={[0, 0.3, 0]}>
        <mesh rotation={[0.3, 0, 0.2]}>
          <cylinderGeometry args={[0.025, 0.02, 0.12, 8]} />
          <meshStandardMaterial color={0x333333} roughness={0.9} />
        </mesh>
        {/* Spark at tip of fuse */}
        <Sphere args={[0.05, 8, 8]} position={[0.02, 0.08, 0.02]} ref={sparkRef}>
          <meshBasicMaterial
            color={color === "red" ? 0xff0000 : color === "yellow" ? 0xffaa00 : 0xff6600}
          />
        </Sphere>
        {/* Spark glow */}
        <pointLight 
          position={[0.02, 0.08, 0.02]} 
          color={color === "red" ? 0xff0000 : color === "yellow" ? 0xffaa00 : 0xff6600}
          intensity={color === "red" ? 2 : color === "yellow" ? 1 : 0.5}
          distance={1}
        />
      </group>
    </group>
  );
}
