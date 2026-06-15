import { useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useGame } from '../context/GameContext'
import { useSocket } from '../context/SocketContext'

const avatar = seed =>
  `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(seed)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc`

const CONFETTI_COLORS = ['#5b3cdd','#0c6780','#ffe16d','#ba1a1a','#00FA9A','#ec4899','#f97316']

function Confetti() {
  const ref = useRef(null)
  useEffect(() => {
    const container = ref.current
    if (!container) return
    const pieces = Array.from({ length: 55 }, () => {
      const el = document.createElement('div')
      el.className = 'confetti-piece'
      el.style.cssText = [
        `left:${Math.random() * 100}vw`,
        `background:${CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)]}`,
        `border-radius:${Math.random() > 0.5 ? '50%' : '2px'}`,
        `animation-duration:${(Math.random() * 3 + 2).toFixed(1)}s`,
        `animation-delay:${(Math.random() * 3).toFixed(1)}s`,
      ].join(';')
      container.appendChild(el)
      return el
    })
    return () => pieces.forEach(p => p.remove())
  }, [])
  return <div ref={ref} style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 999 }} />
}

export default function GameOverPage() {
  const { roomId } = useParams()
  const navigate   = useNavigate()
  const { socket } = useSocket()
  const { gameOverData, myPlayer, resetGame } = useGame()

  const leaderboard = gameOverData?.leaderboard || []
  const top3 = leaderboard.slice(0, 3)
  const myId = myPlayer?.id

  // Podium: 2nd, 1st, 3rd
  const podiumSlots = [
    { player: top3[1], rank: 2, h: 110, avatarSz: 72, delay: '-0.4s' },
    { player: top3[0], rank: 1, h: 160, avatarSz: 92, delay: '0s', crown: true },
    { player: top3[2], rank: 3, h: 80,  avatarSz: 64, delay: '-0.8s' },
  ].filter(s => s.player)

  const handlePlayAgain = () => {
    resetGame()
    navigate(`/game/${roomId}`)
  }

  const handleHome = () => { resetGame(); navigate('/') }

  return (
    <div className="page-wrapper custom-scroll" style={{ overflowY: 'auto', background: 'transparent', position: 'relative' }}>
      <Confetti />

      <main style={{ maxWidth: 720, margin: '0 auto', padding: '40px 20px 60px', position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        
        {/* Top Logo */}
        <div style={{ textAlign: 'center', marginBottom: 30, position: 'relative', width: '100%' }}>
          <span className="logo" style={{ fontSize: 'clamp(40px, 6vw, 60px)', textShadow: '0 8px 16px rgba(0,0,0,0.6)' }}>Doodlz</span>
          
          <div style={{ position: 'absolute', top: 10, right: 0, display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost btn-icon" onClick={handlePlayAgain} title="Play Again">
              <span className="material-symbols-outlined">replay</span>
            </button>
            <button className="btn btn-ghost btn-icon" onClick={handleHome} title="Home">
              <span className="material-symbols-outlined">home</span>
            </button>
          </div>
        </div>

        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontWeight: 900, fontStyle: 'italic',
            fontSize: 'clamp(36px,7vw,64px)', color: 'var(--primary)',
            textShadow: '4px 4px 0 var(--ink-black)', marginBottom: 6,
          }}>GAME OVER</h1>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 16, color: 'var(--on-surface-variant)' }}>
            Congratulations to the master artists! 🎨
          </p>
        </div>

        {/* Podium */}
        {leaderboard.length >= 2 && (
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 14, marginBottom: 40 }}>
            {podiumSlots.map(({ player, rank, h, avatarSz, delay, crown }) => {
              const podiumBg = { 1: 'var(--primary)', 2: 'var(--secondary)', 3: 'var(--surface-highest)' }[rank]
              const textCol  = { 1: 'white', 2: 'white', 3: 'var(--on-surface)' }[rank]
              return (
                <div key={rank} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: rank === 1 ? 180 : 150 }}>
                  {/* Avatar */}
                  <div className="animate-bounce-gentle" style={{ animationDelay: delay, position: 'relative', marginBottom: 12 }}>
                    {crown && (
                      <span className="material-symbols-outlined icon-fill" style={{
                        position: 'absolute', top: -28, left: '50%', transform: 'translateX(-50%)',
                        fontSize: 30, color: 'var(--accent-yellow)', filter: 'drop-shadow(2px 2px 0 var(--ink-black))',
                      }}>workspace_premium</span>
                    )}
                    <img src={avatar(player.avatarSeed)} alt={player.name} style={{
                      width: avatarSz, height: avatarSz, borderRadius: '50%',
                      border: 'var(--border)', background: 'var(--secondary-container)',
                      boxShadow: 'var(--shadow)',
                    }} />
                    <div style={{
                      position: 'absolute', bottom: -8, right: -8,
                      width: rank === 1 ? 34 : 28, height: rank === 1 ? 34 : 28,
                      background: rank === 1 ? 'var(--accent-yellow)' : 'var(--paper-white)',
                      border: 'var(--border)', borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: rank === 1 ? 15 : 13,
                      boxShadow: 'var(--shadow-sm)',
                    }}>
                      {rank}
                    </div>
                  </div>
                  {/* Podium block */}
                  <div style={{
                    width: '100%', height: h, background: podiumBg,
                    border: 'var(--border)', borderBottom: 'none', boxShadow: 'var(--shadow)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: rank === 1 ? 17 : 14, color: textCol }}>
                      {player.name}
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: rank === 1 ? 'var(--accent-yellow)' : textCol, opacity: 0.9 }}>
                      {player.score?.toLocaleString()} pts
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Full leaderboard */}
        <div className="neo-card" style={{ overflow: 'hidden', marginBottom: 28 }}>
          <div style={{
            background: 'var(--surface-low)', padding: '12px 18px',
            borderBottom: 'var(--border)', display: 'flex', justifyContent: 'space-between',
          }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16, textTransform: 'uppercase', color: 'var(--ink-black)' }}>
              Final Scores
            </h3>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--on-surface-variant)' }}>
              {leaderboard.length} players
            </span>
          </div>

          {leaderboard.map((p, i) => (
            <div key={p.id} style={{
              display: 'flex', alignItems: 'center', padding: '10px 18px',
              background: p.id === myId ? 'rgba(91,60,221,0.06)' : i % 2 === 0 ? 'transparent' : 'var(--surface-low)',
              borderBottom: i < leaderboard.length - 1 ? '1px solid var(--surface-high)' : 'none',
            }}>
              <span style={{ width: 28, fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 15, color: i < 3 ? 'var(--ink-black)' : 'var(--on-surface-variant)' }}>
                #{i + 1}
              </span>
              <img src={avatar(p.avatarSeed)} alt={p.name} style={{
                width: 36, height: 36, borderRadius: '50%', border: 'var(--border-2)',
                background: 'var(--secondary-container)', marginRight: 12,
              }} />
              <span style={{ flex: 1, fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 15, color: 'var(--ink-black)' }}>
                {p.name}
                {p.id === myId && <span style={{ color: 'var(--secondary)', fontWeight: 500, fontSize: 13, marginLeft: 6 }}>(you)</span>}
              </span>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 17, color: i === 0 ? 'var(--primary)' : 'var(--on-surface)' }}>
                {p.score?.toLocaleString()} pts
              </span>
            </div>
          ))}
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
          <button className="btn btn-primary" style={{ minWidth: 200, padding: '13px 28px', fontSize: 16 }}
            onClick={handlePlayAgain}>
            <span className="material-symbols-outlined">replay</span>
            Play Again
          </button>
          <button className="btn btn-cyan" style={{ minWidth: 200, padding: '13px 28px', fontSize: 16 }}
            onClick={handleHome}>
            <span className="material-symbols-outlined">home</span>
            Back to Home
          </button>
        </div>
      </main>
    </div>
  )
}
