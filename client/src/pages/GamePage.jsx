import { useEffect, useState } from 'react'
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

export default function GamePage() {
  const { roomId } = useParams()
  const navigate   = useNavigate()
  const { socket } = useSocket()
  const { room, myPlayer, players, gameState, roundEndData, resetGame } = useGame()

  const myId     = myPlayer?.id
  const isDrawer = gameState.currentDrawerId === myId
  const [exitConfirm, setExitConfirm] = useState(false)

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

      {/* ── Header (Floating Glass Bar) ─────────────────────────────── */}
      <header style={{
        height: 60, flexShrink: 0, display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', padding: '0 16px',
        background: 'rgba(0, 0, 0, 0.2)', borderBottom: '1px solid rgba(255,255,255,0.1)',
        gap: 8,
      }}>
        {/* Left: logo + round chip */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <span className="logo" style={{ fontSize: 20 }}>Doodlz</span>
          <span className="chip chip-primary" style={{ fontSize: 10 }}>
            Round {gameState.currentRound}/{gameState.totalRounds}
          </span>
          {isDrawer
            ? <span className="chip chip-mint" style={{ fontSize: 10 }}>🎨 Drawing</span>
            : <span className="chip chip-cyan" style={{ fontSize: 10 }}>🤔 Guess!</span>
          }
        </div>

        {/* Centre: word blanks */}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', overflow: 'hidden', padding: '0 8px' }}>
          <WordBlanks hint={gameState.hint} blankWord={gameState.blankWord} isDrawer={isDrawer} currentWord={gameState.currentWord} />
        </div>

        {/* Right: timer + exit */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <Timer timeLeft={gameState.timeLeft} drawTime={room?.settings?.drawTime || 60} />
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
        <section style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '8px 8px 6px', gap: 6, overflow: 'hidden', minWidth: 0 }}>
          <Canvas isDrawer={isDrawer} />
        </section>

        {/* Sidebar */}
        <aside style={{ width: 320, flexShrink: 0, display: 'flex', flexDirection: 'column', borderLeft: 'var(--border)', background: '#12101a', overflow: 'hidden' }}>
          {/* Leaderboard */}
          <div style={{ flexShrink: 0, padding: '8px 8px 4px', borderBottom: '2px solid rgba(255,255,255,0.15)' }}>
            <PlayerList players={players} myId={myId} currentDrawerId={gameState.currentDrawerId} />
          </div>
          {/* Room code */}
          <div style={{ padding: '6px 10px', borderBottom: '2px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 14, color: 'var(--secondary)' }}>meeting_room</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--secondary)', fontWeight: 600 }}>Room #{roomId}</span>
          </div>
          {/* Chat */}
          <div style={{ flex: 1, padding: '6px 8px 8px', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <ChatPanel isDrawer={isDrawer} />
          </div>
        </aside>
      </div>

      {/* Overlays */}
      {showWordSelection && (
        <WordChoiceOverlay wordOptions={gameState.wordOptions} drawerName={gameState.drawerName} isDrawer={isDrawer} />
      )}
      {showRoundEnd && (
        <RoundEndOverlay word={roundEndData.word} scores={roundEndData.scores} />
      )}

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
        <div style={{ textAlign: 'center', position: 'relative', width: '100%' }}>
          <span style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, letterSpacing: '0.08em', fontSize: 'clamp(48px, 7vw, 70px)', lineHeight: 1, display: 'inline-block' }}>
            {'Doodlz'.split('').map((ch, i) => (
              <span key={i} style={{
                color: ['#ff6b6b','#ffd93d','#6bcb77','#4d96ff','#ff6bdf','#c77dff'][i],
                textShadow: '-2px -2px 0 #fff, 2px -2px 0 #fff, -2px 2px 0 #fff, 2px 2px 0 #fff, 0 3px 12px rgba(0,0,0,0.35)',
                display: 'inline-block',
              }}>{ch}</span>
            ))}
          </span>
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
              background: p.isHost ? '#d0f4fc' : p.id === myPlayer?.id ? '#f2e6ff' : '#fdfcf4',
              border: p.isHost ? '2px solid #00b4d8' : p.id === myPlayer?.id ? '2px solid #9d4edd' : '2px solid rgba(255,255,255,0.9)',
              position: 'relative',
              aspectRatio: '1',
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
                background: p.isHost ? '#00a86b' : p.isReady ? '#007fa3' : '#333333',
                color: '#ffffff',
              }}>
                {p.isHost ? 'Host' : p.isReady ? 'Ready' : 'Waiting'}
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
              onClick={() => { if (players.length < 2) { alert('Need at least 2 players!'); return } socket.emit('start_game') }}
              onMouseDown={e => { e.currentTarget.style.transform = 'translate(4px,4px)'; e.currentTarget.style.boxShadow = 'none' }}
              onMouseUp={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '4px 4px 0px #000' }}>
              <span className="material-symbols-outlined icon-fill">play_circle</span>
              START GAME
            </button>
          ) : (
            <button style={{
              minWidth: 200, fontSize: 16, padding: '14px 32px', fontFamily: 'var(--font-display)', fontWeight: 800,
              background: myPlayer?.isReady ? 'rgba(253,252,244,0.9)' : '#00FA9A', color: '#000',
              border: '2.5px solid #000', borderRadius: 12, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 8,
              boxShadow: '4px 4px 0px #000', transition: 'transform 0.1s, box-shadow 0.1s', letterSpacing: '0.03em',
            }}
              onClick={() => socket.emit('player_ready')}
              onMouseDown={e => { e.currentTarget.style.transform = 'translate(4px,4px)'; e.currentTarget.style.boxShadow = 'none' }}
              onMouseUp={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '4px 4px 0px #000' }}>
              <span className="material-symbols-outlined">{myPlayer?.isReady ? 'close' : 'check_circle'}</span>
              {myPlayer?.isReady ? "Not Ready" : "I'm Ready!"}
            </button>
          )}
        </div>

        {!isHost && (
          <p style={{ textAlign: 'center', fontSize: 16, fontFamily: 'var(--font-display)', fontWeight: 700, color: '#ffffff', textShadow: '0 2px 12px rgba(0,0,0,0.7)', letterSpacing: '0.02em' }}>
            ⏳ Waiting for the host to start the game…
          </p>
        )}
      </main>
    </div>
  )
}
