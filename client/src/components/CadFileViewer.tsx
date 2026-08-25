import { Component, Suspense, useEffect, useMemo, useRef, useState, type ErrorInfo, type ReactNode } from 'react'
import { Canvas, useLoader } from '@react-three/fiber'
import { Center, ContactShadows, Environment, Html, OrbitControls, PerspectiveCamera } from '@/lib/drei'
import { EffectComposer, Bloom, ToneMapping } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader.js'
import { ThreeMFLoader } from 'three/examples/jsm/loaders/3MFLoader.js'
import { ColladaLoader } from 'three/examples/jsm/loaders/ColladaLoader.js'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'
import { TDSLoader } from 'three/examples/jsm/loaders/TDSLoader.js'
import * as THREE from 'three'

/**
 * Traverse a loaded 3D object and upgrade materials to jewelry-quality PBR.
 *
 * Heuristics (works on TRELLIS vertex-colored meshes and textured GLTFs):
 *  - Warm golden hue  → high-metalness gold  (metalness 0.97, roughness 0.07)
 *  - Cool neutral     → polished silver/platinum (metalness 0.97, roughness 0.09)
 *  - Saturated colour → gemstone (MeshPhysicalMaterial, transmission + IOR)
 *  - Everything else  → default jewelry metal (metalness 0.88, roughness 0.14)
 */
function upgradeToJewelryPBR(object: THREE.Object3D) {
  object.traverse(child => {
    if (!(child instanceof THREE.Mesh)) return

    const geometry = child.geometry as THREE.BufferGeometry
    const colorAttr = geometry.attributes['color']

    // Compute average RGB from vertex colors if present
    let r = 0.72, g = 0.60, b = 0.20 // gold fallback
    if (colorAttr) {
      const n = colorAttr.count
      let sr = 0, sg = 0, sb = 0
      for (let i = 0; i < n; i++) {
        sr += colorAttr.getX(i)
        sg += colorAttr.getY(i)
        sb += colorAttr.getZ(i)
      }
      r = sr / n; g = sg / n; b = sb / n
    } else {
      const mats = Array.isArray(child.material) ? child.material : [child.material]
      const m = mats[0] as THREE.MeshStandardMaterial | undefined
      if (m?.color) { r = m.color.r; g = m.color.g; b = m.color.b }
    }

    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    const saturation = max > 0 ? (max - min) / max : 0
    const value = max

    const applyMetal = (metalness: number, roughness: number) => {
      const mats = Array.isArray(child.material) ? child.material : [child.material]
      mats.forEach(m => {
        const sm = m as THREE.MeshStandardMaterial
        sm.metalness = metalness
        sm.roughness = roughness
        sm.envMapIntensity = 1.1
        sm.needsUpdate = true
      })
    }

    if (r > 0.46 && r > g * 1.15 && b < 0.32 && value > 0.38) {
      // Gold — warm tone, higher roughness prevents mesh-bump mirror effect
      applyMetal(0.90, 0.22)
    } else if (saturation < 0.13 && value > 0.42) {
      // Silver / platinum
      applyMetal(0.90, 0.25)
    } else if (saturation > 0.38 && value > 0.25) {
      // Gem — highly saturated (amethyst, sapphire, ruby, emerald …)
      child.material = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(r, g, b),
        vertexColors: !!colorAttr,
        metalness: 0,
        roughness: 0.08,
        transmission: 0.82,
        ior: 1.72,
        thickness: 0.4,
        envMapIntensity: 1.8,
        transparent: true,
      })
    } else {
      // Default jewelry metal
      applyMetal(0.82, 0.30)
    }
  })
}
import { Box, Download, FileArchive, FileText, Maximize2, Minimize2, RotateCcw, Trash2, Upload } from 'lucide-react'
import { useProjects, type CadFile } from '../context/ProjectContext'
import { useApp } from '../context/AppContext'

type PreviewKind = 'stl' | 'obj' | 'gltf' | 'ply' | '3mf' | 'dae' | 'fbx' | '3ds' | 'image' | 'unsupported'

interface UploadedCadFile {
  name: string
  size: number
  extension: string
  url: string
  previewKind: PreviewKind
}

