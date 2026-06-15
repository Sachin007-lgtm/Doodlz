export default function PlayerList({ players, myId, currentDrawerId }) {
  const sorted = [...players].sort((a, b) => b.score - a.score)

  return (
    <div style={{ border: 'var(--border)', borderRadius: 8, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
      {/* Header */}
      <div style={{
        background: 'var(--ink-black)', color: 'var(--paper-white)',
        padding: '5px 10px', textAlign: 'center',
        fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase',
      }}>
        Leaderboard
      </div>

      {sorted.map((p, i) => {
        const isMe      = p.id === myId
        const isDrawing = p.id === currentDrawerId
        return (
          <div key={p.id} style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px',
            background: isMe ? 'rgba(91,60,221,0.08)' : i % 2 === 0 ? 'var(--paper-white)' : 'var(--surface-low)',
            borderBottom: i < sorted.length - 1 ? '1px solid var(--surface-high)' : 'none',
          }}>
            {/* Rank */}
            <span style={{
              width: 18, fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 12,
              color: i === 0 ? 'var(--primary)' : 'var(--on-surface-variant)',
              flexShrink: 0,
            }}>#{i + 1}</span>

            {/* Avatar */}
            <img
              src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(p.avatarSeed)}&backgroundColor=b6e3f4,c0aede,d1d4f9`}
              alt={p.name}
              style={{ width: 30, height: 30, borderRadius: '50%', border: 'var(--border-2)', background: 'var(--secondary-container)', flexShrink: 0 }}
            />

            {/* Name */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 12,
                color: 'var(--ink-black)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {p.name}{isDrawing ? ' ✍️' : ''}{p.hasGuessedCorrectly ? ' ✅' : ''}
                {isMe && <span style={{ color: 'var(--secondary)', fontWeight: 500, marginLeft: 4 }}>(you)</span>}
              </p>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--on-surface-variant)' }}>
                {p.score?.toLocaleString()} pts
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
