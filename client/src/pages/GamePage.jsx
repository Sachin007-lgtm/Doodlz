import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useGame } from '../context/GameContext'
import { useSocket } from '../context/SocketContext'
import Canvas from '../components/Canvas'
import ChatPanel from '../components/ChatPanel'
import PlayerList from '../components/PlayerList'
import Timer from '../components/Timer'
import WordBlanks from '../components/WordBlanks'
import WordChoiceOverlay from '../components/WordChoiceOverlay'
import RoundEndOverlay from '../components/RoundEndOverlay'
import doodlzLogoImg from '../assets/image-removebg-preview.png'

export default function GamePage() {
  const { roomId } = useParams()
  const navigate   = useNavigate()
  const { socket } = useSocket()
  const { 
    room, myPlayer, players, gameState, roundEndData, resetGame,
    votekick, lastRoundReplay, setLastRoundReplay 
  } = useGame()

  const myId     = myPlayer?.id
  const isDrawer = gameState.currentDrawerId === myId
  const [exitConfirm, setExitConfirm] = useState(false)
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark')

  useEffect(() => {
    document.body.classList.remove('light-theme', 'dark-theme')
    document.body.classList.add(`${theme}-theme`)
    
    const container = document.querySelector('.app-container')
    const appRoot = document.querySelector('.app-root')
    if (container) {
      container.classList.remove('light-theme', 'dark-theme')
      container.classList.add(`${theme}-theme`)
    }
    if (appRoot) {
      appRoot.classList.remove('light-theme', 'dark-theme')
      appRoot.classList.add(`${theme}-theme`)
    }
    localStorage.setItem('theme', theme)
    return () => {
      document.body.classList.remove('light-theme', 'dark-theme')
      if (container) container.classList.remove('light-theme', 'dark-theme')
      if (appRoot) appRoot.classList.remove('light-theme', 'dark-theme')
    }
  }, [theme])

  // Navigate to game-over when game ends
  useEffect(() => {
    if (gameState.phase === 'game_over') navigate(`/gameover/${roomId}`)
  }, [gameState.phase, navigate, roomId])

  // Auto-copy invite link if created via Invite button
  useEffect(() => {
    if (sessionStorage.getItem('copy_invite') === 'true' && roomId) {
      const inviteUrl = `${window.location.origin}/game/${roomId}`
      navigator.clipboard.writeText(inviteUrl)
        .then(() => {
          alert('Room created! Invite link copied to clipboard.')
        })
        .catch(() => {})
      sessionStorage.removeItem('copy_invite')
    }
  }, [roomId])

  // Dynamically expand container width for game play page only
  useEffect(() => {
    const container = document.querySelector('.app-container')
    if (container) {
      container.style.maxWidth = '1250px'
    }
    return () => {
      if (container) {
        container.style.maxWidth = ''
      }
    }
  }, [])

  const handleExit = () => {
    if (exitConfirm) {
      socket.emit('leave_room')
      resetGame()
      navigate('/')
    } else {
      setExitConfirm(true)
      setTimeout(() => setExitConfirm(false), 3000)
    }
  }

  // Show waiting room if game hasn't started yet
  if (gameState.phase === 'waiting' || gameState.phase === 'starting') {
    return <WaitingRoom
      roomId={roomId} players={players} myPlayer={myPlayer}
      socket={socket} gameState={gameState} navigate={navigate}
      resetGame={resetGame}
    />
  }

  const showWordSelection = gameState.phase === 'word_selection'
  const showRoundEnd      = gameState.phase === 'round_end' && roundEndData

  return (
    <div className="page-wrapper" style={{ overflow: 'hidden', background: 'var(--solid-bg, #1c1a27)' }}>

      {/* Votekick Banner */}
      {votekick && myId !== votekick.targetId && !myPlayer?.isSpectator && (
        <div style={{
          position: 'fixed', top: 70, left: '50%', transform: 'translateX(-50%)',
          background: '#1c1a27', border: '3px solid #ffe16d', borderRadius: 12,
          padding: '10px 20px', zIndex: 120, display: 'flex', alignItems: 'center', gap: 16,
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          animation: 'slide-up 0.2s ease-out',
        }}>
          <span className="material-symbols-outlined" style={{ color: '#ffe16d', fontSize: 24 }}>vote</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#ffffff' }}>
              Votekick active for <span style={{ color: '#ffe16d' }}>{votekick.targetName}</span>
            </p>
            <p style={{ margin: 0, fontSize: 10, color: 'rgba(255,255,255,0.6)', fontFamily: 'var(--font-mono)' }}>
              Votes: {votekick.votesCount} / {votekick.requiredVotes} (Requested by {votekick.initiatorName})
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost" style={{ padding: '4px 12px', fontSize: 11, borderRadius: 6, height: 'auto', border: '1.5px solid var(--success-mint)', color: 'var(--success-mint)' }}
              onClick={() => socket.emit('vote_kick', { vote: 'yes' })}>
              Yes
            </button>
            <button className="btn btn-ghost" style={{ padding: '4px 12px', fontSize: 11, borderRadius: 6, height: 'auto', border: '1.5px solid var(--error)', color: 'var(--error)' }}
              onClick={() => socket.emit('vote_kick', { vote: 'no' })}>
              No
            </button>
          </div>
        </div>
      )}

      {/* ── Header (Floating Glass Bar) ─────────────────────────────── */}
      <header style={{
        height: 60, flexShrink: 0, display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', padding: '0 16px',
        background: 'var(--header-bg, rgba(0, 0, 0, 0.2))', borderBottom: 'var(--border-2)',
        gap: 8,
      }}>
        {/* Left: logo + round chip */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <img src={doodlzLogoImg} alt="Doodlz" style={{ height: 72, objectFit: 'contain', display: 'block', marginLeft: 8, marginRight: 8, transform: 'translateY(-3px)' }} />
          <span className="chip chip-primary" style={{ fontSize: 10 }}>
            Round {gameState.currentRound}/{gameState.totalRounds}
          </span>
          {myPlayer?.isSpectator ? (
            <span className="chip chip-ghost" style={{ fontSize: 10 }}>👁️ Spectating</span>
          ) : isDrawer ? (
            <span className="chip chip-mint" style={{ fontSize: 10 }}>🎨 Drawing</span>
          ) : (
            <span className="chip chip-cyan" style={{ fontSize: 10 }}>🤔 Guess!</span>
          )}
        </div>

        {/* Centre: word blanks */}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', overflow: 'hidden', padding: '0 8px' }}>
          <WordBlanks hint={gameState.hint} blankWord={gameState.blankWord} isDrawer={isDrawer || myPlayer?.isSpectator} currentWord={gameState.currentWord} />
        </div>

        {/* Right: timer + exit */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <Timer timeLeft={gameState.timeLeft} drawTime={room?.settings?.drawTime || 60} />
          
          {/* Global Light/Dark Theme Toggle */}
          <button
            onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
            title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
            style={{
              width: 40, height: 40, borderRadius: 8, flexShrink: 0,
              background: 'var(--paper-white)',
              border: 'var(--border)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: 'var(--shadow-sm)', transition: 'var(--transition)',
              color: 'var(--on-surface)',
            }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
              {theme === 'dark' ? 'light_mode' : 'dark_mode'}
            </span>
          </button>

          <button
            onClick={handleExit}
            title={exitConfirm ? 'Click again to confirm exit' : 'Exit game'}
            style={{
              width: 40, height: 40, borderRadius: 8, flexShrink: 0,
              background: exitConfirm ? 'var(--error-container)' : 'var(--paper-white)',
              border: exitConfirm ? '3px solid var(--error)' : 'var(--border)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: 'var(--shadow-sm)', transition: 'var(--transition)',
              color: exitConfirm ? 'var(--error)' : 'var(--on-surface)',
            }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
              {exitConfirm ? 'warning' : 'exit_to_app'}
            </span>
          </button>
        </div>
      </header>

      {/* ── Main ─────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

        {/* Canvas */}
        <section style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '8px 8px 6px', gap: 6, overflow: 'hidden', minWidth: 0, position: 'relative', background: 'var(--canvas-section-bg, transparent)' }}>
          <Canvas isDrawer={isDrawer && !myPlayer?.isSpectator} />
          {/* Overlays inside the canvas drawing screen only */}
          {showWordSelection && (
            <WordChoiceOverlay wordOptions={gameState.wordOptions} drawerName={gameState.drawerName} isDrawer={isDrawer && !myPlayer?.isSpectator} />
          )}
          {showRoundEnd && (
            <RoundEndOverlay word={roundEndData.word} scores={roundEndData.scores} />
          )}
        </section>

        {/* Sidebar */}
        <aside style={{ width: 320, flexShrink: 0, display: 'flex', flexDirection: 'column', borderLeft: 'var(--border)', background: 'var(--sidebar-bg, #12101a)', overflow: 'hidden' }}>
          {/* Leaderboard */}
          <div style={{ flexShrink: 0, padding: '8px 8px 4px', borderBottom: '2px solid rgba(255,255,255,0.15)' }}>
            <PlayerList players={players} myId={myId} currentDrawerId={gameState.currentDrawerId} />
          </div>
          {/* Room code */}
          <div style={{ padding: '6px 10px', borderBottom: '2px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 14, color: 'var(--secondary)' }}>meeting_room</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--secondary)', fontWeight: 600 }}>Room #{roomId}</span>
          </div>

          {/* Replay Last Round button */}
          {room?.hasReplay && (
            <button className="btn btn-yellow" style={{ padding: '8px 12px', fontSize: 12, borderRadius: 8, height: 'auto', display: 'flex', alignItems: 'center', gap: 6, margin: '6px 8px', width: 'calc(100% - 16px)', justifyContent: 'center', fontWeight: 850, border: '2px solid #000000', boxShadow: '2px 2px 0px #000000', transition: 'none' }}
              onClick={() => socket.emit('request_last_round_replay')}>
              <span className="material-symbols-outlined icon-fill" style={{ fontSize: 16, color: 'var(--dark-text)' }}>movie</span>
              Replay Last Round
            </button>
          )}

          {/* Chat */}
          <div style={{ flex: 1, padding: '6px 8px 8px', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <ChatPanel isDrawer={isDrawer || myPlayer?.isSpectator} />
          </div>
        </aside>
      </div>

      {/* (Overlays have been moved inside the canvas section) */}

      {/* Exit confirm toast */}
      {exitConfirm && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--error)', color: 'white', padding: '10px 24px',
          borderRadius: 10, border: 'var(--border)', boxShadow: 'var(--shadow)',
          fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, zIndex: 200,
          animation: 'slide-up 0.2s ease-out',
        }}>
          ⚠️ Click Exit again to leave the game
        </div>
      )}

      {/* Replay Overlay */}
      {lastRoundReplay && (
        <ReplayOverlay replayData={lastRoundReplay} onClose={() => setLastRoundReplay(null)} />
      )}
    </div>
  )
}

