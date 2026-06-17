export default function Timer({ timeLeft, drawTime }) {
  const pct  = drawTime > 0 ? timeLeft / drawTime : 1
  const tier = pct > 0.5 ? 'safe' : pct > 0.25 ? 'warn' : 'danger'
  const borderCol = `var(--timer-border-${tier})`
  const bg = `var(--timer-bg-${tier})`
  const fg = `var(--timer-fg-${tier})`

  return (
    <div style={{
      width: 52, height: 52, borderRadius: '50%',
      border: `2px solid ${borderCol}`, 
      boxShadow: `0 0 10px ${bg}`,
      background: bg, color: fg,
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column',
      transition: 'all 0.5s ease',
      animation: tier === 'danger' ? 'pulse 1s infinite alternate' : 'none',
      flexShrink: 0,
    }}>
      <span style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 900, lineHeight: 1 }}>
        {timeLeft}
      </span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.05em', opacity: 0.8 }}>SEC</span>
    </div>
  )
}
