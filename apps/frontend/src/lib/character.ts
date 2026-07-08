// Character customization model shared between the creator UI, the 3D player
// model, and the network layer (the whole config is sent to the server and
// broadcast to other players).

export interface EyesConfig {
  enabled: boolean;
  type: number;
  /** -1 (down) .. 1 (up) */
  offsetY: number;
  /** 0 (close together) .. 1 (far apart) */
  spacing: number;
}

export interface HairConfig {
  enabled: boolean;
  type: number;
  flip: boolean;
}

export interface MouthConfig {
  enabled: boolean;
  type: number;
  /** -1 (left) .. 1 (right) */
  offsetX: number;
  /** -1 (down) .. 1 (up) */
  offsetY: number;
}

export interface CharacterConfig {
  eyes: EyesConfig;
  hair: HairConfig;
  mouth: MouthConfig;
  /** PNG data URL painted over the base face square, or null */
  facePaint: string | null;
}

export const EYE_TYPES = [
  { id: 0, label: "まる" },
  { id: 1, label: "点" },
  { id: 2, label: "にっこり" },
  { id: 3, label: "ジト目" },
  { id: 4, label: "しかく" },
];

export const HAIR_TYPES = [
  { id: 0, label: "マッシュ" },
  { id: 1, label: "ツンツン" },
  { id: 2, label: "横分け" },
  { id: 3, label: "ツインテール" },
  { id: 4, label: "モヒカン" },
];

export const MOUTH_TYPES = [
  { id: 0, label: "にこっ" },
  { id: 1, label: "まっすぐ" },
  { id: 2, label: "ぽかん" },
  { id: 3, label: "ねこ" },
  { id: 4, label: "への字" },
];

export const DEFAULT_CHARACTER: CharacterConfig = {
  eyes: { enabled: true, type: 0, offsetY: 0, spacing: 0.45 },
  hair: { enabled: true, type: 0, flip: false },
  mouth: { enabled: true, type: 0, offsetX: 0, offsetY: 0 },
  facePaint: null,
};

const clamp = (v: number, min: number, max: number) =>
  Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : 0;

/**
 * Sanitizes a character config coming from storage or from the network so
 * rendering never has to deal with out-of-range values.
 */
export function normalizeCharacter(raw: unknown): CharacterConfig {
  const d = DEFAULT_CHARACTER;
  if (!raw || typeof raw !== "object") {
    return structuredClone(d);
  }
  const r = raw as Partial<CharacterConfig>;
  return {
    eyes: {
      enabled: r.eyes?.enabled ?? d.eyes.enabled,
      type: clamp(Math.round(r.eyes?.type ?? d.eyes.type), 0, EYE_TYPES.length - 1),
      offsetY: clamp(r.eyes?.offsetY ?? d.eyes.offsetY, -1, 1),
      spacing: clamp(r.eyes?.spacing ?? d.eyes.spacing, 0, 1),
    },
    hair: {
      enabled: r.hair?.enabled ?? d.hair.enabled,
      type: clamp(Math.round(r.hair?.type ?? d.hair.type), 0, HAIR_TYPES.length - 1),
      flip: r.hair?.flip ?? d.hair.flip,
    },
    mouth: {
      enabled: r.mouth?.enabled ?? d.mouth.enabled,
      type: clamp(Math.round(r.mouth?.type ?? d.mouth.type), 0, MOUTH_TYPES.length - 1),
      offsetX: clamp(r.mouth?.offsetX ?? d.mouth.offsetX, -1, 1),
      offsetY: clamp(r.mouth?.offsetY ?? d.mouth.offsetY, -1, 1),
    },
    facePaint: typeof r.facePaint === "string" ? r.facePaint : null,
  };
}