class CanvasModelErrorBoundary extends Component<
  { children: ReactNode; resetKey: string },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidUpdate(prevProps: { resetKey: string }) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null })
    }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('CAD model render failed', error, info)
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <CanvasStatusLabel
        title="Could not preview this model"
        description={cleanCadLoadError(this.state.error)}
      />
    )
  }
}

class ViewerRenderErrorBoundary extends Component<
  { children: ReactNode; fileName?: string; resetKey: string },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidUpdate(prevProps: { resetKey: string }) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null })
    }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('CAD viewer failed', error, info)
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div style={{ height: '100%', display: 'grid', placeItems: 'center', textAlign: 'center', padding: 28 }}>
        <div style={{ maxWidth: 430 }}>
          <div style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            margin: '0 auto 16px',
            background: '#f5ede8',
            color: 'var(--bb-rose)',
          }}>
            <FileArchive size={26} />
          </div>
          <h2 style={{ margin: '0 0 10px', color: 'var(--bb-ink)', fontFamily: 'var(--app-font-display)', fontWeight: 600 }}>
            Viewer could not start
          </h2>
          <p style={{ margin: 0, color: 'var(--bb-muted)', lineHeight: 1.65 }}>
            {this.props.fileName ? `${this.props.fileName} is saved, but the live preview failed in this browser.` : 'The CAD file is saved, but the live preview failed in this browser.'}
          </p>
        </div>
      </div>
    )
  }
}

function cleanCadLoadError(error: Error) {
  const message = error.message || String(error)
  if (/failed to fetch|load|network|404|504/i.test(message)) {
    return 'The model file could not be loaded. Try Reset view, or download the file and re-upload it.'
  }
  if (/json|parse|unexpected|invalid/i.test(message)) {
    return 'The file exists, but this model format looks invalid or incomplete.'
  }
  return 'The file is saved, but the browser could not render its live 3D preview.'
}

function CanvasStatusLabel({ title, description }: { title: string; description: string }) {
  return (
    <Html center>
      <div style={{
        minWidth: 260,
        maxWidth: 360,
        padding: '16px 18px',
        borderRadius: 14,
        background: 'rgba(255,255,255,0.92)',
        color: 'var(--bb-ink)',
        textAlign: 'center',
        boxShadow: '0 18px 45px rgba(0,0,0,0.22)',
        border: '1px solid rgba(255,255,255,0.75)',
      }}>
        <div style={{
          width: 30,
          height: 30,
          borderRadius: '50%',
          border: '3px solid rgba(207,95,145,0.18)',
          borderTopColor: 'var(--bb-rose)',
          animation: title.startsWith('Loading') ? 'spin 0.9s linear infinite' : 'none',
          margin: '0 auto 10px',
        }} />
        <strong style={{ display: 'block', marginBottom: 6 }}>{title}</strong>
        <span style={{ display: 'block', color: 'var(--bb-muted)', fontSize: '0.8rem', lineHeight: 1.45 }}>
          {description}
        </span>
      </div>
    </Html>
  )
}

const ACCEPTED_EXTENSIONS = [
  '.stl', '.obj', '.glb', '.gltf', '.ply',
  '.step', '.stp', '.iges', '.igs', '.3dm', '.3mf',
  '.fbx', '.dae', '.dxf', '.dwg', '.3ds', '.usdz',
  '.zip', '.rar', '.7z',
]

function getPreviewKind(extension: string): PreviewKind {
  if (extension === 'stl') return 'stl'
  if (extension === 'obj') return 'obj'
  if (extension === 'glb' || extension === 'gltf') return 'gltf'
  if (extension === 'ply') return 'ply'
  if (extension === '3mf') return '3mf'
  if (extension === 'dae') return 'dae'
  if (extension === 'fbx') return 'fbx'
  if (extension === '3ds') return '3ds'
  if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(extension)) return 'image'
  return 'unsupported'
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function toUploadedCadFile(file: CadFile): UploadedCadFile {
  const extension = (file.extension || file.name.split('.').pop() || '').toLowerCase()
  return {
    name: file.name,
    size: file.size || 0,
    extension,
    url: file.url,
    previewKind: getPreviewKind(extension),
  }
}

