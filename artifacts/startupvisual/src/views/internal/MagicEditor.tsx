import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'wouter'
import {
  ArrowLeft, Check, Grid3X3, Layers, Minus, MousePointer2, Move, Pencil,
  Plus, Redo2, RotateCcw, RotateCw, Sparkles, Trash2, Undo2,
} from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { useProjects } from '../../context/ProjectContext'

type ToolId = 'pencil' | 'shading' | 'eraser' | 'maskBrush' | 'pan' | 'select'
type LayerId = 'drawing' | 'mask'
type ElementType = 'diamond' | 'facet'

interface PlacedElement {
  id: string
  type: ElementType
  name: string
  svg: string
  x: number
  y: number
  width: number
  height: number
  rotation: number
}

interface Snapshot { drawing: string; mask: string }

const tools: Array<{ id: ToolId; name: string; label: string; shortcut: string }> = [
  { id: 'pencil', name: 'Pencil', label: 'P', shortcut: 'B' },
  { id: 'shading', name: 'Shading', label: 'SH', shortcut: 'S' },
  { id: 'eraser', name: 'Eraser', label: 'ER', shortcut: 'E' },
  { id: 'maskBrush', name: 'Mask Brush', label: 'MSK', shortcut: 'M' },
  { id: 'select', name: 'Select', label: 'SEL', shortcut: 'V' },
  { id: 'pan', name: 'Pan', label: 'PAN', shortcut: 'H' },
]

const brushTypes = [
  { id: 'hardPencil', name: 'Hard Pencil', hardness: 100, opacity: 90, flow: 100 },
  { id: 'softPencil', name: 'Soft Pencil', hardness: 60, opacity: 70, flow: 80 },
  { id: 'shading', name: 'Soft Shading', hardness: 20, opacity: 40, flow: 50 },
  { id: 'marker', name: 'Marker', hardness: 90, opacity: 80, flow: 100 },
  { id: 'airbrush', name: 'Airbrush', hardness: 10, opacity: 30, flow: 40 },
]

const diamondShapes = [
  { id: 'round', name: 'Round', svg: 'M50,5 L95,50 L50,95 L5,50 Z M50,15 L85,50 L50,85 L15,50 Z' },
  { id: 'oval', name: 'Oval', svg: 'M50,5 Q95,50 50,95 Q5,50 50,5 Z M50,20 Q80,50 50,80 Q20,50 50,20 Z' },
  { id: 'emerald', name: 'Emerald', svg: 'M15,15 L85,15 L95,30 L95,70 L85,85 L15,85 L5,70 L5,30 Z M25,25 L75,25 L82,35 L82,65 L75,75 L25,75 L18,65 L18,35 Z' },
  { id: 'princess', name: 'Princess', svg: 'M10,10 L90,10 L90,90 L10,90 Z M20,20 L80,20 L80,80 L20,80 Z M50,20 L80,50 L50,80 L20,50 Z' },
  { id: 'pear', name: 'Pear', svg: 'M50,5 Q90,40 50,95 Q10,40 50,5 Z M50,20 Q75,45 50,80 Q25,45 50,20 Z' },
  { id: 'marquise', name: 'Marquise', svg: 'M50,5 Q95,50 50,95 Q5,50 50,5 Z M50,25 Q75,50 50,75 Q25,50 50,25 Z' },
  { id: 'heart', name: 'Heart', svg: 'M50,90 L10,50 Q5,30 25,20 Q45,15 50,35 Q55,15 75,20 Q95,30 90,50 Z' },
]

const facetPatterns = [
  { id: 'brilliant', name: 'Brilliant', svg: 'M50,50 L50,5 M50,50 L95,50 M50,50 L50,95 M50,50 L5,50 M50,50 L82,18 M50,50 L82,82 M50,50 L18,82 M50,50 L18,18 M50,5 L82,18 L95,50 L82,82 L50,95 L18,82 L5,50 L18,18 Z M50,20 L70,30 L80,50 L70,70 L50,80 L30,70 L20,50 L30,30 Z' },
  { id: 'star', name: 'Star', svg: 'M50,5 L50,95 M5,50 L95,50 M15,15 L85,85 M85,15 L15,85 M50,5 L60,35 L95,50 L60,65 L50,95 L40,65 L5,50 L40,35 Z' },
  { id: 'step', name: 'Step Cut', svg: 'M20,20 L80,20 L80,80 L20,80 Z M30,30 L70,30 L70,70 L30,70 Z M40,40 L60,40 L60,60 L40,60 Z M20,20 L30,30 M80,20 L70,30 M80,80 L70,70 M20,80 L30,70' },
  { id: 'pavilion', name: 'Pavilion', svg: 'M50,50 L50,5 M50,50 L85,20 M50,50 L95,50 M50,50 L85,80 M50,50 L50,95 M50,50 L15,80 M50,50 L5,50 M50,50 L15,20 M50,5 L85,20 L95,50 L85,80 L50,95 L15,80 L5,50 L15,20 Z' },
]

