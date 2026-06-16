export default function PlayerList({ players, myId, currentDrawerId }) {
  const sorted = [...players].sort((a, b) => b.score - a.score)

  return (
    <div style={{ border: 'var(--border)', borderRadius: 8, overflow: 'hidden', boxShadow: 'var(--shadow-sm)', background: 'rgba(0,0,0,0.2)' }}>
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
        const rankColor = i === 0 ? '#ffe16d' : i === 1 ? '#d1d5db' : i === 2 ? '#b45309' : 'rgba(255,255,255,0.5)'
        
        return (
          <div key={p.id} style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
            background: p.hasGuessedCorrectly 
              ? 'rgba(0, 250, 154, 0.1)' 
              : isMe 
                ? 'rgba(0, 180, 216, 0.1)' 
                : i % 2 === 0 
                  ? 'rgba(255, 255, 255, 0.04)' 
                  : 'rgba(0, 0, 0, 0.15)',
            borderBottom: i < sorted.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
            borderLeft: p.hasGuessedCorrectly
              ? '4px solid var(--success-mint)'
              : isDrawing
                ? '4px solid var(--accent-yellow)'
                : isMe
                  ? '4px solid var(--secondary)'
                  : '4px solid transparent',
            transition: 'all 0.2s ease',
          }}>
            {/* Rank */}
            <span style={{
              width: 18, fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 13,
              color: rankColor,
              flexShrink: 0,
              textShadow: i < 3 ? '0 0 8px rgba(0,0,0,0.5)' : 'none'
            }}>#{i + 1}</span>

            {/* Avatar */}
            <img
              src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(p.avatarSeed)}&backgroundColor=b6e3f4,c0aede,d1d4f9`}
              alt={p.name}
              style={{ 
                width: 32, height: 32, borderRadius: '50%', 
                border: isDrawing ? '2px solid var(--accent-yellow)' : isMe ? '2px solid var(--secondary)' : '1.5px solid rgba(255,255,255,0.2)', 
                background: 'var(--secondary-container)', flexShrink: 0,
                boxShadow: isDrawing ? '0 0 8px var(--accent-yellow)' : 'none'
              }}
            />

            {/* Name */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 12,
                color: p.hasGuessedCorrectly ? 'var(--success-mint)' : '#ffffff', 
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}>
                <span style={{ textDecoration: p.hasGuessedCorrectly ? 'none' : 'none' }}>{p.name}</span>
                {isDrawing && <span title="Drawing" style={{ fontSize: 11 }}>✍️</span>}
                {p.hasGuessedCorrectly && <span title="Guessed Correctly" style={{ fontSize: 11, color: 'var(--success-mint)' }}>✅</span>}
                {isMe && <span style={{ color: 'var(--secondary)', fontSize: 10, fontWeight: 500 }}>(you)</span>}
              </p>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'rgba(255,255,255,0.5)', margin: 0 }}>
                {p.score?.toLocaleString()} pts
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
