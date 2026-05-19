import { useState } from 'react'
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
            <span className="bb-eyebrow" style={{ color: 'var(--bb-muted)' }}>
              {activeId === 'cad'
                ? `${cadFiles.length} files`
                : activeId === 'ai' && !activeAiFolder
                ? `${aiGeneratedFolders.length} folders`
                : `${(activeAiFolder?.images || activeFolder.images).length} images`}
            </span>
          </div>

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
            {(activeAiFolder?.images || activeFolder.images).map((image, index) => (
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
                </div>
                <figcaption title={image.prompt} style={{ padding: '9px 10px', color: 'var(--bb-muted)', fontSize: '0.78rem', fontWeight: 700 }}>
                  {image.label}
                </figcaption>
              </motion.figure>
            ))}
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
