# Doodlz 🎨

A full-stack real-time multiplayer drawing and guessing game (skribbl.io clone) built with React + Vite + Node.js + Socket.IO.

**Live URL:** `https://your-doodlz-server.onrender.com` ← update after deployment

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + React Router v6 |
| Canvas | HTML5 Canvas API (custom drawing hook) |
| Backend | Node.js + Express |
| Real-time | Socket.IO 4 |
| Avatars | DiceBear API (adventurer style) |
| Deployment | Render / Railway |

---

## Features

- ✅ Create / join rooms via 6-character code
- ✅ Public room auto-matching (≤10 players per room)
- ✅ Lobby with player grid, ready system, host settings
- ✅ Configurable: max players, rounds, draw time, word count
- ✅ Real-time canvas sync (draw_start / draw_move / draw_end)
- ✅ Color palette, brush sizes, eraser, undo, clear
- ✅ Word selection (drawer picks from N choices)
- ✅ Hints revealed progressively over time
- ✅ Guess detection with normalized matching
- ✅ Diminishing points (first guesser earns most)
- ✅ Live leaderboard during game
- ✅ Round-end overlay with score changes
- ✅ Game-over podium with confetti
- ✅ DiceBear avatars for all players

---

## Local Development

### Prerequisites
- Node.js 18+
- npm

### 1. Install dependencies

```bash
# Server
cd server
npm install

# Client
cd ../client
npm install
```

### 2. Run both servers

**Terminal 1 — Backend:**
```bash
cd server
npm run dev
# Server starts on http://localhost:3001
```

**Terminal 2 — Frontend:**
```bash
cd client
npm run dev
# App opens on http://localhost:5173
```

### 3. Test with multiple players
Open 2–3 browser tabs pointing to `http://localhost:5173`. Each tab is a separate player.

---

## Project Structure

```
Doodlz/
├── server/
│   ├── classes/
│   │   ├── Player.js      # Player state (score, avatar, ready)
│   │   ├── Room.js        # Room management + broadcasting
│   │   └── Game.js        # Round logic, timer, hints, scoring
│   ├── words.js           # 300+ word list by category
│   ├── index.js           # Express + Socket.IO entry point
│   └── package.json
└── client/
    ├── src/
    │   ├── context/
    │   │   ├── SocketContext.jsx   # Single Socket.IO connection
    │   │   └── GameContext.jsx     # All socket event handlers + state
    │   ├── hooks/
    │   │   └── useCanvas.js        # Drawing logic + emit throttle
    │   ├── components/
    │   │   ├── Canvas.jsx          # Canvas + toolbar
    │   │   ├── ChatPanel.jsx       # Chat / guessing input
    │   │   ├── PlayerList.jsx      # Live leaderboard
    │   │   ├── WordBlanks.jsx      # Hint display
    │   │   ├── Timer.jsx           # Countdown circle
    │   │   ├── WordChoiceOverlay.jsx
    │   │   └── RoundEndOverlay.jsx
    │   ├── pages/
    │   │   ├── HomePage.jsx        # Landing + create/join
    │   │   ├── LobbyPage.jsx       # Pre-game lobby
    │   │   ├── GamePage.jsx        # Active game room
    │   │   └── GameOverPage.jsx    # Winner podium
    │   └── index.css               # Neo-brutalist design system
    └── vite.config.js
```

---

## Deployment (Render)

### Backend (Web Service)
1. Create a new **Web Service** on [render.com](https://render.com)
2. Connect your GitHub repo
3. Set:
   - **Root directory:** `server`
   - **Build command:** `npm install`
   - **Start command:** `node index.js`
4. Add environment variable: `PORT=3001` (Render sets this automatically)
5. Enable **WebSocket** support (auto on Render)

### Frontend (Static Site)
1. Create a new **Static Site** on Render
2. Set:
   - **Root directory:** `client`
   - **Build command:** `npm install && npm run build`
   - **Publish directory:** `dist`
3. Add environment variable: `VITE_SERVER_URL=https://your-server.onrender.com`

### Alternative: Railway
- Create a project, add two services (server + client)
- Same env vars as above

---

## WebSocket Architecture

```
Client (drawer)          Server                  Clients (guessers)
────────────────         ──────────────          ──────────────────
draw_start ────────────► broadcast ────────────► draw_data
draw_move  ────────────► broadcast ────────────► draw_data
draw_end   ────────────► broadcast ────────────► draw_data
canvas_clear ──────────► broadcast ────────────► canvas_clear
draw_undo  ────────────► recompute ────────────► canvas_replay
                         strokes[]

guess ─────────────────► check word
                         if correct:
                         ◄─────────────────────  guess_result (all)
                         else:
                         ◄─────────────────────  chat_message (all)
```

### Scoring Algorithm
```
base = 300
penalty = correctGuessCount * 20        (later guessers get less)
timeBonus = floor(timeLeft/drawTime * 100)
points = max(50, base - penalty + timeBonus)

drawerBonus = correctGuessCount * 50    (drawer gets per guesser)
```

### Word Matching
```js
input.trim().toLowerCase() === word.trim().toLowerCase()
```

---

## Code Walkthrough Topics

1. **Drawing sync** — `useCanvas.js` captures normalized (0–1) coordinates, throttles at 16ms, emits `draw_start/move/end`. Server broadcasts to room, clients reconstruct strokes locally.

2. **Game state** — `Game.js` manages `drawQueue`, advances turn with `_nextDrawer()`, auto-ends round when all guess or timer hits 0.

3. **WebSockets** — Socket.IO rooms map 1:1 to game rooms. Each socket is tracked via `socketToPlayer` Map; disconnects trigger host transfer if needed.

4. **Hints** — Scheduled with `setTimeout` at 33% and 66% of draw time, reveal random letters from the word.

5. **Public rooms** — `findPublicRoom()` scans for open public rooms with < 10 players. Creates new room if none found.
