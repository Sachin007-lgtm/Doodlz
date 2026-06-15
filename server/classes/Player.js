// ============================================================
//  Player class — represents a single connected player
// ============================================================

class Player {
  constructor(id, name, socketId) {
    this.id = id;               // stable uuid
    this.name = name;           // display name
    this.socketId = socketId;   // current socket connection
    this.score = 0;
    this.roundScore = 0;        // points earned this round
    this.isReady = false;
    this.isHost = false;
    this.hasGuessedCorrectly = false;
    this.guessedAt = null;      // timestamp for scoring
    // DiceBear seed — random noun for unique avatar
    this.avatarSeed = name + Math.floor(Math.random() * 9999);
    this.color = Player.COLORS[Math.floor(Math.random() * Player.COLORS.length)];
  }

  addPoints(pts) {
    this.score += pts;
    this.roundScore += pts;
  }

  resetRound() {
    this.roundScore = 0;
    this.hasGuessedCorrectly = false;
    this.guessedAt = null;
  }

  resetScore() {
    this.score = 0;
    this.roundScore = 0;
    this.hasGuessedCorrectly = false;
    this.guessedAt = null;
    this.isReady = false;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      socketId: this.socketId,
      score: this.score,
      isReady: this.isReady,
      isHost: this.isHost,
      hasGuessedCorrectly: this.hasGuessedCorrectly,
      avatarSeed: this.avatarSeed,
      color: this.color,
    };
  }
}

Player.COLORS = [
  '#5b3cdd', '#0c6780', '#e9c400', '#00FA9A', '#ba1a1a',
  '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7',
];

module.exports = Player;
