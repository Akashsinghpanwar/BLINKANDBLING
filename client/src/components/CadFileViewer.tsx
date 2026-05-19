import { Suspense, useEffect, useMemo, useState } from 'react'
import { Canvas, useLoader } from '@react-three/fiber'
import { Center, Environment, OrbitControls, PerspectiveCamera } from '@react-three/drei'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader.js'
import { ThreeMFLoader } from 'three/examples/jsm/loaders/3MFLoader.js'
import { ColladaLoader } from 'three/examples/jsm/loaders/ColladaLoader.js'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'
import { TDSLoader } from 'three/examples/jsm/loaders/TDSLoader.js'
import * as THREE from 'three'
import { Box, Download, FileArchive, FileText, RotateCcw, Trash2, Upload } from 'lucide-react'
import { useProjects, type CadFile } from '../context/ProjectContext'
import { useApp } from '../context/AppContext'

type PreviewKind = 'stl' | 'obj' | 'gltf' | 'ply' | '3mf' | 'dae' | 'fbx' | '3ds' | 'unsupported'

interface UploadedCadFile {
  name: string
  size: number
  extension: string
  url: string
  previewKind: PreviewKind
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

  return (
    <mesh geometry={normalized} castShadow receiveShadow>
      <meshStandardMaterial color="#d8d2ca" metalness={0.45} roughness={0.32} />
    </mesh>
  )
}

function ObjModel({ url }: { url: string }) {
  const object = useLoader(OBJLoader, url)
  const clone = useMemo(() => object.clone(true), [object])
  return <primitive object={clone} />
}

function GltfModel({ url }: { url: string }) {
  const gltf = useLoader(GLTFLoader, url)
  const scene = useMemo(() => gltf.scene.clone(true), [gltf.scene])
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
      <meshStandardMaterial color="#d8d2ca" metalness={0.35} roughness={0.38} />
    </mesh>
  )
}

function ThreeMfModel({ url }: { url: string }) {
  const object = useLoader(ThreeMFLoader, url)
  const clone = useMemo(() => object.clone(true), [object])
  return <primitive object={clone} />
}

function ColladaModel({ url }: { url: string }) {
  const collada = useLoader(ColladaLoader, url)
  const scene = useMemo(() => (collada?.scene || new THREE.Group()).clone(true), [collada])
  return <primitive object={scene} />
}

function FbxModel({ url }: { url: string }) {
  const object = useLoader(FBXLoader, url)
  const clone = useMemo(() => object.clone(true), [object])
  return <primitive object={clone} />
}

function ThreeDsModel({ url }: { url: string }) {
  const object = useLoader(TDSLoader, url)
  const clone = useMemo(() => object.clone(true), [object])
  return <primitive object={clone} />
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
    <Canvas shadows dpr={[1, 2]} gl={{ antialias: true }}>
      <PerspectiveCamera makeDefault position={[8, 7, 10]} fov={35} />
      <color attach="background" args={['#d4d4d4']} />
      <ambientLight intensity={0.45} />
      <directionalLight position={[8, 12, 8]} intensity={1.3} castShadow />
      <directionalLight position={[-8, 5, -4]} intensity={0.5} />
      <Environment preset="studio" environmentIntensity={1.1} />
      <gridHelper args={[20, 20, '#9ca3af', '#eeeeee']} position={[0, -2.8, 0]} />
      <Suspense fallback={null}>
        <CadModel file={file} />
      </Suspense>
      <OrbitControls enableDamping dampingFactor={0.08} target={[0, 0, 0]} />
    </Canvas>
  )
}

