import { useEffect, useRef, useState } from 'react'
import { useCanvas } from '../hooks/useCanvas'

const COLORS = [
  '#000000','#6b7280','#ef4444','#f97316','#eab308',
  '#22c55e','#3b82f6','#7c3aed','#ec4899','#92400e',
  '#ffffff','#fde68a','#a7f3d0','#bfdbfe','#ddd6fe',
]
const SIZES = [3, 6, 12, 20]

const TOOLS = [
  { id: 'brush',  icon: 'brush',      label: 'Pen'    },
  { id: 'eraser', icon: 'ink_eraser', label: 'Eraser' },
  { id: 'fill',   icon: 'format_color_fill', label: 'Fill'   },
]

export default function Canvas({ isDrawer }) {
  const canvasRef  = useRef(null)
  const wrapperRef = useRef(null)

  const [activeColor, setActiveColor] = useState('#000000')
  const [brushSize,   setBrushSize]   = useState(6)
  const [activeTool,  setActiveTool]  = useState('brush')
  const [sizeOpen,    setSizeOpen]    = useState(false)

  const { onPointerDown, onPointerMove, onPointerUp, clearCanvas, undoStroke } =
    useCanvas({ isDrawer, canvasRef, activeTool, activeColor, brushSize })

  // Keep canvas pixel dimensions = wrapper CSS size
  useEffect(() => {
    const resize = () => {
      const wrapper = wrapperRef.current
      const canvas  = canvasRef.current
      if (!wrapper || !canvas) return
      const { width, height } = wrapper.getBoundingClientRect()
      // Preserve existing drawing
      const tmp = document.createElement('canvas')
      tmp.width = canvas.width; tmp.height = canvas.height
      tmp.getContext('2d').drawImage(canvas, 0, 0)
      canvas.width = width; canvas.height = height
      canvas.getContext('2d').drawImage(tmp, 0, 0)
    }
    resize()
    const ro = new ResizeObserver(resize)
    if (wrapperRef.current) ro.observe(wrapperRef.current)
    return () => ro.disconnect()
  }, [])

  // Cursor per tool
  const cursor = !isDrawer ? 'not-allowed'
    : activeTool === 'eraser' ? 'cell'
    : activeTool === 'fill'   ? 'crosshair'
    : 'crosshair'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minHeight: 0 }}>
      {/* Canvas surface */}
      <div ref={wrapperRef} className="canvas-wrapper"
        style={{ flex: 1, minHeight: 300, cursor }}>
        <canvas
          ref={canvasRef}
          style={{ display: 'block', width: '100%', height: '100%', touchAction: 'none' }}
          onMouseDown={onPointerDown}
          onMouseMove={onPointerMove}
          onMouseUp={onPointerUp}
          onMouseLeave={onPointerUp}
          onTouchStart={onPointerDown}
          onTouchMove={onPointerMove}
          onTouchEnd={onPointerUp}
        />
      </div>

      {/* Toolbar — only visible to drawer */}
      {isDrawer && (
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '0 4px' }}>
          {/* Color palette */}
          <div className="neo-card-sm" style={{ padding: '6px 8px', display: 'flex', flexWrap: 'wrap', gap: 4, maxWidth: 248 }}>
            {COLORS.map(c => (
              <button key={c} title={c}
                onClick={() => { setActiveColor(c); if (activeTool === 'eraser') setActiveTool('brush') }}
                style={{
                  width: 22, height: 22, borderRadius: '50%', background: c,
                  border: activeColor === c && activeTool !== 'eraser' ? '3px solid var(--primary)' : '2px solid var(--ink-black)',
                  cursor: 'pointer',
                  transform: activeColor === c && activeTool !== 'eraser' ? 'scale(1.25)' : 'scale(1)',
                  transition: 'transform 0.1s',
                  outline: c === '#ffffff' ? '1px solid #ccc' : 'none',
                  flexShrink: 0,
                }} />
            ))}
          </div>

          {/* Tool buttons row */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
            {/* Pen / Eraser / Fill */}
            {TOOLS.map(t => (
              <div key={t.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <button onClick={() => setActiveTool(t.id)} style={{
                  width: 44, height: 44,
                  background: activeTool === t.id ? 'var(--accent-yellow)' : 'var(--paper-white)',
                  border: 'var(--border)', borderRadius: '12px 12px 4px 4px',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: 'var(--shadow-sm)', transition: 'var(--transition)',
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 22 }}>{t.icon}</span>
                </button>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--on-surface-variant)' }}>{t.label}</span>
              </div>
            ))}

            {/* Brush size */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, position: 'relative' }}>
              <button onClick={() => setSizeOpen(p => !p)} style={{
                width: 44, height: 44, background: sizeOpen ? 'var(--primary-container)' : 'var(--paper-white)',
                border: 'var(--border)', borderRadius: '12px 12px 4px 4px',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: 'var(--shadow-sm)',
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: 22 }}>line_weight</span>
              </button>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--on-surface-variant)' }}>Size</span>
              {sizeOpen && (
                <div className="neo-card-sm" style={{
                  position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
                  padding: '8px 14px', display: 'flex', gap: 12, marginBottom: 6, zIndex: 30,
                  alignItems: 'center', whiteSpace: 'nowrap',
                }}>
                  {SIZES.map(s => (
                    <button key={s} title={`${s}px`}
                      onClick={() => { setBrushSize(s); setSizeOpen(false) }}
                      style={{
                        width: Math.max(s + 8, 18), height: Math.max(s + 8, 18),
                        borderRadius: '50%', background: 'var(--ink-black)',
                        border: brushSize === s ? '3px solid var(--primary)' : '2px solid transparent',
                        cursor: 'pointer', flexShrink: 0,
                      }} />
                  ))}
                </div>
              )}
            </div>

            {/* Undo */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <button onClick={undoStroke} style={{
                width: 44, height: 44, background: 'var(--paper-white)',
                border: 'var(--border)', borderRadius: '12px 12px 4px 4px',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: 'var(--shadow-sm)',
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: 22 }}>undo</span>
              </button>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--on-surface-variant)' }}>Undo</span>
            </div>

            {/* Clear */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <button onClick={clearCanvas} style={{
                width: 44, height: 44, background: 'var(--paper-white)',
                border: 'var(--border)', borderRadius: '12px 12px 4px 4px',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: 'var(--shadow-sm)',
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: 22 }}>delete</span>
              </button>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--on-surface-variant)' }}>Clear</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
