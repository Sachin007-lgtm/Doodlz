// ============================================================
//  Game class — manages round logic, scoring, timers, hints
// ============================================================

const { getRandomWords } = require('../words');

const PHASE = {
  WAITING: 'waiting',
  WORD_SELECTION: 'word_selection',
  DRAWING: 'drawing',
  ROUND_END: 'round_end',
  GAME_OVER: 'game_over',
};

class Game {
  constructor(room) {
    this.room = room;
    this.phase = PHASE.WAITING;
    this.currentRound = 0;
    this.totalRounds = room.settings.rounds;
    this.drawTime = room.settings.drawTime;
    this.wordCount = room.settings.wordCount;

    // Turn management
    this.drawQueue = [];        // ordered list of playerIds
    this.currentDrawerIndex = 0;
    this.currentDrawerId = null;

    // Word state
    this.currentWord = null;
    this.wordOptions = [];
    this.revealedIndices = new Set(); // which letter positions are revealed
    this.hintIntervals = [];

    // Timer
    this.timerInterval = null;
    this.timeLeft = 0;
    this.wordChoiceTimeout = null;

    // Drawing strokes for late-join replay
    this.strokes = [];          // [{type, x, y, color, size, tool}]
    this.currentStroke = null;

    // Scores
    this.correctGuessCount = 0; // how many guessed this round
  }

  // ── Game lifecycle ─────────────────────────────────────────

  start() {
    // Build draw queue from current players (excluding spectators)
    this.drawQueue = Array.from(this.room.players.values())
      .filter(p => !p.isSpectator)
      .map(p => p.id);
    this.currentRound = 1;
    this.currentDrawerIndex = 0;
    this._startTurn();
  }

  _startTurn() {
    // Reset all players for new round
    for (const p of this.room.players.values()) p.resetRound();
    this.correctGuessCount = 0;
    this.strokes = [];
    this.revealedIndices = new Set();
    this.currentWord = null;
    // Auto-clear canvas for everyone at start of each turn
    this.room.broadcast('canvas_clear', {});

    this.currentDrawerId = this.drawQueue[this.currentDrawerIndex];
    const drawer = this.room.getPlayerById(this.currentDrawerId);
    if (!drawer) {
      this._nextDrawer();
      return;
    }

    this.phase = PHASE.WORD_SELECTION;
    
    let choices = [];
    const settings = this.room.settings || {};
    if (settings.wordMode === 'custom' && settings.customWords) {
      const customPool = settings.customWords
        .split(',')
        .map(w => w.trim())
        .filter(w => w.length > 0);
      if (customPool.length > 0) {
        const shuffledCustom = [...customPool].sort(() => Math.random() - 0.5);
        choices = shuffledCustom.slice(0, this.wordCount);
      }
    }

    if (choices.length === 0) {
      choices = getRandomWords(this.wordCount);
    } else if (choices.length < this.wordCount) {
      const extraCount = this.wordCount - choices.length;
      const standardExtra = getRandomWords(extraCount * 2)
        .filter(w => !choices.includes(w))
        .slice(0, extraCount);
      choices = [...choices, ...standardExtra];
    }
    this.wordOptions = choices;

    // Send word choices only to drawer
    const drawerSocket = drawer.socketId;
    if (this.room.io) {
      this.room.io.to(drawerSocket).emit('round_start', {
        round: this.currentRound,
        totalRounds: this.totalRounds,
        drawerId: this.currentDrawerId,
        drawerName: drawer.name,
        wordOptions: this.wordOptions,
        drawTime: this.drawTime,
      });

      // Broadcast to others (no word options)
      this.room.broadcast('round_start', {
        round: this.currentRound,
        totalRounds: this.totalRounds,
        drawerId: this.currentDrawerId,
        drawerName: drawer.name,
        wordOptions: null,
        wordLength: null,
        drawTime: this.drawTime,
      });

      // Actually send drawer-specific after broadcast (it will overwrite for drawer)
      this.room.io.to(drawerSocket).emit('round_start', {
        round: this.currentRound,
        totalRounds: this.totalRounds,
        drawerId: this.currentDrawerId,
        drawerName: drawer.name,
        wordOptions: this.wordOptions,
        drawTime: this.drawTime,
      });
    }

    // Auto-pick word if drawer doesn't choose in 15s
    this.wordChoiceTimeout = setTimeout(() => {
      if (this.phase === PHASE.WORD_SELECTION) {
        this.wordChosen(this.currentDrawerId, this.wordOptions[0]);
      }
    }, 15000);
  }

