"use client";

import { useRef, useMemo, useEffect, useState } from "react";
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
  const [skinTexture, setSkinTexture] = useState<string | null>(null);

  useEffect(() => {
    const savedSkin = localStorage.getItem("bombGame_skin");
    if (savedSkin) {
      setSkinTexture(savedSkin);
    }
  }, []);

  const bodyColor = "#4a90d9";

  const texture = useMemo(() => {
    if (!skinTexture) return null;
    const loader = new THREE.TextureLoader();
    const tex = loader.load(skinTexture);
    tex.minFilter = THREE.NearestFilter;
    tex.magFilter = THREE.NearestFilter;
    return tex;
  }, [skinTexture]);

  const headMaterials = useMemo(() => {
    const sideMaterial = new THREE.MeshStandardMaterial({
      color: "#e8c4a0",
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
  }, [texture]);

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
        <mesh castShadow material={headMaterials}>
          <boxGeometry args={[0.4, 0.4, 0.4]} />
        </mesh>

        {!skinTexture && (
          <>
            <mesh position={[0.08, 0.05, 0.21]}>
              <sphereGeometry args={[0.04, 8, 8]} />
              <meshBasicMaterial color="#000000" />
            </mesh>
            <mesh position={[-0.08, 0.05, 0.21]}>
              <sphereGeometry args={[0.04, 8, 8]} />
              <meshBasicMaterial color="#000000" />
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
    </group>
  );
}
