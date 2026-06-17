// ============================================================
//  Room class — manages players and room settings
// ============================================================

class Room {
  constructor(roomId, hostId, settings = {}) {
    this.roomId = roomId;
    this.hostId = hostId;
    this.players = new Map();   // playerId → Player
    this.settings = {
      maxPlayers: settings.maxPlayers || 8,
      rounds: settings.rounds || 3,
      drawTime: settings.drawTime || 60,
      wordCount: settings.wordCount || 3,
      isPublic: settings.isPublic !== undefined ? settings.isPublic : true,
      wordMode: settings.wordMode || 'standard',
      language: settings.language || 'English',
      gameMode: settings.gameMode || 'Normal',
      hints: settings.hints !== undefined ? settings.hints : 2,
      customWords: settings.customWords || '',
    };
    this.game = null;           // set by Game class
    this.createdAt = Date.now();
    this.io = null;             // injected by server
    this.bannedPlayers = new Set(); // store { name, ip }
    this.votekick = null; // { targetId, votes: Set, requiredVotes, expiresAt }
    this.lastRoundStrokes = null; // store last round strokes for replay
  }

  // ── Moderation & Bans ──────────────────────────────────────
  isBanned(name, ip) {
    const normName = (name || '').trim().toLowerCase();
    for (const b of this.bannedPlayers) {
      if (b.name === normName || b.ip === ip) return true;
    }
    return false;
  }

  ban(name, ip) {
    this.bannedPlayers.add({ name: (name || '').trim().toLowerCase(), ip });
  }

  // ── Votekick ───────────────────────────────────────────────
  startVotekick(targetId, initiatorId) {
    // Check if there is an active valid votekick
    if (this.votekick && this.votekick.expiresAt > Date.now()) {
      return false;
    }

    const nonTargetPlayers = Array.from(this.players.values()).filter(p => p.id !== targetId && !p.isSpectator);
    // Required votes: majority of non-target active players
    const requiredVotes = Math.max(1, Math.floor(nonTargetPlayers.length / 2) + 1);

    this.votekick = {
      targetId,
      yesVotes: new Set([initiatorId]),
      noVotes: new Set(),
      requiredVotes,
      expiresAt: Date.now() + 30000, // 30 seconds
    };
    return true;
  }

  castVotekick(voterId, vote) {
    if (!this.votekick || this.votekick.expiresAt < Date.now()) {
      this.votekick = null;
      return null;
    }

    const targetId = this.votekick.targetId;

    if (vote === 'yes') {
      this.votekick.yesVotes.add(voterId);
      this.votekick.noVotes.delete(voterId);
    } else if (vote === 'no') {
      this.votekick.noVotes.add(voterId);
      this.votekick.yesVotes.delete(voterId);
    }

    // Recalculate required votes in case players left
    const nonTargetPlayers = Array.from(this.players.values()).filter(p => p.id !== targetId && !p.isSpectator);
    this.votekick.requiredVotes = Math.max(1, Math.floor(nonTargetPlayers.length / 2) + 1);

    if (this.votekick.yesVotes.size >= this.votekick.requiredVotes) {
      this.votekick = null;
      return { kicked: true, targetId };
    }

    // If yes votes cannot possibly reach required due to no votes, end early
    const maxPossibleYes = nonTargetPlayers.length - this.votekick.noVotes.size;
    if (maxPossibleYes < this.votekick.requiredVotes) {
      this.votekick = null;
      return { kicked: false, failed: true, targetId };
    }

    return { kicked: false, failed: false, currentVotes: this.votekick.yesVotes.size, requiredVotes: this.votekick.requiredVotes };
  }

  clearVotekick() {
    this.votekick = null;
  }

  // ── Player management ──────────────────────────────────────

  addPlayer(player) {
    this.players.set(player.id, player);
  }

  removePlayer(playerId) {
    this.players.delete(playerId);
  }

  getPlayerBySocketId(socketId) {
    for (const p of this.players.values()) {
      if (p.socketId === socketId) return p;
    }
    return null;
  }

  getPlayerById(playerId) {
    return this.players.get(playerId) || null;
  }

  getPlayerList() {
    return Array.from(this.players.values()).map(p => p.toJSON());
  }

  isFull() {
    return this.players.size >= this.settings.maxPlayers;
  }

  isEmpty() {
    return this.players.size === 0;
  }

  playerCount() {
    return this.players.size;
  }

  // Transfer host to next available player after host leaves
  transferHost(excludePlayerId) {
    for (const p of this.players.values()) {
      if (p.id !== excludePlayerId) {
        p.isHost = true;
        this.hostId = p.id;
        return p;
      }
    }
    return null;
  }

  updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
  }

  // ── Broadcasting ───────────────────────────────────────────

  broadcast(event, data) {
    if (this.io) {
      this.io.to(this.roomId).emit(event, data);
    }
  }

  broadcastToOthers(socketId, event, data) {
    if (this.io) {
      this.io.to(this.roomId).except(socketId).emit(event, data);
    }
  }

  // ── Serialization ──────────────────────────────────────────

  toJSON() {
    return {
      roomId: this.roomId,
      hostId: this.hostId,
      settings: this.settings,
      players: this.getPlayerList(),
      playerCount: this.players.size,
      hasReplay: !!this.lastRoundStrokes,
    };
  }
}

module.exports = Room;