function StlModel({ url }: { url: string }) {
  const geometry = useLoader(STLLoader, url)
  const normalized = useMemo(() => {
    const clone = geometry.clone()
    clone.computeVertexNormals()
    clone.center()
    return clone
  }, [geometry])
  // STL has no color data — render as polished gold by default
  return (
    <mesh geometry={normalized} castShadow receiveShadow>
      <meshPhysicalMaterial color="#d4a853" metalness={0.90} roughness={0.22} envMapIntensity={1.1} />
    </mesh>
  )
}

function ObjModel({ url }: { url: string }) {
  const object = useLoader(OBJLoader, url)
  const scene = useMemo(() => {
    const clone = object.clone(true)
    upgradeToJewelryPBR(clone)
    return clone
  }, [object])
  return <primitive object={scene} />
}

function GltfModel({ url }: { url: string }) {
  const gltf = useLoader(GLTFLoader, url)
  const scene = useMemo(() => {
    const clone = gltf.scene.clone(true)
    upgradeToJewelryPBR(clone)
    return clone
  }, [gltf.scene])
  return <primitive object={scene} />
}

function PlyModel({ url }: { url: string }) {
  const geometry = useLoader(PLYLoader, url)
  const normalized = useMemo(() => {
    const clone = geometry.clone()
    clone.computeVertexNormals()
    clone.center()
    return clone
  }, [geometry])
  return (
    <mesh geometry={normalized} castShadow receiveShadow>
      <meshPhysicalMaterial color="#d4a853" metalness={0.90} roughness={0.22} envMapIntensity={1.1} />
    </mesh>
  )
}

function ThreeMfModel({ url }: { url: string }) {
  const object = useLoader(ThreeMFLoader, url)
  const scene = useMemo(() => {
    const clone = object.clone(true)
    upgradeToJewelryPBR(clone)
    return clone
  }, [object])
  return <primitive object={scene} />
}

function ColladaModel({ url }: { url: string }) {
  const collada = useLoader(ColladaLoader, url)
  const scene = useMemo(() => {
    const base = (collada?.scene || new THREE.Group()).clone(true)
    upgradeToJewelryPBR(base)
    return base
  }, [collada])
  return <primitive object={scene} />
}

function FbxModel({ url }: { url: string }) {
  const object = useLoader(FBXLoader, url)
  const scene = useMemo(() => {
    const clone = object.clone(true)
    upgradeToJewelryPBR(clone)
    return clone
  }, [object])
  return <primitive object={scene} />
}

function ThreeDsModel({ url }: { url: string }) {
  const object = useLoader(TDSLoader, url)
  const scene = useMemo(() => {
    const clone = object.clone(true)
    upgradeToJewelryPBR(clone)
    return clone
  }, [object])
  return <primitive object={scene} />
}

function CadModel({ file }: { file: UploadedCadFile }) {
  return (
    <Center>
      <group rotation={[-Math.PI / 2, 0, 0]}>
        {file.previewKind === 'stl' && <StlModel url={file.url} />}
        {file.previewKind === 'obj' && <ObjModel url={file.url} />}
        {file.previewKind === 'gltf' && <GltfModel url={file.url} />}
        {file.previewKind === 'ply' && <PlyModel url={file.url} />}
        {file.previewKind === '3mf' && <ThreeMfModel url={file.url} />}
        {file.previewKind === 'dae' && <ColladaModel url={file.url} />}
        {file.previewKind === 'fbx' && <FbxModel url={file.url} />}
        {file.previewKind === '3ds' && <ThreeDsModel url={file.url} />}
      </group>
    </Center>
  )
}