const metalTypes = [
  { id: 'rose', name: 'Rose', color: '#c98673' },
  { id: 'yellow', name: 'Yellow', color: '#d5a642' },
  { id: 'white', name: 'White', color: '#d8d7d3' },
  { id: 'platinum', name: 'Platinum', color: '#b9c2c9' },
]

export default function MagicEditor() {
  const [, setLocation] = useLocation()
  const { showToast } = useApp()
  const { editorImage, saveAiGeneratedFolder } = useProjects()

  const drawingRef = useRef<HTMLCanvasElement>(null)
  const maskRef = useRef<HTMLCanvasElement>(null)
  const lastPoint = useRef<{ x: number; y: number } | null>(null)
  const isDrawing = useRef(false)
  const isPanning = useRef(false)
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 })
  const dragElement = useRef<{ id: string; dx: number; dy: number } | null>(null)

  const [canvasSize, setCanvasSize] = useState({ width: 760, height: 560 })
  const [activeTool, setActiveTool] = useState<ToolId>('pencil')
  const [activeLayer, setActiveLayer] = useState<LayerId>('drawing')
  const [activeBrushType, setActiveBrushType] = useState('hardPencil')
  const [brushSize, setBrushSize] = useState(8)
  const [brushOpacity, setBrushOpacity] = useState(90)
  const [brushHardness, setBrushHardness] = useState(80)
  const [brushStabilization, setBrushStabilization] = useState(5)
  const [brushColor, setBrushColor] = useState('#2f2a27')
  const [showGrid, setShowGrid] = useState(false)
  const [showGuides, setShowGuides] = useState(true)
  const [symmetryEnabled, setSymmetryEnabled] = useState(false)
  const [symmetryAxis, setSymmetryAxis] = useState<'vertical' | 'horizontal' | 'both'>('vertical')
  const [showMask, setShowMask] = useState(false)
  const [baseOpacity, setBaseOpacity] = useState(100)
  const [baseBlur, setBaseBlur] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [elements, setElements] = useState<PlacedElement[]>([])
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null)
  const [arrayCount, setArrayCount] = useState(8)
  const [arrayRadius, setArrayRadius] = useState(66)
  const [arrayStoneSize, setArrayStoneSize] = useState(18)
  const [selectedMetal, setSelectedMetal] = useState('rose')
  const [editNotes, setEditNotes] = useState('')
  const [history, setHistory] = useState<Snapshot[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [finalizedImage, setFinalizedImage] = useState<string | null>(null)
  const [showComparison, setShowComparison] = useState(false)

  const activeBrush = useMemo(
    () => brushTypes.find(brush => brush.id === activeBrushType) || brushTypes[0],
    [activeBrushType],
  )
  const selectedElement = elements.find(element => element.id === selectedElementId) || null

  useEffect(() => {
    if (!editorImage?.url) return
    const img = new Image()
    img.onload = () => {
      const maxW = 860
      const maxH = 660
      const scale = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight, 1)
      const size = {
        width: Math.max(320, Math.round(img.naturalWidth * scale)),
        height: Math.max(260, Math.round(img.naturalHeight * scale)),
      }
      setCanvasSize(size)
      requestAnimationFrame(() => {
        for (const canvas of [drawingRef.current, maskRef.current]) {
          if (!canvas) continue
          canvas.width = size.width
          canvas.height = size.height
        }
        pushHistory()
      })
    }
    img.src = editorImage.url
  }, [editorImage?.url])

  useEffect(() => {
    const selected = brushTypes.find(brush => brush.id === activeBrushType)
    if (!selected) return
    setBrushOpacity(selected.opacity)
    setBrushHardness(selected.hardness)
  }, [activeBrushType])

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key.toLowerCase() === 'z') { event.preventDefault(); undo(); return }
      if (event.ctrlKey && event.key.toLowerCase() === 'y') { event.preventDefault(); redo(); return }
      if (event.key === 'Delete' && selectedElementId) { deleteElement(selectedElementId); return }
      const key = event.key.toLowerCase()
      const found = tools.find(tool => tool.shortcut.toLowerCase() === key)
      if (found) setActiveTool(found.id)
      if (key === 'g') setShowGrid(prev => !prev)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  })

  const canvasPoint = (event: React.PointerEvent) => {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
    return {
      x: (event.clientX - rect.left) / zoom,
      y: (event.clientY - rect.top) / zoom,
    }
  }

  const targetCanvas = () => activeTool === 'maskBrush' || activeLayer === 'mask' ? maskRef.current : drawingRef.current

  const drawSegment = (from: { x: number; y: number }, to: { x: number; y: number }) => {
    const canvas = targetCanvas()
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const segments = symmetryPoints(from, to)
    for (const segment of segments) {
      ctx.save()
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.lineWidth = brushSize
      ctx.globalAlpha = Math.max(0.05, brushOpacity / 100)
      ctx.shadowBlur = Math.max(0, (100 - brushHardness) / 8)
      ctx.shadowColor = activeTool === 'maskBrush' ? 'rgba(207,95,145,0.55)' : brushColor

      if (activeTool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out'
        ctx.strokeStyle = 'rgba(0,0,0,1)'
      } else if (activeTool === 'maskBrush') {
        ctx.globalCompositeOperation = 'source-over'
        ctx.strokeStyle = 'rgba(207,95,145,0.82)'
      } else if (activeTool === 'shading') {
        ctx.globalCompositeOperation = 'source-over'
        ctx.strokeStyle = 'rgba(35,30,25,0.45)'
        ctx.globalAlpha = Math.min(ctx.globalAlpha, 0.42)
      } else {
        ctx.globalCompositeOperation = 'source-over'
        ctx.strokeStyle = brushColor
      }

      ctx.beginPath()
      ctx.moveTo(segment.from.x, segment.from.y)
      ctx.lineTo(segment.to.x, segment.to.y)
      ctx.stroke()
      ctx.restore()
    }
  }

  const symmetryPoints = (from: { x: number; y: number }, to: { x: number; y: number }) => {
    const segments = [{ from, to }]
    if (!symmetryEnabled) return segments
    const mirrorV = (p: { x: number; y: number }) => ({ x: canvasSize.width - p.x, y: p.y })
    const mirrorH = (p: { x: number; y: number }) => ({ x: p.x, y: canvasSize.height - p.y })
    if (symmetryAxis === 'vertical' || symmetryAxis === 'both') segments.push({ from: mirrorV(from), to: mirrorV(to) })
    if (symmetryAxis === 'horizontal' || symmetryAxis === 'both') segments.push({ from: mirrorH(from), to: mirrorH(to) })
    if (symmetryAxis === 'both') segments.push({ from: mirrorH(mirrorV(from)), to: mirrorH(mirrorV(to)) })
    return segments
  }

  const startCanvasPointer = (event: React.PointerEvent<HTMLDivElement>) => {
    if (activeTool === 'select') return
    if (activeTool === 'pan') {
      isPanning.current = true
      panStart.current = { x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y }
      return
    }
    const p = canvasPoint(event)
    isDrawing.current = true
    lastPoint.current = p
    drawSegment(p, p)
  }

  const moveCanvasPointer = (event: React.PointerEvent<HTMLDivElement>) => {
    if (isPanning.current) {
      setPan({
        x: panStart.current.panX + event.clientX - panStart.current.x,
        y: panStart.current.panY + event.clientY - panStart.current.y,
      })
      return
    }
    if (!isDrawing.current || !lastPoint.current) return
    const next = canvasPoint(event)
    const smoothing = Math.min(0.85, brushStabilization / 12)
    const smoothed = {
      x: lastPoint.current.x + (next.x - lastPoint.current.x) * (1 - smoothing),
      y: lastPoint.current.y + (next.y - lastPoint.current.y) * (1 - smoothing),
    }
    drawSegment(lastPoint.current, smoothed)
    lastPoint.current = smoothed
  }

  const stopCanvasPointer = () => {
    if (isDrawing.current) pushHistory()
    isDrawing.current = false
    isPanning.current = false
    lastPoint.current = null
  }

  const snapshot = (): Snapshot => ({
    drawing: drawingRef.current?.toDataURL('image/png') || '',
    mask: maskRef.current?.toDataURL('image/png') || '',
  })

  const restoreSnapshot = (snap: Snapshot) => {
    restoreCanvas(drawingRef.current, snap.drawing)
    restoreCanvas(maskRef.current, snap.mask)
  }

  const restoreCanvas = (canvas: HTMLCanvasElement | null, url: string) => {
    if (!canvas || !url) return
    const ctx = canvas.getContext('2d')
    const img = new Image()
    img.onload = () => {
      ctx?.clearRect(0, 0, canvas.width, canvas.height)
      ctx?.drawImage(img, 0, 0)
    }
    img.src = url
  }

  const pushHistory = () => {
    const next = snapshot()
    setHistory(prev => {
      const trimmed = prev.slice(0, historyIndex + 1)
      return [...trimmed, next].slice(-80)
    })
    setHistoryIndex(prev => Math.min(prev + 1, 79))
  }

  const undo = () => {
    if (historyIndex <= 0) return
    const nextIndex = historyIndex - 1
    setHistoryIndex(nextIndex)
    restoreSnapshot(history[nextIndex])
  }

  const redo = () => {
    if (historyIndex >= history.length - 1) return
    const nextIndex = historyIndex + 1
    setHistoryIndex(nextIndex)
    restoreSnapshot(history[nextIndex])
  }

  const clearCanvas = () => {
    for (const canvas of [drawingRef.current, maskRef.current]) {
      const ctx = canvas?.getContext('2d')
      if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height)
    }
    setElements([])
    setSelectedElementId(null)
    pushHistory()
  }

  const addElement = (type: ElementType, item: { name: string; svg: string }, overrides: Partial<PlacedElement> = {}) => {
    const id = `${type}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    setElements(prev => [...prev, {
      id,
      type,
      name: item.name,
      svg: item.svg,
      x: canvasSize.width / 2 - 38,
      y: canvasSize.height / 2 - 38,
      width: type === 'facet' ? 96 : 76,
      height: type === 'facet' ? 96 : 76,
      rotation: 0,
      ...overrides,
    }])
    setSelectedElementId(id)
  }

  const createHaloArray = () => {
    const shape = diamondShapes[0]
    const centerX = canvasSize.width / 2
    const centerY = canvasSize.height / 2
    const items = Array.from({ length: arrayCount }, (_, index) => {
      const angle = (Math.PI * 2 * index) / arrayCount
      return {
        id: `halo_${Date.now()}_${index}`,
        type: 'diamond' as const,
        name: `Halo ${index + 1}`,
        svg: shape.svg,
        x: centerX + Math.cos(angle) * arrayRadius - arrayStoneSize / 2,
        y: centerY + Math.sin(angle) * arrayRadius - arrayStoneSize / 2,
        width: arrayStoneSize,
        height: arrayStoneSize,
        rotation: (angle * 180) / Math.PI,
      }
    })
    setElements(prev => [...prev, ...items])
  }

  const createPaveArray = () => {
    const shape = diamondShapes[0]
    const startX = canvasSize.width / 2 - (arrayCount * arrayRadius) / 8
    const y = canvasSize.height / 2
    setElements(prev => [...prev, ...Array.from({ length: arrayCount }, (_, index) => ({
      id: `pave_${Date.now()}_${index}`,
      type: 'diamond' as const,
      name: `Pave ${index + 1}`,
      svg: shape.svg,
      x: startX + index * (arrayStoneSize + 8),
      y,
      width: arrayStoneSize,
      height: arrayStoneSize,
      rotation: 0,
    }))])
  }

  const startElementDrag = (event: React.PointerEvent, id: string) => {
    if (activeTool !== 'select') return
    const element = elements.find(el => el.id === id)
    if (!element) return
    setSelectedElementId(id)
    dragElement.current = { id, dx: event.clientX - element.x, dy: event.clientY - element.y }
  }

  const onGlobalMove = (event: React.PointerEvent) => {
    if (!dragElement.current) return
    const drag = dragElement.current
    setElements(prev => prev.map(el => el.id === drag.id ? { ...el, x: (event.clientX - drag.dx), y: (event.clientY - drag.dy) } : el))
  }

  const stopElementDrag = () => {
    dragElement.current = null
  }

  const updateSelectedElement = (patch: Partial<PlacedElement>) => {
    if (!selectedElementId) return
    setElements(prev => prev.map(el => el.id === selectedElementId ? { ...el, ...patch } : el))
  }

  const deleteElement = (id: string) => {
    setElements(prev => prev.filter(el => el.id !== id))
    if (selectedElementId === id) setSelectedElementId(null)
  }

  const compositeCanvas = async () => {
    if (!editorImage) return null
    const out = document.createElement('canvas')
    out.width = canvasSize.width
    out.height = canvasSize.height
    const ctx = out.getContext('2d')
    if (!ctx) return null
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, out.width, out.height)

    const img = new Image()
    img.src = editorImage.url
    await img.decode()
    ctx.globalAlpha = baseOpacity / 100
    drawContain(ctx, img, out.width, out.height)
    ctx.globalAlpha = 1

    for (const el of elements) drawElement(ctx, el)
    if (drawingRef.current) ctx.drawImage(drawingRef.current, 0, 0)
    if (maskRef.current && showMask) ctx.drawImage(maskRef.current, 0, 0)
    return out.toDataURL('image/png')
  }

  const finalizeDesign = async () => {
    const url = await compositeCanvas()
    if (!url || !editorImage) return
    setFinalizedImage(url)
    setShowComparison(true)
  }

  const acceptFinalized = async () => {
    if (!finalizedImage || !editorImage) return
    await saveAiGeneratedFolder({
      name: `Magic edit ${new Date().toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}`,
      prompt: editNotes || editorImage.prompt || '',
      images: [{ url: finalizedImage, label: 'Magic edit', angle: 'Edited render', prompt: editNotes || editorImage.prompt }],
    })
    showToast('Magic edit saved to gallery', 'success')
    setLocation('/workspace/magic-movement')
  }

  if (!editorImage) {
    return (
      <div className="bb-page" style={{ display: 'grid', placeItems: 'center', minHeight: '70vh' }}>
        <div className="bb-card" style={{ padding: 28, textAlign: 'center' }}>
          <h1 style={{ margin: '0 0 10px', color: 'var(--bb-ink)' }}>No render selected</h1>
          <button className="bb-btn-primary" onClick={() => setLocation('/workspace/magic-movement')}>
            <ArrowLeft size={16} /> Back to Magic Movement
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ height: 'calc(100vh - 26px)', background: '#1f1f20', color: '#f7f4f0', display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: 8 }}>
      <div style={{ height: 48, background: '#272728', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button className="bb-editor-button" onClick={() => setLocation('/workspace/magic-movement')}><ArrowLeft size={14} /> Back</button>
          <strong style={{ fontSize: 14 }}>Magic Editor Pro</strong>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <select value={activeBrushType} onChange={e => setActiveBrushType(e.target.value)} className="bb-editor-select">
            {brushTypes.map(brush => <option key={brush.id} value={brush.id}>{brush.name}</option>)}
          </select>
          <button className={`bb-editor-button ${symmetryEnabled ? 'active' : ''}`} onClick={() => setSymmetryEnabled(prev => !prev)}>Symmetry</button>
          <button className={`bb-editor-button ${showGrid ? 'active' : ''}`} onClick={() => setShowGrid(prev => !prev)}><Grid3X3 size={14} /> Grid</button>
          <div className="bb-editor-segment">
            <button onClick={() => setZoom(z => Math.max(0.35, z - 0.1))}><Minus size={13} /></button>
            <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }) }}>{Math.round(zoom * 100)}%</button>
            <button onClick={() => setZoom(z => Math.min(3, z + 0.1))}><Plus size={13} /></button>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <aside style={{ width: 58, background: '#222223', borderRight: '1px solid rgba(255,255,255,0.1)', padding: '8px 6px', display: 'grid', alignContent: 'start', gap: 4 }}>
          {tools.map(tool => (
            <button key={tool.id} onClick={() => setActiveTool(tool.id)} title={`${tool.name} (${tool.shortcut})`} className={`bb-editor-tool ${activeTool === tool.id ? 'active' : ''}`}>
              <span>{tool.label}</span>
              <small>{tool.name}</small>
            </button>
          ))}
          <div style={{ height: 1, background: 'rgba(255,255,255,0.1)', margin: '5px 4px' }} />
          <button className="bb-editor-tool" onClick={undo} disabled={historyIndex <= 0}><Undo2 size={14} /><small>Undo</small></button>
          <button className="bb-editor-tool" onClick={redo} disabled={historyIndex >= history.length - 1}><Redo2 size={14} /><small>Redo</small></button>
          <button className="bb-editor-tool danger" onClick={clearCanvas}><Trash2 size={14} /><small>Clear</small></button>
        </aside>

        <main style={{ flex: 1, position: 'relative', overflow: 'hidden', background: '#2c2c2d' }} onPointerMove={onGlobalMove} onPointerUp={() => { stopCanvasPointer(); stopElementDrag() }}>
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px)) scale(${zoom})`,
              width: canvasSize.width,
              height: canvasSize.height,
              boxShadow: '0 28px 70px rgba(0,0,0,0.45)',
              borderRadius: 10,
              overflow: 'hidden',
              background: '#fff',
              cursor: activeTool === 'pan' ? 'grab' : activeTool === 'select' ? 'default' : 'crosshair',
            }}
            onPointerDown={startCanvasPointer}
            onPointerMove={moveCanvasPointer}
            onPointerUp={stopCanvasPointer}
            onPointerLeave={stopCanvasPointer}
          >
            <img
              src={editorImage.url}
              alt={editorImage.label}
              style={{ width: '100%', height: '100%', objectFit: 'contain', opacity: baseOpacity / 100, filter: baseBlur ? `blur(${baseBlur}px)` : 'none', position: 'absolute', inset: 0 }}
              draggable={false}
            />
            {showGuides && (
              <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: 'rgba(207,95,145,0.28)' }} />
                <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1, background: 'rgba(207,95,145,0.28)' }} />
              </div>
            )}
            {showGrid && (
              <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: 'linear-gradient(rgba(0,0,0,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.08) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
            )}
            <canvas ref={drawingRef} width={canvasSize.width} height={canvasSize.height} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
            <canvas ref={maskRef} width={canvasSize.width} height={canvasSize.height} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: showMask ? 0.72 : 0, pointerEvents: 'none', mixBlendMode: 'multiply' }} />
            {elements.map(el => (
              <div
                key={el.id}
                onPointerDown={e => { e.stopPropagation(); startElementDrag(e, el.id) }}
                style={{
                  position: 'absolute',
                  left: el.x,
                  top: el.y,
                  width: el.width,
                  height: el.height,
                  transform: `rotate(${el.rotation}deg)`,
                  cursor: activeTool === 'select' ? 'move' : 'default',
                  outline: selectedElementId === el.id ? '2px solid #cf5f91' : 'none',
                  pointerEvents: activeTool === 'select' ? 'auto' : 'none',
                }}
              >
                <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}>
                  <path d={el.svg} fill={el.type === 'diamond' ? 'rgba(255,255,255,0.12)' : 'none'} stroke="rgba(35,30,25,0.86)" strokeWidth={el.type === 'diamond' ? 2.2 : 1.4} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {selectedElementId === el.id && <button className="bb-editor-mini-delete" onClick={e => { e.stopPropagation(); deleteElement(el.id) }}>x</button>}
              </div>
            ))}
          </div>

          {showComparison && finalizedImage && (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 20, padding: 28, display: 'grid', gridTemplateRows: 'auto 1fr auto', gap: 16 }}>
              <h2 style={{ margin: 0, textAlign: 'center' }}>Before & After</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, minHeight: 0 }}>
                <Preview title="Original" url={editorImage.url} />
                <Preview title="Edited" url={finalizedImage} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
                <button className="bb-editor-button" onClick={() => setShowComparison(false)}>Continue editing</button>
                <button className="bb-btn-primary" onClick={() => void acceptFinalized()}><Check size={16} /> Accept & Save</button>
              </div>
            </div>
          )}
        </main>

        <aside style={{ width: 282, background: '#222223', borderLeft: '1px solid rgba(255,255,255,0.1)', overflowY: 'auto', flexShrink: 0 }}>
          <Panel title="Brush">
            <Range label="Size" value={brushSize} min={1} max={100} suffix="px" onChange={setBrushSize} />
            <Range label="Opacity" value={brushOpacity} min={1} max={100} suffix="%" onChange={setBrushOpacity} />
            <Range label="Hardness" value={brushHardness} min={1} max={100} suffix="%" onChange={setBrushHardness} />
            <Range label="Stabilization" value={brushStabilization} min={0} max={10} onChange={setBrushStabilization} />
            <label className="bb-editor-field">Color <input type="color" value={brushColor} onChange={e => setBrushColor(e.target.value)} /></label>
            <div style={{ color: 'rgba(255,255,255,0.36)', fontSize: 11 }}>Active brush: {activeBrush.name}</div>
          </Panel>

          <Panel title="Layers">
            <LayerRow label="Drawing" active={activeLayer === 'drawing'} visible onClick={() => setActiveLayer('drawing')} />
            <LayerRow label="Mask" active={activeLayer === 'mask'} visible={showMask} onClick={() => setActiveLayer('mask')} onToggle={() => setShowMask(v => !v)} />
          </Panel>

          <Panel title="Base Image">
            <Range label="Blur" value={baseBlur} min={0} max={20} suffix="px" onChange={setBaseBlur} />
            <Range label="Opacity" value={baseOpacity} min={0} max={100} suffix="%" onChange={setBaseOpacity} />
          </Panel>

          {symmetryEnabled && (
            <Panel title="Symmetry">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
                {(['vertical', 'horizontal', 'both'] as const).map(axis => (
                  <button key={axis} className={`bb-editor-button ${symmetryAxis === axis ? 'active' : ''}`} onClick={() => setSymmetryAxis(axis)}>{axis}</button>
                ))}
              </div>
            </Panel>
          )}

          <Panel title="Diamond Shapes">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
              {diamondShapes.map(shape => (
                <button key={shape.id} className="bb-editor-shape" title={shape.name} onClick={() => addElement('diamond', shape)}>
                  <svg viewBox="0 0 100 100"><path d={shape.svg} fill="none" stroke="currentColor" strokeWidth={3} /></svg>
                </button>
              ))}
            </div>
          </Panel>

          <Panel title="Facet Patterns">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 6 }}>
              {facetPatterns.map(pattern => (
                <button key={pattern.id} className="bb-editor-facet" onClick={() => addElement('facet', pattern)}>
                  <svg viewBox="0 0 100 100"><path d={pattern.svg} fill="none" stroke="currentColor" strokeWidth={1.5} /></svg>
                  <span>{pattern.name}</span>
                </button>
              ))}
            </div>
          </Panel>

          <Panel title="Stone Arrays">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              <button className="bb-editor-button" onClick={createHaloArray}>Halo</button>
              <button className="bb-editor-button" onClick={createPaveArray}>Pave</button>
            </div>
            <Range label="Count" value={arrayCount} min={4} max={24} onChange={setArrayCount} />
            <Range label="Radius" value={arrayRadius} min={20} max={150} suffix="px" onChange={setArrayRadius} />
            <Range label="Stone Size" value={arrayStoneSize} min={5} max={44} suffix="px" onChange={setArrayStoneSize} />
          </Panel>

          <Panel title="Metal">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 6 }}>
              {metalTypes.map(metal => (
                <button key={metal.id} className={`bb-editor-button ${selectedMetal === metal.id ? 'active' : ''}`} style={{ color: metal.color }} onClick={() => setSelectedMetal(metal.id)}>{metal.name}</button>
              ))}
            </div>
          </Panel>

          <Panel title={`Elements (${elements.length})`}>
            <div style={{ display: 'grid', gap: 5, maxHeight: 110, overflowY: 'auto' }}>
              {elements.map(el => (
                <button key={el.id} className={`bb-editor-element ${selectedElementId === el.id ? 'active' : ''}`} onClick={() => { setActiveTool('select'); setSelectedElementId(el.id) }}>
                  <span>{el.name}</span>
                  <Trash2 size={13} onClick={e => { e.stopPropagation(); deleteElement(el.id) }} />
                </button>
              ))}
            </div>
            {selectedElement && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 5, marginTop: 8 }}>
                <button className="bb-editor-button" onClick={() => updateSelectedElement({ width: Math.max(8, selectedElement.width - 8), height: Math.max(8, selectedElement.height - 8) })}>-</button>
                <button className="bb-editor-button" onClick={() => updateSelectedElement({ width: selectedElement.width + 8, height: selectedElement.height + 8 })}>+</button>
                <button className="bb-editor-button" onClick={() => updateSelectedElement({ rotation: selectedElement.rotation - 15 })}><RotateCcw size={13} /></button>
                <button className="bb-editor-button" onClick={() => updateSelectedElement({ rotation: selectedElement.rotation + 15 })}><RotateCw size={13} /></button>
              </div>
            )}
          </Panel>

          <Panel title="Edit Notes">
            <textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} placeholder="Describe changes for AI..." rows={3} className="bb-editor-textarea" />
          </Panel>

          <div style={{ padding: 12 }}>
            <button className="bb-editor-finalize" onClick={() => void finalizeDesign()}>
              <Sparkles size={16} /> Finalize Design
            </button>
            <p style={{ margin: '6px 0 0', color: 'rgba(255,255,255,0.34)', textAlign: 'center', fontSize: 11 }}>Save edited composition to gallery</p>
          </div>
        </aside>
      </div>
    </div>
  )
}