  wordChosen(drawerId, word) {
    if (this.phase !== PHASE.WORD_SELECTION) return;
    if (drawerId !== this.currentDrawerId) return;

    clearTimeout(this.wordChoiceTimeout);
    this.currentWord = word;
    this.phase = PHASE.DRAWING;
    this.timeLeft = this.drawTime;

    const blankWord = this._makeBlank(word);

    // Tell everyone the word length (blanks) or actual word (if spectator/drawer)
    if (this.room.io) {
      for (const p of this.room.players.values()) {
        const isDrawer = (p.id === this.currentDrawerId);
        const isSpectator = p.isSpectator;
        if (isDrawer || isSpectator) {
          this.room.io.to(p.socketId).emit('word_chosen', {
            word: this.currentWord,
            blank: blankWord,
            drawTime: this.drawTime,
          });
        } else {
          this.room.io.to(p.socketId).emit('word_chosen', {
            word: null,
            blank: blankWord,
            drawTime: this.drawTime,
          });
        }
      }
    }

    // Start countdown timer
    this._startTimer();

    // Schedule hints
    this._scheduleHints();
  }

  _startTimer() {
    this.timerInterval = setInterval(() => {
      this.timeLeft--;
      this.room.broadcast('timer_tick', { timeLeft: this.timeLeft });

      if (this.timeLeft <= 0) {
        this._endRound();
      }
    }, 1000);
  }

  _scheduleHints() {
    const word = this.currentWord;
    if (!word) return;

    const chars = word.split('');
    const revealableIndices = chars
      .map((c, i) => (c !== ' ' ? i : null))
      .filter(i => i !== null);

    // Shuffle revealable positions
    const shuffled = [...revealableIndices].sort(() => Math.random() - 0.5);
    const maxHints = Math.min(2, Math.floor(shuffled.length / 2));

    for (let h = 0; h < maxHints; h++) {
      const delay = Math.floor((this.drawTime * 1000 * (h + 1)) / (maxHints + 1));
      const idx = shuffled[h];
      const t = setTimeout(() => {
        if (this.phase !== PHASE.DRAWING) return;
        this.revealedIndices.add(idx);
        const hint = this._makeHintDisplay();
        this.room.broadcast('hint_reveal', { hint, letter: word[idx], index: idx });
      }, delay);
      this.hintIntervals.push(t);
    }
  }

  _endRound() {
    this._clearTimers();
    this.phase = PHASE.ROUND_END;

    // Save stroke data for replay
    this.room.lastRoundStrokes = {
      word: this.currentWord,
      drawerId: this.currentDrawerId,
      drawerName: this.room.getPlayerById(this.currentDrawerId)?.name || 'Artist',
      strokes: [...this.strokes]
    };

    // Drawer gets points for each correct guesser
    const drawerBonus = this.correctGuessCount * 50;
    const drawer = this.room.getPlayerById(this.currentDrawerId);
    if (drawer) drawer.addPoints(drawerBonus);

    const scores = this.room.getPlayerList().map(p => ({
      id: p.id,
      name: p.name,
      score: p.score,
      roundScore: this.room.players.get(p.id)?.roundScore || 0,
    }));

    this.room.broadcast('round_end', {
      word: this.currentWord,
      scores,
      drawerBonus,
      drawerId: this.currentDrawerId,
    });

    // Move to next after 5s
    setTimeout(() => this._nextDrawer(), 5000);
  }

  _nextDrawer() {
    this.currentDrawerIndex++;

    // If all players in this round have drawn, go to next round
    if (this.currentDrawerIndex >= this.drawQueue.length) {
      this.currentRound++;
      this.currentDrawerIndex = 0;

      if (this.currentRound > this.totalRounds) {
        this._endGame();
        return;
      }
    }

    this._startTurn();
  }

  _endGame() {
    this._clearTimers();
    this.phase = PHASE.GAME_OVER;

    const leaderboard = this.room.getPlayerList()
      .sort((a, b) => b.score - a.score);

    const winner = leaderboard[0] || null;

    this.room.broadcast('game_over', {
      winner,
      leaderboard,
    });
  }

  // ── Guessing ───────────────────────────────────────────────

