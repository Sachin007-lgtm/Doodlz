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
  socket.on('create_room', ({ playerName, avatarSeed, settings }) => {
    try {
      const roomId = createUniqueRoomCode();
      const playerId = uuidv4();

      const room = new Room(roomId, playerId, settings || {});
      room.io = io;
      rooms.set(roomId, room);

      const player = new Player(playerId, playerName || 'Artist', socket.id, avatarSeed);
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
  socket.on('join_room', ({ roomId, playerName, avatarSeed, isSpectator }) => {
    try {
      const upperCode = (roomId || '').toUpperCase().trim();
      const room = rooms.get(upperCode);

      if (!room) {
        socket.emit('join_error', { message: 'Room not found. Check the code!' });
        return;
      }

      const ip = socket.handshake.address;
      if (room.isBanned(playerName, ip)) {
        socket.emit('join_error', { message: 'You are banned from this room!' });
        return;
      }

      let forceSpectator = false;
      if (room.game && room.game.phase !== Game.PHASE.WAITING) {
        forceSpectator = true;
      }

      if (room.isFull() && !forceSpectator && !isSpectator) {
        socket.emit('join_error', { message: 'Room is full!' });
        return;
      }

      const finalIsSpectator = !!(isSpectator || forceSpectator);
      const playerId = uuidv4();
      const player = new Player(playerId, playerName || 'Artist', socket.id, avatarSeed, finalIsSpectator);
      room.addPlayer(player);

      socket.join(upperCode);
      socketToPlayer.set(socket.id, { playerId, roomId: upperCode });

      // Tell the new player their info + full room state
      let gameStateData = null;
      if (room.game && room.game.phase !== Game.PHASE.WAITING) {
        gameStateData = {
          phase: room.game.phase,
          currentRound: room.game.currentRound,
          totalRounds: room.game.totalRounds,
          currentDrawerId: room.game.currentDrawerId,
          drawerName: room.getPlayerById(room.game.currentDrawerId)?.name || 'Artist',
          timeLeft: room.game.timeLeft,
          hint: room.game.getHintDisplay(),
          blankWord: room.game._makeBlank(room.game.currentWord || ''),
          currentWord: room.game.currentWord,
        };
      }

      socket.emit('room_joined', {
        roomId: upperCode,
        player: player.toJSON(),
        room: room.toJSON(),
        gameState: gameStateData,
      });

      // Tell everyone else a player joined
      room.broadcastToOthers(socket.id, 'player_joined', {
        player: player.toJSON(),
        players: room.getPlayerList(),
      });

      if (forceSpectator) {
        room.broadcast('chat_message', {
          playerId: 'system',
          playerName: 'System',
          text: `${player.name} joined as a spectator because the game is in progress.`,
          type: 'system'
        });
      }

      console.log(`[Room] ${playerName} joined ${upperCode} (Spectator: ${finalIsSpectator})`);
    } catch (err) {
      console.error('[join_room error]', err);
      socket.emit('error', { message: 'Failed to join room' });
    }
  });

  // ── join_public_room ─────────────────────────────────────
  socket.on('join_public_room', ({ playerName, avatarSeed, isSpectator }) => {
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
      const player = new Player(playerId, playerName || 'Artist', socket.id, avatarSeed, !!isSpectator);
      // First player in a brand-new room is host
      if (room.playerCount() === 0) {
        player.isHost = true;
        room.hostId = playerId;
        player.isSpectator = false; // Host shouldn't be spectator initially
      }
      player.isReady = !player.isSpectator;
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

      console.log(`[Room] ${playerName} joined public room ${room.roomId} (Spectator: ${player.isSpectator})`);
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

  // ── request_canvas_history ────────────────────────────────
  socket.on('request_canvas_history', () => {
    const meta = socketToPlayer.get(socket.id);
    if (!meta) return;
    const room = rooms.get(meta.roomId);
    if (room && room.game) {
      socket.emit('canvas_replay', { strokes: room.game.strokes });
    }
  });

  // ── guess ─────────────────────────────────────────────────
  socket.on('guess', ({ text }) => {
    const meta = socketToPlayer.get(socket.id);
    if (!meta) return;
    const room = rooms.get(meta.roomId);
    if (!room || !room.game) return;

    const player = room.getPlayerById(meta.playerId);
    if (!player) return;

    if (player.isSpectator) {
      // Spectator typing: treat as chat but prevent spoilers
      if (room.game.phase === Game.PHASE.DRAWING) {
        const wordNormalized = (room.game.currentWord || '').trim().toLowerCase();
        const textNormalized = text.trim().toLowerCase();
        if (textNormalized.includes(wordNormalized)) {
          socket.emit('error', { message: 'No spoilers! Spectators cannot guess the secret word in chat.' });
          return;
        }
      }
      room.broadcast('chat_message', {
        playerId: meta.playerId,
        playerName: `[Spec] ${player.name}`,
        text,
        type: 'chat',
      });
      return;
    }

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

      if (result && result.isClose) {
        socket.emit('chat_message', {
          id: Date.now() + Math.random(),
          playerId: 'system',
          playerName: 'System',
          text: `⚠️ "${text}" is very close!`,
          type: 'system',
        });
      }
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

    // Prevent spectator spoilers
    if (player.isSpectator && room.game && room.game.phase === Game.PHASE.DRAWING) {
      const wordNormalized = (room.game.currentWord || '').trim().toLowerCase();
      const textNormalized = text.trim().toLowerCase();
      if (textNormalized.includes(wordNormalized)) {
        socket.emit('error', { message: 'No spoilers! Spectators cannot guess the secret word in chat.' });
        return;
      }
    }

    room.broadcast('chat_message', {
      playerId: meta.playerId,
      playerName: player.isSpectator ? `[Spec] ${player.name}` : player.name,
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

    const player = room.getPlayerById(meta.playerId);
    const isSpec = player ? player.isSpectator : false;

    socket.emit('game_state', {
      room: room.toJSON(),
      game: room.game ? room.game.toStateJSON(isSpec) : null,
      strokes: room.game ? room.game.strokes : [],
    });
  });

  // ── toggle_spectator ──────────────────────────────────────
  socket.on('toggle_spectator', () => {
    const meta = socketToPlayer.get(socket.id);
    if (!meta) return;
    const room = rooms.get(meta.roomId);
    if (!room) return;
    const player = room.getPlayerById(meta.playerId);
    if (!player) return;

    player.isSpectator = !player.isSpectator;
    player.isReady = false; // Reset ready status on switch

    // If host toggles spectator, transfer host if there are other players
    if (player.isSpectator && player.isHost) {
      // Transfer host role to another non-spectator player if possible
      const newHost = room.transferHost(player.id);
      player.isHost = false; // Host transferred
      if (newHost) {
        room.broadcast('host_transferred', { newHostId: newHost.id, newHostName: newHost.name });
      }
    }

    // Mid-game spectator toggle logic
    if (room.game && room.game.phase !== Game.PHASE.WAITING) {
      if (player.isSpectator) {
        room.game.drawQueue = room.game.drawQueue.filter(id => id !== player.id);
        room.broadcast('chat_message', {
          playerId: 'system',
          playerName: 'System',
          text: `⚠️ ${player.name} has switched to spectating.`,
          type: 'system'
        });
        if (room.game.currentDrawerId === player.id) {
          room.broadcast('chat_message', {
            playerId: 'system',
            playerName: 'System',
            text: `Ending round early since the drawer left the active queue.`,
            type: 'system'
          });
          room.game._endRound();
        }
      } else {
        if (!room.game.drawQueue.includes(player.id)) {
          room.game.drawQueue.push(player.id);
          room.broadcast('chat_message', {
            playerId: 'system',
            playerName: 'System',
            text: `🎮 ${player.name} is now playing.`,
            type: 'system'
          });
        }
      }
    }

    room.broadcast('players_updated', { players: room.getPlayerList() });
  });

  // ── kick_player ──────────────────────────────────────────
  socket.on('kick_player', ({ targetPlayerId }) => {
    const meta = socketToPlayer.get(socket.id);
    if (!meta) return;
    const room = rooms.get(meta.roomId);
    if (!room) return;
    const sender = room.getPlayerById(meta.playerId);
    if (!sender || !sender.isHost) return;

    const target = room.getPlayerById(targetPlayerId);
    if (!target) return;

    const targetSocket = io.sockets.sockets.get(target.socketId);
    if (targetSocket) {
      targetSocket.emit('kicked', { message: 'You have been kicked by the host.' });
      targetSocket.leave(room.roomId);
    }

    room.removePlayer(targetPlayerId);
    room.broadcast('player_left', {
      playerId: targetPlayerId,
      playerName: target.name,
      players: room.getPlayerList()
    });
    room.broadcast('chat_message', {
      playerId: 'system',
      playerName: 'System',
      text: `🚨 ${target.name} was kicked by the host.`,
      type: 'system'
    });
  });

  // ── ban_player ───────────────────────────────────────────
  socket.on('ban_player', ({ targetPlayerId }) => {
    const meta = socketToPlayer.get(socket.id);
    if (!meta) return;
    const room = rooms.get(meta.roomId);
    if (!room) return;
    const sender = room.getPlayerById(meta.playerId);
    if (!sender || !sender.isHost) return;

    const target = room.getPlayerById(targetPlayerId);
    if (!target) return;

    const targetSocket = io.sockets.sockets.get(target.socketId);
    const ip = targetSocket ? targetSocket.handshake.address : '';
    room.ban(target.name, ip);

    if (targetSocket) {
      targetSocket.emit('banned', { message: 'You have been banned by the host.' });
      targetSocket.leave(room.roomId);
    }

    room.removePlayer(targetPlayerId);
    room.broadcast('player_left', {
      playerId: targetPlayerId,
      playerName: target.name,
      players: room.getPlayerList()
    });
    room.broadcast('chat_message', {
      playerId: 'system',
      playerName: 'System',
      text: `🚨 ${target.name} was banned by the host.`,
      type: 'system'
    });
  });

  // ── votekick_player ──────────────────────────────────────
  socket.on('votekick_player', ({ targetPlayerId }) => {
    const meta = socketToPlayer.get(socket.id);
    if (!meta) return;
    const room = rooms.get(meta.roomId);
    if (!room) return;
    const initiator = room.getPlayerById(meta.playerId);
    const target = room.getPlayerById(targetPlayerId);
    if (!initiator || !target || initiator.isSpectator || target.id === initiator.id) return;

    // Enforce minimum player requirement (at least 3 players)
    const activePlayers = Array.from(room.players.values()).filter(p => !p.isSpectator);
    if (activePlayers.length < 3) {
      socket.emit('error', { message: 'Votekick requires at least 3 players in the room.' });
      return;
    }

    const success = room.startVotekick(targetPlayerId, initiator.id);
    if (success) {
      room.broadcast('votekick_started', {
        targetId: targetPlayerId,
        targetName: target.name,
        initiatorName: initiator.name,
        votesCount: 1,
        requiredVotes: room.votekick.requiredVotes,
        expiresAt: room.votekick.expiresAt
      });
      room.broadcast('chat_message', {
        playerId: 'system',
        playerName: 'System',
        text: `🗳️ Votekick started against ${target.name} by ${initiator.name} (1/${room.votekick.requiredVotes} votes).`,
        type: 'system'
      });

      // Clear existing timer if any
      if (room.votekickTimer) clearTimeout(room.votekickTimer);

      // Set a timer to clear the vote after 30s
      room.votekickTimer = setTimeout(() => {
        if (room.votekick && room.votekick.targetId === targetPlayerId) {
          room.clearVotekick();
          room.broadcast('votekick_cleared');
          room.broadcast('chat_message', {
            playerId: 'system',
            playerName: 'System',
            text: `🗳️ Votekick against ${target.name} has expired.`,
            type: 'system'
          });
        }
      }, 30000);
    }
  });

  // ── vote_kick ────────────────────────────────────────────
  socket.on('vote_kick', ({ vote }) => {
    const meta = socketToPlayer.get(socket.id);
    if (!meta) return;
    const room = rooms.get(meta.roomId);
    if (!room || !room.votekick) return;
    const voter = room.getPlayerById(meta.playerId);
    if (!voter || voter.isSpectator || voter.id === room.votekick.targetId) return;

    const result = room.castVotekick(voter.id, vote);
    if (result) {
      if (result.kicked) {
        // Clear the timer
        if (room.votekickTimer) clearTimeout(room.votekickTimer);

        const target = room.getPlayerById(result.targetId);
        if (target) {
          const targetSocket = io.sockets.sockets.get(target.socketId);
          if (targetSocket) {
            targetSocket.emit('kicked', { message: 'You have been kicked via community vote.' });
            targetSocket.leave(room.roomId);
          }
          room.removePlayer(result.targetId);
          room.broadcast('votekick_cleared');
          room.broadcast('player_left', {
            playerId: result.targetId,
            playerName: target.name,
            players: room.getPlayerList()
          });
          room.broadcast('chat_message', {
            playerId: 'system',
            playerName: 'System',
            text: `🚨 ${target.name} was kicked via vote.`,
            type: 'system'
          });
        }
      } else if (result.failed) {
        // Clear the timer
        if (room.votekickTimer) clearTimeout(room.votekickTimer);

        const target = room.getPlayerById(result.targetId);
        room.broadcast('votekick_cleared');
        room.broadcast('chat_message', {
          playerId: 'system',
          playerName: 'System',
          text: `🗳️ Votekick against ${target ? target.name : 'player'} failed due to insufficient support.`,
          type: 'system'
        });
      } else {
        const target = room.getPlayerById(room.votekick?.targetId);
        room.broadcast('votekick_updated', {
          targetId: room.votekick?.targetId,
          targetName: target?.name,
          votesCount: result.currentVotes,
          requiredVotes: result.requiredVotes
        });
      }
    }
  });

  // ── report_player ────────────────────────────────────────
  socket.on('report_player', ({ targetPlayerId, reason }) => {
    const meta = socketToPlayer.get(socket.id);
    if (!meta) return;
    const room = rooms.get(meta.roomId);
    if (!room) return;
    const reporter = room.getPlayerById(meta.playerId);
    const target = room.getPlayerById(targetPlayerId);
    if (!reporter || !target) return;

    target.reporters = target.reporters || new Set();
    if (target.reporters.has(reporter.id)) {
      socket.emit('error', { message: 'You have already reported this player.' });
      return;
    }
    target.reporters.add(reporter.id);
    target.reportCount = (target.reportCount || 0) + 1;

    room.broadcast('chat_message', {
      playerId: 'system',
      playerName: 'System',
      text: `⚠️ ${reporter.name} reported ${target.name} for: "${reason || 'unspecified behavior'}"`,
      type: 'system'
    });

    // Auto-kick if reports count >= 3
    if (target.reportCount >= 3) {
      const targetSocket = io.sockets.sockets.get(target.socketId);
      if (targetSocket) {
        targetSocket.emit('kicked', { message: 'You have been auto-kicked due to receiving multiple reports.' });
        targetSocket.leave(room.roomId);
      }
      room.removePlayer(targetPlayerId);
      room.broadcast('player_left', {
        playerId: targetPlayerId,
        playerName: target.name,
        players: room.getPlayerList()
      });
      room.broadcast('chat_message', {
        playerId: 'system',
        playerName: 'System',
        text: `🚨 ${target.name} was auto-kicked after receiving 3 community reports.`,
        type: 'system'
      });
    }
  });

  // ── request_last_round_replay ────────────────────────────
  socket.on('request_last_round_replay', () => {
    const meta = socketToPlayer.get(socket.id);
    if (!meta) return;
    const room = rooms.get(meta.roomId);
    if (!room) return;

    if (room.lastRoundStrokes) {
      socket.emit('last_round_replay', room.lastRoundStrokes);
    } else {
      socket.emit('error', { message: 'No replay available yet. Finish a round first!' });
    }
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
