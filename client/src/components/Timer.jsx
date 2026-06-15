export default function Timer({ timeLeft, drawTime }) {
  const pct  = drawTime > 0 ? timeLeft / drawTime : 1
  const tier = pct > 0.5 ? 'safe' : pct > 0.25 ? 'warn' : 'danger'
  const bg   = { safe: 'var(--secondary-fixed)', warn: 'var(--accent-yellow)', danger: 'var(--error-container)' }[tier]
  const fg   = { safe: 'var(--secondary)', warn: 'var(--ink-black)', danger: 'var(--error)' }[tier]

  return (
    <div style={{
      width: 52, height: 52, borderRadius: '50%',
      border: 'var(--border)', boxShadow: 'var(--shadow-sm)',
      background: bg, color: fg,
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column',
      transition: 'background 0.5s',
      flexShrink: 0,
    }}>
      <span style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 900, lineHeight: 1 }}>
        {timeLeft}
      </span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.05em', opacity: 0.7 }}>SEC</span>
    </div>
  )
}