  checkGuess(text, playerId) {
    if (this.phase !== PHASE.DRAWING) return false;
    if (playerId === this.currentDrawerId) return false;

    const player = this.room.getPlayerById(playerId);
    if (!player || player.hasGuessedCorrectly || player.isSpectator) return false;

    const normalized = text.trim().toLowerCase();
    const wordNormalized = (this.currentWord || '').trim().toLowerCase();

    if (normalized === wordNormalized) {
      // Award points — diminishing by order of guessing
      const basePoints = 300;
      const penalty = this.correctGuessCount * 20;
      const timeBonus = Math.floor((this.timeLeft / this.drawTime) * 100);
      const pts = Math.max(50, basePoints - penalty + timeBonus);

      player.addPoints(pts);
      player.hasGuessedCorrectly = true;
      player.guessedAt = Date.now();
      this.correctGuessCount++;

      // If all non-drawers guessed, end round early
      const nonDrawers = Array.from(this.room.players.values()).filter(
        p => p.id !== this.currentDrawerId && !p.isSpectator
      );
      const allGuessed = nonDrawers.every(p => p.hasGuessedCorrectly);
      if (allGuessed) {
        setTimeout(() => this._endRound(), 2000);
      }

      return { correct: true, points: pts };
    }

    // Levenshtein distance helper
    const getLevenshteinDistance = (a, b) => {
      const tmp = [];
      let i, j;
      for (i = 0; i <= a.length; i++) tmp[i] = [i];
      for (j = 0; j <= b.length; j++) tmp[0][j] = j;
      for (i = 1; i <= a.length; i++) {
        for (j = 1; j <= b.length; j++) {
          tmp[i][j] = Math.min(
            tmp[i - 1][j] + 1,
            tmp[i][j - 1] + 1,
            tmp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
          );
        }
      }
      return tmp[a.length][b.length];
    };

    const dist = getLevenshteinDistance(normalized, wordNormalized);
    const wordLen = wordNormalized.length;
    const guessLen = normalized.length;

    // Check distance-based closeness
    const isCloseDist = (dist === 1 && wordLen >= 3) || (dist === 2 && wordLen >= 6);

    // Check substring-based closeness (e.g. "rain" for "rainbow" or "brush" for "toothbrush")
    const isSubstring = (guessLen >= 3 && wordLen >= 3) && 
      (wordNormalized.includes(normalized) || normalized.includes(wordNormalized));

    const isClose = isCloseDist || isSubstring;

    return { correct: false, isClose };
  }

  // ── Drawing ────────────────────────────────────────────────

  addStroke(strokeData) {
    if (strokeData.type === 'start' || strokeData.type === 'fill') {
      this.currentStrokeId = (this.currentStrokeId || 0) + 1;
    }
    strokeData.strokeId = this.currentStrokeId || 1;
    this.strokes.push(strokeData);
  }

  clearCanvas() {
    this.strokes = [];
    this.currentStrokeId = 0;
  }

  undoLastStroke() {
    if (this.strokes.length === 0) return;
    const lastStrokeId = this.strokes[this.strokes.length - 1].strokeId;
    this.strokes = this.strokes.filter(s => s.strokeId !== lastStrokeId);
  }

  // ── Helpers ────────────────────────────────────────────────

  _makeBlank(word) {
    return word
      .split('')
      .map(c => (c === ' ' ? ' ' : '_'))
      .join('');
  }

  _makeHintDisplay() {
    if (!this.currentWord) return '';
    return this.currentWord
      .split('')
      .map((c, i) => {
        if (c === ' ') return ' ';
        if (this.revealedIndices.has(i)) return c;
        return '_';
      })
      .join('');
  }

  getHintDisplay() {
    return this._makeHintDisplay();
  }

  _clearTimers() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    if (this.wordChoiceTimeout) clearTimeout(this.wordChoiceTimeout);
    this.hintIntervals.forEach(t => clearTimeout(t));
    this.hintIntervals = [];
    this.timerInterval = null;
    this.wordChoiceTimeout = null;
  }

  isDrawer(playerId) {
    return playerId === this.currentDrawerId;
  }

  toStateJSON(isSpectator = false) {
    return {
      phase: this.phase,
      currentRound: this.currentRound,
      totalRounds: this.totalRounds,
      currentDrawerId: this.currentDrawerId,
      timeLeft: this.timeLeft,
      hint: this._makeHintDisplay(),
      wordLength: this.currentWord ? this.currentWord.length : 0,
      blankWord: this.currentWord ? this._makeBlank(this.currentWord) : '',
      correctGuessCount: this.correctGuessCount,
      currentWord: (isSpectator && this.currentWord) ? this.currentWord : null,
    };
  }
}

Game.PHASE = PHASE;
module.exports = Game;