export default function CadFileViewer() {
  const { showToast } = useApp()
  const { cadFiles, saveCadFile, deleteCadFile, viewerCadFile, setViewerCadFile } = useProjects()
  const [file, setFile] = useState<UploadedCadFile | null>(null)
  const [activeSavedId, setActiveSavedId] = useState<string | null>(null)
  const [viewKey, setViewKey] = useState(0)
  const [saving, setSaving] = useState(false)

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

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <section
        style={{
          borderRadius: 18,
          border: '1px solid rgba(210,185,176,0.9)',
          background: 'linear-gradient(135deg, rgba(255,255,255,0.96), rgba(255,247,244,0.88))',
          boxShadow: '0 22px 70px rgba(40,32,30,0.12)',
          padding: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 14,
        }}
      >
        <div>
          <span className="bb-eyebrow" style={{ color: 'var(--bb-rose)' }}>AutoCAD Viewer</span>
          <h2 style={{ margin: '4px 0 0', color: 'var(--bb-ink)', fontFamily: 'var(--app-font-display)', fontWeight: 500, fontSize: '1.55rem' }}>
            CAD file studio
          </h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--bb-muted)', fontWeight: 800, fontSize: '0.82rem' }}>
          <FileArchive size={16} /> {cadFiles.length} saved files
        </div>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: '340px minmax(0, 1fr)', gap: 14, minHeight: 640 }}>
        <aside style={{ display: 'grid', gap: 14, alignContent: 'start' }}>
          <section
            className="bb-card"
            style={{
              padding: 18,
              borderRadius: 16,
              background: 'linear-gradient(180deg, #ffffff, #fff8f5)',
              boxShadow: '0 18px 42px rgba(53,40,35,0.10)',
            }}
          >
          <span className="bb-eyebrow" style={{ color: 'var(--bb-pillar-2)', display: 'block', marginBottom: 12 }}>Import</span>
          <label
            className="bb-btn-primary bb-lift"
            style={{ width: '100%', justifyContent: 'center', cursor: 'pointer' }}
          >
            <Upload size={16} /> {saving ? 'Saving...' : 'Upload CAD file'}
            <input
              type="file"
              accept={ACCEPTED_EXTENSIONS.join(',')}
              disabled={saving}
              onChange={(event) => handleFile(event.target.files?.[0])}
              style={{ display: 'none' }}
            />
          </label>
          <p style={{ margin: '12px 0 0', color: 'var(--bb-muted)', fontSize: '0.82rem', lineHeight: 1.55 }}>
            STL, OBJ, GLB, GLTF, PLY, 3MF, DAE, FBX and 3DS open in the live viewer. STEP, IGES, 3DM, DXF and DWG are stored for CAD handoff.
          </p>
        </section>

        <section className="bb-card" style={{ padding: 18, borderRadius: 16, boxShadow: '0 18px 42px rgba(53,40,35,0.08)' }}>
          <span className="bb-eyebrow" style={{ color: 'var(--bb-pillar-1)', display: 'block', marginBottom: 12 }}>Saved CAD folder</span>
          <div style={{ display: 'grid', gap: 8, maxHeight: 330, overflowY: 'auto', paddingRight: 4 }}>
            {cadFiles.map(saved => {
              const extension = (saved.extension || saved.name.split('.').pop() || '').toUpperCase()
              const active = activeSavedId === saved.id
              return (
                <div
                  key={saved.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto',
                    gap: 8,
                    alignItems: 'center',
                    border: `1px solid ${active ? 'var(--bb-rose)' : 'var(--bb-line)'}`,
                    borderRadius: 12,
                    background: active ? 'linear-gradient(135deg, #fff7f4, #ffffff)' : '#fff',
                    padding: 9,
                    boxShadow: active ? '0 12px 26px rgba(207,95,145,0.12)' : 'none',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => openSaved(saved)}
                    style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0, border: 0, background: 'transparent', padding: 0, textAlign: 'left', cursor: 'pointer' }}
                  >
                    <Box size={16} style={{ color: 'var(--bb-rose)', flexShrink: 0 }} />
                    <span style={{ minWidth: 0 }}>
                      <strong style={{ display: 'block', color: 'var(--bb-ink)', fontSize: '0.82rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{saved.name}</strong>
                      <span style={{ display: 'block', color: 'var(--bb-muted)', fontSize: '0.72rem' }}>{extension || 'FILE'} - {formatSize(saved.size || 0)}</span>
                    </span>
                  </button>
                  <button className="bb-icon-btn" onClick={() => void removeSaved(saved.id)} aria-label="Delete CAD file">
                    <Trash2 size={14} />
                  </button>
                </div>
              )
            })}
            {cadFiles.length === 0 && (
              <div style={{ color: 'var(--bb-muted)', fontSize: '0.86rem', lineHeight: 1.5 }}>No CAD files saved yet.</div>
            )}
          </div>
        </section>

        <section className="bb-card" style={{ padding: 18, borderRadius: 16, boxShadow: '0 18px 42px rgba(53,40,35,0.08)' }}>
          <span className="bb-eyebrow" style={{ color: 'var(--bb-pillar-3)', display: 'block', marginBottom: 12 }}>File</span>
          {file ? (
            <div style={{ display: 'grid', gap: 10 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <div style={{ width: 42, height: 42, borderRadius: 10, display: 'grid', placeItems: 'center', background: '#f5ede8', color: 'var(--bb-rose)' }}>
                  {file.previewKind === 'unsupported' ? <FileArchive size={18} /> : <Box size={18} />}
                </div>
                <div style={{ minWidth: 0 }}>
                  <strong style={{ color: 'var(--bb-ink)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</strong>
                  <span style={{ color: 'var(--bb-muted)', fontSize: '0.8rem' }}>{file.extension.toUpperCase()} - {formatSize(file.size)}</span>
                </div>
              </div>
              <button className="bb-btn-secondary" onClick={() => setViewKey(prev => prev + 1)} style={{ width: '100%', justifyContent: 'center' }}>
                <RotateCcw size={15} /> Reset viewer
              </button>
              <a className="bb-btn-secondary" href={file.url} download={file.name} style={{ width: '100%', justifyContent: 'center', textDecoration: 'none' }}>
                <Download size={15} /> Download file
              </a>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', color: 'var(--bb-muted)', fontSize: '0.9rem' }}>
              <FileText size={17} /> No CAD file loaded
            </div>
          )}
        </section>
      </aside>

      <section
        className="bb-card"
        style={{
          minHeight: 640,
          borderRadius: 18,
          overflow: 'hidden',
          position: 'relative',
          background: 'linear-gradient(145deg, #2f2f31, #d7d7d7 38%, #f6f1ee)',
          border: '1px solid rgba(184,184,184,0.9)',
          boxShadow: '0 24px 70px rgba(31,27,29,0.18)',
        }}
      >
        {file && (
          <div style={{
            position: 'absolute',
            top: 14,
            left: 14,
            right: 14,
            zIndex: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            pointerEvents: 'none',
          }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              borderRadius: 999,
              padding: '8px 12px',
              background: 'rgba(255,255,255,0.78)',
              backdropFilter: 'blur(12px)',
              color: 'var(--bb-ink)',
              fontWeight: 900,
              fontSize: '0.78rem',
              maxWidth: '70%',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              <Box size={14} /> {file.name}
            </span>
          </div>
        )}
        {file?.previewKind && file.previewKind !== 'unsupported' ? (
          <ViewerCanvas key={viewKey} file={file} />
        ) : (
          <div style={{ height: '100%', minHeight: 620, display: 'grid', placeItems: 'center', textAlign: 'center', padding: 28 }}>
            <div style={{ maxWidth: 460 }}>
              <div style={{ width: 74, height: 74, borderRadius: '50%', display: 'grid', placeItems: 'center', margin: '0 auto 18px', background: '#f5ede8', color: 'var(--bb-rose)' }}>
                {file ? <FileArchive size={30} /> : <Box size={30} />}
              </div>
              <h2 style={{ margin: '0 0 10px', color: 'var(--bb-ink)', fontFamily: 'var(--app-font-display)', fontWeight: 500 }}>
                {file ? 'File saved for handoff' : 'Upload a CAD file'}
              </h2>
              <p style={{ margin: 0, color: 'var(--bb-muted)', lineHeight: 1.65 }}>
                {file
                  ? `${file.extension.toUpperCase()} files are accepted, but this format needs a dedicated CAD kernel/viewer for live geometry preview.`
                  : 'Use this viewer for supplier CAD files, customer uploads, or generated mesh exports.'}
              </p>
            </div>
          </div>
        )}
      </section>
      </div>
    </div>
  )
}
