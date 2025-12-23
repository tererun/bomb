import { Server } from "socket.io";
import { GameRoom } from "./game/GameRoom";
import type { ClientToServerEvents, ServerToClientEvents } from "./game/types";

const rooms = new Map<string, GameRoom>();

function generateRoomId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

const corsOrigins = process.env.CORS_ORIGINS 
  ? process.env.CORS_ORIGINS.split(",")
  : ["http://localhost:3000", "http://localhost:3001"];

const io = new Server<ClientToServerEvents, ServerToClientEvents>({
  cors: {
    origin: corsOrigins,
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log(`Client connected: ${socket.id}`);

  socket.on("createRoom", (playerName, skin, callback) => {
    let roomId = generateRoomId();
    while (rooms.has(roomId)) {
      roomId = generateRoomId();
    }

    const room = new GameRoom(roomId, playerName);
    const player = room.addPlayer(playerName, socket.id, skin);

    if (!player) {
      if (typeof callback === "function") {
        callback({ success: false, error: "Failed to create room" });
      }
      return;
    }

    rooms.set(roomId, room);
    socket.join(roomId);
    
    if (typeof callback === "function") {
      callback({ success: true, roomId });
    }
    io.to(roomId).emit("roomState", room.getState());
    
    console.log(`Room ${roomId} created by ${playerName}`);
  });

  socket.on("joinRoom", (roomId, playerName, skin, callback) => {
    const room = rooms.get(roomId.toUpperCase());
    
    if (!room) {
      if (typeof callback === "function") {
        callback({ success: false, error: "Room not found" });
      }
      return;
    }

    const existingPlayer = room.players.get(playerName);
    
    // Allow reconnection: if the same player reconnects, update their socket
    if (existingPlayer) {
      existingPlayer.socketId = socket.id;
      if (skin !== undefined) {
        existingPlayer.skin = skin;
      }
      socket.join(roomId.toUpperCase());
      if (typeof callback === "function") {
        callback({ success: true });
      }
      io.to(roomId.toUpperCase()).emit("playerReconnected", playerName);
      io.to(roomId.toUpperCase()).emit("roomState", room.getState());
      console.log(`${playerName} reconnected to room ${roomId}`);
      return;
    }

    const player = room.addPlayer(playerName, socket.id, skin);
    
    if (!player) {
      if (typeof callback === "function") {
        callback({ success: false, error: "Cannot join room (game already started)" });
      }
      return;
    }

    socket.join(roomId.toUpperCase());
    if (typeof callback === "function") {
      callback({ success: true });
    }
    io.to(roomId.toUpperCase()).emit("playerJoined", player);
    io.to(roomId.toUpperCase()).emit("roomState", room.getState());
    console.log(`${playerName} joined room ${roomId}`);
  });

  socket.on("startGame", (callback) => {
    const room = findRoomBySocketId(socket.id);
    if (!room) {
      if (typeof callback === "function") {
        callback({ success: false, error: "Room not found" });
      }
      return;
    }

    const player = room.getPlayerBySocketId(socket.id);
    if (!player?.isHost) {
      if (typeof callback === "function") {
        callback({ success: false, error: "Only host can start the game" });
      }
      return;
    }

    if (!room.startGame()) {
      if (typeof callback === "function") {
        callback({ success: false, error: "Cannot start game (need at least 2 players)" });
      }
      return;
    }

    if (typeof callback === "function") {
      callback({ success: true });
    }
    io.to(room.roomId).emit("gameStarted");
    io.to(room.roomId).emit("roomState", room.getState());
    
    const currentPlayer = room.getCurrentTurnPlayer();
    if (currentPlayer) {
      io.to(room.roomId).emit("turnChanged", currentPlayer.name);
    }
    
    console.log(`Game started in room ${room.roomId}`);
  });

  socket.on("rollDice", (callback) => {
    const room = findRoomBySocketId(socket.id);
    if (!room) {
      if (typeof callback === "function") {
        callback({ success: false, error: "Room not found" });
      }
      return;
    }

    const player = room.getPlayerBySocketId(socket.id);
    const currentTurnPlayer = room.getCurrentTurnPlayer();
    
    if (!player || player.name !== currentTurnPlayer?.name) {
      if (typeof callback === "function") {
        callback({ success: false, error: "Not your turn" });
      }
      return;
    }

    const diceResult = room.rollDice();
    if (!diceResult) {
      if (typeof callback === "function") {
        callback({ success: false, error: "Cannot roll dice now" });
      }
      return;
    }

    if (typeof callback === "function") {
      callback({ success: true });
    }
    io.to(room.roomId).emit("diceResult", diceResult);

    if (diceResult.effect === "reverse") {
      io.to(room.roomId).emit("directionChanged", room.direction);
    }

    if (diceResult.effect === "pass") {
      io.to(room.roomId).emit("waitingForPassChoice", player.name);
    } else if (diceResult.totalMoves > 0) {
      const moveResult = room.moveBomb(diceResult.totalMoves);
      const bombHolder = room.getBombHolder();
      
      io.to(room.roomId).emit("bombMoved", {
        fromIndex: moveResult.fromIndex,
        toIndex: moveResult.toIndex,
        damage: diceResult.totalMoves,
        newBombHolder: bombHolder?.name || "",
        steps: moveResult.steps,
        explodedAtStep: moveResult.explodedAtStep,
      });

      if (moveResult.exploded) {
        io.to(room.roomId).emit("bombExploded", { loserName: room.loser || "" });
      } else {
        const nextPlayer = room.getCurrentTurnPlayer();
        if (nextPlayer) {
          io.to(room.roomId).emit("turnChanged", nextPlayer.name);
        }
      }
    } else {
      // For halve effect, move to next turn
      if (diceResult.effect === "halve") {
        const moveResult = room.moveBomb(diceResult.totalMoves);
        const bombHolder = room.getBombHolder();
        
        io.to(room.roomId).emit("bombMoved", {
          fromIndex: moveResult.fromIndex,
          toIndex: moveResult.toIndex,
          damage: diceResult.totalMoves,
          newBombHolder: bombHolder?.name || "",
          steps: moveResult.steps,
          explodedAtStep: moveResult.explodedAtStep,
        });

        if (moveResult.exploded) {
          io.to(room.roomId).emit("bombExploded", { loserName: room.loser || "" });
        } else {
          const nextPlayer = room.getCurrentTurnPlayer();
          if (nextPlayer) {
            io.to(room.roomId).emit("turnChanged", nextPlayer.name);
          }
        }
      }
    }

    io.to(room.roomId).emit("roomState", room.getState());
  });

  socket.on("passBomb", (targetName, callback) => {
    const room = findRoomBySocketId(socket.id);
    if (!room) {
      callback({ success: false, error: "Room not found" });
      return;
    }

    const player = room.getPlayerBySocketId(socket.id);
    const currentTurnPlayer = room.getCurrentTurnPlayer();
    
    if (!player || player.name !== currentTurnPlayer?.name) {
      callback({ success: false, error: "Not your turn" });
      return;
    }

    if (!room.passBombTo(targetName)) {
      callback({ success: false, error: "Cannot pass bomb to that player" });
      return;
    }

    callback({ success: true });
    
    const bombHolder = room.getBombHolder();
    io.to(room.roomId).emit("bombMoved", {
      fromIndex: -1,
      toIndex: room.bombHolderIndex,
      damage: 0,
      newBombHolder: bombHolder?.name || "",
      steps: [room.bombHolderIndex],
      explodedAtStep: -1,
    });
    
    const nextPlayer = room.getCurrentTurnPlayer();
    if (nextPlayer) {
      io.to(room.roomId).emit("turnChanged", nextPlayer.name);
    }
    
    io.to(room.roomId).emit("roomState", room.getState());
  });

  socket.on("updateHeadRotation", (rotation) => {
    const room = findRoomBySocketId(socket.id);
    if (!room) return;

    const player = room.getPlayerBySocketId(socket.id);
    if (!player) return;

    player.headRotation = rotation;
    
    // Broadcast to other players in the room
    socket.to(room.roomId).emit("playerHeadRotation", {
      playerName: player.name,
      rotation,
    });
  });

  socket.on("updateSkin", (skin) => {
    const room = findRoomBySocketId(socket.id);
    if (!room) return;

    const player = room.updatePlayerSkin(socket.id, skin);
    if (!player) return;

    // Broadcast to other players in the room
    socket.to(room.roomId).emit("playerSkinUpdated", {
      playerName: player.name,
      skin,
    });
  });

  socket.on("disconnect", () => {
    console.log(`Client disconnected: ${socket.id}`);
    
    const room = findRoomBySocketId(socket.id);
    if (room) {
      const player = room.removePlayer(socket.id);
      if (player) {
        if (room.phase === "waiting") {
          io.to(room.roomId).emit("playerLeft", player.name);
        }
        io.to(room.roomId).emit("roomState", room.getState());
        
        // Clean up empty rooms
        if (room.players.size === 0) {
          rooms.delete(room.roomId);
          console.log(`Room ${room.roomId} deleted (empty)`);
        }
      }
    }
  });
});

function findRoomBySocketId(socketId: string): GameRoom | undefined {
  for (const room of rooms.values()) {
    if (room.getPlayerBySocketId(socketId)) {
      return room;
    }
  }
  return undefined;
}

const PORT = process.env.BACKEND_PORT || process.env.PORT || 3001;
io.listen(Number(PORT));
console.log(`Socket.io server running on port ${PORT}`);
console.log(`CORS origins: ${corsOrigins.join(", ")}`);
