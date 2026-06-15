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
        <aside style={{ width: 265, flexShrink: 0, display: 'flex', flexDirection: 'column', borderLeft: 'var(--border)', background: 'var(--secondary-fixed)', overflow: 'hidden' }}>
          {/* Leaderboard */}
          <div style={{ flexShrink: 0, padding: '8px 8px 4px', borderBottom: '2px solid rgba(11,38,100,0.15)' }}>
            <PlayerList players={players} myId={myId} currentDrawerId={gameState.currentDrawerId} />
          </div>
          {/* Room code */}
          <div style={{ padding: '4px 10px', borderBottom: '2px solid rgba(11,38,100,0.1)', display: 'flex', alignItems: 'center', gap: 6 }}>
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

  return (
    <div className="page-wrapper custom-scroll" style={{ overflowY: 'auto', background: 'var(--solid-bg, #1c1a27)' }}>
      <main style={{ flex: 1, padding: '30px 20px', maxWidth: 800, margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        
        {/* Top Logo */}
        <div style={{ textAlign: 'center', marginBottom: 30, position: 'relative', width: '100%' }}>
          <span className="logo" style={{ fontSize: 'clamp(40px, 6vw, 60px)', textShadow: '0 8px 16px rgba(0,0,0,0.6)' }}>Doodlz</span>
          
          <div style={{ position: 'absolute', top: 10, right: 0, display: 'flex', gap: 6 }}>
            <button className="btn btn-ghost btn-icon" onClick={copyCode} title="Copy room code">
              <span className="material-symbols-outlined">{copied ? 'check' : 'share'}</span>
            </button>
            <button className="btn btn-ghost btn-icon" onClick={handleLeave} title="Leave room">
              <span className="material-symbols-outlined">exit_to_app</span>
            </button>
          </div>
        </div>

        {/* Room Code Banner */}
        <div className="neo-card" style={{ padding: '18px 24px', marginBottom: 20, textAlign: 'center' }}>
          <p className="text-label" style={{ color: 'var(--secondary)', marginBottom: 4 }}>Invite friends with this code</p>
          <h1 onClick={copyCode} style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(32px,6vw,56px)', fontWeight: 900, color: 'var(--ink-black)', letterSpacing: '0.12em', cursor: 'pointer', marginBottom: 4 }}>
            #{roomId}
          </h1>
          <p style={{ fontSize: 13, color: 'var(--on-surface-variant)' }}>
            {copied ? '✅ Copied to clipboard!' : `${players.length} player${players.length !== 1 ? 's' : ''} in lobby • click code to copy`}
          </p>
        </div>

        {/* Players grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24, width: '100%', maxWidth: 560 }}>
          {players.map(p => (
            <div key={p.id} className="neo-card" style={{
              padding: '14px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
              background: p.id === myPlayer?.id ? 'var(--primary-container)' : 'var(--paper-white)',
              position: 'relative',
            }}>
              {p.isHost && (
                <span className="material-symbols-outlined icon-fill" style={{ position: 'absolute', top: 7, right: 7, fontSize: 14, color: 'var(--primary)' }}>star</span>
              )}
              <img src={avatar(p.avatarSeed)} alt={p.name}
                style={{ width: 58, height: 58, borderRadius: '50%', border: 'var(--border)', background: 'var(--secondary-container)' }} />
              <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, textAlign: 'center', color: 'var(--ink-black)', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {p.name}
              </p>
              <span className={`chip ${p.isHost ? 'chip-mint' : p.isReady ? 'chip-cyan' : 'chip-ghost'}`} style={{ fontSize: 10 }}>
                {p.isHost ? 'Host' : p.isReady ? 'Ready' : 'Waiting'}
              </span>
            </div>
          ))}

          {/* Empty slot hints */}
          {Array.from({ length: Math.max(0, Math.min(3, 8 - players.length)) }).map((_, i) => (
            <div key={i} onClick={copyCode}
              style={{ border: '3px dashed var(--ink-black)', borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: 0.3, cursor: 'pointer', minHeight: 120 }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
              onMouseLeave={e => e.currentTarget.style.opacity = '0.3'}>
              <span className="material-symbols-outlined" style={{ fontSize: 26 }}>person_add</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}>Invite</span>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          {isHost ? (
            <button className="btn btn-yellow" style={{ minWidth: 200, fontSize: 17, padding: '14px 32px' }}
              onClick={() => {
                if (players.length < 2) { alert('Need at least 2 players!'); return }
                socket.emit('start_game')
              }}>
              <span className="material-symbols-outlined icon-fill">play_circle</span>
              START GAME
            </button>
          ) : (
            <button className="btn btn-mint" style={{ minWidth: 200, fontSize: 16 }}
              onClick={() => socket.emit('player_ready')}>
              <span className="material-symbols-outlined">{myPlayer?.isReady ? 'close' : 'check_circle'}</span>
              {myPlayer?.isReady ? 'Not Ready' : 'I\'m Ready!'}
            </button>
          )}
          <button className="btn btn-ghost" style={{ minWidth: 160 }} onClick={handleLeave}>
            <span className="material-symbols-outlined">exit_to_app</span>
            Leave Room
          </button>
        </div>

        {!isHost && (
          <p style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: 'var(--on-surface-variant)', fontStyle: 'italic' }}>
            Waiting for the host to start the game…
          </p>
        )}
      </main>
    </div>
  )
}
