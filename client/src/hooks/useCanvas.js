import { useCallback, useEffect, useRef } from 'react'
import { useSocket } from '../context/SocketContext'

const THROTTLE_MS = 16

// ── Flood fill (scanline) ──────────────────────────────────────────
function hexToRgb(hex) {
  const h = hex.replace('#', '')
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ]
}

function floodFill(ctx, startX, startY, fillHex) {
  const canvas = ctx.canvas
  const width  = canvas.width
  const height = canvas.height
  const imgData = ctx.getImageData(0, 0, width, height)
  const d = imgData.data

  const px = (x, y) => (y * width + x) * 4

  // Target color at click point
  const ti = px(startX, startY)
  const tr = d[ti], tg = d[ti + 1], tb = d[ti + 2], ta = d[ti + 3]

  const [fr, fg, fb] = hexToRgb(fillHex)

  // Same color — nothing to do
  if (tr === fr && tg === fg && tb === fb && ta === 255) return

  const tolerance = 30
  const match = (i) => {
    const dr = d[i] - tr, dg = d[i + 1] - tg, db = d[i + 2] - tb, da = d[i + 3] - ta
    return Math.sqrt(dr*dr + dg*dg + db*db + da*da) <= tolerance
  }
  const paint = (i) => { d[i] = fr; d[i+1] = fg; d[i+2] = fb; d[i+3] = 255 }

  // Scanline fill — faster than naive BFS for large areas
  const stack = [[startX, startY]]
  const visited = new Uint8Array(width * height)

  while (stack.length) {
    const [x, y] = stack.pop()
    if (x < 0 || x >= width || y < 0 || y >= height) continue
    const idx = y * width + x
    if (visited[idx]) continue
    const i = idx * 4
    if (!match(i)) continue

    // Scan left
    let lx = x
    while (lx > 0 && match(px(lx - 1, y)) && !visited[y * width + lx - 1]) lx--

    // Scan right
    let rx = x
    while (rx < width - 1 && match(px(rx + 1, y)) && !visited[y * width + rx + 1]) rx++

    // Paint this span
    for (let cx = lx; cx <= rx; cx++) {
      const ci = (y * width + cx) * 4
      if (!visited[y * width + cx] && match(ci)) {
        paint(ci)
        visited[y * width + cx] = 1
        if (y > 0)          stack.push([cx, y - 1])
        if (y < height - 1) stack.push([cx, y + 1])
      }
    }
  }

  ctx.putImageData(imgData, 0, 0)
}

// ─────────────────────────────────────────────────────────────────────

