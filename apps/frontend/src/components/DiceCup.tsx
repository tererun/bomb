"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import { Physics, RigidBody, CuboidCollider, CylinderCollider, RapierRigidBody } from "@react-three/rapier";
import * as THREE from "three";
import * as sounds from "@/lib/sounds";

interface DiceCupProps {
  onRelease: () => void;
  onCancel: () => void;
}

// Dot positions for each face (1-6) in local 2D coordinates
const dotPositions: Record<number, [number, number][]> = {
  1: [[0, 0]],
  2: [[-0.25, -0.25], [0.25, 0.25]],
  3: [[-0.25, -0.25], [0, 0], [0.25, 0.25]],
  4: [[-0.25, -0.25], [0.25, -0.25], [-0.25, 0.25], [0.25, 0.25]],
  5: [[-0.25, -0.25], [0.25, -0.25], [0, 0], [-0.25, 0.25], [0.25, 0.25]],
  6: [[-0.25, -0.3], [0.25, -0.3], [-0.25, 0], [0.25, 0], [-0.25, 0.3], [0.25, 0.3]],
};

function CupDice({ size }: { size: number }) {
  const half = size / 2 + 0.001;
  const dotRadius = size * 0.07;
  
  const renderDots = (face: number) => {
    const dots = dotPositions[face] || [];
    return dots.map((pos, i) => (
      <mesh key={i} position={[pos[0] * size, pos[1] * size, 0]}>
        <circleGeometry args={[dotRadius, 16]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
    ));
  };
  
  return (
    <group>
      <RoundedBox args={[size, size, size]} radius={0.04} smoothness={4}>
        <meshStandardMaterial color="#ffffff" roughness={0.2} />
      </RoundedBox>
      {/* Top - 1 */}
      <group position={[0, half, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        {renderDots(1)}
      </group>
      {/* Bottom - 6 */}
      <group position={[0, -half, 0]} rotation={[Math.PI / 2, 0, 0]}>
        {renderDots(6)}
      </group>
      {/* Front - 2 */}
      <group position={[0, 0, half]}>
        {renderDots(2)}
      </group>
      {/* Back - 5 */}
      <group position={[0, 0, -half]} rotation={[0, Math.PI, 0]}>
        {renderDots(5)}
      </group>
      {/* Right - 3 */}
      <group position={[half, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        {renderDots(3)}
      </group>
      {/* Left - 4 */}
      <group position={[-half, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
        {renderDots(4)}
      </group>
    </group>
  );
}

function PhysicsDice({ position, size }: { position: [number, number, number]; size: number }) {
  const rigidBodyRef = useRef<RapierRigidBody>(null);
  const maxRadius = 0.6;
  const minY = -1.2;
  const maxY = 1.2;

  useFrame(() => {
    if (rigidBodyRef.current) {
      const pos = rigidBodyRef.current.translation();
      const distFromCenter = Math.sqrt(pos.x * pos.x + pos.z * pos.z);
      
      // Check if dice escaped the cup
      if (distFromCenter > maxRadius || pos.y < minY || pos.y > maxY) {
        // Reset position to center
        rigidBodyRef.current.setTranslation(
          { x: (Math.random() - 0.5) * 0.2, y: 0, z: (Math.random() - 0.5) * 0.2 },
          true
        );
        // Reset velocity
        rigidBodyRef.current.setLinvel({ x: 0, y: -2, z: 0 }, true);
        rigidBodyRef.current.setAngvel({ x: 0, y: 0, z: 0 }, true);
      }
    }
  });

  return (
    <RigidBody
      ref={rigidBodyRef}
      position={position}
      colliders="cuboid"
      restitution={0.4}
      friction={0.3}
      mass={0.05}
      linearDamping={0.3}
      angularDamping={0.2}
      ccd={true}
    >
      <CupDice size={size} />
    </RigidBody>
  );
}

function CupWalls({ velocity }: { velocity: { x: number; y: number } }) {
  const cupRef = useRef<RapierRigidBody>(null);
  const prevVelocity = useRef({ x: 0, y: 0 });

  useFrame(() => {
    if (cupRef.current) {
      prevVelocity.current = { ...velocity };

      // Move the cup kinematically - responsive but limited
      const maxMove = 0.4;
      const moveX = Math.max(-maxMove, Math.min(maxMove, velocity.x * 0.015));
      const moveZ = Math.max(-maxMove, Math.min(maxMove, velocity.y * 0.015));
      
      const currentPos = cupRef.current.translation();
      cupRef.current.setNextKinematicTranslation({
        x: moveX,
        y: currentPos.y,
        z: moveZ,
      });
    }
  });

  const wallThickness = 0.4;
  const cupRadius = 0.7;
  const cupHeight = 2.5;
  const segments = 32;

  // Create wall segments for cylinder approximation
  const walls = [];
  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const nextAngle = ((i + 1) / segments) * Math.PI * 2;
    const midAngle = (angle + nextAngle) / 2;
    
    const x = Math.cos(midAngle) * cupRadius;
    const z = Math.sin(midAngle) * cupRadius;
    const segmentWidth = 2 * cupRadius * Math.sin(Math.PI / segments);
    
    walls.push(
      <CuboidCollider
        key={i}
        args={[segmentWidth / 2, cupHeight / 2, wallThickness / 2]}
        position={[x, 0, z]}
        rotation={[0, -midAngle + Math.PI / 2, 0]}
      />
    );
  }

  return (
    <RigidBody ref={cupRef} type="kinematicPosition" colliders={false}>
      {/* Cup walls */}
      {walls}
      {/* Cup bottom */}
      <CuboidCollider args={[cupRadius + 0.2, 0.2, cupRadius + 0.2]} position={[0, -cupHeight / 2 - 0.1, 0]} />
      {/* Cup lid (transparent) */}
      <CuboidCollider args={[cupRadius + 0.2, 0.2, cupRadius + 0.2]} position={[0, cupHeight / 2 + 0.1, 0]} />
    </RigidBody>
  );
}

function CupVisual() {
  return (
    <group>
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[1.2, 1, 2.5, 32, 1, true]} />
        <meshStandardMaterial 
          color="#8B4513" 
          side={THREE.DoubleSide}
          roughness={0.6}
          metalness={0.1}
          transparent
          opacity={0.85}
        />
      </mesh>
      <mesh position={[0, -1.25, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1, 32]} />
        <meshStandardMaterial color="#6B3510" roughness={0.7} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function Scene({ 
  onRelease, 
  velocity,
  shakeAccumulator,
}: { 
  onRelease: () => void;
  velocity: { x: number; y: number };
  shakeAccumulator: React.MutableRefObject<number>;
}) {
  const diceSize = 0.35;
  const lastSoundTime = useRef(0);

  useFrame((state) => {
    const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
    if (speed > 3 && state.clock.elapsedTime - lastSoundTime.current > 0.06) {
      const intensity = Math.min(speed / 30, 1);
      sounds.playDiceShake(intensity);
      lastSoundTime.current = state.clock.elapsedTime;
    }
    shakeAccumulator.current += speed * 0.01;
  });

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[0, 5, 0]} intensity={1.2} />
      <pointLight position={[1, 3, 1]} intensity={0.5} />

      <Physics gravity={[0, -20, 0]} timeStep={1/240}>
        <PhysicsDice position={[-0.12, -0.5, 0.08]} size={diceSize} />
        <PhysicsDice position={[0.12, -0.2, -0.08]} size={diceSize} />
        <CupWalls velocity={velocity} />
      </Physics>

      <CupVisual />
    </>
  );
}

export function DiceCup({ onRelease, onCancel }: DiceCupProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [velocity, setVelocity] = useState({ x: 0, y: 0 });
  const lastPos = useRef({ x: 0, y: 0 });
  const shakeAccumulator = useRef(0);

  const handleRelease = useCallback(() => {
    if (shakeAccumulator.current > 3) {
      setIsVisible(false);
      sounds.playDiceRoll();
      setTimeout(() => {
        onRelease();
      }, 100);
    }
  }, [onRelease]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const newX = e.clientX - window.innerWidth / 2;
      const newY = e.clientY - window.innerHeight / 2;
      setVelocity({
        x: newX - lastPos.current.x,
        y: newY - lastPos.current.y,
      });
      lastPos.current = { x: newX, y: newY };
      setPosition({ x: newX, y: newY });
    };

    const handleMouseDown = (e: MouseEvent) => {
      const newX = e.clientX - window.innerWidth / 2;
      const newY = e.clientY - window.innerHeight / 2;
      setIsDragging(true);
      lastPos.current = { x: newX, y: newY };
      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      if (isDragging && shakeAccumulator.current > 3) {
        handleRelease();
      }
      setIsDragging(false);
      setPosition({ x: 0, y: 0 });
      setVelocity({ x: 0, y: 0 });
      shakeAccumulator.current = 0;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging || e.touches.length === 0) return;
      const newX = e.touches[0].clientX - window.innerWidth / 2;
      const newY = e.touches[0].clientY - window.innerHeight / 2;
      setVelocity({
        x: newX - lastPos.current.x,
        y: newY - lastPos.current.y,
      });
      lastPos.current = { x: newX, y: newY };
      setPosition({ x: newX, y: newY });
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 0) return;
      const newX = e.touches[0].clientX - window.innerWidth / 2;
      const newY = e.touches[0].clientY - window.innerHeight / 2;
      setIsDragging(true);
      lastPos.current = { x: newX, y: newY };
      setPosition({ x: newX, y: newY });
    };

    const handleTouchEnd = () => {
      if (isDragging && shakeAccumulator.current > 3) {
        handleRelease();
      }
      setIsDragging(false);
      setPosition({ x: 0, y: 0 });
      setVelocity({ x: 0, y: 0 });
      shakeAccumulator.current = 0;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("touchmove", handleTouchMove);
    window.addEventListener("touchstart", handleTouchStart);
    window.addEventListener("touchend", handleTouchEnd);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [isDragging, handleRelease]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70" style={{ cursor: isDragging ? 'grabbing' : 'grab' }}>
      {/* Instructions - fixed at top */}
      <div className="absolute top-8 left-0 right-0 text-center text-white text-lg font-bold pointer-events-none">
        ドラッグしてカップを振れ！
      </div>

      {/* Cancel button - fixed at bottom */}
      <button
        onClick={onCancel}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg text-sm z-10"
      >
        キャンセル
      </button>

      {/* 3D Canvas - follows mouse */}
      <div 
        className="absolute w-80 h-80 left-1/2 top-1/2 -ml-40 -mt-40 pointer-events-none"
        style={{
          transform: `translate(${position.x}px, ${position.y}px)`,
          transition: isDragging ? 'none' : 'transform 0.3s ease-out',
        }}
      >
        <Canvas camera={{ position: [0, 4, 0.5], fov: 50 }}>
          <Scene onRelease={handleRelease} velocity={velocity} shakeAccumulator={shakeAccumulator} />
        </Canvas>
      </div>
    </div>
  );
}
