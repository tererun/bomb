"use client";

import { useMemo } from "react";
import { Stars, Sparkles } from "@react-three/drei";
import * as THREE from "three";
import {
  getStage,
  createSeededRandom,
  type StageDefinition,
  type DecorationKind,
} from "@/lib/environments";

interface Environment3DProps {
  stageId?: number;
  seed?: number;
}

// Gradient sky dome rendered on the inside of a large sphere.
const skyVertexShader = /* glsl */ `
  varying vec3 vWorldPosition;
  void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const skyFragmentShader = /* glsl */ `
  uniform vec3 topColor;
  uniform vec3 horizonColor;
  uniform vec3 bottomColor;
  varying vec3 vWorldPosition;
  void main() {
    float h = normalize(vWorldPosition).y;
    vec3 color = h >= 0.0
      ? mix(horizonColor, topColor, pow(h, 0.6))
      : mix(horizonColor, bottomColor, pow(-h, 0.8));
    gl_FragColor = vec4(color, 1.0);
  }
`;

function SkyDome({ stage }: { stage: StageDefinition }) {
  const uniforms = useMemo(
    () => ({
      topColor: { value: new THREE.Color(stage.sky.top) },
      horizonColor: { value: new THREE.Color(stage.sky.horizon) },
      bottomColor: { value: new THREE.Color(stage.sky.bottom) },
    }),
    [stage]
  );

  return (
    <mesh>
      <sphereGeometry args={[70, 32, 20]} />
      <shaderMaterial
        key={stage.id}
        side={THREE.BackSide}
        depthWrite={false}
        uniforms={uniforms}
        vertexShader={skyVertexShader}
        fragmentShader={skyFragmentShader}
      />
    </mesh>
  );
}

interface DecorationProps {
  position: [number, number, number];
  rotationY: number;
  scale: number;
}

function Mushroom({ position, rotationY, scale }: DecorationProps) {
  return (
    <group position={position} rotation={[0, rotationY, 0]} scale={scale}>
      <mesh position={[0, 0.25, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.18, 0.5, 8]} />
        <meshStandardMaterial color="#e8e0d0" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.55, 0]} castShadow>
        <sphereGeometry args={[0.35, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial
          color="#6688ff"
          emissive="#3355dd"
          emissiveIntensity={0.6}
          roughness={0.5}
        />
      </mesh>
    </group>
  );
}

function Tree({ position, rotationY, scale }: DecorationProps) {
  return (
    <group position={position} rotation={[0, rotationY, 0]} scale={scale}>
      <mesh position={[0, 0.5, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.18, 1, 8]} />
        <meshStandardMaterial color="#5a3d26" roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.3, 0]} castShadow>
        <coneGeometry args={[0.7, 1.2, 8]} />
        <meshStandardMaterial color="#2d6b32" roughness={0.9} />
      </mesh>
      <mesh position={[0, 2, 0]} castShadow>
        <coneGeometry args={[0.5, 1, 8]} />
        <meshStandardMaterial color="#357a3a" roughness={0.9} />
      </mesh>
      <mesh position={[0, 2.6, 0]} castShadow>
        <coneGeometry args={[0.32, 0.8, 8]} />
        <meshStandardMaterial color="#3d8842" roughness={0.9} />
      </mesh>
    </group>
  );
}

function Cactus({ position, rotationY, scale }: DecorationProps) {
  return (
    <group position={position} rotation={[0, rotationY, 0]} scale={scale}>
      <mesh position={[0, 0.7, 0]} castShadow>
        <capsuleGeometry args={[0.22, 1.1, 4, 10]} />
        <meshStandardMaterial color="#3f7d3a" roughness={0.85} />
      </mesh>
      <mesh position={[0.32, 0.85, 0]} rotation={[0, 0, -0.9]} castShadow>
        <capsuleGeometry args={[0.11, 0.4, 4, 8]} />
        <meshStandardMaterial color="#468a41" roughness={0.85} />
      </mesh>
      <mesh position={[-0.3, 0.65, 0]} rotation={[0, 0, 0.9]} castShadow>
        <capsuleGeometry args={[0.11, 0.35, 4, 8]} />
        <meshStandardMaterial color="#468a41" roughness={0.85} />
      </mesh>
    </group>
  );
}

function Rock({ position, rotationY, scale }: DecorationProps) {
  return (
    <mesh
      position={[position[0], position[1] + 0.25 * scale, position[2]]}
      rotation={[0, rotationY, 0]}
      scale={scale}
      castShadow
    >
      <dodecahedronGeometry args={[0.4, 0]} />
      <meshStandardMaterial color="#8a8078" roughness={0.95} />
    </mesh>
  );
}

function Snowman({ position, rotationY, scale }: DecorationProps) {
  return (
    <group position={position} rotation={[0, rotationY, 0]} scale={scale}>
      <mesh position={[0, 0.4, 0]} castShadow>
        <sphereGeometry args={[0.45, 12, 12]} />
        <meshStandardMaterial color="#ffffff" roughness={0.6} />
      </mesh>
      <mesh position={[0, 1, 0]} castShadow>
        <sphereGeometry args={[0.32, 12, 12]} />
        <meshStandardMaterial color="#ffffff" roughness={0.6} />
      </mesh>
      <mesh position={[0, 1.42, 0]} castShadow>
        <sphereGeometry args={[0.22, 12, 12]} />
        <meshStandardMaterial color="#ffffff" roughness={0.6} />
      </mesh>
      <mesh position={[0, 1.44, 0.2]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.05, 0.22, 8]} />
        <meshStandardMaterial color="#ff8833" roughness={0.7} />
      </mesh>
      <mesh position={[0, 1.68, 0]} castShadow>
        <cylinderGeometry args={[0.14, 0.14, 0.18, 10]} />
        <meshStandardMaterial color="#333333" roughness={0.8} />
      </mesh>
    </group>
  );
}

function IceCrystal({ position, rotationY, scale }: DecorationProps) {
  return (
    <mesh
      position={[position[0], position[1] + 0.5 * scale, position[2]]}
      rotation={[0, rotationY, 0.15]}
      scale={scale}
      castShadow
    >
      <octahedronGeometry args={[0.5, 0]} />
      <meshStandardMaterial
        color="#aaddff"
        emissive="#66aaee"
        emissiveIntensity={0.4}
        roughness={0.1}
        metalness={0.3}
        transparent
        opacity={0.85}
      />
    </mesh>
  );
}

function Asteroid({ position, rotationY, scale }: DecorationProps) {
  // Floats above the ground for a weightless, space-like look.
  return (
    <mesh
      position={[position[0], position[1] + 1 + scale * 1.5, position[2]]}
      rotation={[rotationY, rotationY * 2, rotationY * 0.5]}
      scale={scale}
    >
      <icosahedronGeometry args={[0.5, 0]} />
      <meshStandardMaterial
        color="#665577"
        emissive="#442266"
        emissiveIntensity={0.25}
        roughness={0.8}
      />
    </mesh>
  );
}

function LavaRock({ position, rotationY, scale }: DecorationProps) {
  return (
    <group position={position} rotation={[0, rotationY, 0]} scale={scale}>
      <mesh position={[0, 0.3, 0]} castShadow>
        <dodecahedronGeometry args={[0.45, 0]} />
        <meshStandardMaterial color="#221510" roughness={0.95} />
      </mesh>
      <mesh position={[0.1, 0.12, 0.15]}>
        <sphereGeometry args={[0.18, 8, 8]} />
        <meshStandardMaterial
          color="#ff5511"
          emissive="#ff4400"
          emissiveIntensity={1.5}
          roughness={0.4}
        />
      </mesh>
    </group>
  );
}

function Pillar({ position, rotationY, scale }: DecorationProps) {
  return (
    <group position={position} rotation={[0.06, rotationY, -0.04]} scale={scale}>
      <mesh position={[0, 1.2, 0]} castShadow>
        <cylinderGeometry args={[0.28, 0.4, 2.4, 6]} />
        <meshStandardMaterial color="#3a2a24" roughness={0.9} />
      </mesh>
      <mesh position={[0, 2.45, 0]} castShadow>
        <cylinderGeometry args={[0.42, 0.3, 0.25, 6]} />
        <meshStandardMaterial color="#2c1f1a" roughness={0.9} />
      </mesh>
    </group>
  );
}

const DECORATION_COMPONENTS: Record<
  DecorationKind,
  (props: DecorationProps) => React.JSX.Element
> = {
  mushroom: Mushroom,
  tree: Tree,
  cactus: Cactus,
  rock: Rock,
  snowman: Snowman,
  iceCrystal: IceCrystal,
  asteroid: Asteroid,
  lavaRock: LavaRock,
  pillar: Pillar,
};

interface PlacedDecoration {
  key: string;
  kind: DecorationKind;
  position: [number, number, number];
  rotationY: number;
  scale: number;
}

function useDecorations(stage: StageDefinition, seed: number): PlacedDecoration[] {
  return useMemo(() => {
    const rand = createSeededRandom(seed + stage.id * 7919);
    const placed: PlacedDecoration[] = [];
    for (const { kind, count } of stage.decorations) {
      for (let i = 0; i < count; i++) {
        // Keep a clear ring around the table (radius 4) and the players (radius ~3).
        const radius = 7 + rand() * 18;
        const angle = rand() * Math.PI * 2;
        placed.push({
          key: `${kind}-${i}`,
          kind,
          position: [Math.sin(angle) * radius, -0.5, Math.cos(angle) * radius],
          rotationY: rand() * Math.PI * 2,
          scale: 0.7 + rand() * 0.9,
        });
      }
    }
    return placed;
  }, [stage, seed]);
}

export function Environment3D({ stageId, seed = 1 }: Environment3DProps) {
  const stage = getStage(stageId);
  const decorations = useDecorations(stage, seed);

  return (
    <>
      {/* fog attaches to the scene (nearest three parent), so this must not
          be wrapped in a <group> */}
      {stage.fog && (
        <fog attach="fog" args={[stage.fog.color, stage.fog.near, stage.fog.far]} />
      )}

      <SkyDome stage={stage} />

      {stage.stars && (
        <Stars radius={60} depth={20} count={3000} factor={4} saturation={0.5} fade speed={0.5} />
      )}

      {/* Lighting */}
      <ambientLight color={stage.lights.ambient.color} intensity={stage.lights.ambient.intensity} />
      <directionalLight
        color={stage.lights.directional.color}
        position={stage.lights.directional.position}
        intensity={stage.lights.directional.intensity}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <pointLight position={[0, 5, 0]} intensity={0.5} />
      <hemisphereLight
        args={[
          stage.lights.hemisphere.sky,
          stage.lights.hemisphere.ground,
          stage.lights.hemisphere.intensity,
        ]}
      />

      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
        <circleGeometry args={[45, 48]} />
        <meshStandardMaterial color={stage.ground.color} roughness={stage.ground.roughness} />
      </mesh>
      {/* Accent circle under the table */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.49, 0]} receiveShadow>
        <circleGeometry args={[6, 48]} />
        <meshStandardMaterial color={stage.ground.accent} roughness={stage.ground.roughness} />
      </mesh>

      {/* Decorations */}
      {decorations.map((deco) => {
        const Component = DECORATION_COMPONENTS[deco.kind];
        return (
          <Component
            key={deco.key}
            position={deco.position}
            rotationY={deco.rotationY}
            scale={deco.scale}
          />
        );
      })}

      {/* Ambient particles (snow, embers, stardust...) */}
      {stage.sparkles && (
        <Sparkles
          color={stage.sparkles.color}
          count={stage.sparkles.count}
          size={stage.sparkles.size}
          scale={[24, 8, 24]}
          position={[0, 3, 0]}
          speed={0.4}
        />
      )}
    </>
  );
}
