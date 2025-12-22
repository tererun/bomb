"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox, Html } from "@react-three/drei";
import * as THREE from "three";

interface Dice3DProps {
  dice1: number;
  dice2: number;
  position: [number, number, number];
  fromPosition?: [number, number, number];
}

// Dot patterns for each face value
function DiceFace({ value, size, isTop = false }: { value: number; size: number; isTop?: boolean }) {
  const offset = size * 0.28;
  const dotRadius = size * 0.1;
  
  const patterns: Record<number, [number, number][]> = {
    1: [[0, 0]],
    2: [[-offset, offset], [offset, -offset]],
    3: [[-offset, offset], [0, 0], [offset, -offset]],
    4: [[-offset, offset], [offset, offset], [-offset, -offset], [offset, -offset]],
    5: [[-offset, offset], [offset, offset], [0, 0], [-offset, -offset], [offset, -offset]],
    6: [[-offset, offset], [offset, offset], [-offset, 0], [offset, 0], [-offset, -offset], [offset, -offset]],
  };

  const dots = patterns[value] || [];

  return (
    <group>
      {dots.map((pos, i) => (
        <mesh key={i} position={[pos[0], pos[1], 0]}>
          <circleGeometry args={[dotRadius, 16]} />
          <meshBasicMaterial color={isTop ? "#ff0000" : "#111111"} />
        </mesh>
      ))}
    </group>
  );
}

function SingleDice({ value, position }: { value: number; position: [number, number, number] }) {
  const groupRef = useRef<THREE.Group>(null);
  const size = 0.4;
  const halfSize = size / 2 + 0.001;

  // Standard dice: opposite faces sum to 7
  // value is shown on top, so: top=value, bottom=7-value
  // front=random, back=7-front, left=random, right=7-left
  const topValue = value;
  const bottomValue = 7 - value;
  // For simplicity, assign other faces
  const frontValue = topValue === 1 || topValue === 6 ? 2 : topValue === 2 || topValue === 5 ? 1 : 3;
  const backValue = 7 - frontValue;
  const rightValue = topValue === 1 || topValue === 6 ? 3 : topValue === 3 || topValue === 4 ? 1 : 4;
  const leftValue = 7 - rightValue;

  useFrame((state) => {
    if (groupRef.current) {
      // Gentle floating and rotation animation
      groupRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2 + position[0]) * 0.05;
      groupRef.current.rotation.y += 0.01;
      groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 1.5) * 0.1;
    }
  });

  return (
    <group ref={groupRef} position={position}>
      {/* Dice cube */}
      <RoundedBox
        args={[size, size, size]}
        radius={0.03}
        smoothness={4}
        castShadow
      >
        <meshStandardMaterial color="#ffffff" roughness={0.3} metalness={0.1} />
      </RoundedBox>
      
      {/* Top face (Y+) */}
      <group position={[0, halfSize, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <DiceFace value={topValue} size={size} isTop={true} />
      </group>
      
      {/* Bottom face (Y-) */}
      <group position={[0, -halfSize, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <DiceFace value={bottomValue} size={size} />
      </group>
      
      {/* Front face (Z+) */}
      <group position={[0, 0, halfSize]}>
        <DiceFace value={frontValue} size={size} />
      </group>
      
      {/* Back face (Z-) */}
      <group position={[0, 0, -halfSize]} rotation={[0, Math.PI, 0]}>
        <DiceFace value={backValue} size={size} />
      </group>
      
      {/* Right face (X+) */}
      <group position={[halfSize, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <DiceFace value={rightValue} size={size} />
      </group>
      
      {/* Left face (X-) */}
      <group position={[-halfSize, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <DiceFace value={leftValue} size={size} />
      </group>
    </group>
  );
}

export function Dice3D({ dice1, dice2, position, fromPosition }: Dice3DProps) {
  const groupRef = useRef<THREE.Group>(null);
  const startTime = useRef(Date.now());
  const animDuration = 0.6;

  useFrame(() => {
    if (groupRef.current) {
      const elapsed = (Date.now() - startTime.current) / 1000;
      
      if (elapsed < animDuration) {
        const progress = elapsed / animDuration;
        // Ease out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        
        if (fromPosition) {
          // Animate from thrower position to center
          groupRef.current.position.x = fromPosition[0] + (position[0] - fromPosition[0]) * eased;
          groupRef.current.position.z = fromPosition[2] + (position[2] - fromPosition[2]) * eased;
          // Arc trajectory
          const arc = Math.sin(progress * Math.PI) * 1.5;
          groupRef.current.position.y = fromPosition[1] + (position[1] - fromPosition[1]) * eased + arc;
        } else {
          groupRef.current.position.y = position[1] + Math.sin(progress * Math.PI) * 0.5;
        }
        
        // Scale in
        groupRef.current.scale.setScalar(Math.min(progress * 2, 1));
        
        // Spin while flying
        groupRef.current.rotation.x = progress * Math.PI * 4;
        groupRef.current.rotation.z = progress * Math.PI * 2;
      } else {
        // Settle at final position
        groupRef.current.position.set(position[0], position[1], position[2]);
        groupRef.current.scale.setScalar(1);
        groupRef.current.rotation.x = 0;
        groupRef.current.rotation.z = 0;
      }
    }
  });

  return (
    <group ref={groupRef} position={fromPosition || position}>
      <SingleDice value={dice1} position={[-0.35, 0, 0]} />
      <SingleDice value={dice2} position={[0.35, 0, 0]} />
      
      {/* Sum display */}
      <Html position={[0, 0.6, 0]} center zIndexRange={[10, 0]}>
        <div className="text-3xl font-bold text-yellow-400 drop-shadow-lg">
          {dice1 + dice2}
        </div>
      </Html>
    </group>
  );
}
