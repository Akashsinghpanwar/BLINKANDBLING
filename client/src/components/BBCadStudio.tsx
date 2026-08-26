import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AlertCircle, Box, CheckCircle2, Download,
  ImagePlus, Loader2, RefreshCw, Wand2, X,
} from 'lucide-react'
import { toast } from 'sonner'
import { useProjects } from '../context/ProjectContext'
import { useBackgroundJobs, type ThreeDJob } from '../store/backgroundJobs'

type GenState = 'idle' | 'uploading' | 'processing' | 'done' | 'error'
type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'SUCCEEDED' | 'FAILED' | 'EXPIRED'

interface TaskResult {
  id?: string
  status?: TaskStatus
  progress?: number
  model_urls?: { glb?: string }
  thumbnail_url?: string
  task_error?: { message: string }
  error?: string
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = String(reader.result || '')
      resolve(result.split(',')[1] ?? result)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

function cleanGenerationMessage(message?: string) {
  const value = String(message || '').trim()
  const lower = value.toLowerCase()

  if (!value) {
    return 'The 3D model could not be generated from this image. Try a clearer product photo.'
  }

  if (lower.includes('charmap') || lower.includes('codec') || lower.includes('\\u2714')) {
    return 'The generator hit an encoding issue while processing this image. Export the image as a simple JPG or PNG and try again.'
  }

  if (lower.includes('api key') || lower.includes('authorization')) {
    return '3D generation is not configured correctly. Check the server API key and try again.'
  }

  return value.replace(/Meshy AI|Meshy/gi, 'the 3D generator')
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="bbcad-progress">
      <div
        className="bbcad-progress__bar"
        style={{ width: `${Math.max(4, Math.min(100, value))}%` }}
      />
    </div>
  )
}

function StatusBadge({ status }: { status: TaskStatus }) {
  const map: Record<TaskStatus, { label: string; color: string }> = {
    PENDING: { label: 'Queued', color: 'var(--bb-violet)' },
    IN_PROGRESS: { label: 'Generating', color: 'var(--bb-coral)' },
    SUCCEEDED: { label: 'Ready', color: 'var(--bb-emerald)' },
    FAILED: { label: 'Failed', color: '#dc2626' },
    EXPIRED: { label: 'Expired', color: 'var(--bb-muted)' },
  }
  const { label, color } = map[status]

  return (
    <span className="bbcad-status" style={{ color, borderColor: `${color}55`, background: `${color}14` }}>
      {(status === 'PENDING' || status === 'IN_PROGRESS') && (
        <Loader2 size={12} className="bbcad-spin" />
      )}
      {status === 'SUCCEEDED' && <CheckCircle2 size={12} />}
      {(status === 'FAILED' || status === 'EXPIRED') && <AlertCircle size={12} />}
      {label}
    </span>
  )
}

interface Props {
  onOpenInViewer?: () => void
}

