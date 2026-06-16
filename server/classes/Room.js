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
    };
  }
}

module.exports = Room;