function drawContain(ctx: CanvasRenderingContext2D, img: HTMLImageElement, width: number, height: number) {
  const scale = Math.min(width / img.naturalWidth, height / img.naturalHeight)
  const w = img.naturalWidth * scale
  const h = img.naturalHeight * scale
  ctx.drawImage(img, (width - w) / 2, (height - h) / 2, w, h)
}

function drawElement(ctx: CanvasRenderingContext2D, el: PlacedElement) {
  ctx.save()
  ctx.translate(el.x + el.width / 2, el.y + el.height / 2)
  ctx.rotate((el.rotation * Math.PI) / 180)
  ctx.scale(el.width / 100, el.height / 100)
  ctx.translate(-50, -50)
  const path = new Path2D(el.svg)
  ctx.strokeStyle = 'rgba(35,30,25,0.88)'
  ctx.lineWidth = el.type === 'diamond' ? 2.2 : 1.4
  ctx.fillStyle = el.type === 'diamond' ? 'rgba(255,255,255,0.18)' : 'transparent'
  ctx.fill(path)
  ctx.stroke(path)
  ctx.restore()
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ padding: 12, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
      <h3 style={{ margin: '0 0 9px', color: 'rgba(255,255,255,0.42)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{title}</h3>
      <div style={{ display: 'grid', gap: 8 }}>{children}</div>
    </section>
  )
}

function Range({ label, value, min, max, suffix = '', onChange }: { label: string; value: number; min: number; max: number; suffix?: string; onChange: (value: number) => void }) {
  return (
    <label style={{ display: 'grid', gap: 4, color: 'rgba(255,255,255,0.66)', fontSize: 11 }}>
      <span style={{ display: 'flex', justifyContent: 'space-between' }}><span>{label}</span><span>{value}{suffix}</span></span>
      <input type="range" min={min} max={max} value={value} onChange={e => onChange(Number(e.target.value))} />
    </label>
  )
}

function LayerRow({ label, active, visible, onClick, onToggle }: { label: string; active: boolean; visible: boolean; onClick: () => void; onToggle?: () => void }) {
  return (
    <div className={`bb-editor-layer ${active ? 'active' : ''}`} onClick={onClick}>
      <Layers size={14} />
      <span>{label}</span>
      {onToggle && <button onClick={e => { e.stopPropagation(); onToggle() }}>{visible ? 'On' : 'Off'}</button>}
    </div>
  )
}

function Preview({ title, url }: { title: string; url: string }) {
  return (
    <div style={{ display: 'grid', gridTemplateRows: 'auto 1fr', gap: 8, minHeight: 0 }}>
      <p style={{ margin: 0, color: 'rgba(255,255,255,0.62)', textAlign: 'center' }}>{title}</p>
      <div style={{ borderRadius: 14, background: '#fff', display: 'grid', placeItems: 'center', overflow: 'hidden' }}>
        <img src={url} alt={title} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
      </div>
    </div>
  )
}
