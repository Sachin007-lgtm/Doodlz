export default function WordBlanks({ hint, blankWord, isDrawer, currentWord }) {
  const display = isDrawer ? currentWord : (hint || blankWord || '')
  if (!display) return (
    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--on-surface-variant)', fontStyle: 'italic' }}>
      Waiting for word…
    </span>
  )

  const chars = display.split('')
  const letterCount = display.replace(/\s/g, '').length

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 3, justifyContent: 'center' }}>
        {chars.map((ch, i) => {
          if (ch === ' ') return <div key={i} style={{ width: 12 }} />
          const revealed = ch !== '_'
          return (
            <span key={i} style={{
              display: 'inline-block',
              minWidth: 18,
              textAlign: 'center',
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(14px, 2.2vw, 22px)',
              fontWeight: 800,
              borderBottom: '3.5px solid var(--ink-black)',
              margin: '0 4px',
              color: isDrawer ? 'var(--word-blank-color)' : revealed ? 'var(--word-blank-color)' : 'transparent',
              transition: 'color 0.3s',
            }}>
              {ch === '_' ? '\u00A0' : ch}
            </span>
          )
        })}
      </div>
      
      <span style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 12,
        fontWeight: 800,
        color: 'var(--word-badge-color)',
        background: 'var(--word-badge-bg)',
        padding: '3px 8px',
        borderRadius: 8,
        border: 'var(--word-badge-border)',
        flexShrink: 0,
        boxShadow: 'var(--shadow-sm)'
      }}>
        ({letterCount} letters)
      </span>
    </div>
  )
}
