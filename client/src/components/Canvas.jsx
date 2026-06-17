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
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '6px 4px', background: 'var(--toolbar-bg)', borderRadius: 16, border: 'var(--toolbar-border)' }}>
          {/* Color palette */}
          <div className="neo-card-sm" style={{ padding: '6px 8px', display: 'flex', flexWrap: 'wrap', gap: 4, maxWidth: 248, background: 'var(--tool-btn-bg)', border: 'var(--tool-btn-border)' }}>
            {COLORS.map(c => {
              const isSelected = activeColor === c && activeTool !== 'eraser'
              return (
                <button key={c} title={c}
                  onClick={() => { setActiveColor(c); if (activeTool === 'eraser') setActiveTool('brush') }}
                  style={{
                    width: 22, height: 22, borderRadius: '50%', background: c,
                    border: isSelected ? '3px solid var(--tool-btn-fg)' : '1.5px solid var(--tool-btn-border)',
                    cursor: 'pointer',
                    transform: isSelected ? 'scale(1.3)' : 'scale(1)',
                    boxShadow: isSelected ? 'none' : '0 2px 5px rgba(0,0,0,0.3)',
                    transition: 'transform 0.15s, box-shadow 0.15s',
                    outline: 'none',
                    flexShrink: 0,
                  }}
                  onMouseEnter={e => { if(!isSelected) e.currentTarget.style.transform = 'scale(1.15)' }}
                  onMouseLeave={e => { if(!isSelected) e.currentTarget.style.transform = 'scale(1)' }}
                />
              )
            })}
          </div>

          {/* Tool buttons row */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
            {/* Pen / Eraser / Fill */}
            {TOOLS.map(t => {
              const isSelected = activeTool === t.id
              return (
                <div key={t.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <button onClick={() => setActiveTool(t.id)} style={{
                    width: 44, height: 44,
                    background: isSelected ? 'var(--accent-yellow)' : 'var(--tool-btn-bg)',
                    border: isSelected ? 'var(--tool-btn-selected-border)' : 'var(--tool-btn-border)', 
                    borderRadius: '12px',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: isSelected ? '0 0 10px rgba(255,225,109,0.4)' : '0 2px 6px rgba(0,0,0,0.15)', 
                    transition: 'all 0.15s ease',
                    transform: 'scale(1)',
                  }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)' }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)' }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 22, color: isSelected ? '#10002b' : 'var(--tool-btn-fg)', transition: 'color 0.15s' }}>{t.icon}</span>
                  </button>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: isSelected ? 'var(--accent-yellow)' : 'var(--tool-btn-label)', fontWeight: isSelected ? 700 : 500 }}>{t.label}</span>
                </div>
              )
            })}

            {/* Brush size */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, position: 'relative' }}>
              <button onClick={() => setSizeOpen(p => !p)} style={{
                width: 44, height: 44, 
                background: sizeOpen ? 'rgba(255,255,255,0.2)' : 'var(--tool-btn-bg)',
                border: sizeOpen ? '2px solid var(--accent-yellow)' : 'var(--tool-btn-border)', 
                borderRadius: '12px',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: sizeOpen ? '0 0 10px rgba(255,225,109,0.2)' : '0 2px 6px rgba(0,0,0,0.15)',
                transition: 'all 0.15s ease',
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 22, color: 'var(--tool-btn-fg)' }}>line_weight</span>
              </button>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: sizeOpen ? 'var(--accent-yellow)' : 'var(--tool-btn-label)' }}>Size</span>
              {sizeOpen && (
                <div className="neo-card-sm" style={{
                  position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
                  padding: '10px 14px', display: 'flex', gap: 12, marginBottom: 8, zIndex: 30,
                  alignItems: 'center', whiteSpace: 'nowrap',
                  background: 'var(--size-popup-bg)',
                  border: 'var(--size-popup-border)',
                  boxShadow: 'var(--size-popup-shadow)'
                }}>
                  {SIZES.map(s => (
                    <button key={s} title={`${s}px`}
                      onClick={() => { setBrushSize(s); setSizeOpen(false) }}
                      style={{
                        width: Math.max(s + 8, 18), height: Math.max(s + 8, 18),
                        borderRadius: '50%', background: '#ffffff',
                        border: brushSize === s ? '3.5px solid var(--accent-yellow)' : '2px solid transparent',
                        cursor: 'pointer', flexShrink: 0,
                        transition: 'transform 0.1s',
                        boxShadow: brushSize === s ? '0 0 8px var(--accent-yellow)' : 'none'
                      }}
                      onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.2)'}
                      onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Undo */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <button onClick={undoStroke} style={{
                width: 44, height: 44, background: 'var(--tool-btn-bg)',
                border: 'var(--tool-btn-border)', borderRadius: '12px',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                transition: 'all 0.15s ease',
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 22, color: 'var(--tool-btn-fg)' }}>undo</span>
              </button>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--tool-btn-label)' }}>Undo</span>
            </div>

            {/* Clear */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <button onClick={clearCanvas} style={{
                width: 44, height: 44, background: 'var(--tool-btn-bg)',
                border: 'var(--tool-btn-border)', borderRadius: '12px',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                transition: 'all 0.15s ease',
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 22, color: 'var(--tool-btn-fg)' }}>delete</span>
              </button>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--tool-btn-label)' }}>Clear</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
