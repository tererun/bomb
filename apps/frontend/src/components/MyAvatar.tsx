"use client";

import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Capsule } from "@react-three/drei";
import * as THREE from "three";
import { getSocket } from "@/lib/socket";

interface MyAvatarProps {
  position: [number, number, number];
  isCurrentTurn: boolean;
  hasBomb: boolean;
}

export function MyAvatar({ position, isCurrentTurn, hasBomb }: MyAvatarProps) {
  const headRef = useRef<THREE.Group>(null);
  const lastSentRotation = useRef({ x: 0, y: 0 });
  const frameCount = useRef(0);
  const { camera } = useThree();

  const bodyColor = "#4a90d9";
  const headColor = "#e8c4a0";

  useFrame(() => {
    if (headRef.current) {
      // Get camera's rotation and apply to head
      const cameraDirection = new THREE.Vector3();
      camera.getWorldDirection(cameraDirection);
      
      // Calculate the Y rotation from camera direction
      const yRotation = Math.atan2(cameraDirection.x, cameraDirection.z);
      headRef.current.rotation.y = yRotation + Math.PI;
      
      // Slight X rotation based on camera pitch
      const pitch = Math.asin(-cameraDirection.y);
      headRef.current.rotation.x = pitch * 0.5;

      // Send rotation to server every 6 frames (~10fps) if changed significantly
      frameCount.current++;
      if (frameCount.current % 6 === 0) {
        const currentRotation = { 
          x: headRef.current.rotation.x, 
          y: headRef.current.rotation.y 
        };
        
        const threshold = 0.05;
        if (
          Math.abs(currentRotation.x - lastSentRotation.current.x) > threshold ||
          Math.abs(currentRotation.y - lastSentRotation.current.y) > threshold
        ) {
          const socket = getSocket();
          socket.emit("updateHeadRotation", currentRotation);
          lastSentRotation.current = currentRotation;
        }
      }
    }
  });

  return (
    <group position={position} scale={2}>
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

      {/* Head group - rotates with camera */}
      <group ref={headRef} position={[0, 1.3, 0]}>
        {/* Head */}
        <mesh castShadow>
          <sphereGeometry args={[0.2, 16, 16]} />
          <meshStandardMaterial
            color={headColor}
            roughness={0.8}
            metalness={0.1}
          />
        </mesh>

        {/* Eyes */}
        <mesh position={[0.08, 0.05, 0.15]}>
          <sphereGeometry args={[0.04, 8, 8]} />
          <meshBasicMaterial color="#000000" />
        </mesh>
        <mesh position={[-0.08, 0.05, 0.15]}>
          <sphereGeometry args={[0.04, 8, 8]} />
          <meshBasicMaterial color="#000000" />
        </mesh>
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
    </group>
  );
}
