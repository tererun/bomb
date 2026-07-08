"use client";

import { Cylinder } from "@react-three/drei";
import { DEFAULT_STAGE, type StageDefinition } from "@/lib/environments";

interface TableProps {
  theme?: StageDefinition["table"];
}

export function Table({ theme = DEFAULT_STAGE.table }: TableProps) {
  return (
    <group position={[0, 0, 0]}>
      {/* Table top */}
      <Cylinder
        args={[4, 4, 0.2, 64]}
        position={[0, 0.6, 0]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial
          color={theme.top}
          roughness={0.8}
          metalness={0.1}
        />
      </Cylinder>

      {/* Table edge (rim) */}
      <Cylinder
        args={[4.1, 4.1, 0.1, 64]}
        position={[0, 0.75, 0]}
      >
        <meshStandardMaterial
          color={theme.rim}
          roughness={0.6}
          metalness={0.2}
        />
      </Cylinder>

      {/* Center decoration */}
      <Cylinder
        args={[1, 1, 0.05, 32]}
        position={[0, 0.73, 0]}
      >
        <meshStandardMaterial
          color={theme.center}
          roughness={0.5}
          metalness={0.3}
        />
      </Cylinder>

      {/* Table leg (center pillar) */}
      <Cylinder
        args={[0.4, 0.6, 1, 32]}
        position={[0, 0, 0]}
        castShadow
      >
        <meshStandardMaterial
          color={theme.leg}
          roughness={0.7}
          metalness={0.1}
        />
      </Cylinder>

      {/* Base */}
      <Cylinder
        args={[1.2, 1.5, 0.15, 32]}
        position={[0, -0.45, 0]}
        castShadow
      >
        <meshStandardMaterial
          color={theme.leg}
          roughness={0.7}
          metalness={0.1}
        />
      </Cylinder>
    </group>
  );
}