function ViewerCanvas({ file }: { file: UploadedCadFile }) {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      gl={{ antialias: true, toneMapping: THREE.NoToneMapping }}
      style={{ display: 'block', width: '100%', height: '100%' }}
    >
      <PerspectiveCamera makeDefault position={[8, 7, 10]} fov={32} />

      {/* Dark velvet background — makes metals and gems pop */}
      <color attach="background" args={['#111114']} />

      {/* ── Jewelry studio 3-point lighting ── */}
      {/* Key light: warm top-right */}
      <spotLight
        position={[12, 18, 10]} angle={0.22} penumbra={0.65}
        intensity={2.8} castShadow color="#fff8ee"
        shadow-mapSize={[2048, 2048]} shadow-bias={-0.0004}
      />
      {/* Fill light: cool left */}
      <spotLight
        position={[-10, 10, -6]} angle={0.38} penumbra={0.9}
        intensity={1.1} color="#dceeff"
      />
      {/* Rim light: bottom-front */}
      <spotLight
        position={[1, -5, 14]} angle={0.5} penumbra={1}
        intensity={0.7} color="#fff4e8"
      />
      {/* Ambient: slightly raised so dark areas aren't pitch black */}
      <ambientLight intensity={0.32} />

      {/* Studio HDRI */}
      <Suspense fallback={<CanvasStatusLabel title="Loading 3D model" description="Preparing the live preview..." />}>
        <CanvasModelErrorBoundary resetKey={`${file.previewKind}:${file.url}`}>
          <Environment preset="studio" environmentIntensity={1.0} />

          <CadModel file={file} />
          {/* Soft contact shadow on the ground plane */}
          <ContactShadows
            position={[0, -3.2, 0]}
            opacity={0.55} scale={22} blur={2.5} far={5}
            color="#000000"
          />
          <OrbitControls enableDamping dampingFactor={0.07} target={[0, 0, 0]} />

          <EffectComposer>
            <Bloom
              intensity={0.18}
              luminanceThreshold={0.90}
              luminanceSmoothing={0.60}
              mipmapBlur
            />
            <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
          </EffectComposer>
        </CanvasModelErrorBoundary>
      </Suspense>

      {/* ── Post-processing ── */}
    </Canvas>
  )
}

/* ─── responsive hook ─────────────────────────────────── */
function useMobile(breakpoint = 768) {
  const [mobile, setMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < breakpoint : false,
  )
  useEffect(() => {
    const fn = () => setMobile(window.innerWidth < breakpoint)
    window.addEventListener('resize', fn, { passive: true })
    return () => window.removeEventListener('resize', fn)
  }, [breakpoint])
  return mobile
}

interface CadFileViewerProps {
  /** Hide the delete button (e.g. for customer portal). Upload is always available. */
  canDelete?: boolean
}

