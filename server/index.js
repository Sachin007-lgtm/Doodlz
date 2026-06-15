// ============================================================
//  Doodlz — Main Server Entry Point
//  Express + Socket.IO  |  Port 3001
// ============================================================

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const Player = require('./classes/Player');
const Room = require('./classes/Room');
const Game = require('./classes/Game');

// ── Express setup ──────────────────────────────────────────
const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);

// ── Socket.IO setup ────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// ── In-memory stores ───────────────────────────────────────
const rooms = new Map();       // roomId  → Room
const socketToPlayer = new Map(); // socketId → { playerId, roomId }

// ── Utility helpers ────────────────────────────────────────

/** Generate a short 6-char room code */
function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

/** Find a public room with available space (< 10 players) */
function findPublicRoom() {
  for (const room of rooms.values()) {
    if (room.settings.isPublic && room.playerCount() < 10 && !room.game) {
      return room;
    }
  }
  return null;
}

/** Ensure a room code is unique */
function createUniqueRoomCode() {
  let code;
  do { code = generateRoomCode(); } while (rooms.has(code));
  return code;
}

// ── REST endpoints ─────────────────────────────────────────

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

/** List public rooms (for browse page) */
app.get('/api/rooms', (_req, res) => {
  const publicRooms = [];
  for (const room of rooms.values()) {
    if (room.settings.isPublic && !room.game) {
      publicRooms.push({
        roomId: room.roomId,
        playerCount: room.playerCount(),
        maxPlayers: room.settings.maxPlayers,
        settings: room.settings,
      });
    }
  }
  res.json(publicRooms);
});

// ── Socket.IO event handlers ───────────────────────────────

