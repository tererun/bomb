export interface Player {
  name: string;
  socketId: string | null;
  position: number;
  isAlive: boolean;
  isHost: boolean;
  headRotation: { x: number; y: number };
  skin?: string | null;
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

export interface GameState {
  roomId: string;
  players: Player[];
  bomb: Bomb;
  currentTurnIndex: number;
  direction: 1 | -1; // 1 = clockwise (right), -1 = counter-clockwise
  phase: "waiting" | "playing" | "finished";
  colorThresholds: ColorThresholds;
  bombHolderIndex: number;
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
  createRoom: (playerName: string, skin: string | null, callback: (response: { success: boolean; roomId?: string; error?: string }) => void) => void;
  joinRoom: (roomId: string, playerName: string, skin: string | null, callback: (response: { success: boolean; error?: string }) => void) => void;
  startGame: (callback: (response: { success: boolean; error?: string }) => void) => void;
  rollDice: (callback: (response: { success: boolean; error?: string }) => void) => void;
  passBomb: (targetName: string, callback: (response: { success: boolean; error?: string }) => void) => void;
  updateHeadRotation: (rotation: { x: number; y: number }) => void;
  updateSkin: (skin: string | null) => void;
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
  playerSkinUpdated: (data: { playerName: string; skin: string | null }) => void;
  error: (message: string) => void;
}
