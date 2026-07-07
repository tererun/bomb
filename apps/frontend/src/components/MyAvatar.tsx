"use client";

import { useRef, useEffect, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { getSocket } from "@/lib/socket";
import { PlayerModel } from "./PlayerModel";

interface MyAvatarProps {
  position: [number, number, number];
  colorIndex: number;
  isCurrentTurn: boolean;
  hasBomb: boolean;
}

export function MyAvatar({ position, colorIndex, isCurrentTurn, hasBomb }: MyAvatarProps) {
  const headRef = useRef<THREE.Group>(null);
  const lastSentRotation = useRef({ x: 0, y: 0 });
  const frameCount = useRef(0);
  const { camera } = useThree();
  const [skinTexture, setSkinTexture] = useState<string | null>(null);

  useEffect(() => {
    const savedSkin = localStorage.getItem("bombGame_skin");
    if (savedSkin) {
      setSkinTexture(savedSkin);
    }
  }, []);

  useFrame(() => {
    if (headRef.current) {
      // Get camera's rotation and apply to head
      const cameraDirection = new THREE.Vector3();
      camera.getWorldDirection(cameraDirection);
      
      // Calculate the Y rotation from camera direction, normalized to [-PI, PI]
      // so the value never wraps around (e.g. 2PI -> 0) when facing forward.
      const yRotation = Math.atan2(cameraDirection.x, cameraDirection.z);
      headRef.current.rotation.y = THREE.MathUtils.euclideanModulo(
        yRotation + Math.PI * 2,
        Math.PI * 2
      ) - Math.PI;
      
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
      <PlayerModel
        headRef={headRef}
        colorIndex={colorIndex}
        skinTexture={skinTexture}
        hasBomb={hasBomb}
        firstPerson
      />
    </group>
  );
}