export default function CadFileViewer({ canDelete = true }: CadFileViewerProps) {
  const { showToast } = useApp()
  const { cadFiles, saveCadFile, deleteCadFile, viewerCadFile, setViewerCadFile } = useProjects()
  const [file, setFile] = useState<UploadedCadFile | null>(null)
  const [activeSavedId, setActiveSavedId] = useState<string | null>(null)
  const [viewKey, setViewKey] = useState(0)
  const [saving, setSaving] = useState(false)
  const [maximized, setMaximized] = useState(false)
  const viewerRef = useRef<HTMLElement>(null)
  const mobile = useMobile()

  // Sync maximized state with browser fullscreen events (e.g. user presses Esc)
  useEffect(() => {
    const onFsChange = () => {
      if (!document.fullscreenElement) setMaximized(false)
    }
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])

  const toggleMaximize = () => {
    if (!maximized) {
      viewerRef.current?.requestFullscreen?.().catch(() => {})
      setMaximized(true)
    } else {
      document.exitFullscreen?.().catch(() => {})
      setMaximized(false)
    }
  }

  useEffect(() => {
    if (!viewerCadFile) return
    setActiveSavedId(viewerCadFile.id)
    setFile(toUploadedCadFile(viewerCadFile))
    setViewKey(prev => prev + 1)
    setViewerCadFile(null)
  }, [setViewerCadFile, viewerCadFile])

  const handleFile = async (incoming: File | undefined) => {
    if (!incoming) return
    const extension = incoming.name.split('.').pop()?.toLowerCase() || ''
    setSaving(true)
    try {
      const url = await fileToDataUrl(incoming)
      const saved = await saveCadFile({
        name: incoming.name,
        url,
        mimeType: incoming.type || 'application/octet-stream',
        extension,
        size: incoming.size,
        source: 'upload',
      })
      setActiveSavedId(saved.id)
      setFile(toUploadedCadFile(saved))
      setViewKey(prev => prev + 1)
      showToast('CAD file saved to gallery', 'success')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'CAD file save failed', 'error')
    } finally {
      setSaving(false)
    }
  }

  const openSaved = (saved: CadFile) => {
    setActiveSavedId(saved.id)
    setFile(toUploadedCadFile(saved))
    setViewKey(prev => prev + 1)
  }

  const removeSaved = async (id: string) => {
    try {
      await deleteCadFile(id)
      if (activeSavedId === id) {
        setActiveSavedId(null)
        setFile(null)
      }
      showToast('CAD file deleted', 'success')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Could not delete CAD file', 'error')
    }
  }

  /* ─── viewer panel ───────────────────────────────────── */
  const viewerSection = (
    <section
      ref={viewerRef}
      className="bb-card"
      style={{
        borderRadius: 18,
        overflow: 'hidden',
        position: 'relative',
        background: '#111114',
        border: '1px solid rgba(80,70,90,0.6)',
        boxShadow: '0 24px 70px rgba(31,27,29,0.18)',
        height: '100%',
        minHeight: mobile ? 320 : 0,
      }}
    >
      {/* Top bar: filename badge + maximize button */}
      <div style={{
        position: 'absolute', top: 12, left: 12, right: 12, zIndex: 2,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 12,
      }}>
        {/* Filename badge */}
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          borderRadius: 999, padding: mobile ? '6px 10px' : '8px 12px',
          background: 'rgba(20,18,28,0.72)', backdropFilter: 'blur(12px)',
          color: 'rgba(255,255,255,0.9)', fontWeight: 900,
          fontSize: mobile ? '0.7rem' : '0.78rem',
          maxWidth: '70%', overflow: 'hidden',
          textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          pointerEvents: 'none',
        }}>
          <Box size={mobile ? 12 : 14} />
          {file ? file.name : 'No file loaded'}
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Touch hint for mobile */}
          {mobile && file && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              borderRadius: 999, padding: '5px 9px',
              background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(10px)',
              color: 'var(--bb-muted)', fontSize: '0.65rem', fontWeight: 700,
              pointerEvents: 'none',
            }}>
              👆 Drag to rotate
            </span>
          )}

          {/* Maximize / minimize button */}
          <button
            onClick={toggleMaximize}
            title={maximized ? 'Exit fullscreen' : 'Fullscreen'}
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 36, height: 36, borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.15)',
              background: 'rgba(20,18,28,0.72)',
              backdropFilter: 'blur(12px)',
              color: 'rgba(255,255,255,0.85)',
              cursor: 'pointer',
              transition: 'background 0.15s, transform 0.15s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(168,85,247,0.45)'
              e.currentTarget.style.transform = 'scale(1.08)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(20,18,28,0.72)'
              e.currentTarget.style.transform = 'scale(1)'
            }}
          >
            {maximized ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
        </div>
      </div>

      {file?.previewKind && file.previewKind === 'image' ? (
        <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', padding: 24 }}>
          <img
            src={file.url}
            alt={file.name}
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 12, boxShadow: '0 18px 45px rgba(0,0,0,0.4)' }}
          />
        </div>
      ) : file?.previewKind && file.previewKind !== 'unsupported' ? (
        <div style={{ width: '100%', height: '100%' }}>
          <ViewerRenderErrorBoundary resetKey={`${viewKey}:${file.previewKind}:${file.url}`} fileName={file.name}>
            <ViewerCanvas key={viewKey} file={file} />
          </ViewerRenderErrorBoundary>
        </div>
      ) : (
        <div style={{ height: '100%', display: 'grid', placeItems: 'center', textAlign: 'center', padding: mobile ? 20 : 28 }}>
          <div style={{ maxWidth: 420 }}>
            <div style={{
              width: mobile ? 56 : 74, height: mobile ? 56 : 74,
              borderRadius: '50%', display: 'grid', placeItems: 'center',
              margin: '0 auto 16px', background: '#f5ede8', color: 'var(--bb-rose)',
            }}>
              {file ? <FileArchive size={mobile ? 22 : 30} /> : <Box size={mobile ? 22 : 30} />}
            </div>
            <h2 style={{ margin: '0 0 10px', color: 'var(--bb-ink)', fontFamily: 'var(--app-font-display)', fontWeight: 500, fontSize: mobile ? '1.1rem' : '1.4rem' }}>
              {file ? 'File saved for handoff' : 'Upload a CAD file'}
            </h2>
            <p style={{ margin: 0, color: 'var(--bb-muted)', lineHeight: 1.65, fontSize: mobile ? '0.82rem' : '0.9rem' }}>
              {file
                ? `${file.extension.toUpperCase()} files are accepted, but this format needs a dedicated CAD kernel/viewer for live geometry preview.`
                : 'Use this viewer for supplier CAD files, customer uploads, or generated mesh exports.'}
            </p>
          </div>
        </div>
      )}
    </section>
  )

  /* ─── sidebar panel ──────────────────────────────────── */
  const sidebarSection = (
    <aside style={{ display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto', overflowX: 'hidden', height: '100%', scrollbarWidth: 'thin' }}>

      {/* Upload + File info — side-by-side on mobile */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: mobile ? '1fr 1fr' : '1fr',
        gap: 12,
      }}>
        {/* Upload */}
        <section
          className="bb-card"
          style={{
            padding: mobile ? 14 : 18,
            borderRadius: 16,
            background: 'linear-gradient(180deg, #ffffff, #fff8f5)',
            boxShadow: '0 18px 42px rgba(53,40,35,0.10)',
          }}
        >
          <span className="bb-eyebrow" style={{ color: 'var(--bb-pillar-2)', display: 'block', marginBottom: 10 }}>Import</span>
          <label
            className="bb-btn-primary bb-lift"
            style={{ width: '100%', justifyContent: 'center', cursor: 'pointer', fontSize: mobile ? '0.78rem' : undefined }}
          >
            <Upload size={14} /> {saving ? 'Saving…' : 'Upload CAD'}
            <input
              type="file"
              accept={ACCEPTED_EXTENSIONS.join(',')}
              disabled={saving}
              onChange={(e) => handleFile(e.target.files?.[0])}
              style={{ display: 'none' }}
            />
          </label>
          {!mobile && (
            <p style={{ margin: '10px 0 0', color: 'var(--bb-muted)', fontSize: '0.8rem', lineHeight: 1.5 }}>
              STL, OBJ, GLB, GLTF, PLY, 3MF, DAE, FBX and 3DS open in the live viewer. STEP, IGES, 3DM, DXF and DWG are stored for CAD handoff.
            </p>
          )}
        </section>

        {/* File info */}
        <section className="bb-card" style={{ padding: mobile ? 14 : 18, borderRadius: 16, boxShadow: '0 18px 42px rgba(53,40,35,0.08)' }}>
          <span className="bb-eyebrow" style={{ color: 'var(--bb-pillar-3)', display: 'block', marginBottom: 10 }}>File</span>
          {file ? (
            <div style={{ display: 'grid', gap: 8 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, display: 'grid', placeItems: 'center', background: '#f5ede8', color: 'var(--bb-rose)', flexShrink: 0 }}>
                  {file.previewKind === 'unsupported' ? <FileArchive size={15} /> : <Box size={15} />}
                </div>
                <div style={{ minWidth: 0 }}>
                  <strong style={{ color: 'var(--bb-ink)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.8rem' }}>{file.name}</strong>
                  <span style={{ color: 'var(--bb-muted)', fontSize: '0.72rem' }}>{file.extension.toUpperCase()} · {formatSize(file.size)}</span>
                </div>
              </div>
              <button className="bb-btn-secondary" onClick={() => setViewKey(prev => prev + 1)} style={{ width: '100%', justifyContent: 'center', fontSize: '0.8rem' }}>
                <RotateCcw size={13} /> Reset view
              </button>
              <a className="bb-btn-secondary" href={file.url} download={file.name} style={{ width: '100%', justifyContent: 'center', textDecoration: 'none', fontSize: '0.8rem' }}>
                <Download size={13} /> Download
              </a>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', color: 'var(--bb-muted)', fontSize: '0.84rem' }}>
              <FileText size={15} /> No file loaded
            </div>
          )}
        </section>
      </div>

      {/* Saved CAD folder — grows to fill remaining sidebar */}
      <section className="bb-card" style={{ padding: mobile ? 14 : 18, borderRadius: 16, boxShadow: '0 18px 42px rgba(53,40,35,0.08)', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <span className="bb-eyebrow" style={{ color: 'var(--bb-pillar-1)', display: 'block', marginBottom: 10, flexShrink: 0 }}>
          {canDelete ? 'Saved CAD folder' : 'Your 3D models'}
        </span>
        <div style={{ display: 'grid', gap: 7, overflowY: 'auto', paddingRight: 4, flex: 1, minHeight: 0, alignContent: 'start' }}>
          {cadFiles.map(saved => {
            const extension = (saved.extension || saved.name.split('.').pop() || '').toUpperCase()
            const active = activeSavedId === saved.id
            return (
              <div
                key={saved.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: canDelete ? '1fr auto' : '1fr',
                  gap: 6,
                  alignItems: 'center',
                  border: `1px solid ${active ? 'var(--bb-rose)' : 'var(--bb-line)'}`,
                  borderRadius: 10,
                  background: active ? 'linear-gradient(135deg, #fff7f4, #ffffff)' : '#fff',
                  padding: mobile ? 8 : 9,
                  boxShadow: active ? '0 12px 26px rgba(207,95,145,0.12)' : 'none',
                }}
              >
                <button
                  type="button"
                  onClick={() => openSaved(saved)}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, border: 0, background: 'transparent', padding: 0, textAlign: 'left', cursor: 'pointer' }}
                >
                  <Box size={14} style={{ color: 'var(--bb-rose)', flexShrink: 0 }} />
                  <span style={{ minWidth: 0 }}>
                    <strong style={{ display: 'block', color: 'var(--bb-ink)', fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{saved.name}</strong>
                    <span style={{ display: 'block', color: 'var(--bb-muted)', fontSize: '0.7rem' }}>{extension} · {formatSize(saved.size || 0)}</span>
                  </span>
                </button>
                {canDelete && (
                  <button className="bb-icon-btn" onClick={() => void removeSaved(saved.id)} aria-label="Delete CAD file">
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            )
          })}
          {cadFiles.length === 0 && (
            <div style={{ color: 'var(--bb-muted)', fontSize: '0.84rem', lineHeight: 1.5 }}>
              {canDelete ? 'No CAD files saved yet.' : 'No 3D models saved yet.'}
            </div>
          )}
        </div>
      </section>
    </aside>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 12, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexShrink: 0, padding: '2px 4px' }}>
        <h2 style={{
          margin: 0,
          fontFamily: 'var(--app-font-display)',
          fontWeight: 700,
          fontSize: mobile ? '1.15rem' : '1.45rem',
          color: '#e879a0',
          textShadow: '0 0 18px rgba(236,72,153,0.55), 0 0 40px rgba(167,90,255,0.30)',
          letterSpacing: '-0.01em',
        }}>
          {canDelete ? 'CAD file studio' : 'Your 3D models'}
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--bb-muted)', fontWeight: 800, fontSize: mobile ? '0.74rem' : '0.82rem' }}>
          <FileArchive size={14} /> {cadFiles.length} files
        </div>
      </div>

      {/* Body — fills remaining height */}
      {mobile ? (
        /* ── Mobile: viewer on top, sidebar below (natural scroll) ── */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, overflow: 'auto', flex: 1 }}>
          <div style={{ height: Math.min(Math.round(window.innerWidth * 0.82), 400) }}>
            {viewerSection}
          </div>
          {sidebarSection}
        </div>
      ) : (
        /* ── Desktop: sidebar left, viewer right — both fill remaining height ── */
        <div style={{ display: 'grid', gridTemplateColumns: '280px minmax(0, 1fr)', gap: 14, flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <div style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {sidebarSection}
          </div>
          {viewerSection}
        </div>
      )}
    </div>
  )
}
