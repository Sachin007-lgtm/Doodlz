export default function WordBlanks({ hint, blankWord, isDrawer, currentWord }) {
  const display = isDrawer ? currentWord : (hint || blankWord || '')
  if (!display) return (
    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--on-surface-variant)', fontStyle: 'italic' }}>
      Waiting for word…
    </span>
  )

  const chars = display.split('')

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 3, justifyContent: 'center' }}>
      {chars.map((ch, i) => {
        if (ch === ' ') return <div key={i} style={{ width: 12 }} />
        const revealed = ch !== '_'
        return (
          <span key={i} style={{
            display: 'inline-block',
            minWidth: 16,
            textAlign: 'center',
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(14px, 2.2vw, 22px)',
            fontWeight: 800,
            borderBottom: '3px solid var(--ink-black)',
            margin: '0 1px',
            color: isDrawer ? 'var(--primary)' : revealed ? 'var(--primary)' : 'transparent',
            transition: 'color 0.3s',
          }}>
            {ch === '_' ? '\u00A0' : ch}
          </span>
        )
      })}
    </div>
  )
}
