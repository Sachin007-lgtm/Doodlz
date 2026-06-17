import { useEffect, useRef, useState } from 'react'
import { useSocket } from '../context/SocketContext'
import { useGame } from '../context/GameContext'

export default function ChatPanel({ isDrawer }) {
  const { socket } = useSocket()
  const { chat } = useGame()
  const [input, setInput] = useState('')
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chat])

  const send = () => {
    const text = input.trim()
    if (!text || isDrawer) return
    socket?.emit('guess', { text })
    setInput('')
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0,
      border: 'var(--border)', borderRadius: 10, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
      <div className="custom-scroll" style={{ flex: 1, padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 4, overflowY: 'auto', background: 'var(--chat-bg, #12101a)' }}>
        {chat.length === 0 && (
          <p style={{ color: 'var(--on-surface-variant)', fontSize: 12, fontStyle: 'italic', textAlign: 'center', marginTop: 12 }}>
            No guesses yet!
          </p>
        )}
        {chat.map(msg => (
          <div key={msg.id}>
            {msg.type === 'correct' ? (
              <div className="chat-correct" style={{ fontSize: 13 }}>{msg.text}</div>
            ) : msg.type === 'system' ? (
              <div className="chat-system" style={{ fontSize: 12 }}>{msg.text}</div>
            ) : (
              <div style={{ fontSize: 13 }}>
                <span style={{ fontWeight: 700, color: 'var(--ink-black)' }}>{msg.sender}: </span>
                <span style={{ color: 'var(--on-surface-variant)' }}>{msg.text}</span>
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div style={{ borderTop: 'var(--border-2)', padding: '6px 8px', display: 'flex', gap: 6, background: 'var(--surface-low)' }}>
        {isDrawer ? (
          <p style={{ flex: 1, fontSize: 13, color: 'var(--on-surface-variant)', fontStyle: 'italic', padding: '6px 0' }}>
            🎨 You're drawing!
          </p>
        ) : (
          <>
            <input className="input"
              style={{ flex: 1, padding: '6px 10px', fontSize: 13 }}
              placeholder="Type your guess..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
              maxLength={80}
            />
            <button className="btn btn-primary"
              style={{ width: 36, height: 36, borderRadius: '50%', padding: 0, flexShrink: 0 }}
              onClick={send}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>send</span>
            </button>
          </>
        )}
      </div>
    </div>
  )
}
