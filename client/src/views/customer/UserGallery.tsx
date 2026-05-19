import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Box, Check, Download, Eye, FileArchive, FolderOpen, Images, Instagram, Mail, Maximize2, MessageCircle, Pencil, Send, Share2, Sparkles, Trash2, Upload, X } from 'lucide-react'
import { useLocation } from 'wouter'
import { MOOD_BOARD, photos } from '../../lib/photos'
import { fadeUp, stagger } from '../../lib/motion'
import { useProjects } from '../../context/ProjectContext'
import { useApp } from '../../context/AppContext'

interface GalleryTile {
  url: string
  label: string
  prompt?: string
}

interface GalleryFolder {
  id: string
  name: string
  icon: typeof Images
  accent: string
  images: GalleryTile[]
}

function formatSize(bytes = 0) {
  if (!bytes) return 'Stored'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const demoFolders: GalleryFolder[] = [
  {
    id: 'pinterest',
    name: 'Pinterest',
    icon: Images,
    accent: 'var(--bb-rose)',
    images: MOOD_BOARD.slice(0, 8).map(tile => ({ url: tile.url, label: tile.tags.slice(0, 2).join(' ') })),
  },
  {
    id: 'social',
    name: 'Social Media',
    icon: Instagram,
    accent: 'var(--bb-coral)',
    images: [
      { url: photos.pearSolitaire, label: 'Pear solitaire' },
      { url: photos.multiStoneRings, label: 'Stacked rings' },
      { url: photos.pearlNecklace, label: 'Pearl mood' },
      { url: photos.goldStack, label: 'Gold bands' },
    ],
  },
  {
    id: 'ai',
    name: 'AI Generated',
    icon: Sparkles,
    accent: 'var(--bb-violet)',
    images: [
      { url: photos.haloRing, label: 'Halo render' },
      { url: photos.vintageCushion, label: 'Vintage cushion' },
      { url: photos.diamondNeck, label: 'Necklace concept' },
      { url: photos.gemCloseup, label: 'Gem closeup' },
    ],
  },
  {
    id: 'cad',
    name: 'CAD Files',
    icon: FileArchive,
    accent: 'var(--bb-pillar-4)',
    images: [],
  },
  {
    id: 'uploads',
    name: 'Uploaded References',
    icon: Upload,
    accent: 'var(--bb-pillar-1)',
    images: [
      { url: photos.handSketch, label: 'Sketch brief' },
      { url: photos.ringBox, label: 'Presentation box' },
      { url: photos.workshop, label: 'Bench detail' },
    ],
  },
]

export default function UserGallery() {
  const [, setLocation] = useLocation()
  const { showToast } = useApp()
  const {
    aiGeneratedFolders,
    cadFiles,
    renameAiGeneratedFolder,
    deleteAiGeneratedFolder,
    deleteCadFile,
    setViewerCadFile,
    setPendingMagicReference,
    sendImageToCadFiles,
  } = useProjects()
  const folders = demoFolders.map(folder => folder.id === 'ai'
    ? {
        ...folder,
        images: aiGeneratedFolders.flatMap(generation => generation.images.map(image => ({
          url: image.url,
          label: image.label,
          prompt: image.prompt,
        }))),
      }
    : folder)
  const [activeId, setActiveId] = useState(folders[0].id)
  const [activeAiFolderId, setActiveAiFolderId] = useState<string | null>(null)
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null)
  const [folderNameDraft, setFolderNameDraft] = useState('')
  const [maximizedImage, setMaximizedImage] = useState<GalleryTile | null>(null)
  const [sharingFileId, setSharingFileId] = useState<string | null>(null)
  const [uploadedImages, setUploadedImages] = useState<GalleryTile[]>([])
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (activeId !== 'uploads') return
    fetch('/api/uploads', { credentials: 'include' })
      .then(r => r.ok ? r.json() as Promise<Array<{ id: string; name: string; data_url: string }>> : [])
      .then(rows => setUploadedImages(rows.map(r => ({ url: r.data_url, label: r.name }))))
      .catch(() => {})
  }, [activeId])

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const reader = new FileReader()
    reader.onload = async () => {
      try {
        const dataUrl = reader.result as string
        const res = await fetch('/api/uploads', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: file.name, dataUrl, mimeType: file.type, sizeBytes: file.size }),
        })
        if (res.ok) {
          const rows = await fetch('/api/uploads', { credentials: 'include' })
            .then(r => r.json()) as Array<{ id: string; name: string; data_url: string }>
          setUploadedImages(rows.map(r => ({ url: r.data_url, label: r.name })))
          showToast('Image uploaded', 'success')
        } else {
          showToast('Upload failed — file may be too large (10 MB max)', 'error')
        }
      } catch {
        showToast('Upload failed', 'error')
      } finally {
        setUploading(false)
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
    }
    reader.readAsDataURL(file)
  }

  const pinShare = (imageUrl: string, label: string) => {
    const media = encodeURIComponent(imageUrl.startsWith('data:') ? '' : imageUrl)
    const desc = encodeURIComponent(`${label} — Blink & Bling Jewellery`)
    window.open(`https://pinterest.com/pin/create/button/?media=${media}&description=${desc}`, '_blank', 'width=750,height=550')
  }
  const activeFolder = folders.find(folder => folder.id === activeId) ?? folders[0]
  const activeAiFolder = activeAiFolderId
    ? aiGeneratedFolders.find(folder => folder.id === activeAiFolderId) || null
    : null

  const startRename = (folder: { id: string; name: string }) => {
    setEditingFolderId(folder.id)
    setFolderNameDraft(folder.name)
  }

  const saveRename = async () => {
    if (!editingFolderId || !folderNameDraft.trim()) return
    await renameAiGeneratedFolder(editingFolderId, folderNameDraft.trim())
    setEditingFolderId(null)
    setFolderNameDraft('')
  }

  const removeFolder = async (id: string) => {
    await deleteAiGeneratedFolder(id)
    if (activeAiFolderId === id) setActiveAiFolderId(null)
  }

  const removeCadFile = async (id: string) => {
    try {
      await deleteCadFile(id)
      showToast('CAD file deleted', 'success')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Could not delete CAD file', 'error')
    }
  }

  const toGalleryImage = (image: GalleryTile, index = 0) => ({
    id: `gallery_action_${index}_${Date.now()}`,
    url: image.url,
    label: image.label,
    prompt: image.prompt,
    source: 'ai' as const,
    createdAt: new Date().toISOString(),
  })

  const sendToMagicMovement = (image: GalleryTile, index: number) => {
    setPendingMagicReference(toGalleryImage(image, index))
    showToast('Sent to Magic Movement references', 'success')
    setLocation('/portal/magic-movement')
  }

  const sendToCad = async (image: GalleryTile, index: number) => {
    try {
      await sendImageToCadFiles(toGalleryImage(image, index))
      showToast('Saved in CAD Files folder', 'success')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Could not save to CAD files', 'error')
    }
  }

  const openCadViewer = (file: typeof cadFiles[number]) => {
    setViewerCadFile(file)
    showToast('Opening in CAD Viewer', 'success')
    setLocation('/portal/3d-studio')
  }

  const shareText = (file: typeof cadFiles[number]) => {
    const kind = (file.extension || 'CAD').toUpperCase()
    return `Blink & Bling CAD file: ${file.name} (${kind}). Open this file from the customer CAD Files folder.`
  }

  return (
    <motion.div variants={stagger(0.08)} initial="hidden" animate="visible" style={{ display: 'grid', gap: 22 }}>
      <motion.header variants={fadeUp} className="bb-page-header">
        <div>
          <span className="bb-eyebrow" style={{ color: 'var(--bb-pillar-3)' }}>User database</span>
          <h1 className="bb-display" style={{ marginBottom: 8 }}>
            User <span className="bb-script" style={{ color: 'var(--bb-rose)', fontSize: '1.25em' }}>Gallery</span>
          </h1>
        </div>
      </motion.header>

      <motion.section variants={fadeUp} style={{ display: 'grid', gridTemplateColumns: '260px minmax(0,1fr)', gap: 18 }} className="bb-stack-mobile">
        <div className="bb-card" style={{ padding: 14, display: 'grid', gap: 8 }}>
          {folders.map(folder => {
            const Icon = folder.icon
            const active = folder.id === activeId
            return (
              <button
                key={folder.id}
                type="button"
                onClick={() => {
                  setActiveId(folder.id)
                  setActiveAiFolderId(null)
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  width: '100%', minHeight: 54, padding: '10px 12px',
                  borderRadius: 12, border: `1px solid ${active ? '#efd9d0' : 'transparent'}`,
                  background: active ? '#fff' : 'transparent',
                  color: active ? 'var(--bb-ink)' : 'var(--bb-muted)',
                  boxShadow: active ? 'var(--bb-soft-shadow)' : 'none',
                  cursor: 'pointer', textAlign: 'left', fontWeight: 700,
                }}
              >
                <span style={{
                  width: 34, height: 34, borderRadius: 10,
                  display: 'grid', placeItems: 'center',
                  background: active ? `${folder.accent}18` : '#f7f0ec',
                  color: active ? folder.accent : 'var(--bb-muted)',
                }}>
                  <Icon size={17} />
                </span>
                <span>{folder.name}</span>
                <span style={{ marginLeft: 'auto', color: 'var(--bb-muted)', fontSize: '0.78rem' }}>
                  {folder.id === 'ai' ? aiGeneratedFolders.length : folder.id === 'cad' ? cadFiles.length : folder.images.length}
                </span>
              </button>
            )
          })}
        </div>

        <div className="bb-card" style={{ padding: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <FolderOpen size={20} style={{ color: activeFolder.accent }} />
              <strong style={{ color: 'var(--bb-ink)', fontFamily: 'var(--app-font-display)', fontSize: '1.25rem', fontWeight: 500 }}>
                {activeAiFolder ? activeAiFolder.name : activeFolder.name}
              </strong>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {activeId === 'uploads' && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleFileUpload}
                  />
                  <button
                    type="button"
                    className="bb-btn-primary"
                    disabled={uploading}
                    onClick={() => fileInputRef.current?.click()}
                    style={{ minHeight: 36, padding: '8px 14px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 7 }}
                  >
                    <Upload size={14} />
                    {uploading ? 'Uploading…' : 'Upload Image'}
                  </button>
                </>
              )}
              <span className="bb-eyebrow" style={{ color: 'var(--bb-muted)' }}>
                {activeId === 'cad'
                  ? `${cadFiles.length} files`
                  : activeId === 'uploads'
                  ? `${uploadedImages.length || activeFolder.images.length} images`
                  : activeId === 'ai' && !activeAiFolder
                  ? `${aiGeneratedFolders.length} folders`
                  : `${(activeAiFolder?.images || activeFolder.images).length} images`}
              </span>
            </div>
          </div>

          {activeId === 'pinterest' && (
            <div style={{ marginBottom: 16, padding: '12px 16px', borderRadius: 12, background: '#fff0f3', border: '1px solid #f9d0d8', display: 'flex', alignItems: 'center', gap: 12 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="#e60023"><path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z"/></svg>
              <div style={{ flex: 1 }}>
                <strong style={{ color: '#e60023', fontSize: '0.9rem' }}>Pinterest Gallery</strong>
                <span style={{ display: 'block', color: 'var(--bb-muted)', fontSize: '0.78rem', marginTop: 2 }}>
                  Save any image from below directly to Pinterest, or open your board to import inspiration.
                </span>
              </div>
              <a
                href="https://www.pinterest.com"
                target="_blank"
                rel="noreferrer"
                className="bb-btn-secondary"
                style={{ textDecoration: 'none', fontSize: '0.82rem', minHeight: 34, padding: '7px 13px', color: '#e60023', borderColor: '#f9d0d8', whiteSpace: 'nowrap' }}
              >
                Open Pinterest
              </a>
            </div>
          )}

          {activeId === 'cad' ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 12 }}>
              {cadFiles.map(file => {
                const extension = (file.extension || file.name.split('.').pop() || 'file').toUpperCase()
                return (
                  <motion.div
                    key={file.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bb-card"
                    style={{ padding: 12, borderRadius: 14, display: 'grid', gap: 12, position: 'relative', overflow: 'visible' }}
                  >
                    <div style={{ aspectRatio: '4 / 3', borderRadius: 12, border: '1px solid var(--bb-line)', background: '#fffaf7', display: 'grid', placeItems: 'center', color: 'var(--bb-rose)' }}>
                      {file.extension?.toLowerCase() === 'png' || file.mimeType?.startsWith('image/') ? (
                        <img src={file.url} alt={file.name} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 12 }} />
                      ) : (
                        <FileArchive size={40} />
                      )}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <strong style={{ display: 'block', color: 'var(--bb-ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {file.name}
                      </strong>
                      <span style={{ color: 'var(--bb-muted)', fontSize: '0.76rem', fontWeight: 700 }}>
                        {extension} - {formatSize(file.size)} - {file.source || 'cad'}
                      </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 8 }}>
                      <a className="bb-btn-secondary" href={file.url} download={file.name} style={{ justifyContent: 'center', textDecoration: 'none', minHeight: 38 }}>
                        <Download size={14} /> Download
                      </a>
                      <div style={{ position: 'relative' }}>
                        <button type="button" className="bb-icon-btn" onClick={() => setSharingFileId(prev => prev === file.id ? null : file.id)} aria-label="Share CAD file">
                          <Share2 size={15} />
                        </button>
                        {sharingFileId === file.id && (
                          <div
                            style={{
                              position: 'absolute',
                              right: 0,
                              bottom: 'calc(100% + 8px)',
                              zIndex: 20,
                              display: 'flex',
                              gap: 6,
                              padding: 6,
                              borderRadius: 999,
                              border: '1px solid var(--bb-line)',
                              background: 'rgba(255,255,255,0.96)',
                              boxShadow: '0 18px 38px rgba(40,32,30,0.16)',
                              backdropFilter: 'blur(12px)',
                            }}
                          >
                            <a
                              href={`https://wa.me/?text=${encodeURIComponent(shareText(file))}`}
                              target="_blank"
                              rel="noreferrer"
                              title="WhatsApp"
                              aria-label="Share on WhatsApp"
                              className="bb-icon-btn"
                              style={{ textDecoration: 'none', color: 'var(--bb-ink)' }}
                            >
                              <MessageCircle size={15} />
                            </a>
                            <a
                              href={`mailto:?subject=${encodeURIComponent(`CAD file - ${file.name}`)}&body=${encodeURIComponent(shareText(file))}`}
                              title="Email"
                              aria-label="Share by email"
                              className="bb-icon-btn"
                              style={{ textDecoration: 'none', color: 'var(--bb-ink)' }}
                            >
                              <Mail size={15} />
                            </a>
                            <button type="button" title="Open in CAD Viewer" className="bb-icon-btn" onClick={() => openCadViewer(file)} aria-label="Open in CAD Viewer">
                              <Eye size={15} />
                            </button>
                          </div>
                        )}
                      </div>
                      <button type="button" className="bb-icon-btn" onClick={() => void removeCadFile(file.id)} aria-label="Delete CAD file">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </motion.div>
                )
              })}
              {cadFiles.length === 0 && (
                <div style={{ color: 'var(--bb-muted)', padding: 24 }}>No CAD files saved yet.</div>
              )}
            </div>
          ) : activeId === 'ai' && !activeAiFolder ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 12 }}>
              {aiGeneratedFolders.map(folder => {
                const cover = folder.images[0]
                const isEditing = editingFolderId === folder.id
                return (
                  <motion.div
                    key={folder.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bb-card"
                    style={{ padding: 10, borderRadius: 14, cursor: 'pointer' }}
                    onClick={() => !isEditing && setActiveAiFolderId(folder.id)}
                  >
                    <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--bb-line)', background: '#fff' }}>
                      {cover ? (
                        <img src={cover.url} alt={folder.name} loading="lazy" style={{ width: '100%', aspectRatio: '4 / 3', objectFit: 'contain', display: 'block' }} />
                      ) : (
                        <div style={{ aspectRatio: '4 / 3', display: 'grid', placeItems: 'center', color: 'var(--bb-muted)' }}>
                          <FolderOpen size={30} />
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
                      {isEditing ? (
                        <>
                          <input
                            value={folderNameDraft}
                            onChange={e => setFolderNameDraft(e.target.value)}
                            onClick={e => e.stopPropagation()}
                            style={{ flex: 1, minWidth: 0, border: '1px solid var(--bb-line)', borderRadius: 8, padding: '7px 8px' }}
                          />
                          <button type="button" onClick={e => { e.stopPropagation(); void saveRename() }} className="bb-icon-btn" aria-label="Save folder name"><Check size={15} /></button>
                          <button type="button" onClick={e => { e.stopPropagation(); setEditingFolderId(null) }} className="bb-icon-btn" aria-label="Cancel rename"><X size={15} /></button>
                        </>
                      ) : (
                        <>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <strong style={{ display: 'block', color: 'var(--bb-ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {folder.name}
                            </strong>
                            <span style={{ display: 'block', color: 'var(--bb-muted)', fontSize: '0.75rem' }}>{folder.images.length} images</span>
                          </div>
                          <button type="button" onClick={e => { e.stopPropagation(); startRename(folder) }} className="bb-icon-btn" aria-label="Rename folder"><Pencil size={15} /></button>
                          <button type="button" onClick={e => { e.stopPropagation(); void removeFolder(folder.id) }} className="bb-icon-btn" aria-label="Delete folder"><Trash2 size={15} /></button>
                        </>
                      )}
                    </div>
                  </motion.div>
                )
              })}
              {aiGeneratedFolders.length === 0 && (
                <div style={{ color: 'var(--bb-muted)', padding: 24 }}>No AI generation folders yet.</div>
              )}
            </div>
          ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 12 }}>
            {(activeId === 'uploads' && uploadedImages.length > 0
              ? uploadedImages
              : (activeAiFolder?.images || activeFolder.images)
            ).map((image, index) => (
              <motion.figure
                key={`${activeAiFolder?.id || activeFolder.id}-${image.url}-${index}`}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  margin: 0, overflow: 'hidden', borderRadius: 14,
                  border: '1px solid var(--bb-line)',
                  background: '#fff', boxShadow: '0 12px 26px rgba(51,39,35,0.07)',
                  position: 'relative',
                }}
              >
                <img src={image.url} alt={image.label} loading="lazy" style={{ width: '100%', aspectRatio: '1 / 1', objectFit: 'cover', display: 'block' }} />
                <div className="bb-gallery-actions">
                  <button type="button" title="Maximize" onClick={() => setMaximizedImage(image)}><Maximize2 size={15} /></button>
                  <button type="button" title="Send to Magic Movement" onClick={() => sendToMagicMovement(image, index)}><Send size={15} /></button>
                  <button type="button" title="Send to CAD files" onClick={() => void sendToCad(image, index)}><Box size={15} /></button>
                  {!image.url.startsWith('data:') && (
                    <button
                      type="button"
                      title="Share on Pinterest"
                      onClick={() => pinShare(image.url, image.label)}
                      style={{ color: '#e60023' }}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z"/></svg>
                    </button>
                  )}
                </div>
                <figcaption title={image.prompt} style={{ padding: '9px 10px', color: 'var(--bb-muted)', fontSize: '0.78rem', fontWeight: 700 }}>
                  {image.label}
                </figcaption>
              </motion.figure>
            ))}
            {activeId === 'uploads' && uploadedImages.length === 0 && activeFolder.images.length === 0 && (
              <div style={{ gridColumn: '1/-1', color: 'var(--bb-muted)', padding: 24, textAlign: 'center' }}>
                No uploaded images yet. Click <strong>Upload Image</strong> to add your reference photos.
              </div>
            )}
          </div>
          )}
        </div>
      </motion.section>

      {maximizedImage && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setMaximizedImage(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 120,
            background: 'rgba(22,18,20,0.78)',
            backdropFilter: 'blur(10px)',
            display: 'grid',
            placeItems: 'center',
            padding: 28,
          }}
        >
          <div className="bb-card" onClick={e => e.stopPropagation()} style={{ width: 'min(1040px, 94vw)', maxHeight: '92vh', padding: 14, display: 'grid', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <strong style={{ color: 'var(--bb-ink)' }}>{maximizedImage.label}</strong>
              <button className="bb-icon-btn" onClick={() => setMaximizedImage(null)} aria-label="Close image"><X size={16} /></button>
            </div>
            <div style={{ minHeight: 0, display: 'grid', placeItems: 'center', background: '#fff', border: '1px solid var(--bb-line)', borderRadius: 12, overflow: 'hidden' }}>
              <img src={maximizedImage.url} alt={maximizedImage.label} style={{ maxWidth: '100%', maxHeight: '76vh', objectFit: 'contain', display: 'block' }} />
            </div>
          </div>
        </div>
      )}
    </motion.div>
  )
}
