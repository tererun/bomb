import type { Player, Bomb, GameState, ColorThresholds, DiceResult } from "./types";

export class GameRoom {
  roomId: string;
  players: Map<string, Player> = new Map();
  bomb: Bomb;
  currentTurnIndex: number = 0;
  direction: 1 | -1 = 1;
  phase: "waiting" | "playing" | "finished" = "waiting";
  colorThresholds: ColorThresholds;
  bombHolderIndex: number = 0;
  hostName: string;
  winner?: string;
  loser?: string;
  waitingForPassChoice: boolean = false;

  constructor(roomId: string, hostName: string) {
    this.roomId = roomId;
    this.hostName = hostName;
    
    // Random HP between 50-150
    const hp = Math.floor(Math.random() * 101) + 50;
    this.bomb = { hp, maxHp: hp, damage: 0 };
    
    // Random thresholds for color changes
    // Yellow: 20-50%, Red: 60-90%
    const yellow = Math.floor(Math.random() * 31) + 20;
    const red = Math.floor(Math.random() * 31) + 60;
    this.colorThresholds = { yellow, red };
  }

  addPlayer(name: string, socketId: string, skin?: string | null): Player | null {
    if (this.players.has(name)) {
      // Reconnection
      const player = this.players.get(name)!;
      player.socketId = socketId;
      if (skin !== undefined) {
        player.skin = skin;
      }
      return player;
    }

    if (this.phase !== "waiting") {
      return null;
    }

    const isHost = this.players.size === 0;
    const player: Player = {
      name,
      socketId,
      position: this.players.size,
      isAlive: true,
      isHost,
      headRotation: { x: 0, y: 0 },
      skin: skin || null,
    };

    this.players.set(name, player);
    return player;
  }

  updatePlayerSkin(socketId: string, skin: string | null): Player | undefined {
    const player = this.getPlayerBySocketId(socketId);
    if (player) {
      player.skin = skin;
    }
    return player;
  }

  removePlayer(socketId: string): Player | null {
    for (const [name, player] of this.players) {
      if (player.socketId === socketId) {
        if (this.phase === "waiting") {
          this.players.delete(name);
          this.reassignPositions();
          if (player.isHost && this.players.size > 0) {
            const firstPlayer = Array.from(this.players.values())[0];
            firstPlayer.isHost = true;
            this.hostName = firstPlayer.name;
          }
        } else {
          player.socketId = null;
        }
        return player;
      }
    }
    return null;
  }

  private reassignPositions(): void {
    let pos = 0;
    for (const player of this.players.values()) {
      player.position = pos++;
    }
  }

  getPlayerBySocketId(socketId: string): Player | undefined {
    for (const player of this.players.values()) {
      if (player.socketId === socketId) {
        return player;
      }
    }
    return undefined;
  }

  startGame(): boolean {
    if (this.phase !== "waiting" || this.players.size < 2) {
      return false;
    }

    this.phase = "playing";
    this.currentTurnIndex = 0;
    this.bombHolderIndex = 0;
    return true;
  }

  rollDice(): DiceResult | null {
    if (this.phase !== "playing" || this.waitingForPassChoice) {
      return null;
    }

    const dice1 = Math.floor(Math.random() * 6) + 1;
    const dice2 = Math.floor(Math.random() * 6) + 1;

    let effect: DiceResult["effect"] = "normal";
    let totalMoves = dice1 + dice2;

    if (dice1 === dice2) {
      if (dice1 === 4) {
        effect = "reverse";
        totalMoves = 0;
        this.direction *= -1;
      } else if (dice1 === 1) {
        effect = "pass";
        totalMoves = 0;
        this.waitingForPassChoice = true;
      } else if (dice1 === 6) {
        effect = "halve";
        this.bomb.hp = Math.floor(this.bomb.hp / 2);
        totalMoves = dice1 + dice2;
      }
    }

    return { dice1, dice2, effect, totalMoves };
  }

  moveBomb(moves: number): { 
    fromIndex: number; 
    toIndex: number; 
    exploded: boolean;
    steps: number[];
    explodedAtStep: number;
  } {
    const playerList = this.getAlivePlayers();
    const fromIndex = this.bombHolderIndex;
    const steps: number[] = [];
    let explodedAtStep = -1;
    
    // Move bomb one step at a time
    let currentIndex = this.bombHolderIndex;
    for (let i = 0; i < moves; i++) {
      this.bomb.damage += 1;
      currentIndex = this.getNextPlayerIndex(currentIndex);
      steps.push(currentIndex);
      
      // Check if exploded at this step
      if (explodedAtStep === -1 && this.bomb.damage >= this.bomb.hp) {
        explodedAtStep = i;
        this.bombHolderIndex = currentIndex;
        this.currentTurnIndex = currentIndex;
        
        this.phase = "finished";
        const loserPlayer = playerList[currentIndex];
        this.loser = loserPlayer.name;
        
        const alivePlayers = playerList.filter(p => p.name !== this.loser);
        if (alivePlayers.length === 1) {
          this.winner = alivePlayers[0].name;
        }
        break;
      }
    }
    
    if (explodedAtStep === -1) {
      this.bombHolderIndex = currentIndex;
      this.currentTurnIndex = currentIndex;
    }

    return { 
      fromIndex, 
      toIndex: this.bombHolderIndex, 
      exploded: explodedAtStep !== -1,
      steps,
      explodedAtStep,
    };
  }

  passBombTo(targetName: string): boolean {
    if (!this.waitingForPassChoice) return false;
    
    const targetPlayer = this.players.get(targetName);
    if (!targetPlayer || !targetPlayer.isAlive) return false;

    const playerList = this.getAlivePlayers();
    const targetIndex = playerList.findIndex(p => p.name === targetName);
    if (targetIndex === -1) return false;

    this.bombHolderIndex = targetIndex;
    this.currentTurnIndex = targetIndex;
    this.waitingForPassChoice = false;

    return true;
  }

  private getNextPlayerIndex(currentIndex: number): number {
    const playerList = this.getAlivePlayers();
    let nextIndex = currentIndex + this.direction;
    
    if (nextIndex >= playerList.length) {
      nextIndex = 0;
    } else if (nextIndex < 0) {
      nextIndex = playerList.length - 1;
    }

    return nextIndex;
  }

  private getAlivePlayers(): Player[] {
    return Array.from(this.players.values())
      .filter(p => p.isAlive)
      .sort((a, b) => a.position - b.position);
  }

  getCurrentTurnPlayer(): Player | undefined {
    const playerList = this.getAlivePlayers();
    return playerList[this.currentTurnIndex];
  }

  getBombHolder(): Player | undefined {
    const playerList = this.getAlivePlayers();
    return playerList[this.bombHolderIndex];
  }

  getState(): GameState {
    return {
      roomId: this.roomId,
      players: Array.from(this.players.values()),
      bomb: { ...this.bomb },
      currentTurnIndex: this.currentTurnIndex,
      direction: this.direction,
      phase: this.phase,
      colorThresholds: { ...this.colorThresholds },
      bombHolderIndex: this.bombHolderIndex,
      winner: this.winner,
      loser: this.loser,
    };
  }

  getBombColor(): "black" | "yellow" | "red" {
    const damagePercent = (this.bomb.damage / this.bomb.maxHp) * 100;
    if (damagePercent >= this.colorThresholds.red) {
      return "red";
    } else if (damagePercent >= this.colorThresholds.yellow) {
      return "yellow";
    }
    return "black";
  }
}
