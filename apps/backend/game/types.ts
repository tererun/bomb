// Character customization payload. The server stores and relays it as-is;
// rendering/validation happens on the clients.
export interface CharacterConfig {
  eyes: { enabled: boolean; type: number; offsetY: number; spacing: number };
  hair: { enabled: boolean; type: number; flip: boolean };
  mouth: { enabled: boolean; type: number; offsetX: number; offsetY: number };
  facePaint: string | null;
}

export interface Player {
  name: string;
  socketId: string | null;
  position: number;
  isAlive: boolean;
  isHost: boolean;
  headRotation: { x: number; y: number };
  character?: CharacterConfig | null;
}

export interface Bomb {
  hp: number;
  maxHp: number;
  damage: number;
}

export interface ColorThresholds {
  yellow: number; // damage percentage to turn yellow
  red: number; // damage percentage to turn red
}

// Number of visual stages defined on the frontend (lib/environments.ts).
export const STAGE_COUNT = 6;

// Visual environment for a match. Randomized per room so every match
// gets a different skybox/field, shared by all players in the room.
export interface StageEnvironment {
  stageId: number;
  seed: number;
}

export interface GameState {
  roomId: string;
  players: Player[];
  bomb: Bomb;
  currentTurnIndex: number;
  direction: 1 | -1; // 1 = clockwise (right), -1 = counter-clockwise
  phase: "waiting" | "playing" | "finished";
  colorThresholds: ColorThresholds;
  bombHolderIndex: number;
  environment: StageEnvironment;
  winner?: string;
  loser?: string;
}

export interface DiceResult {
  dice1: number;
  dice2: number;
  effect: "normal" | "reverse" | "pass" | "halve";
  totalMoves: number;
}

export interface ClientToServerEvents {
  createRoom: (playerName: string, character: CharacterConfig | null, callback: (response: { success: boolean; roomId?: string; error?: string }) => void) => void;
  joinRoom: (roomId: string, playerName: string, character: CharacterConfig | null, callback: (response: { success: boolean; error?: string }) => void) => void;
  startGame: (callback: (response: { success: boolean; error?: string }) => void) => void;
  rollDice: (callback: (response: { success: boolean; error?: string }) => void) => void;
  passBomb: (targetName: string, callback: (response: { success: boolean; error?: string }) => void) => void;
  updateHeadRotation: (rotation: { x: number; y: number }) => void;
  updateCharacter: (character: CharacterConfig | null) => void;
}

export interface ServerToClientEvents {
  roomState: (state: GameState) => void;
  diceResult: (result: DiceResult) => void;
  bombMoved: (data: { fromIndex: number; toIndex: number; damage: number; newBombHolder: string }) => void;
  bombExploded: (data: { loserName: string }) => void;
  playerJoined: (player: Player) => void;
  playerLeft: (playerName: string) => void;
  playerReconnected: (playerName: string) => void;
  gameStarted: () => void;
  turnChanged: (playerName: string) => void;
  directionChanged: (direction: 1 | -1) => void;
  waitingForPassChoice: (playerName: string) => void;
  playerHeadRotation: (data: { playerName: string; rotation: { x: number; y: number } }) => void;
  playerCharacterUpdated: (data: { playerName: string; character: CharacterConfig | null }) => void;
  error: (message: string) => void;
}
