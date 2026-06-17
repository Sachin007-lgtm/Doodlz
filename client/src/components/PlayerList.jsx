import { useState } from 'react'
import { useSocket } from '../context/SocketContext'
import { useGame } from '../context/GameContext'

export default function PlayerList({ players, myId, currentDrawerId }) {
  const { socket } = useSocket()
  const { myPlayer } = useGame()
  const [menuOpenPlayerId, setMenuOpenPlayerId] = useState(null)

  const activePlayers = players.filter(p => !p.isSpectator)
  const spectatorPlayers = players.filter(p => p.isSpectator)

  const sortedActive = [...activePlayers].sort((a, b) => b.score - a.score)
  const sortedSpectators = [...spectatorPlayers].sort((a, b) => a.name.localeCompare(b.name))
  const sorted = [...sortedActive, ...sortedSpectators]

  const handleKick = (targetId) => {
    socket?.emit('kick_player', { targetPlayerId: targetId })
    setMenuOpenPlayerId(null)
  }

  const handleBan = (targetId) => {
    socket?.emit('ban_player', { targetPlayerId: targetId })
    setMenuOpenPlayerId(null)
  }

  const handleVotekick = (targetId) => {
    socket?.emit('votekick_player', { targetPlayerId: targetId })
    setMenuOpenPlayerId(null)
  }

  const handleReport = (targetId) => {
    const reason = window.prompt("Enter reason for reporting this player:")
    if (reason && reason.trim()) {
      socket?.emit('report_player', { targetPlayerId: targetId, reason: reason.trim() })
    }
    setMenuOpenPlayerId(null)
  }

  return (
    <div style={{ border: 'var(--border)', borderRadius: 8, overflow: 'hidden', boxShadow: 'var(--shadow-sm)', background: 'var(--list-bg, rgba(0,0,0,0.2))', position: 'relative' }}>
      {/* Click outside backdrop */}
      {menuOpenPlayerId && (
        <div 
          onClick={() => setMenuOpenPlayerId(null)} 
          style={{ position: 'fixed', inset: 0, zIndex: 99, background: 'transparent' }} 
        />
      )}

      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, var(--primary), var(--primary-light))', color: '#ffffff',
        padding: '6px 10px', textAlign: 'center',
        fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase',
        fontWeight: 800, borderBottom: '1px solid rgba(255, 255, 255, 0.15)'
      }}>
        Leaderboard
      </div>

      {sorted.map((p, i) => {
        const isMe      = p.id === myId
        const isDrawing = p.id === currentDrawerId
        const rankColor = i === 0 ? 'var(--rank-1-color)' : i === 1 ? 'var(--rank-2-color)' : i === 2 ? 'var(--rank-3-color)' : 'var(--rank-other-color)'
        
        return (
          <div key={p.id} 
            onClick={() => { if (!isMe) setMenuOpenPlayerId(menuOpenPlayerId === p.id ? null : p.id) }}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
              background: p.hasGuessedCorrectly 
                ? 'var(--row-correct-bg)' 
                : isMe 
                  ? 'var(--row-me-bg)' 
                  : i % 2 === 0 
                    ? 'var(--row-even-bg)' 
                    : 'var(--row-odd-bg)',
              borderBottom: i < sorted.length - 1 ? 'var(--border-2)' : 'none',
              borderLeft: p.isSpectator
                ? '4px solid var(--border)'
                : p.hasGuessedCorrectly
                  ? '4px solid var(--success-mint)'
                  : isDrawing
                    ? '4px solid var(--accent-yellow)'
                    : isMe
                      ? '4px solid var(--secondary)'
                      : '4px solid transparent',
              transition: 'all 0.2s ease',
              cursor: isMe ? 'default' : 'pointer',
              position: 'relative',
            }}>
            {/* Rank or Spec Badge */}
            {p.isSpectator ? (
              <span className="material-symbols-outlined" style={{
                width: 18, fontSize: 14, color: 'var(--on-surface-variant)', flexShrink: 0
              }}>visibility</span>
            ) : (
              <span style={{
                width: 18, fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 13,
                color: rankColor,
                flexShrink: 0,
                textShadow: i < 3 ? '0 0 8px rgba(0,0,0,0.5)' : 'none'
              }}>#{i + 1}</span>
            )}

            {/* Avatar */}
            <img
              src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(p.avatarSeed)}&backgroundColor=b6e3f4,c0aede,d1d4f9`}
              alt={p.name}
              style={{ 
                width: 32, height: 32, borderRadius: '50%', 
                border: isDrawing ? '2px solid var(--accent-yellow)' : isMe ? '2px solid var(--secondary)' : '1.5px solid var(--border-2)', 
                background: 'var(--secondary-container)', flexShrink: 0,
                boxShadow: isDrawing ? '0 0 8px var(--accent-yellow)' : 'none',
                opacity: p.isSpectator ? 0.7 : 1,
              }}
            />

            {/* Name */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 12,
                color: p.hasGuessedCorrectly ? 'var(--row-correct-fg)' : 'var(--ink-black)', 
                textShadow: p.hasGuessedCorrectly ? '0 1px 2px rgba(0,0,0,0.8)' : 'none',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}>
                <span style={{ textDecoration: p.hasGuessedCorrectly ? 'none' : 'none' }}>{p.name}</span>
                {isDrawing && <span title="Drawing" style={{ fontSize: 11 }}>✍️</span>}
                {p.hasGuessedCorrectly && <span title="Guessed Correctly" style={{ fontSize: 11, color: 'var(--success-mint)' }}>✅</span>}
                {p.isSpectator && <span title="Spectating" style={{ fontSize: 11 }}>👁️</span>}
                {isMe && <span style={{ color: 'var(--secondary)', fontSize: 10, fontWeight: 500 }}>(you)</span>}
              </p>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--on-surface-variant)', margin: 0 }}>
                {p.isSpectator ? 'Spectating' : `${p.score?.toLocaleString()} pts`}
              </p>
            </div>

            {/* Action Popup */}
            {menuOpenPlayerId === p.id && (
              <div 
                onClick={e => e.stopPropagation()} // Prevent clicking popup closing itself
                style={{
                  position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                  background: '#1c1a27', border: '2px solid rgba(255,255,255,0.3)',
                  borderRadius: 8, padding: '4px 6px', display: 'flex', gap: 4, zIndex: 100,
                  boxShadow: '0 4px 16px rgba(0,0,0,0.6)',
                  animation: 'pop-in 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
                }}>
                {myPlayer?.isHost ? (
                  <>
                    <button className="btn btn-ghost" style={{ padding: '2px 8px', fontSize: 10, borderRadius: 6, height: 'auto', border: '1px solid var(--error)', color: 'var(--error)', margin: 0 }}
                      onClick={() => handleKick(p.id)}>
                      Kick
                    </button>
                    <button className="btn btn-ghost" style={{ padding: '2px 8px', fontSize: 10, borderRadius: 6, height: 'auto', background: 'var(--error)', color: '#ffffff', border: '1px solid var(--error)', margin: 0 }}
                      onClick={() => handleBan(p.id)}>
                      Ban
                    </button>
                  </>
                ) : (
                  <>
                    <button className="btn btn-ghost" style={{ padding: '2px 8px', fontSize: 10, borderRadius: 6, height: 'auto', border: '1px solid var(--accent-yellow)', color: 'var(--accent-yellow)', margin: 0 }}
                      onClick={() => handleVotekick(p.id)}>
                      Votekick
                    </button>
                    <button className="btn btn-ghost" style={{ padding: '2px 8px', fontSize: 10, borderRadius: 6, height: 'auto', border: '1px solid var(--secondary)', color: 'var(--secondary)', margin: 0 }}
                      onClick={() => handleReport(p.id)}>
                      Report
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
