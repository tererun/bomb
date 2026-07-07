"use client";

import { useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { Capsule, RoundedBox } from "@react-three/drei";
import * as THREE from "three";

// Distinct body colors assigned per player (by seat index) so everyone is
// distinguishable at a glance.
export const PLAYER_COLORS = [
  "#4a90d9", // blue
  "#e05252", // red
  "#4caf6e", // green
  "#e6a23c", // orange
  "#9b6dd6", // purple
  "#e57fb3", // pink
  "#50c8c8", // teal
  "#a3b04a", // olive
];

export function getPlayerColor(index: number): string {
  const n = PLAYER_COLORS.length;
  return PLAYER_COLORS[((index % n) + n) % n];
}

const HAIR_COLORS = [
  "#3a2a1e", // dark brown
  "#1f2933", // black
  "#8a5a2b", // brown
  "#d9b44a", // blond
  "#6e4a6e", // plum
  "#404a52", // gray blue
  "#a04a2e", // ginger
  "#e8e4da", // silver
];

const SKIN_COLOR = "#e8c4a0";
const DISCONNECTED_SKIN = "#888888";
const DISCONNECTED_BODY = "#666666";

interface PlayerModelProps {
  headRef: RefObject<THREE.Group | null>;
  colorIndex: number;
  skinTexture?: string | null;
  isConnected?: boolean;
  hasBomb?: boolean;
  // First-person: skip face details / hair so the local camera (placed inside
  // the head) never sees floating face parts.
  firstPerson?: boolean;
}

export function PlayerModel({
  headRef,
  colorIndex,
  skinTexture,
  isConnected = true,
  hasBomb = false,
  firstPerson = false,
}: PlayerModelProps) {
  const bobRef = useRef<THREE.Group>(null);
  const leftShoulderRef = useRef<THREE.Group>(null);
  const rightShoulderRef = useRef<THREE.Group>(null);
  const eyesRef = useRef<THREE.Group>(null);

  const bodyColor = isConnected ? getPlayerColor(colorIndex) : DISCONNECTED_BODY;
  const skinColor = isConnected ? SKIN_COLOR : DISCONNECTED_SKIN;
  const hairColor = isConnected
    ? HAIR_COLORS[((colorIndex % HAIR_COLORS.length) + HAIR_COLORS.length) % HAIR_COLORS.length]
    : "#555555";

  const pantsColor = useMemo(
    () => `#${new THREE.Color(bodyColor).multiplyScalar(0.45).getHexString()}`,
    [bodyColor]
  );

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
      color: skinColor,
      roughness: 0.8,
      metalness: 0.1,
    });

    if (texture) {
      const frontMaterial = new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 0.8,
        metalness: 0.1,
      });
      // Box material order: +x, -x, +y, -y, +z (front), -z
      return [
        sideMaterial, sideMaterial, sideMaterial, sideMaterial,
        frontMaterial, sideMaterial,
      ];
    }
    return [sideMaterial, sideMaterial, sideMaterial, sideMaterial, sideMaterial, sideMaterial];
  }, [texture, skinColor]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() + colorIndex * 1.7;

    // Gentle idle bob
    if (bobRef.current) {
      bobRef.current.position.y = Math.sin(t * 2.1) * 0.012;
    }

    // Arms: sway idly, or reach forward when holding the bomb
    const sway = Math.sin(t * 2.1) * 0.05;
    const targetX = hasBomb ? -1.05 : sway;
    const targetZ = hasBomb ? 0.3 : 0.1;
    if (leftShoulderRef.current) {
      leftShoulderRef.current.rotation.x = THREE.MathUtils.lerp(
        leftShoulderRef.current.rotation.x, targetX, 0.1
      );
      leftShoulderRef.current.rotation.z = THREE.MathUtils.lerp(
        leftShoulderRef.current.rotation.z, targetZ, 0.1
      );
    }
    if (rightShoulderRef.current) {
      rightShoulderRef.current.rotation.x = THREE.MathUtils.lerp(
        rightShoulderRef.current.rotation.x, hasBomb ? -1.05 : -sway, 0.1
      );
      rightShoulderRef.current.rotation.z = THREE.MathUtils.lerp(
        rightShoulderRef.current.rotation.z, -targetZ, 0.1
      );
    }

    // Blink every few seconds
    if (eyesRef.current) {
      const blinkPhase = (t % 3.8) / 3.8;
      const blinking = blinkPhase > 0.96;
      eyesRef.current.scale.y = THREE.MathUtils.lerp(
        eyesRef.current.scale.y, blinking ? 0.1 : 1, 0.45
      );
    }
  });

  return (
    <group ref={bobRef}>
      {/* Legs */}
      {[-1, 1].map((side) => (
        <group key={`leg-${side}`}>
          <Capsule
            args={[0.085, 0.22, 4, 8]}
            position={[0.115 * side, 0.28, 0]}
            castShadow
          >
            <meshStandardMaterial color={pantsColor} roughness={0.8} />
          </Capsule>
          {/* Shoe */}
          <mesh position={[0.115 * side, 0.05, 0.03]} castShadow>
            <boxGeometry args={[0.15, 0.1, 0.24]} />
            <meshStandardMaterial color="#3b3b3b" roughness={0.6} />
          </mesh>
        </group>
      ))}

      {/* Torso */}
      <RoundedBox
        args={[0.46, 0.52, 0.3]}
        radius={0.08}
        smoothness={4}
        position={[0, 0.72, 0]}
        castShadow
      >
        <meshStandardMaterial color={bodyColor} roughness={0.6} metalness={0.1} />
      </RoundedBox>

      {/* Arms (pivoted at shoulders so they can pose) */}
      <group ref={leftShoulderRef} position={[0.27, 0.9, 0]}>
        <Capsule args={[0.065, 0.24, 4, 8]} position={[0, -0.17, 0]} castShadow>
          <meshStandardMaterial color={bodyColor} roughness={0.6} />
        </Capsule>
        <mesh position={[0, -0.36, 0]} castShadow>
          <sphereGeometry args={[0.07, 12, 12]} />
          <meshStandardMaterial color={skinColor} roughness={0.8} />
        </mesh>
      </group>
      <group ref={rightShoulderRef} position={[-0.27, 0.9, 0]}>
        <Capsule args={[0.065, 0.24, 4, 8]} position={[0, -0.17, 0]} castShadow>
          <meshStandardMaterial color={bodyColor} roughness={0.6} />
        </Capsule>
        <mesh position={[0, -0.36, 0]} castShadow>
          <sphereGeometry args={[0.07, 12, 12]} />
          <meshStandardMaterial color={skinColor} roughness={0.8} />
        </mesh>
      </group>

      {/* Neck (hidden in first person: looking down would show its cut-off top) */}
      {!firstPerson && (
        <mesh position={[0, 1.0, 0]}>
          <cylinderGeometry args={[0.07, 0.07, 0.1, 12]} />
          <meshStandardMaterial color={skinColor} roughness={0.8} />
        </mesh>
      )}

      {/* Head group - rotation is driven from outside via headRef.
          In first person the head box is hidden so the camera (placed inside
          the head) never sees its outside when pitching up/down. */}
      <group ref={headRef} position={[0, 1.14, 0]}>
        {!firstPerson && (
          <mesh castShadow material={headMaterials} position={[0, 0.08, 0]}>
            <boxGeometry args={[0.42, 0.42, 0.42]} />
          </mesh>
        )}

        {!firstPerson && (
          <>
            {/* Hair: top, fringe and back (bowl cut, keeps square silhouette) */}
            <mesh position={[0, 0.26, -0.01]} castShadow>
              <boxGeometry args={[0.46, 0.14, 0.46]} />
              <meshStandardMaterial color={hairColor} roughness={0.9} />
            </mesh>
            <mesh position={[0, 0.235, 0.205]}>
              <boxGeometry args={[0.46, 0.06, 0.06]} />
              <meshStandardMaterial color={hairColor} roughness={0.9} />
            </mesh>
            <mesh position={[0, 0.1, -0.19]}>
              <boxGeometry args={[0.46, 0.28, 0.09]} />
              <meshStandardMaterial color={hairColor} roughness={0.9} />
            </mesh>

            {/* Face (only when no custom skin is drawn) */}
            {!skinTexture && (
              <>
                <group ref={eyesRef} position={[0, 0.12, 0]}>
                  {[-1, 1].map((side) => (
                    <group key={`eye-${side}`}>
                      <mesh position={[0.095 * side, 0, 0.2]} scale={[1, 1, 0.5]}>
                        <sphereGeometry args={[0.05, 12, 12]} />
                        <meshStandardMaterial color="#ffffff" roughness={0.4} />
                      </mesh>
                      <mesh position={[0.095 * side, 0, 0.23]}>
                        <sphereGeometry args={[0.024, 10, 10]} />
                        <meshBasicMaterial color={isConnected ? "#1a1a1a" : "#444444"} />
                      </mesh>
                    </group>
                  ))}
                </group>

                {/* Eyebrows */}
                {[-1, 1].map((side) => (
                  <mesh
                    key={`brow-${side}`}
                    position={[0.095 * side, 0.185, 0.212]}
                    rotation={[0, 0, side * -0.12]}
                  >
                    <boxGeometry args={[0.08, 0.02, 0.012]} />
                    <meshBasicMaterial color={hairColor} />
                  </mesh>
                ))}

                {/* Mouth */}
                <mesh position={[0, -0.02, 0.212]}>
                  <boxGeometry args={[0.09, 0.025, 0.012]} />
                  <meshBasicMaterial color="#7a4a3a" />
                </mesh>

                {/* Blush */}
                {[-1, 1].map((side) => (
                  <mesh key={`blush-${side}`} position={[0.155 * side, 0.03, 0.211]}>
                    <circleGeometry args={[0.035, 16]} />
                    <meshBasicMaterial color="#e89b8b" transparent opacity={0.55} />
                  </mesh>
                ))}
              </>
            )}
          </>
        )}
      </group>
    </group>
  );
}
