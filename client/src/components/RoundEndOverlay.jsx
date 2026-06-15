export default function RoundEndOverlay({ word, scores }) {
  const sorted = [...(scores || [])].sort((a, b) => b.score - a.score)

  return (
    <div className="overlay">
      <div className="neo-card animate-pop-in"
        style={{ padding: '28px 32px', maxWidth: 440, width: '90%', textAlign: 'center' }}>
        <div style={{ fontSize: 36, marginBottom: 6 }}>🔔</div>
        <h2 className="text-headline" style={{ color: 'var(--ink-black)', marginBottom: 4 }}>Round Over!</h2>
        <p style={{ fontSize: 14, color: 'var(--on-surface-variant)', marginBottom: 14 }}>The word was:</p>

        <div style={{
          display: 'inline-block', background: 'var(--primary)', color: 'white',
          borderRadius: 10, padding: '10px 28px', border: 'var(--border)',
          boxShadow: 'var(--shadow-sm)', marginBottom: 20,
        }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {word}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 220, overflowY: 'auto' }}>
          {sorted.map((s, i) => (
            <div key={s.id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '8px 12px', background: i === 0 ? 'var(--primary-container)' : 'var(--surface-low)',
              borderRadius: 8, border: 'var(--border-2)',
            }}>
              <span style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 14 }}>
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i+1}`} {s.name}
              </span>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {(s.roundScore || 0) > 0 && (
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: 12, color: '#007a48',
                    background: 'rgba(0,250,154,0.15)', padding: '2px 8px', borderRadius: 6, fontWeight: 700,
                  }}>+{s.roundScore}</span>
                )}
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 16, color: 'var(--primary)' }}>
                  {s.score?.toLocaleString()}
                </span>
              </div>
            </div>
          ))}
        </div>

        <p style={{ fontSize: 13, color: 'var(--on-surface-variant)', marginTop: 14 }}>
          Next round starting soon…
        </p>
      </div>
    </div>
  )
}
