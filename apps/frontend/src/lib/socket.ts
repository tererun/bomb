import { io, Socket } from "socket.io-client";

export interface Player {
  name: string;
  socketId: string | null;
  position: number;
  isAlive: boolean;
  isHost: boolean;
  headRotation: { x: number; y: number };
}

export interface Bomb {
  hp: number;
  maxHp: number;
  damage: number;
}

export interface ColorThresholds {
  yellow: number;
  red: number;
}

export interface GameState {
  roomId: string;
  players: Player[];
  bomb: Bomb;
  currentTurnIndex: number;
  direction: 1 | -1;
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

interface ClientToServerEvents {
  createRoom: (playerName: string, callback: (response: { success: boolean; roomId?: string; error?: string }) => void) => void;
  joinRoom: (roomId: string, playerName: string, callback: (response: { success: boolean; error?: string }) => void) => void;
  startGame: (callback: (response: { success: boolean; error?: string }) => void) => void;
  rollDice: (callback: (response: { success: boolean; error?: string }) => void) => void;
  passBomb: (targetName: string, callback: (response: { success: boolean; error?: string }) => void) => void;
  updateHeadRotation: (rotation: { x: number; y: number }) => void;
}

interface ServerToClientEvents {
  roomState: (state: GameState) => void;
  diceResult: (result: DiceResult) => void;
  bombMoved: (data: { fromIndex: number; toIndex: number; damage: number; newBombHolder: string; steps: number[]; explodedAtStep: number }) => void;
  bombExploded: (data: { loserName: string }) => void;
  playerJoined: (player: Player) => void;
  playerLeft: (playerName: string) => void;
  playerReconnected: (playerName: string) => void;
  gameStarted: () => void;
  turnChanged: (playerName: string) => void;
  directionChanged: (direction: 1 | -1) => void;
  waitingForPassChoice: (playerName: string) => void;
  playerHeadRotation: (data: { playerName: string; rotation: { x: number; y: number } }) => void;
  error: (message: string) => void;
}

export type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: GameSocket | null = null;

export function getSocket(): GameSocket {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001", {
      autoConnect: false,
    });
  }
  return socket;
}

export function connectSocket(): void {
  const s = getSocket();
  if (!s.connected) {
    s.connect();
  }
}

export function disconnectSocket(): void {
  if (socket?.connected) {
    socket.disconnect();
  }
}
