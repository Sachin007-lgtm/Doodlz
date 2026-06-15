import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useSocket } from '../context/SocketContext'
import { useGame } from '../context/GameContext'

const avatar = seed =>
  `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(seed)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc`

export default function LobbyPage() {
  const { roomId } = useParams()
  const navigate = useNavigate()
  const { socket } = useSocket()
  const { room, myPlayer, players, gameState } = useGame()

  const [copied, setCopied] = useState(false)
  const [settings, setSettings] = useState({ maxPlayers: 8, rounds: 3, drawTime: 60, wordCount: 3, isPublic: true })

  const isHost = myPlayer?.isHost
  const myId = myPlayer?.id

  // When game starts → go to game page
  useEffect(() => {
    if (gameState.phase === 'starting' || (gameState.phase === 'word_selection' && gameState.currentDrawerId)) {
      navigate(`/game/${roomId}`)
    }
  }, [gameState.phase, gameState.currentDrawerId, navigate, roomId])

  // Sync settings from server
  useEffect(() => {
    if (room?.settings) setSettings(room.settings)
  }, [room?.settings])

  const updateSetting = (key, val) => {
    const next = { ...settings, [key]: val }
    setSettings(next)
    socket.emit('update_settings', next)
  }

  const copyCode = () => {
    navigator.clipboard.writeText(roomId || '').catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const emptySlots = Math.max(0, (settings.maxPlayers || 8) - players.length)

  return (
    <div className="dotted-bg" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header className="app-header">
        <span className="logo">Doodlz</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--secondary-container)', padding: '5px 14px', border: 'var(--border-2)', borderRadius: 20 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--secondary)' }}>meeting_room</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, color: 'var(--secondary)' }}>LOBBY #{roomId}</span>
        </div>
        <button className="btn btn-ghost btn-icon" onClick={copyCode}>
          <span className="material-symbols-outlined">{copied ? 'check' : 'share'}</span>
        </button>
      </header>

      <main style={{
        flex: 1, padding: '16px 20px 20px', maxWidth: 1100, margin: '0 auto', width: '100%',
        display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20, alignItems: 'start',
      }}>
        {/* Left */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Room code */}
          <div className="neo-card" style={{ padding: '16px 24px', textAlign: 'center' }}>
            <p className="text-label" style={{ color: 'var(--secondary)', marginBottom: 4 }}>Room Code</p>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(28px,5vw,48px)', fontWeight: 900, color: 'var(--ink-black)', letterSpacing: '0.1em', cursor: 'pointer' }}
              onClick={copyCode} title="Click to copy">
              #{roomId}
            </h1>
            <p style={{ fontSize: 13, color: 'var(--on-surface-variant)', marginTop: 4 }}>
              {copied ? '✅ Copied!' : `${players.length}/${settings.maxPlayers} players • Share this code to invite friends`}
            </p>
          </div>

          {/* Player grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
            {players.map(p => (
              <div key={p.id} className="neo-card"
                style={{ padding: '14px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                  background: p.id === myId ? 'var(--primary-container)' : 'var(--paper-white)', position: 'relative' }}>
                {p.isHost && (
                  <span className="material-symbols-outlined icon-fill"
                    style={{ position: 'absolute', top: 8, right: 8, fontSize: 16, color: 'var(--primary)' }}>star</span>
                )}
                <img src={avatar(p.avatarSeed)} alt={p.name}
                  className="avatar" style={{ width: 60, height: 60, background: 'var(--secondary-container)' }} />
                <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, textAlign: 'center', color: 'var(--ink-black)', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.name}{p.id === myId ? ' (you)' : ''}
                </p>
                <span className={`chip ${p.isHost ? 'chip-mint' : p.isReady ? 'chip-cyan' : 'chip-ghost'}`} style={{ fontSize: 10 }}>
                  {p.isHost ? 'Host' : p.isReady ? 'Ready' : 'Waiting'}
                </span>
              </div>
            ))}
            {Array.from({ length: Math.min(emptySlots, 3) }).map((_, i) => (
              <div key={i} onClick={copyCode}
                style={{ border: '3px dashed var(--ink-black)', borderRadius: 12, padding: 14,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  gap: 6, opacity: 0.35, cursor: 'pointer', minHeight: 130, transition: 'opacity 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                onMouseLeave={e => e.currentTarget.style.opacity = '0.35'}>
                <span className="material-symbols-outlined" style={{ fontSize: 28 }}>person_add</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}>Invite</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right — Settings */}
        <div className="neo-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 14, borderBottom: 'var(--border)' }}>
            <span className="material-symbols-outlined" style={{ color: 'var(--primary)', fontSize: 20 }}>tune</span>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16, textTransform: 'uppercase', fontStyle: 'italic', color: 'var(--ink-black)' }}>Room Settings</h2>
          </div>

          {/* Rounds */}
          <div>
            <label className="text-label" style={{ display: 'block', marginBottom: 8, color: 'var(--ink-black)' }}>Rounds</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6 }}>
              {[2, 3, 5, 8].map(n => (
                <button key={n} disabled={!isHost} onClick={() => updateSetting('rounds', n)} style={{
                  border: 'var(--border-2)', borderRadius: 7, padding: '7px 0',
                  background: settings.rounds === n ? 'var(--secondary-container)' : 'var(--paper-white)',
                  fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14,
                  cursor: isHost ? 'pointer' : 'default', color: 'var(--ink-black)',
                }}>
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Draw Time */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <label className="text-label" style={{ color: 'var(--ink-black)' }}>Draw Time</label>
              <span className="chip chip-primary" style={{ fontSize: 10 }}>{settings.drawTime}s</span>
            </div>
            <input type="range" min={15} max={180} step={15} value={settings.drawTime}
              disabled={!isHost} onChange={e => updateSetting('drawTime', +e.target.value)} />
          </div>

          {/* Word count */}
          <div>
            <label className="text-label" style={{ display: 'block', marginBottom: 8, color: 'var(--ink-black)' }}>Word Choices per Turn</label>
            <div style={{ display: 'flex', gap: 6 }}>
              {[1,2,3,4,5].map(n => (
                <button key={n} disabled={!isHost} onClick={() => updateSetting('wordCount', n)} style={{
                  flex: 1, border: 'var(--border-2)', borderRadius: 7, padding: '7px 0',
                  background: settings.wordCount === n ? 'var(--primary-container)' : 'var(--paper-white)',
                  fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14,
                  cursor: isHost ? 'pointer' : 'default', color: 'var(--ink-black)',
                }}>
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Public toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--surface-low)', borderRadius: 8, border: 'var(--border-2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--secondary)' }}>public</span>
              <span style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 14 }}>Public Lobby</span>
            </div>
            <input type="checkbox" checked={!!settings.isPublic} disabled={!isHost}
              onChange={e => updateSetting('isPublic', e.target.checked)}
              style={{ width: 18, height: 18, cursor: 'pointer', accentColor: 'var(--primary)' }} />
          </div>

          {/* Actions */}
          <div style={{ paddingTop: 14, borderTop: 'var(--border)', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {isHost ? (
              <button className="btn btn-yellow" style={{ width: '100%' }}
                onClick={() => {
                  if (players.length < 2) { alert('Need at least 2 players!'); return }
                  socket.emit('start_game')
                }}>
                <span className="material-symbols-outlined icon-fill">play_circle</span>
                START GAME
              </button>
            ) : (
              <button className="btn btn-mint" style={{ width: '100%' }} onClick={() => socket.emit('player_ready')}>
                <span className="material-symbols-outlined">{myPlayer?.isReady ? 'close' : 'check_circle'}</span>
                {myPlayer?.isReady ? 'Not Ready' : 'Ready Up!'}
              </button>
            )}
            <button onClick={() => { socket.emit('leave_room'); navigate('/') }}
              style={{ background: 'none', border: 'none', color: 'var(--error)', fontFamily: 'var(--font-mono)', fontSize: 12, cursor: 'pointer', padding: '6px 0', letterSpacing: '0.05em', textTransform: 'uppercase', fontWeight: 700 }}>
              Leave Room
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
