import { useSocket } from '../context/SocketContext'

export default function WordChoiceOverlay({ wordOptions, drawerName, isDrawer }) {
  const { socket } = useSocket()

  const choose = (word) => socket?.emit('word_chosen', { word })

  return (
    <div className="overlay">
      <div className="neo-card animate-pop-in"
        style={{ padding: '32px 36px', maxWidth: 440, width: '90%', textAlign: 'center' }}>
        {isDrawer ? (
          <>
            <div style={{ fontSize: 40, marginBottom: 10 }}>🎨</div>
            <h2 className="text-headline" style={{ marginBottom: 6, color: 'var(--ink-black)' }}>Choose a word to draw!</h2>
            <p style={{ fontSize: 14, color: 'var(--on-surface-variant)', marginBottom: 24 }}>
              Pick wisely — you have 15 seconds!
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(wordOptions || []).map((word, i) => {
                const colors = [
                  { bg: 'var(--primary)', color: 'white' },
                  { bg: 'var(--secondary)', color: 'white' },
                  { bg: 'var(--accent-yellow)', color: 'var(--ink-black)' },
                ]
                const c = colors[i] || colors[0]
                return (
                  <button key={word} onClick={() => choose(word)}
                    style={{
                      width: '100%', padding: '14px 0',
                      background: c.bg, color: c.color,
                      border: 'var(--border)', borderRadius: 10,
                      boxShadow: 'var(--shadow-sm)',
                      fontFamily: 'var(--font-display)', fontWeight: 800,
                      fontSize: 20, letterSpacing: '0.06em',
                      cursor: 'pointer', transition: 'var(--transition)',
                      textTransform: 'uppercase',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translate(-2px,-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow)' }}
                    onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = 'var(--shadow-sm)' }}>
                    {word}
                  </button>
                )
              })}
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 40, marginBottom: 10 }}>⏳</div>
            <h2 className="text-headline" style={{ color: 'var(--ink-black)', marginBottom: 8 }}>
              {drawerName} is choosing a word…
            </h2>
            <p style={{ fontSize: 14, color: 'var(--on-surface-variant)' }}>Get ready to guess!</p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{
                  width: 10, height: 10, borderRadius: '50%', background: 'var(--primary)',
                  animation: `bounce-gentle ${0.8 + i * 0.2}s ease-in-out ${i * 0.15}s infinite`,
                }} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