// ── Waiting room (shown before game starts) ───────────────────────────
const avatar = seed =>
  `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(seed)}&backgroundColor=b6e3f4,c0aede,d1d4f9`

function WaitingRoom({ roomId, players, myPlayer, socket, gameState, navigate, resetGame }) {
  const [copied, setCopied] = useState(false)
  const isHost = myPlayer?.isHost

  const copyCode = () => {
    navigator.clipboard.writeText(roomId || '').catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleLeave = () => {
    socket.emit('leave_room')
    resetGame()
    navigate('/')
  }

  const pressDown = (e) => { e.currentTarget.style.transform = 'translate(4px,4px)'; e.currentTarget.style.boxShadow = 'none' }
  const pressUp = (e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '4px 4px 0px #000' }

  // Shared card style — solid cream card
  const glassCard = {
    background: '#fdfcf4',
    border: '2px solid rgba(255,255,255,0.9)',
    borderRadius: 16,
    boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
  }

  return (
    <div className="page-wrapper custom-scroll" style={{ overflowY: 'auto', background: 'transparent' }}>
      <main style={{ flex: 1, padding: '28px 20px', maxWidth: 760, margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>

        {/* Top Logo + controls */}
        <div style={{ textAlign: 'center', position: 'relative', width: '100%', marginTop: -20 }}>
          <img src={doodlzLogoImg} alt="Doodlz" style={{ height: 130, objectFit: 'contain', display: 'block', margin: '0 auto', transform: 'translateY(8px)' }} />
          <div style={{ position: 'absolute', top: 10, right: 0, display: 'flex', gap: 8 }}>
            <button onClick={copyCode} title="Copy room code" style={{
              width: 40, height: 40, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.9)',
              background: '#fdfcf4',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)', transition: 'transform 0.15s'
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#333' }}>{copied ? 'check' : 'share'}</span>
            </button>
            <button onClick={handleLeave} title="Leave room" style={{
              width: 40, height: 40, borderRadius: '50%', border: '2px solid rgba(255,100,100,0.6)',
              background: '#fff5f5',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)', transition: 'transform 0.15s'
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#e53935' }}>exit_to_app</span>
            </button>
          </div>
        </div>

        {/* Room Code Card */}
        <div style={{ ...glassCard, padding: '14px 28px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 56 }}>
          <div>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9d4edd', marginBottom: 2 }}>Invite Friends</p>
            <h1 onClick={copyCode} style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(22px, 3.5vw, 36px)', fontWeight: 900, color: '#000000', letterSpacing: '0.12em', cursor: 'pointer', margin: 0 }}>
              #{roomId}
            </h1>
          </div>
          <div style={{ width: 1, height: 48, background: 'rgba(0,0,0,0.12)' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <p style={{ fontSize: 12, color: '#555', margin: 0, fontFamily: 'var(--font-body)', fontWeight: 600 }}>
              {players.length} player{players.length !== 1 ? 's' : ''} in lobby
            </p>
            <button onClick={copyCode} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px',
              background: copied ? '#00b4d8' : '#9d4edd', color: '#fff', border: 'none',
              borderRadius: 20, cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 700,
              fontSize: 12, letterSpacing: '0.03em', transition: 'background 0.2s',
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>{copied ? 'check' : 'content_copy'}</span>
              {copied ? 'Copied!' : 'Copy Code'}
            </button>
          </div>
        </div>

        {/* Players grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16, width: '100%', maxWidth: 820, alignItems: 'start' }}>
          {players.map(p => (
            <div key={p.id} style={{
              ...glassCard,
              padding: '14px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
              background: p.isSpectator ? '#e2e3e5' : p.isHost ? '#d0f4fc' : p.id === myPlayer?.id ? '#f2e6ff' : '#fdfcf4',
              border: p.isSpectator ? '2px solid #6c757d' : p.isHost ? '2px solid #00b4d8' : p.id === myPlayer?.id ? '2px solid #9d4edd' : '2px solid rgba(255,255,255,0.9)',
              position: 'relative',
              aspectRatio: '1',
              opacity: p.isSpectator ? 0.75 : 1,
            }}>
              {p.isHost && (
                <span className="material-symbols-outlined icon-fill" style={{
                  position: 'absolute',
                  top: -12,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  fontSize: '1.5rem',
                  color: '#00b4d8',
                  zIndex: 2,
                }}>star</span>
              )}
              <img src={avatar(p.avatarSeed)} alt={p.name}
                style={{ width: 66, height: 66, borderRadius: '50%', border: '2.5px solid rgba(157,78,221,0.4)', background: '#e8d5f5' }} />
              <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 12, textAlign: 'center', color: '#111', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>
                {p.name}
              </p>
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700, letterSpacing: '0.05em',
                textTransform: 'uppercase', padding: '3px 8px', borderRadius: 20,
                background: p.isSpectator ? '#6c757d' : p.isHost ? '#00a86b' : p.isReady ? '#007fa3' : '#333333',
                color: '#ffffff',
              }}>
                {p.isSpectator ? 'Spectating' : p.isHost ? 'Host' : p.isReady ? 'Ready' : 'Waiting'}
              </span>
            </div>
          ))}

          {/* Empty slot hints */}
          {Array.from({ length: Math.max(0, Math.min(3, 8 - players.length)) }).map((_, i) => (
            <div key={i} onClick={copyCode}
              style={{
                border: '2.5px dashed #9d4edd', borderRadius: 16, padding: 12,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 8, cursor: 'pointer', aspectRatio: '1',
                background: '#faf9f2',
                boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                transition: 'background 0.15s, transform 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#f2e6ff'; e.currentTarget.style.transform = 'translateY(-2px)' }}
              onMouseLeave={e => { e.currentTarget.style.background = '#faf9f2'; e.currentTarget.style.transform = '' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 32, color: '#9d4edd' }}>person_add</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#9d4edd', fontWeight: 800, letterSpacing: '0.05em' }}>INVITE</span>
            </div>
          ))}
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          {isHost ? (
            <button style={{
              minWidth: 200, fontSize: 16, padding: '14px 32px', fontFamily: 'var(--font-display)', fontWeight: 800,
              background: '#ffe16d', color: '#000', border: '2.5px solid #000',
              borderRadius: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
              boxShadow: '4px 4px 0px #000', transition: 'transform 0.1s, box-shadow 0.1s', letterSpacing: '0.03em',
            }}
              onClick={() => {
                const activePlayerCount = players.filter(p => !p.isSpectator).length
                if (activePlayerCount < 2) { alert('Need at least 2 active players to start!'); return }
                socket.emit('start_game')
              }}
              onMouseDown={pressDown} onMouseUp={pressUp} onMouseLeave={pressUp}>
              <span className="material-symbols-outlined icon-fill">play_circle</span>
              START GAME
            </button>
          ) : (
            <button style={{
              minWidth: 200, fontSize: 16, padding: '14px 32px', fontFamily: 'var(--font-display)', fontWeight: 800,
              background: myPlayer?.isSpectator ? '#cbd5e1' : myPlayer?.isReady ? 'rgba(253,252,244,0.9)' : '#00FA9A', color: '#000',
              border: '2.5px solid #000', borderRadius: 12, cursor: myPlayer?.isSpectator ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 8,
              boxShadow: '4px 4px 0px #000', transition: 'transform 0.1s, box-shadow 0.1s', letterSpacing: '0.03em',
              opacity: myPlayer?.isSpectator ? 0.6 : 1
            }}
              disabled={!!myPlayer?.isSpectator}
              onClick={() => socket.emit('player_ready')}
              onMouseDown={e => { if (!myPlayer?.isSpectator) pressDown(e) }}
              onMouseUp={e => { if (!myPlayer?.isSpectator) pressUp(e) }}
              onMouseLeave={e => { if (!myPlayer?.isSpectator) pressUp(e) }}>
              <span className="material-symbols-outlined">{myPlayer?.isReady ? 'close' : 'check_circle'}</span>
              {myPlayer?.isReady ? "Not Ready" : "I'm Ready!"}
            </button>
          )}

          {/* Toggle Role Button */}
          <button style={{
            minWidth: 200, fontSize: 16, padding: '14px 32px', fontFamily: 'var(--font-display)', fontWeight: 800,
            background: myPlayer?.isSpectator ? '#00FA9A' : 'rgba(253,252,244,0.9)', color: '#000',
            border: '2.5px solid #000', borderRadius: 12, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 8,
            boxShadow: '4px 4px 0px #000', transition: 'transform 0.1s, box-shadow 0.1s', letterSpacing: '0.03em',
          }}
            onClick={() => socket.emit('toggle_spectator')}
            onMouseDown={pressDown} onMouseUp={pressUp} onMouseLeave={pressUp}>
            <span className="material-symbols-outlined">{myPlayer?.isSpectator ? 'sports_esports' : 'visibility'}</span>
            {myPlayer?.isSpectator ? "Join Game" : "Spectate"}
          </button>
        </div>

        {!isHost && !myPlayer?.isSpectator && (
          <p style={{ textAlign: 'center', fontSize: 16, fontFamily: 'var(--font-display)', fontWeight: 700, color: '#ffffff', textShadow: '0 2px 12px rgba(0,0,0,0.7)', letterSpacing: '0.02em' }}>
            ⏳ Waiting for the host to start the game…
          </p>
        )}
      </main>
    </div>
  )
}

// ── Replay overlay modal ──────────────────────────────────────────────
function ReplayOverlay({ replayData, onClose }) {
  const canvasRef = useRef(null)
  const [playbackIndex, setPlaybackIndex] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [speed, setSpeed] = useState(2) // default to 2x speed for good pace

  const totalStrokes = replayData.strokes.length

  // Animation controller tick loop
  useEffect(() => {
    if (!playing) return
    if (playbackIndex >= totalStrokes) {
      setPlaying(false)
      return
    }

    const tick = () => {
      setPlaybackIndex(prev => {
        const next = prev + speed
        return next > totalStrokes ? totalStrokes : next
      })
    }

    const interval = setInterval(tick, 30) // ~33fps
    return () => clearInterval(interval)
  }, [playing, playbackIndex, speed, totalStrokes])

  // Redraw canvas on playbackIndex increments
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    const w = canvas.width
    const h = canvas.height
    const subStrokes = replayData.strokes.slice(0, playbackIndex)
    
    let px = 0, py = 0, col = '#000', sz = 6, tool = 'brush'

    const drawDot = (ctx, x, y, color, size, tool) => {
      ctx.beginPath()
      ctx.arc(x, y, size / 2, 0, Math.PI * 2)
      ctx.fillStyle = tool === 'eraser' ? '#ffffff' : color
      ctx.fill()
    }

    const drawSeg = (ctx, x0, y0, x1, y1, color, size, tool) => {
      ctx.beginPath()
      ctx.moveTo(x0, y0)
      ctx.lineTo(x1, y1)
      ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color
      ctx.lineWidth = size
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.stroke()
    }

    const hexToRgb = (hex) => {
      const h = hex.replace('#', '')
      return [
        parseInt(h.substring(0, 2), 16),
        parseInt(h.substring(2, 4), 16),
        parseInt(h.substring(4, 6), 16),
      ]
    }

    const floodFill = (ctx, startX, startY, fillHex) => {
      const width  = canvas.width
      const height = canvas.height
      const imgData = ctx.getImageData(0, 0, width, height)
      const d = imgData.data
      const px = (x, y) => (y * width + x) * 4
      const ti = px(startX, startY)
      const tr = d[ti], tg = d[ti + 1], tb = d[ti + 2], ta = d[ti + 3]
      const [fr, fg, fb] = hexToRgb(fillHex)
      if (tr === fr && tg === fg && tb === fb && ta === 255) return
      const tolerance = 30
      const match = (i) => {
        const dr = d[i] - tr, dg = d[i + 1] - tg, db = d[i + 2] - tb, da = d[i + 3] - ta
        return Math.sqrt(dr*dr + dg*dg + db*db + da*da) <= tolerance
      }
      const paint = (i) => { d[i] = fr; d[i+1] = fg; d[i+2] = fb; d[i+3] = 255 }
      const stack = [[startX, startY]]
      const visited = new Uint8Array(width * height)
      while (stack.length) {
        const [x, y] = stack.pop()
        if (x < 0 || x >= width || y < 0 || y >= height) continue
        const idx = y * width + x
        if (visited[idx]) continue
        const i = idx * 4
        if (!match(i)) continue
        let lx = x
        while (lx > 0 && match(px(lx - 1, y)) && !visited[y * width + lx - 1]) lx--
        let rx = x
        while (rx < width - 1 && match(px(rx + 1, y)) && !visited[y * width + rx + 1]) rx++
        for (let cx = lx; cx <= rx; cx++) {
          const ci = (y * width + cx) * 4
          if (!visited[y * width + cx] && match(ci)) {
            paint(ci)
            visited[y * width + cx] = 1
            if (y > 0)          stack.push([cx, y - 1])
            if (y < height - 1) stack.push([cx, y + 1])
          }
        }
      }
      ctx.putImageData(imgData, 0, 0)
    }

    subStrokes.forEach(s => {
      if (s.type === 'start') {
        col = s.color || '#000'; sz = s.size || 6; tool = s.tool || 'brush'
        px = s.x * w; py = s.y * h
        drawDot(ctx, px, py, col, sz, tool)
      } else if (s.type === 'move') {
        const nx = s.x * w, ny = s.y * h
        drawSeg(ctx, px, py, nx, ny, col, sz, tool)
        px = nx; py = ny
      } else if (s.type === 'fill') {
        floodFill(ctx, Math.floor(s.x * w), Math.floor(s.y * h), s.color)
      }
    })
  }, [playbackIndex, replayData])

  const handleScrub = (e) => {
    setPlaybackIndex(Number(e.target.value))
    setPlaying(false) // Pause on manual timeline drag
  }

  return (
    <div className="overlay" style={{ background: 'rgba(10, 8, 20, 0.85)', backdropFilter: 'blur(8px)', zIndex: 300 }}>
      <div className="neo-card" style={{ padding: 24, width: '90%', maxWidth: 650, background: '#1c1a27', border: '3px solid #ffffff', boxShadow: '0 10px 40px rgba(0,0,0,0.6)', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p className="text-label" style={{ color: 'var(--accent-yellow)', marginBottom: 2 }}>Round Replay</p>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 800, color: '#ffffff', margin: 0 }}>
              {replayData.drawerName} drew <span style={{ color: 'var(--accent-yellow)' }}>"{replayData.word}"</span>
            </h2>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose} style={{ width: 36, height: 36 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
          </button>
        </div>

        {/* Canvas area */}
        <div style={{ position: 'relative', width: '100%', background: '#ffffff', borderRadius: 8, border: '3px solid #000000', overflow: 'hidden' }}>
          <canvas ref={canvasRef} width={600} height={400} style={{ display: 'block', width: '100%', height: 'auto', aspectRatio: '3/2' }} />
        </div>

        {/* Timeline scrubber */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'rgba(255,255,255,0.6)', width: 36, textAlign: 'right' }}>
            {playbackIndex}
          </span>
          <input 
            type="range" 
            min={0} 
            max={totalStrokes} 
            value={playbackIndex} 
            onChange={handleScrub}
            style={{ flex: 1 }}
          />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'rgba(255,255,255,0.6)', width: 36 }}>
            {totalStrokes}
          </span>
        </div>

        {/* Controls footer */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            {/* Play/Pause */}
            <button className="btn btn-ghost" style={{ padding: '6px 14px', fontSize: 12, borderRadius: 8, height: 'auto' }}
              onClick={() => {
                if (playbackIndex >= totalStrokes) {
                  setPlaybackIndex(0)
                }
                setPlaying(!playing)
              }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18, marginRight: 4 }}>
                {playing ? 'pause' : 'play_arrow'}
              </span>
              {playing ? 'Pause' : 'Play'}
            </button>

            {/* Restart */}
            <button className="btn btn-ghost" style={{ padding: '6px 14px', fontSize: 12, borderRadius: 8, height: 'auto' }}
              onClick={() => {
                setPlaybackIndex(0)
                setPlaying(true)
              }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18, marginRight: 4 }}>replay</span>
              Restart
            </button>
          </div>

          {/* Speed settings */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'rgba(255,255,255,0.6)', marginRight: 4 }}>Speed:</span>
            {[1, 2, 5, 10].map(s => (
              <button key={s} 
                onClick={() => setSpeed(s)}
                style={{
                  background: speed === s ? 'var(--accent-yellow)' : 'rgba(255,255,255,0.1)',
                  color: speed === s ? '#000000' : '#ffffff',
                  border: speed === s ? '1px solid #ffffff' : '1px solid transparent',
                  borderRadius: 4, padding: '2px 8px', fontSize: 10, fontFamily: 'var(--font-mono)',
                  cursor: 'pointer', fontWeight: 700, transition: 'all 0.1s'
                }}>
                {s}x
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