export default function BBCadStudio({ onOpenInViewer }: Props) {
  const { saveGeneratedCadFile, setViewerCadFile, pending3DImageUrl, setPending3DImageUrl } = useProjects()
  const { add3DJob, removeJob } = useBackgroundJobs()
  const savedTaskIdsRef = useRef<Set<string>>(new Set())
  const savingTaskIdsRef = useRef<Set<string>>(new Set())

  // Subscribe to 3D jobs in the global store
  const active3DJob = useBackgroundJobs(s =>
    s.jobs.find((j): j is ThreeDJob => j.type === '3d-gen') ?? null,
  )

  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [genState, setGenState] = useState<GenState>('idle')
  const [taskId, setTaskId] = useState<string | null>(null)
  const [taskResult, setTaskResult] = useState<TaskResult | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [savingToViewer, setSavingToViewer] = useState(false)

  // Revoke preview blob URL on unmount
  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview)
    }
  }, [imagePreview])

  // Sync local UI state from global store (handles the "came back to this page" case)
  useEffect(() => {
    if (!active3DJob) return

    setTaskId(active3DJob.id)

    if (active3DJob.status === 'processing') {
      setGenState('processing')
      setTaskResult(prev => ({
        ...prev,
        id: active3DJob.id,
        status: 'IN_PROGRESS',
        progress: active3DJob.progress,
      }))
    } else if (active3DJob.status === 'done') {
      setGenState('done')
      setTaskResult({
        id: active3DJob.id,
        status: 'SUCCEEDED',
        progress: 100,
        model_urls: { glb: active3DJob.glbUrl },
        thumbnail_url: active3DJob.thumbnailUrl,
      })
    } else if (active3DJob.status === 'failed') {
      const msg = cleanGenerationMessage(active3DJob.error)
      setGenState('error')
      setErrorMsg(msg)
      setTaskResult(null)
      // Clean up consumed failed job
      removeJob(active3DJob.id)
    }
  }, [active3DJob?.id, active3DJob?.status, active3DJob?.progress, active3DJob?.glbUrl, removeJob])

  // Auto-load an image URL sent from the gallery
  useEffect(() => {
    if (!pending3DImageUrl) return
    let cancelled = false

    const loadAndGenerate = async () => {
      try {
        let blob: Blob
        if (pending3DImageUrl.startsWith('data:')) {
          const [header, b64] = pending3DImageUrl.split(',')
          const mime = header.match(/:(.*?);/)?.[1] ?? 'image/png'
          const bytes = atob(b64 ?? '')
          const arr = new Uint8Array(bytes.length)
          for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i)
          blob = new Blob([arr], { type: mime })
        } else {
          const res = await fetch(pending3DImageUrl, { credentials: 'include', cache: 'no-store' })
          if (!res.ok) throw new Error(`Gallery image request failed with ${res.status}`)
          blob = await res.blob()
        }
        if (blob.size === 0) throw new Error('Gallery image was empty')
        if (cancelled) return
        const file = new File([blob], 'ai-design.png', { type: blob.type || 'image/png' })
        setPending3DImageUrl(null)
        // Set preview immediately
        setImageFile(file)
        setImagePreview(URL.createObjectURL(file))
        setGenState('idle')
        setTaskResult(null)
        setTaskId(null)
        setErrorMsg('')
        // Auto-start generation with this file directly
        await startGeneration(file)
      } catch {
        if (!cancelled) toast.error('Could not load gallery image for 3D generation')
        setPending3DImageUrl(null)
      }
    }

    void loadAndGenerate()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending3DImageUrl])

  const resetImage = useCallback(() => {
    setImageFile(null)
    setImagePreview(null)
    setGenState('idle')
    setTaskResult(null)
    setTaskId(null)
    setErrorMsg('')
    // Remove any active 3D job when user resets
    if (active3DJob) removeJob(active3DJob.id)
  }, [active3DJob, removeJob])

  const acceptImage = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file')
      return
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error('Image must be under 20 MB')
      return
    }
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
    setGenState('idle')
    setTaskResult(null)
    setTaskId(null)
    setErrorMsg('')
  }, [])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) acceptImage(file)
  }, [acceptImage])

  const startGeneration = async (file: File) => {
    setGenState('uploading')
    setErrorMsg('')
    setTaskResult(null)

    try {
      const imageData = await fileToBase64(file)
      const res = await fetch('/api/cad/image-to-3d/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageData }),
      })
      const body: { taskId?: string; error?: string } = await res.json().catch(() => ({}))

      if (!res.ok || !body.taskId) {
        throw new Error(cleanGenerationMessage(body.error || `Server error ${res.status}`))
      }

      setTaskId(body.taskId)
      setGenState('processing')
      toast.info('3D generation started — you can navigate away and we will notify you when done.')

      add3DJob(body.taskId, file.name)
    } catch (err: unknown) {
      const msg = cleanGenerationMessage(err instanceof Error ? err.message : 'Unknown error')
      setGenState('error')
      setErrorMsg(msg)
      toast.error(msg)
    }
  }

  const generate = async () => {
    if (!imageFile) return
    await startGeneration(imageFile)
  }

  const glbUrl = taskResult?.model_urls?.glb

  const saveAndView = useCallback(async (options?: { auto?: boolean }) => {
    const generationId = taskResult?.id || taskId
    if (!generationId) {
      toast.error('Generated model task was not found')
      return
    }
    if (savedTaskIdsRef.current.has(generationId) || savingTaskIdsRef.current.has(generationId)) {
      onOpenInViewer?.()
      return
    }

    const baseName = imageFile?.name.replace(/\.[^.]+$/, '') || 'model'
    const name = `${baseName}_generated.glb`
    savingTaskIdsRef.current.add(generationId)
    setSavingToViewer(true)

    try {
      const saved = await saveGeneratedCadFile(generationId, name)
      setViewerCadFile(saved)
      savedTaskIdsRef.current.add(generationId)
      removeJob(generationId)
      toast.success(options?.auto ? '3D model saved - opening viewer' : 'Saved to CAD files')
      onOpenInViewer?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save CAD file')
    } finally {
      savingTaskIdsRef.current.delete(generationId)
      setSavingToViewer(false)
    }
  }, [imageFile?.name, onOpenInViewer, removeJob, saveGeneratedCadFile, setViewerCadFile, taskId, taskResult?.id])

  useEffect(() => {
    if (genState !== 'done' || !glbUrl) return
    void saveAndView({ auto: true })
  }, [genState, glbUrl, saveAndView])

  const isRunning = genState === 'uploading' || genState === 'processing'
  const progress = taskResult?.progress ?? (genState === 'uploading' ? 8 : 18)

  return (
    <div className="bbcad-generator">
      <style>{`
        @keyframes bbcad-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .bbcad-spin { animation: bbcad-spin 1s linear infinite; }
        .bbcad-generator {
          min-height: 560px;
          overflow: hidden;
          border-radius: 18px;
          border: 1px solid rgba(210,185,176,0.9);
          background:
            linear-gradient(135deg, rgba(255,255,255,0.98), rgba(255,247,244,0.92) 45%, rgba(250,244,255,0.82));
          box-shadow: 0 24px 70px rgba(40,32,30,0.13);
          display: grid;
          grid-template-columns: minmax(280px, 380px) minmax(0, 1fr);
        }
        .bbcad-side {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 18px;
          border-right: 1px solid var(--bb-line);
          background: rgba(255,255,255,0.62);
        }
        .bbcad-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          width: fit-content;
          margin-bottom: 10px;
          padding: 5px 11px;
          border-radius: 999px;
          border: 1px solid rgba(199,166,106,0.28);
          background: #fbf4ea;
          color: #8a6740;
          font-size: 0.68rem;
          font-weight: 900;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }
        .bbcad-title {
          margin: 0;
          color: var(--bb-ink);
          font-family: var(--app-font-display);
          font-size: 1.58rem;
          font-weight: 500;
          line-height: 1.05;
        }
        .bbcad-copy {
          margin: 7px 0 0;
          color: var(--bb-muted);
          font-size: 0.84rem;
          line-height: 1.55;
        }
        .bbcad-drop {
          min-height: 186px;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          position: relative;
          border-radius: 14px;
          border: 1.5px dashed rgba(207,95,145,0.38);
          background: linear-gradient(180deg, #fffefe, #fff8f5);
          cursor: pointer;
          transition: border-color 0.18s ease, background 0.18s ease, box-shadow 0.18s ease;
        }
        .bbcad-drop[data-drag="true"] {
          border-color: var(--bb-rose);
          background: #fff2f6;
          box-shadow: 0 14px 34px rgba(207,95,145,0.13);
        }
        .bbcad-drop[data-disabled="true"] {
          cursor: default;
        }
        .bbcad-drop-empty {
          padding: 28px 22px;
          text-align: center;
        }
        .bbcad-drop-icon {
          width: 46px;
          height: 46px;
          display: grid;
          place-items: center;
          margin: 0 auto 12px;
          border-radius: 13px;
          background: linear-gradient(135deg, var(--bb-coral), var(--bb-rose));
          color: #fff;
          box-shadow: 0 12px 26px rgba(207,95,145,0.2);
        }
        .bbcad-file-bar {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          padding: 7px 11px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          background: rgba(32,34,43,0.72);
          color: rgba(255,255,255,0.9);
          font-size: 0.72rem;
          font-weight: 700;
          backdrop-filter: blur(10px);
        }
        .bbcad-clear {
          position: absolute;
          top: 8px;
          right: 8px;
          width: 30px;
          height: 30px;
          border: 0;
          border-radius: 999px;
          background: rgba(32,34,43,0.74);
          color: #fff;
          display: grid;
          place-items: center;
        }
        .bbcad-primary {
          min-height: 46px;
          border: 0;
          border-radius: 12px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          color: #fff;
          font-size: 0.9rem;
          font-weight: 900;
          background: linear-gradient(135deg, var(--bb-coral), var(--bb-rose) 55%, var(--bb-violet));
          box-shadow: 0 14px 30px rgba(207,95,145,0.24);
          transition: transform 0.18s ease, box-shadow 0.18s ease, opacity 0.18s ease;
        }
        .bbcad-primary:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 18px 36px rgba(207,95,145,0.3);
        }
        .bbcad-primary:disabled {
          opacity: 0.46;
          cursor: not-allowed;
          box-shadow: none;
        }
        .bbcad-secondary {
          min-height: 42px;
          padding: 10px 16px;
          border-radius: 11px;
          border: 1px solid var(--bb-line);
          background: #fff;
          color: var(--bb-ink);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-size: 0.82rem;
          font-weight: 850;
          text-decoration: none;
        }
        .bbcad-workspace {
          min-height: 420px;
          padding: 32px;
          display: grid;
          place-items: center;
          background:
            radial-gradient(circle at 50% 18%, rgba(199,166,106,0.12), transparent 34%),
            linear-gradient(180deg, rgba(255,255,255,0.28), rgba(255,255,255,0.04));
        }
        .bbcad-state {
          width: min(100%, 500px);
          text-align: center;
        }
        .bbcad-state-icon {
          width: 82px;
          height: 82px;
          display: grid;
          place-items: center;
          margin: 0 auto 18px;
          border-radius: 22px;
          border: 1px solid rgba(199,166,106,0.22);
          background: rgba(255,255,255,0.76);
          color: var(--bb-rose);
          box-shadow: 0 18px 42px rgba(51,39,35,0.1);
        }
        .bbcad-state h3 {
          margin: 0;
          color: var(--bb-ink);
          font-family: var(--app-font-display);
          font-size: 1.45rem;
          font-weight: 500;
        }
        .bbcad-state p {
          margin: 8px auto 0;
          max-width: 360px;
          color: var(--bb-muted);
          font-size: 0.88rem;
          line-height: 1.6;
        }
        .bbcad-progress {
          width: 100%;
          height: 8px;
          overflow: hidden;
          border-radius: 999px;
          background: rgba(207,95,145,0.12);
        }
        .bbcad-progress__bar {
          height: 100%;
          border-radius: 999px;
          background: linear-gradient(90deg, var(--bb-coral), var(--bb-rose), var(--bb-violet));
          transition: width 0.55s ease;
        }
        .bbcad-status {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 10px;
          border-radius: 999px;
          border: 1px solid;
          font-size: 0.74rem;
          font-weight: 900;
        }
        .bbcad-error {
          padding: 18px;
          border-radius: 14px;
          border: 1px solid rgba(220,38,38,0.22);
          background: rgba(254,242,242,0.78);
        }
        .bbcad-thumb {
          width: min(100%, 330px);
          margin: 0 auto 22px;
          border-radius: 14px;
          border: 1px solid rgba(210,185,176,0.7);
          box-shadow: 0 18px 44px rgba(51,39,35,0.16);
        }
        @media (max-width: 860px) {
          .bbcad-generator { grid-template-columns: 1fr; }
          .bbcad-side { border-right: 0; border-bottom: 1px solid var(--bb-line); }
          .bbcad-workspace { padding: 24px 18px; }
        }
        @media (max-width: 640px) {
          .bbcad-generator {
            min-height: 0;
            border-radius: 14px;
            box-shadow: 0 12px 34px rgba(40,32,30,0.1);
          }
          .bbcad-side {
            padding: 18px 16px;
            gap: 14px;
          }
          .bbcad-title { font-size: 1.3rem; }
          .bbcad-copy { font-size: 0.8rem; }
          .bbcad-drop { min-height: 150px; }
          .bbcad-drop-empty { padding: 20px 16px; }
          .bbcad-drop-icon {
            width: 40px;
            height: 40px;
            margin-bottom: 9px;
          }
          .bbcad-workspace { min-height: 300px; padding: 22px 12px; }
          .bbcad-state-icon {
            width: 64px;
            height: 64px;
            margin-bottom: 13px;
          }
          .bbcad-state h3 { font-size: 1.2rem; }
          .bbcad-state p { font-size: 0.82rem; }
          .bbcad-thumb { width: 100%; margin-bottom: 16px; }
        }
      `}</style>

      <div className="bbcad-side">
        <div>
          <div className="bbcad-eyebrow">
            <Box size={13} />
            Image to 3D
          </div>
          <h2 className="bbcad-title">3D model studio</h2>
          <p className="bbcad-copy">
            Upload a clear jewellery reference and generate a preview-ready GLB for review or CAD handoff.
          </p>
        </div>

        <div
          className="bbcad-drop"
          data-drag={isDragOver}
          data-disabled={isRunning}
          onClick={() => !isRunning && fileInputRef.current?.click()}
          onDrop={onDrop}
          onDragOver={e => { e.preventDefault(); setIsDragOver(true) }}
          onDragLeave={() => setIsDragOver(false)}
        >
          {imagePreview ? (
            <>
              <img
                src={imagePreview}
                alt="Selected jewellery reference"
                style={{ width: '100%', maxHeight: 230, objectFit: 'contain', display: 'block', background: '#fff' }}
              />
              {!isRunning && (
                <button
                  type="button"
                  className="bbcad-clear"
                  onClick={e => { e.stopPropagation(); resetImage() }}
                  aria-label="Remove selected image"
                >
                  <X size={14} />
                </button>
              )}
              {imageFile && (
                <div className="bbcad-file-bar">
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {imageFile.name}
                  </span>
                  <span style={{ flexShrink: 0 }}>{formatBytes(imageFile.size)}</span>
                </div>
              )}
            </>
          ) : (
            <div className="bbcad-drop-empty">
              <div className="bbcad-drop-icon">
                <ImagePlus size={24} />
              </div>
              <div style={{ color: 'var(--bb-ink)', fontSize: '0.9rem', fontWeight: 850 }}>
                Drop reference image
              </div>
              <div style={{ color: 'var(--bb-muted)', fontSize: '0.75rem', marginTop: 5 }}>
                JPG, PNG or WEBP, up to 20 MB
              </div>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={e => { const f = e.target.files?.[0]; if (f) acceptImage(f); e.target.value = '' }}
          />
        </div>

        <button
          type="button"
          className="bbcad-primary"
          disabled={!imageFile || isRunning}
          onClick={generate}
        >
          {isRunning
            ? <><Loader2 size={16} className="bbcad-spin" /> Generating model</>
            : <><Wand2 size={16} /> Generate 3D model</>
          }
        </button>

        <div style={{ display: 'grid', gap: 8, color: 'var(--bb-muted)', fontSize: '0.76rem', lineHeight: 1.5 }}>
          <div><strong style={{ color: 'var(--bb-ink)' }}>Best input:</strong> centered product photo, plain background, no hands or packaging.</div>
          <div><strong style={{ color: 'var(--bb-ink)' }}>Output:</strong> GLB mesh for viewer preview, download, and client presentation.</div>
        </div>
      </div>

      <div className="bbcad-workspace">
        {genState === 'idle' && (
          <div className="bbcad-state">
            <div className="bbcad-state-icon">
              <Box size={36} />
            </div>
            <h3>Preview workspace</h3>
            <p>Your generated model will appear here after the source image is processed.</p>
          </div>
        )}

        {(genState === 'uploading' || genState === 'processing') && (
          <div className="bbcad-state">
            <div className="bbcad-state-icon" style={{ position: 'relative' }}>
              <Box size={34} />
              <span
                style={{
                  position: 'absolute',
                  inset: -7,
                  borderRadius: 26,
                  border: '2px solid transparent',
                  borderTopColor: 'var(--bb-rose)',
                  borderRightColor: 'var(--bb-gold)',
                }}
                className="bbcad-spin"
              />
            </div>
            <h3>{genState === 'uploading' ? 'Preparing image' : 'Building 3D model'}</h3>
            <p>Keep this tab open while the model is generated. Most jobs finish in a few minutes.</p>
            <div style={{ display: 'grid', gap: 10, marginTop: 22 }}>
              {taskResult?.status && (
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <StatusBadge status={taskResult.status} />
                </div>
              )}
              <ProgressBar value={progress} />
              <div style={{ color: 'var(--bb-muted)', fontSize: '0.75rem', fontWeight: 800 }}>
                {Math.round(progress)}% complete
              </div>
            </div>
          </div>
        )}

        {genState === 'error' && (
          <div className="bbcad-state bbcad-error">
            <div className="bbcad-state-icon" style={{ width: 64, height: 64, borderRadius: 18, color: '#dc2626', marginBottom: 14 }}>
              <AlertCircle size={30} />
            </div>
            <h3>Generation failed</h3>
            <p>{errorMsg}</p>
            <button
              type="button"
              className="bbcad-secondary"
              onClick={() => { setGenState('idle'); setTaskResult(null); setErrorMsg('') }}
              style={{ marginTop: 18 }}
            >
              <RefreshCw size={14} /> Try again
            </button>
          </div>
        )}

        {genState === 'done' && taskResult && (
          <div className="bbcad-state">
            <div className="bbcad-state-icon" style={{ color: 'var(--bb-emerald)' }}>
              <CheckCircle2 size={36} />
            </div>
            <h3>3D model ready</h3>
            <div style={{ display: 'flex', justifyContent: 'center', margin: '14px 0 22px' }}>
              <StatusBadge status="SUCCEEDED" />
            </div>

            {taskResult.thumbnail_url && (
              <img className="bbcad-thumb" src={taskResult.thumbnail_url} alt="Generated 3D preview" />
            )}

            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 10 }}>
              {glbUrl && (
                <button
                  type="button"
                  className="bbcad-primary"
                  disabled={savingToViewer}
                  onClick={() => saveAndView()}
                  style={{ padding: '0 20px' }}
                >
                  {savingToViewer ? <Loader2 size={15} className="bbcad-spin" /> : <Box size={15} />}
                  {savingToViewer ? 'Opening viewer' : 'Open in CAD viewer'}
                </button>
              )}
              {glbUrl && (
                <a className="bbcad-secondary" href={glbUrl} download={`model_${taskId?.slice(0, 8) || 'generated'}.glb`}>
                  <Download size={14} /> Download GLB
                </a>
              )}
            </div>

            <button
              type="button"
              className="bbcad-secondary"
              onClick={resetImage}
              style={{ marginTop: 18, background: 'transparent' }}
            >
              <RefreshCw size={13} /> Start new
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
