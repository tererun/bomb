// Visual stage definitions. The backend only sends { stageId, seed };
// everything about how a stage looks is defined here so all clients
// render the exact same environment deterministically.

export type DecorationKind =
  | "mushroom"
  | "tree"
  | "cactus"
  | "rock"
  | "snowman"
  | "iceCrystal"
  | "asteroid"
  | "lavaRock"
  | "pillar";

export interface StageDefinition {
  id: number;
  name: string;
  emoji: string;
  sky: {
    top: string;
    horizon: string;
    bottom: string;
  };
  stars: boolean;
  fog: { color: string; near: number; far: number } | null;
  ground: {
    color: string;
    accent: string; // inner circle under the table
    roughness: number;
  };
  lights: {
    ambient: { color: string; intensity: number };
    directional: { color: string; intensity: number; position: [number, number, number] };
    hemisphere: { sky: string; ground: string; intensity: number };
  };
  decorations: { kind: DecorationKind; count: number }[];
  sparkles: { color: string; count: number; size: number } | null;
  table: {
    top: string;
    rim: string;
    center: string;
    leg: string;
  };
}

export const STAGES: StageDefinition[] = [
  {
    id: 0,
    name: "スターリーナイト",
    emoji: "🌙",
    sky: { top: "#050514", horizon: "#1a1a3e", bottom: "#101024" },
    stars: true,
    fog: { color: "#101024", near: 18, far: 55 },
    ground: { color: "#181830", accent: "#22224a", roughness: 0.9 },
    lights: {
      ambient: { color: "#8888ff", intensity: 0.45 },
      directional: { color: "#aaccff", intensity: 0.9, position: [5, 10, 5] },
      hemisphere: { sky: "#334488", ground: "#221133", intensity: 0.4 },
    },
    decorations: [
      { kind: "mushroom", count: 14 },
      { kind: "rock", count: 6 },
    ],
    sparkles: { color: "#88aaff", count: 60, size: 2 },
    table: { top: "#3a3050", rim: "#241c36", center: "#4a3f66", leg: "#241c36" },
  },
  {
    id: 1,
    name: "サンセットデザート",
    emoji: "🌵",
    sky: { top: "#3d2b5e", horizon: "#ff8c5a", bottom: "#e8703a" },
    stars: false,
    fog: { color: "#d97a4a", near: 20, far: 60 },
    ground: { color: "#c2954f", accent: "#a87d3e", roughness: 1 },
    lights: {
      ambient: { color: "#ffcc99", intensity: 0.55 },
      directional: { color: "#ffaa66", intensity: 1.2, position: [-8, 6, 4] },
      hemisphere: { sky: "#ff9966", ground: "#8a6633", intensity: 0.35 },
    },
    decorations: [
      { kind: "cactus", count: 10 },
      { kind: "rock", count: 8 },
    ],
    sparkles: null,
    table: { top: "#8a5a30", rim: "#5c3a1c", center: "#a3703e", leg: "#5c3a1c" },
  },
  {
    id: 2,
    name: "スノーフィールド",
    emoji: "⛄",
    sky: { top: "#7aa8d8", horizon: "#cfe4f5", bottom: "#e8f2fa" },
    stars: false,
    fog: { color: "#dceaf5", near: 15, far: 50 },
    ground: { color: "#eef4fa", accent: "#d8e6f2", roughness: 0.7 },
    lights: {
      ambient: { color: "#eef5ff", intensity: 0.7 },
      directional: { color: "#ffffff", intensity: 1.1, position: [6, 10, 3] },
      hemisphere: { sky: "#bcd8f0", ground: "#e8f0f8", intensity: 0.5 },
    },
    decorations: [
      { kind: "snowman", count: 6 },
      { kind: "iceCrystal", count: 10 },
      { kind: "tree", count: 8 },
    ],
    sparkles: { color: "#ffffff", count: 120, size: 2.5 },
    table: { top: "#7fa8c9", rim: "#54748f", center: "#a3c4dd", leg: "#54748f" },
  },
  {
    id: 3,
    name: "ギャラクシー",
    emoji: "🪐",
    sky: { top: "#020208", horizon: "#1c0f38", bottom: "#0a0518" },
    stars: true,
    fog: null,
    ground: { color: "#241640", accent: "#382260", roughness: 0.4 },
    lights: {
      ambient: { color: "#bb88ff", intensity: 0.5 },
      directional: { color: "#dd99ff", intensity: 0.9, position: [4, 12, -6] },
      hemisphere: { sky: "#5533aa", ground: "#180a30", intensity: 0.45 },
    },
    decorations: [
      { kind: "asteroid", count: 12 },
      { kind: "iceCrystal", count: 8 },
    ],
    sparkles: { color: "#cc88ff", count: 100, size: 3 },
    table: { top: "#3c2a5e", rim: "#251840", center: "#54407e", leg: "#251840" },
  },
  {
    id: 4,
    name: "フォレストパーク",
    emoji: "🌲",
    sky: { top: "#3d8ee0", horizon: "#a8d8f0", bottom: "#c8e8f8" },
    stars: false,
    fog: { color: "#b8d8e8", near: 22, far: 65 },
    ground: { color: "#5a9648", accent: "#4a8038", roughness: 1 },
    lights: {
      ambient: { color: "#ffffff", intensity: 0.6 },
      directional: { color: "#fff4d6", intensity: 1.2, position: [6, 12, 4] },
      hemisphere: { sky: "#87ceeb", ground: "#3a6628", intensity: 0.45 },
    },
    decorations: [
      { kind: "tree", count: 16 },
      { kind: "rock", count: 5 },
      { kind: "mushroom", count: 4 },
    ],
    sparkles: null,
    table: { top: "#6b4a2c", rim: "#48301a", center: "#82603e", leg: "#48301a" },
  },
  {
    id: 5,
    name: "ボルケーノ",
    emoji: "🌋",
    sky: { top: "#1a0505", horizon: "#7a2010", bottom: "#3d0f08" },
    stars: false,
    fog: { color: "#40120a", near: 14, far: 45 },
    ground: { color: "#2a1a16", accent: "#3a2420", roughness: 0.95 },
    lights: {
      ambient: { color: "#ff8855", intensity: 0.45 },
      directional: { color: "#ff6633", intensity: 0.9, position: [-5, 8, -5] },
      hemisphere: { sky: "#992211", ground: "#331108", intensity: 0.5 },
    },
    decorations: [
      { kind: "lavaRock", count: 12 },
      { kind: "pillar", count: 6 },
    ],
    sparkles: { color: "#ff7733", count: 80, size: 3 },
    table: { top: "#3d2620", rim: "#241410", center: "#55332a", leg: "#241410" },
  },
];

export const DEFAULT_STAGE = STAGES[0];

export function getStage(stageId: number | undefined): StageDefinition {
  if (stageId === undefined) return DEFAULT_STAGE;
  return STAGES[stageId % STAGES.length] ?? DEFAULT_STAGE;
}

// Deterministic PRNG (mulberry32) so decorations are placed identically
// on every client from the seed the server sends.
export function createSeededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