export function useCanvas({ isDrawer, canvasRef, activeTool, activeColor, brushSize }) {
  const { socket } = useSocket()
  const drawing    = useRef(false)
  const lastEmit   = useRef(0)
  const lastPos    = useRef({ x: 0, y: 0 })
  const remCtx     = useRef({ x: 0, y: 0, color: '#000', size: 6, tool: 'brush' })

  const getPos = useCallback((e, canvas) => {
    const rect = canvas.getBoundingClientRect()
    const cx   = e.touches ? e.touches[0].clientX : e.clientX
    const cy   = e.touches ? e.touches[0].clientY : e.clientY
    return { x: (cx - rect.left) / rect.width, y: (cy - rect.top) / rect.height }
  }, [])

  const drawDot = (ctx, x, y, color, size, tool) => {
    ctx.beginPath()
    ctx.arc(x, y, size / 2, 0, Math.PI * 2)
    ctx.fillStyle = tool === 'eraser' ? '#ffffff' : color
    ctx.fill()
  }

  const drawSeg = (ctx, x0, y0, x1, y1, color, size, tool) => {
    ctx.beginPath()
    ctx.moveTo(x0, y0)
    ctx.lineTo(x1, y1)
    ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color
    ctx.lineWidth = size
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke()
  }

  // Replay all strokes (including fill) from scratch
  const replayStrokes = useCallback((strokes) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    const w = canvas.width, h = canvas.height
    let px = 0, py = 0, col = '#000', sz = 6, tool = 'brush'

    strokes.forEach(s => {
      if (s.type === 'start') {
        col = s.color || '#000'; sz = s.size || 6; tool = s.tool || 'brush'
        px = s.x * w; py = s.y * h
        drawDot(ctx, px, py, col, sz, tool)
      } else if (s.type === 'move') {
        const nx = s.x * w, ny = s.y * h
        drawSeg(ctx, px, py, nx, ny, col, sz, tool)
        px = nx; py = ny
      } else if (s.type === 'fill') {
        floodFill(ctx, Math.floor(s.x * w), Math.floor(s.y * h), s.color)
      }
    })
  }, [canvasRef])

  // ── Remote events ──────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return
    const canvas = canvasRef.current

    const onDraw = (d) => {
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      const w = canvas.width, h = canvas.height

      if (d.type === 'start') {
        remCtx.current = { x: d.x * w, y: d.y * h, color: d.color || '#000', size: d.size || 6, tool: d.tool || 'brush' }
        drawDot(ctx, remCtx.current.x, remCtx.current.y, remCtx.current.color, remCtx.current.size, remCtx.current.tool)
      } else if (d.type === 'move') {
        const nx = d.x * w, ny = d.y * h
        drawSeg(ctx, remCtx.current.x, remCtx.current.y, nx, ny, remCtx.current.color, remCtx.current.size, remCtx.current.tool)
        remCtx.current.x = nx; remCtx.current.y = ny
      } else if (d.type === 'fill') {
        floodFill(ctx, Math.floor(d.x * w), Math.floor(d.y * h), d.color)
      }
    }

    const onClear = () => {
      const canvas = canvasRef.current
      if (!canvas) return
      canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
    }

    const onReplay = ({ strokes }) => replayStrokes(strokes)

    socket.on('draw_data', onDraw)
    socket.on('canvas_clear', onClear)
    socket.on('canvas_replay', onReplay)
    return () => {
      socket.off('draw_data', onDraw)
      socket.off('canvas_clear', onClear)
      socket.off('canvas_replay', onReplay)
    }
  }, [socket, canvasRef, replayStrokes])

  // ── Local pointer handlers ─────────────────────────────────────────
  const onPointerDown = useCallback((e) => {
    if (!isDrawer) return
    e.preventDefault()
    const canvas = canvasRef.current
    const pos    = getPos(e, canvas)

    // Fill tool — single click, no drag
    if (activeTool === 'fill') {
      const ctx = canvas.getContext('2d')
      floodFill(ctx, Math.floor(pos.x * canvas.width), Math.floor(pos.y * canvas.height), activeColor)
      socket?.emit('fill_action', { x: pos.x, y: pos.y, color: activeColor })
      return
    }

    drawing.current = true
    lastPos.current = pos
    drawDot(canvas.getContext('2d'), pos.x * canvas.width, pos.y * canvas.height, activeColor, brushSize, activeTool)
    socket?.emit('draw_start', { x: pos.x, y: pos.y, color: activeColor, size: brushSize, tool: activeTool })
  }, [isDrawer, canvasRef, getPos, activeTool, activeColor, brushSize, socket])

  const onPointerMove = useCallback((e) => {
    if (!isDrawer || !drawing.current || activeTool === 'fill') return
    e.preventDefault()
    const canvas = canvasRef.current
    const pos    = getPos(e, canvas)
    const { x: px, y: py } = lastPos.current

    drawSeg(canvas.getContext('2d'), px * canvas.width, py * canvas.height, pos.x * canvas.width, pos.y * canvas.height, activeColor, brushSize, activeTool)
    lastPos.current = pos

    const now = Date.now()
    if (now - lastEmit.current > THROTTLE_MS) {
      lastEmit.current = now
      socket?.emit('draw_move', { x: pos.x, y: pos.y })
    }
  }, [isDrawer, canvasRef, getPos, activeTool, activeColor, brushSize, socket])

  const onPointerUp = useCallback(() => {
    if (!isDrawer || !drawing.current) return
    drawing.current = false
    socket?.emit('draw_end')
  }, [isDrawer, socket])

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
    socket?.emit('canvas_clear')
  }, [canvasRef, socket])

  const undoStroke = useCallback(() => socket?.emit('draw_undo'), [socket])

  return { onPointerDown, onPointerMove, onPointerUp, clearCanvas, undoStroke, replayStrokes }
}