io.on('connection', (socket) => {
  console.log(`[+] Socket connected: ${socket.id}`);

  // ── create_room ──────────────────────────────────────────
  socket.on('create_room', ({ playerName, settings }) => {
    try {
      const roomId = createUniqueRoomCode();
      const playerId = uuidv4();

      const room = new Room(roomId, playerId, settings || {});
      room.io = io;
      rooms.set(roomId, room);

      const player = new Player(playerId, playerName || 'Artist', socket.id);
      player.isHost = true;
      player.isReady = true;
      room.addPlayer(player);

      socket.join(roomId);
      socketToPlayer.set(socket.id, { playerId, roomId });

      socket.emit('room_created', {
        roomId,
        player: player.toJSON(),
        room: room.toJSON(),
      });

      console.log(`[Room] Created ${roomId} by ${playerName}`);
    } catch (err) {
      console.error('[create_room error]', err);
      socket.emit('error', { message: 'Failed to create room' });
    }
  });

  // ── join_room ────────────────────────────────────────────
  socket.on('join_room', ({ roomId, playerName }) => {
    try {
      const upperCode = (roomId || '').toUpperCase().trim();
      const room = rooms.get(upperCode);

      if (!room) {
        socket.emit('join_error', { message: 'Room not found. Check the code!' });
        return;
      }
      if (room.isFull()) {
        socket.emit('join_error', { message: 'Room is full!' });
        return;
      }
      if (room.game && room.game.phase !== Game.PHASE.WAITING) {
        socket.emit('join_error', { message: 'Game already in progress!' });
        return;
      }

      const playerId = uuidv4();
      const player = new Player(playerId, playerName || 'Artist', socket.id);
      room.addPlayer(player);

      socket.join(upperCode);
      socketToPlayer.set(socket.id, { playerId, roomId: upperCode });

      // Tell the new player their info + full room state
      socket.emit('room_joined', {
        roomId: upperCode,
        player: player.toJSON(),
        room: room.toJSON(),
      });

      // Tell everyone else a player joined
      room.broadcastToOthers(socket.id, 'player_joined', {
        player: player.toJSON(),
        players: room.getPlayerList(),
      });

      console.log(`[Room] ${playerName} joined ${upperCode}`);
    } catch (err) {
      console.error('[join_room error]', err);
      socket.emit('error', { message: 'Failed to join room' });
    }
  });

  // ── join_public_room ─────────────────────────────────────
  socket.on('join_public_room', ({ playerName }) => {
    try {
      let room = findPublicRoom();

      if (!room) {
        // Create a new public room
        const roomId = createUniqueRoomCode();
        const hostId = uuidv4();
        room = new Room(roomId, hostId, { isPublic: true });
        room.io = io;
        rooms.set(roomId, room);
      }

      const playerId = uuidv4();
      const player = new Player(playerId, playerName || 'Artist', socket.id);
      // First player in a brand-new room is host
      if (room.playerCount() === 0) {
        player.isHost = true;
        room.hostId = playerId;
      }
      player.isReady = true;
      room.addPlayer(player);

      socket.join(room.roomId);
      socketToPlayer.set(socket.id, { playerId, roomId: room.roomId });

      socket.emit('room_joined', {
        roomId: room.roomId,
        player: player.toJSON(),
        room: room.toJSON(),
      });

      room.broadcastToOthers(socket.id, 'player_joined', {
        player: player.toJSON(),
        players: room.getPlayerList(),
      });

      console.log(`[Room] ${playerName} joined public room ${room.roomId}`);
    } catch (err) {
      console.error('[join_public_room error]', err);
      socket.emit('error', { message: 'Failed to join public room' });
    }
  });

  // ── player_ready ─────────────────────────────────────────
  // ── leave_room ────────────────────────────────────────────
  socket.on('leave_room', () => {
    const meta = socketToPlayer.get(socket.id);
    if (!meta) return;
    socket.leave(meta.roomId);
    // Trigger the same cleanup as disconnect
    const room = rooms.get(meta.roomId);
    if (!room) { socketToPlayer.delete(socket.id); return; }
    const player = room.getPlayerById(meta.playerId);
    const wasHost = player?.isHost;
    room.removePlayer(meta.playerId);
    socketToPlayer.delete(socket.id);
    if (room.isEmpty()) {
      if (room.game) room.game._clearTimers();
      rooms.delete(meta.roomId);
      return;
    }
    if (wasHost) {
      const newHost = room.transferHost(meta.playerId);
      if (newHost) room.broadcast('host_transferred', { newHostId: newHost.id, newHostName: newHost.name });
    }
    room.broadcast('player_left', { playerId: meta.playerId, playerName: player?.name, players: room.getPlayerList() });
  });

  socket.on('player_ready', () => {
    const meta = socketToPlayer.get(socket.id);
    if (!meta) return;
    const room = rooms.get(meta.roomId);
    if (!room) return;
    const player = room.getPlayerById(meta.playerId);
    if (!player) return;

    player.isReady = !player.isReady;
    room.broadcast('players_updated', { players: room.getPlayerList() });
  });

  // ── update_settings ──────────────────────────────────────
  socket.on('update_settings', (newSettings) => {
    const meta = socketToPlayer.get(socket.id);
    if (!meta) return;
    const room = rooms.get(meta.roomId);
    if (!room) return;
    const player = room.getPlayerById(meta.playerId);
    if (!player || !player.isHost) return;

    room.updateSettings(newSettings);
    room.broadcast('settings_updated', { settings: room.settings });
  });

  // ── start_game ───────────────────────────────────────────
  socket.on('start_game', () => {
    const meta = socketToPlayer.get(socket.id);
    if (!meta) return;
    const room = rooms.get(meta.roomId);
    if (!room) return;
    const player = room.getPlayerById(meta.playerId);
    if (!player || !player.isHost) return;
    if (room.playerCount() < 2) {
      socket.emit('error', { message: 'Need at least 2 players to start!' });
      return;
    }

    // Reset all scores
    for (const p of room.players.values()) p.resetScore();

    const game = new Game(room);
    room.game = game;

    room.broadcast('game_starting', { room: room.toJSON() });
    setTimeout(() => game.start(), 1000);
    console.log(`[Game] Started in room ${meta.roomId}`);
  });

  // ── word_chosen ──────────────────────────────────────────
  socket.on('word_chosen', ({ word }) => {
    const meta = socketToPlayer.get(socket.id);
    if (!meta) return;
    const room = rooms.get(meta.roomId);
    if (!room || !room.game) return;
    room.game.wordChosen(meta.playerId, word);
  });

  // ── draw_start ───────────────────────────────────────────
  socket.on('draw_start', (data) => {
    const meta = socketToPlayer.get(socket.id);
    if (!meta) return;
    const room = rooms.get(meta.roomId);
    if (!room || !room.game) return;
    if (!room.game.isDrawer(meta.playerId)) return;

    const stroke = { type: 'start', ...data };
    room.game.addStroke(stroke);
    room.broadcastToOthers(socket.id, 'draw_data', stroke);
  });

  // ── draw_move ────────────────────────────────────────────
  socket.on('draw_move', (data) => {
    const meta = socketToPlayer.get(socket.id);
    if (!meta) return;
    const room = rooms.get(meta.roomId);
    if (!room || !room.game) return;
    if (!room.game.isDrawer(meta.playerId)) return;

    const stroke = { type: 'move', ...data };
    room.game.addStroke(stroke);
    room.broadcastToOthers(socket.id, 'draw_data', stroke);
  });

  // ── draw_end ─────────────────────────────────────────────
  socket.on('draw_end', () => {
    const meta = socketToPlayer.get(socket.id);
    if (!meta) return;
    const room = rooms.get(meta.roomId);
    if (!room || !room.game) return;
    if (!room.game.isDrawer(meta.playerId)) return;

    const stroke = { type: 'end' };
    room.game.addStroke(stroke);
    room.broadcastToOthers(socket.id, 'draw_data', stroke);
  });

  // ── canvas_clear ─────────────────────────────────────────
  socket.on('canvas_clear', () => {
    const meta = socketToPlayer.get(socket.id);
    if (!meta) return;
    const room = rooms.get(meta.roomId);
    if (!room || !room.game) return;
    if (!room.game.isDrawer(meta.playerId)) return;

    room.game.clearCanvas();
    room.broadcast('canvas_clear', {});
  });

  // ── fill_action ───────────────────────────────────────────
  socket.on('fill_action', ({ x, y, color }) => {
    const meta = socketToPlayer.get(socket.id);
    if (!meta) return;
    const room = rooms.get(meta.roomId);
    if (!room || !room.game) return;
    if (!room.game.isDrawer(meta.playerId)) return;

    const stroke = { type: 'fill', x, y, color };
    room.game.addStroke(stroke);
    room.broadcastToOthers(socket.id, 'draw_data', stroke);
  });

  // ── draw_undo ────────────────────────────────────────────
  socket.on('draw_undo', () => {
    const meta = socketToPlayer.get(socket.id);
    if (!meta) return;
    const room = rooms.get(meta.roomId);
    if (!room || !room.game) return;
    if (!room.game.isDrawer(meta.playerId)) return;

    room.game.undoLastStroke();
    // Send full stroke replay so all clients redraw
    room.broadcast('canvas_replay', { strokes: room.game.strokes });
  });

  // ── guess ─────────────────────────────────────────────────
  socket.on('guess', ({ text }) => {
    const meta = socketToPlayer.get(socket.id);
    if (!meta) return;
    const room = rooms.get(meta.roomId);
    if (!room || !room.game) return;

    const player = room.getPlayerById(meta.playerId);
    if (!player) return;

    const result = room.game.checkGuess(text, meta.playerId);

    if (result && result.correct) {
      room.broadcast('guess_result', {
        correct: true,
        playerId: meta.playerId,
        playerName: player.name,
        points: result.points,
        players: room.getPlayerList(),
      });
    } else {
      // Show as chat (wrong guess visible to all)
      room.broadcast('chat_message', {
        playerId: meta.playerId,
        playerName: player.name,
        text,
        type: 'guess',
      });
    }
  });

  // ── chat ──────────────────────────────────────────────────
  socket.on('chat', ({ text }) => {
    const meta = socketToPlayer.get(socket.id);
    if (!meta) return;
    const room = rooms.get(meta.roomId);
    if (!room) return;
    const player = room.getPlayerById(meta.playerId);
    if (!player) return;

    // Prevent drawer from guessing their own word via chat
    if (room.game && room.game.isDrawer(meta.playerId)) return;

    room.broadcast('chat_message', {
      playerId: meta.playerId,
      playerName: player.name,
      text,
      type: 'chat',
    });
  });

  // ── request_game_state ────────────────────────────────────
  // Called when a player refreshes / reconnects
  socket.on('request_game_state', () => {
    const meta = socketToPlayer.get(socket.id);
    if (!meta) return;
    const room = rooms.get(meta.roomId);
    if (!room) return;

    socket.emit('game_state', {
      room: room.toJSON(),
      game: room.game ? room.game.toStateJSON() : null,
      strokes: room.game ? room.game.strokes : [],
    });
  });

  // ── disconnect ────────────────────────────────────────────
  socket.on('disconnect', () => {
    const meta = socketToPlayer.get(socket.id);
    if (!meta) return;

    socketToPlayer.delete(socket.id);

    const room = rooms.get(meta.roomId);
    if (!room) return;

    const player = room.getPlayerById(meta.playerId);
    const wasHost = player?.isHost;

    room.removePlayer(meta.playerId);
    console.log(`[-] ${player?.name || 'Unknown'} left room ${meta.roomId}`);

    if (room.isEmpty()) {
      // Clean up empty rooms
      if (room.game) room.game._clearTimers();
      rooms.delete(meta.roomId);
      console.log(`[Room] Deleted empty room ${meta.roomId}`);
      return;
    }

    // Transfer host if needed
    if (wasHost) {
      const newHost = room.transferHost(meta.playerId);
      if (newHost) {
        room.broadcast('host_transferred', { newHostId: newHost.id, newHostName: newHost.name });
      }
    }

    room.broadcast('player_left', {
      playerId: meta.playerId,
      playerName: player?.name,
      players: room.getPlayerList(),
    });
  });
});

// ── Start listening ────────────────────────────────────────
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🎨 Doodlz server running on port ${PORT}`);
});
