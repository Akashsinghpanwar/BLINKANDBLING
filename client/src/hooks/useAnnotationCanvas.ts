import React, { useCallback, useEffect, useRef, useState } from 'react'

export interface TextAnnotation { x: number; y: number; text: string }

function applyPenCtx(ctx: CanvasRenderingContext2D, dpr = 1) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.strokeStyle = '#e11d48'
  ctx.lineWidth = 3
}

export function useAnnotationCanvas(active: boolean, imageSrc?: string | null) {
  const [annotationTool, setAnnotationTool] = useState<'pen' | 'text'>('pen')
  const [annotateNotes, setAnnotateNotes] = useState('')
  const [textAnnotations, setTextAnnotations] = useState<TextAnnotation[]>([])
  const [pendingText, setPendingText] = useState<{ x: number; y: number } | null>(null)
  const [pendingTextValue, setPendingTextValue] = useState('')

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageWrapRef = useRef<HTMLDivElement>(null)
  const penState = useRef({ drawing: false, x: 0, y: 0 })
  const hasMoved = useRef(false)

  const syncCanvas = useCallback(() => {
    const canvas = canvasRef.current
    const wrap = imageWrapRef.current
    if (!canvas || !wrap) return
    const rect = wrap.getBoundingClientRect()
    if (!rect.width) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = Math.round(rect.width * dpr)
    canvas.height = Math.round(rect.height * dpr)
    canvas.style.width = `${rect.width}px`
    canvas.style.height = `${rect.height}px`
    const ctx = canvas.getContext('2d')
    if (ctx) applyPenCtx(ctx, dpr)
  }, [])

  useEffect(() => {
    if (!active) return
    const raf = requestAnimationFrame(syncCanvas)
    window.addEventListener('resize', syncCanvas)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', syncCanvas) }
  }, [active, imageSrc, syncCanvas])

  /* ── Pen handlers ── */
  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    hasMoved.current = false
    if (annotationTool !== 'pen') return
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    penState.current = { drawing: true, x: e.clientX - rect.left, y: e.clientY - rect.top }
    canvas.setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    hasMoved.current = true
    if (!penState.current.drawing) return
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx || !canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    ctx.beginPath()
    ctx.moveTo(penState.current.x, penState.current.y)
    ctx.lineTo(x, y)
    ctx.stroke()
    penState.current.x = x
    penState.current.y = y
  }
  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    penState.current.drawing = false
    canvasRef.current?.releasePointerCapture(e.pointerId)
  }

  /* ── Text tool click ── */
  const onCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (hasMoved.current || annotationTool !== 'text') return
    if (pendingText && pendingTextValue.trim()) _commitText(pendingText.x, pendingText.y, pendingTextValue.trim())
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    setPendingText({ x: e.clientX - rect.left, y: e.clientY - rect.top })
    setPendingTextValue('')
  }

  const _commitText = useCallback((x: number, y: number, text: string) => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx) return
    const sz = 14
    const pad = 4
    ctx.save()
    ctx.font = `bold ${sz}px system-ui, sans-serif`
    const w = ctx.measureText(text).width
    ctx.fillStyle = 'rgba(255,255,255,0.92)'
    ctx.fillRect(x - pad, y - sz - 2, w + pad * 2, sz + pad + 2)
    ctx.strokeStyle = '#e11d48'
    ctx.lineWidth = 1
    ctx.strokeRect(x - pad, y - sz - 2, w + pad * 2, sz + pad + 2)
    ctx.fillStyle = '#e11d48'
    ctx.fillText(text, x, y)
    ctx.restore()
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    applyPenCtx(ctx, dpr)
    setTextAnnotations(prev => [...prev, { x, y, text }])
  }, [])

  const commitPendingText = useCallback(() => {
    if (pendingText && pendingTextValue.trim()) _commitText(pendingText.x, pendingText.y, pendingTextValue.trim())
    setPendingText(null)
    setPendingTextValue('')
  }, [pendingText, pendingTextValue, _commitText])

  /* ── Clear / reset ── */
  const clearAnnotations = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx || !canvas) return
    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.restore()
    applyPenCtx(ctx, Math.min(window.devicePixelRatio || 1, 2))
    setTextAnnotations([])
    setPendingText(null)
    setPendingTextValue('')
  }, [])

  const resetAll = useCallback(() => {
    clearAnnotations()
    setAnnotateNotes('')
    setAnnotationTool('pen')
  }, [clearAnnotations])

  /* ── Build composite for API ── */
  const buildAnnotatedComposite = useCallback(async (sourceUrl: string) => {
    const baseImg = new Image()
    baseImg.crossOrigin = 'anonymous'
    baseImg.src = sourceUrl
    await baseImg.decode()
    const ac = canvasRef.current
    const wrap = imageWrapRef.current
    const displayImg = wrap?.querySelector('img')
    const c = document.createElement('canvas')
    c.width = ac?.width && ac.width > 0 ? ac.width : baseImg.naturalWidth
    c.height = ac?.height && ac.height > 0 ? ac.height : baseImg.naturalHeight
    const ctx = c.getContext('2d')
    if (!ctx) throw new Error('Canvas unavailable')

    if (ac && ac.width > 0 && wrap && displayImg) {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const wrapRect = wrap.getBoundingClientRect()
      const imgRect = displayImg.getBoundingClientRect()
      const x = Math.round((imgRect.left - wrapRect.left) * dpr)
      const y = Math.round((imgRect.top - wrapRect.top) * dpr)
      const w = Math.max(1, Math.round(imgRect.width * dpr))
      const h = Math.max(1, Math.round(imgRect.height * dpr))
      ctx.drawImage(baseImg, x, y, w, h)
      ctx.drawImage(ac, 0, 0, c.width, c.height)
    } else {
      ctx.drawImage(baseImg, 0, 0, c.width, c.height)
      if (ac && ac.width > 0) ctx.drawImage(ac, 0, 0, c.width, c.height)
    }

    return { dataUrl: c.toDataURL('image/png'), textLabels: textAnnotations.map(a => a.text) }
  }, [textAnnotations])

  return {
    annotationTool, setAnnotationTool,
    annotateNotes, setAnnotateNotes,
    pendingText, pendingTextValue, setPendingTextValue,
    textAnnotations,
    canvasRef, imageWrapRef,
    onPointerDown, onPointerMove, onPointerUp, onCanvasClick,
    commitPendingText, clearAnnotations, resetAll,
    buildAnnotatedComposite,
  }
}
