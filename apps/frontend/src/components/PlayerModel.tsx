"use client";

import { useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { Capsule, RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import { type CharacterConfig, normalizeCharacter } from "@/lib/character";

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
const MOUTH_COLOR = "#7a4a3a";

// Face front plane (head box is 0.42 deep, centered at z=0)
const FACE_Z = 0.21;

interface PlayerModelProps {
  headRef: RefObject<THREE.Group | null>;
  colorIndex: number;
  character?: CharacterConfig | null;
  isConnected?: boolean;
  hasBomb?: boolean;
  // First-person: skip the head entirely so the local camera (placed inside
  // the head) never sees its own face parts.
  firstPerson?: boolean;
}

function Eyes({
  config,
  eyesRef,
  pupilColor,
  hairColor,
}: {
  config: CharacterConfig["eyes"];
  eyesRef: RefObject<THREE.Group | null>;
  pupilColor: string;
  hairColor: string;
}) {
  const y = 0.12 + config.offsetY * 0.09;
  const half = 0.05 + config.spacing * 0.11;

  return (
    <group ref={eyesRef} position={[0, y, 0]}>
      {[-1, 1].map((side) => (
        <group key={`eye-${side}`} position={[half * side, 0, 0]}>
          {config.type === 0 && (
            <>
              {/* Round: white eyeball + pupil */}
              <mesh position={[0, 0, FACE_Z - 0.01]} scale={[1, 1, 0.5]}>
                <sphereGeometry args={[0.05, 12, 12]} />
                <meshStandardMaterial color="#ffffff" roughness={0.4} />
              </mesh>
              <mesh position={[0, 0, FACE_Z + 0.02]}>
                <sphereGeometry args={[0.024, 10, 10]} />
                <meshBasicMaterial color={pupilColor} />
              </mesh>
            </>
          )}

          {config.type === 1 && (
            /* Simple dots */
            <mesh position={[0, 0, FACE_Z]} scale={[1, 1, 0.5]}>
              <sphereGeometry args={[0.032, 10, 10]} />
              <meshBasicMaterial color={pupilColor} />
            </mesh>
          )}

          {config.type === 2 && (
            /* Closed happy arc (^ ^) */
            <mesh position={[0, -0.01, FACE_Z + 0.005]}>
              <torusGeometry args={[0.042, 0.013, 8, 12, Math.PI]} />
              <meshBasicMaterial color={pupilColor} />
            </mesh>
          )}

          {config.type === 3 && (
            <>
              {/* Half-lidded: squashed eyeball + flat lid line */}
              <mesh position={[0, -0.008, FACE_Z - 0.01]} scale={[1, 0.6, 0.5]}>
                <sphereGeometry args={[0.05, 12, 12]} />
                <meshStandardMaterial color="#ffffff" roughness={0.4} />
              </mesh>
              <mesh position={[0, -0.012, FACE_Z + 0.02]}>
                <sphereGeometry args={[0.022, 10, 10]} />
                <meshBasicMaterial color={pupilColor} />
              </mesh>
              <mesh position={[0, 0.024, FACE_Z + 0.015]}>
                <boxGeometry args={[0.1, 0.018, 0.012]} />
                <meshBasicMaterial color={hairColor} />
              </mesh>
            </>
          )}

          {config.type === 4 && (
            <>
              {/* Square pixel eyes */}
              <mesh position={[0, 0, FACE_Z - 0.005]}>
                <boxGeometry args={[0.078, 0.078, 0.02]} />
                <meshStandardMaterial color="#ffffff" roughness={0.4} />
              </mesh>
              <mesh position={[0.012 * -side, -0.008, FACE_Z + 0.005]}>
                <boxGeometry args={[0.04, 0.04, 0.02]} />
                <meshBasicMaterial color={pupilColor} />
              </mesh>
            </>
          )}
        </group>
      ))}
    </group>
  );
}

function Mouth({ config }: { config: CharacterConfig["mouth"] }) {
  const x = config.offsetX * 0.1;
  const y = -0.02 + config.offsetY * 0.07;

  return (
    <group position={[x, y, 0]}>
      {config.type === 0 && (
        /* Smile (lower half arc) */
        <mesh position={[0, 0.02, FACE_Z + 0.005]} rotation={[0, 0, Math.PI]}>
          <torusGeometry args={[0.05, 0.014, 8, 12, Math.PI]} />
          <meshBasicMaterial color={MOUTH_COLOR} />
        </mesh>
      )}

      {config.type === 1 && (
        /* Straight line */
        <mesh position={[0, 0, FACE_Z + 0.005]}>
          <boxGeometry args={[0.09, 0.025, 0.012]} />
          <meshBasicMaterial color={MOUTH_COLOR} />
        </mesh>
      )}

      {config.type === 2 && (
        /* Open round mouth */
        <mesh position={[0, 0, FACE_Z]} scale={[1, 1.25, 0.4]}>
          <sphereGeometry args={[0.035, 12, 12]} />
          <meshBasicMaterial color="#5a2a22" />
        </mesh>
      )}

      {config.type === 3 && (
        /* Cat mouth (two small lower arcs) */
        <>
          {[-1, 1].map((side) => (
            <mesh
              key={`cat-${side}`}
              position={[0.026 * side, 0.012, FACE_Z + 0.005]}
              rotation={[0, 0, Math.PI]}
            >
              <torusGeometry args={[0.028, 0.011, 8, 10, Math.PI]} />
              <meshBasicMaterial color={MOUTH_COLOR} />
            </mesh>
          ))}
        </>
      )}

      {config.type === 4 && (
        /* Frown (upper half arc) */
        <mesh position={[0, -0.025, FACE_Z + 0.005]}>
          <torusGeometry args={[0.045, 0.013, 8, 12, Math.PI]} />
          <meshBasicMaterial color={MOUTH_COLOR} />
        </mesh>
      )}
    </group>
  );
}

function Hair({
  config,
  color,
  hasFacePaint,
}: {
  config: CharacterConfig["hair"];
  color: string;
  hasFacePaint: boolean;
}) {
  const mat = <meshStandardMaterial color={color} roughness={0.9} />;

  return (
    <group scale={[config.flip ? -1 : 1, 1, 1]}>
      {config.type === 0 && (
        <>
          {/* Bowl cut: top slab + fringe + back. With face paint the fringe is
              skipped and the hair sits above the face so the drawing stays
              fully visible. */}
          <mesh position={[0, hasFacePaint ? 0.36 : 0.26, -0.01]} castShadow>
            <boxGeometry args={[0.46, 0.14, 0.46]} />
            {mat}
          </mesh>
          {!hasFacePaint && (
            <mesh position={[0, 0.235, 0.205]}>
              <boxGeometry args={[0.46, 0.06, 0.06]} />
              {mat}
            </mesh>
          )}
          <mesh position={[0, hasFacePaint ? 0.15 : 0.1, -0.19]}>
            <boxGeometry args={[0.46, 0.28, 0.09]} />
            {mat}
          </mesh>
        </>
      )}

      {config.type === 1 && (
        <>
          {/* Spiky: thin base + cones, one big spike leaning sideways */}
          <mesh position={[0, 0.32, 0]} castShadow>
            <boxGeometry args={[0.46, 0.1, 0.46]} />
            {mat}
          </mesh>
          {[
            { x: -0.14, z: 0.1, h: 0.16, lean: 0.15 },
            { x: 0.02, z: 0.14, h: 0.2, lean: -0.1 },
            { x: 0.15, z: 0.06, h: 0.24, lean: -0.35 },
            { x: -0.06, z: -0.1, h: 0.18, lean: 0.1 },
            { x: 0.1, z: -0.14, h: 0.15, lean: -0.2 },
          ].map((s, i) => (
            <mesh
              key={`spike-${i}`}
              position={[s.x, 0.37 + s.h / 2 - 0.04, s.z]}
              rotation={[0, 0, s.lean]}
              castShadow
            >
              <coneGeometry args={[0.075, s.h, 6]} />
              {mat}
            </mesh>
          ))}
        </>
      )}

      {config.type === 2 && (
        <>
          {/* Side part: top slab + diagonal fringe + volume on one side */}
          <mesh position={[0, hasFacePaint ? 0.36 : 0.29, -0.01]} castShadow>
            <boxGeometry args={[0.46, 0.13, 0.46]} />
            {mat}
          </mesh>
          {!hasFacePaint && (
            <mesh position={[-0.045, 0.215, 0.205]} rotation={[0, 0, -0.16]}>
              <boxGeometry args={[0.37, 0.065, 0.06]} />
              {mat}
            </mesh>
          )}
          <mesh position={[0.225, 0.08, 0]} castShadow>
            <boxGeometry args={[0.06, 0.3, 0.46]} />
            {mat}
          </mesh>
          <mesh position={[0, hasFacePaint ? 0.15 : 0.1, -0.19]}>
            <boxGeometry args={[0.46, 0.28, 0.09]} />
            {mat}
          </mesh>
        </>
      )}

      {config.type === 3 && (
        <>
          {/* Twin tails: bowl base + two hanging tails */}
          <mesh position={[0, hasFacePaint ? 0.36 : 0.28, -0.01]} castShadow>
            <boxGeometry args={[0.46, 0.13, 0.46]} />
            {mat}
          </mesh>
          <mesh position={[0, hasFacePaint ? 0.16 : 0.11, -0.19]}>
            <boxGeometry args={[0.46, 0.26, 0.09]} />
            {mat}
          </mesh>
          {[-1, 1].map((side) => (
            <group key={`tail-${side}`} position={[0.26 * side, 0.16, -0.1]}>
              <mesh position={[0, 0, 0]} castShadow>
                <sphereGeometry args={[0.07, 10, 10]} />
                {mat}
              </mesh>
              <Capsule
                args={[0.055, 0.24, 4, 8]}
                position={[0.05 * side, -0.16, -0.02]}
                rotation={[0, 0, -0.25 * side]}
                castShadow
              >
                {mat}
              </Capsule>
            </group>
          ))}
        </>
      )}

      {config.type === 4 && (
        /* Mohawk: tall center strip */
        <mesh position={[0, 0.35, -0.01]} castShadow>
          <boxGeometry args={[0.1, 0.18, 0.46]} />
          {mat}
        </mesh>
      )}
    </group>
  );
}

export function PlayerModel({
  headRef,
  colorIndex,
  character,
  isConnected = true,
  hasBomb = false,
  firstPerson = false,
}: PlayerModelProps) {
  const bobRef = useRef<THREE.Group>(null);
  const leftShoulderRef = useRef<THREE.Group>(null);
  const rightShoulderRef = useRef<THREE.Group>(null);
  const eyesRef = useRef<THREE.Group>(null);

  const char = useMemo(() => normalizeCharacter(character), [character]);

  const bodyColor = isConnected ? getPlayerColor(colorIndex) : DISCONNECTED_BODY;
  const skinColor = isConnected ? SKIN_COLOR : DISCONNECTED_SKIN;
  const hairColor = isConnected
    ? HAIR_COLORS[((colorIndex % HAIR_COLORS.length) + HAIR_COLORS.length) % HAIR_COLORS.length]
    : "#555555";
  const pupilColor = isConnected ? "#1a1a1a" : "#444444";

  const pantsColor = useMemo(
    () => `#${new THREE.Color(bodyColor).multiplyScalar(0.45).getHexString()}`,
    [bodyColor]
  );

  const texture = useMemo(() => {
    if (!char.facePaint) return null;
    const loader = new THREE.TextureLoader();
    const tex = loader.load(char.facePaint);
    tex.minFilter = THREE.NearestFilter;
    tex.magFilter = THREE.NearestFilter;
    return tex;
  }, [char.facePaint]);

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

    // Blink every few seconds (skip for already-closed happy eyes)
    if (eyesRef.current) {
      const blinkPhase = (t % 3.8) / 3.8;
      const blinking = char.eyes.type !== 2 && blinkPhase > 0.96;
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
          In first person the whole head is hidden so the camera (placed
          inside the head) never sees its own face parts. */}
      <group ref={headRef} position={[0, 1.14, 0]}>
        {!firstPerson && (
          <>
            <mesh castShadow material={headMaterials} position={[0, 0.08, 0]}>
              <boxGeometry args={[0.42, 0.42, 0.42]} />
            </mesh>

            {char.hair.enabled && (
              <Hair
                config={char.hair}
                color={hairColor}
                hasFacePaint={!!char.facePaint}
              />
            )}

            {char.eyes.enabled && (
              <Eyes
                config={char.eyes}
                eyesRef={eyesRef}
                pupilColor={pupilColor}
                hairColor={hairColor}
              />
            )}

            {char.mouth.enabled && <Mouth config={char.mouth} />}
          </>
        )}
      </group>
    </group>
  );
}
