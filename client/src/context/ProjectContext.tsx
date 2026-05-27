import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react'
import { lsGet, lsSet, lsClear, idbGet, idbSet } from '../lib/localCache'

export interface Customer {
  id: string
  name: string
  email: string
  phone: string
}

export interface Project {
  id: string
  name: string
  customer: Customer
  status: string
  stage: string
  budget: string
  metalPreference: string
  gemstonePreference: string
  ringSize: string
  timeline: string
  cadUnlocked: boolean
  featureAccess?: FeatureAccess
  createdAt: string
  updatedAt: string
  accessCode?: string
}

export type FeatureKey = 'overview' | 'luna' | 'designs' | 'gallery' | 'cad' | 'timeline' | 'payments'
export type FeatureAccess = Record<FeatureKey, boolean>

export interface Stage {
  id: string
  label: string
  icon: string
}

export interface IntakeDNA {
  customer?: string
  occasion?: string
  style?: string
  stone?: string
  metal?: string
  budget?: string
  notes?: string
  capturedAt?: string
  projectId?: string
}

export interface GalleryImage {
  id: string
  url: string
  label: string
  prompt?: string
  angle?: string
  createdAt: string
  source: 'ai' | 'upload' | 'pinterest' | 'social' | 'cad'
}

export interface GalleryFolder {
  id: string
  name: string
  source: 'ai'
  prompt?: string
  createdAt: string
  updatedAt?: string
  images: GalleryImage[]
}

export interface CadFile {
  id: string
  name: string
  url: string
  mimeType?: string
  extension?: string
  size?: number
  source?: string
  sourceImageId?: string
  projectId?: string
  createdAt: string
  updatedAt?: string
}

export interface ProjectUpdateInput {
  projectName?: string
  budget?: string
  metalPreference?: string
  gemstonePreference?: string
  ringSize?: string
  timeline?: string
  stage?: string
  fullName?: string
  email?: string
  phone?: string
  status?: string
}

interface ProjectContextValue {
  isLoading: boolean
  projects: Project[]
  stages: Stage[]
  activeProject: Project | null
  portalProject: Project | null
  setPortalProject: (project: Project | null) => void
  refreshPortalProject: () => Promise<Project | null>
  addProject: (input: { fullName: string; email?: string; phone?: string; projectName?: string }) => Promise<Project>
  updateProject: (id: string, fields: ProjectUpdateInput) => Promise<Project>
  refreshProjects: () => Promise<void>
  setActiveProject: (id: string) => void
  setFeatureAccess: (id: string, feature: FeatureKey, unlocked: boolean) => Promise<void>
  setCadUnlocked: (id: string, unlocked: boolean) => Promise<void>
  intakeDNA: IntakeDNA | null
  setIntakeDNA: (d: IntakeDNA) => void
  saveLunaBrief: (d: IntakeDNA) => Promise<void>
  aiGeneratedImages: GalleryImage[]
  aiGeneratedFolders: GalleryFolder[]
  tryonFolders: GalleryFolder[]
  saveAiGeneratedImage: (image: Omit<GalleryImage, 'id' | 'createdAt' | 'source'>) => void
  saveAiGeneratedFolder: (folder: { name?: string; prompt?: string; images: Array<Omit<GalleryImage, 'id' | 'createdAt' | 'source'>> }) => Promise<void>
  saveTryonFolder: (folder: { name?: string; prompt?: string; images: Array<Omit<GalleryImage, 'id' | 'createdAt' | 'source'>> }) => Promise<void>
  refreshGallery: () => Promise<void>
  renameAiGeneratedFolder: (id: string, name: string) => Promise<void>
  deleteAiGeneratedFolder: (id: string) => Promise<void>
  deleteTryonFolder: (id: string) => Promise<void>
  pendingMagicReference: GalleryImage | null
  setPendingMagicReference: (image: GalleryImage | null) => void
  pendingEditResult: GalleryImage | null
  setPendingEditResult: (image: GalleryImage | null) => void
  pending3DImageUrl: string | null
  setPending3DImageUrl: (url: string | null) => void
  cadFiles: CadFile[]
  viewerCadFile: CadFile | null
  setViewerCadFile: (file: CadFile | null) => void
  refreshCadFiles: (projectId?: string) => Promise<void>
  saveCadFile: (file: Omit<CadFile, 'id' | 'createdAt' | 'updatedAt'>) => Promise<CadFile>
  deleteCadFile: (id: string) => Promise<void>
  sendImageToCadFiles: (image: GalleryImage) => Promise<void>
}

const STAGES: Stage[] = [
  { id: 'intake', label: 'Intake', icon: 'IN' },
  { id: 'concepts', label: 'Concepts', icon: 'CO' },
  { id: 'concept_review', label: 'Shortlist', icon: 'SL' },
  { id: '3d_render', label: '3D Render', icon: '3D' },
  { id: 'cad_refinement', label: 'CAD', icon: 'CA' },
  { id: 'manufacturability', label: 'MFG check', icon: 'MF' },
  { id: 'customer_approval', label: 'Approved', icon: 'AP' },
  { id: 'production', label: 'Production', icon: 'PR' },
  { id: 'qa', label: 'QA', icon: 'QA' },
  { id: 'delivered', label: 'Delivered', icon: 'DL' },
]

const ProjectContext = createContext<ProjectContextValue | null>(null)

export function ProjectProvider({ children }: { children: ReactNode }) {
  // Hydrate from cache synchronously — UI renders with stale data instantly
  const [isLoading, setIsLoading] = useState(true)
  const [projects, setProjects] = useState<Project[]>(() => lsGet<Project[]>('projects') || [])
  const [activeProject, setActiveProjectState] = useState<Project | null>(null)
  const [portalProject, setPortalProject] = useState<Project | null>(() => lsGet<Project>('portal-project'))
  const [intakeDNA, setIntakeDNAState] = useState<IntakeDNA | null>(null)
  const [aiGeneratedFolders, setAiGeneratedFolders] = useState<GalleryFolder[]>([])
  const [tryonFolders, setTryonFolders] = useState<GalleryFolder[]>([])
  const [pendingMagicReference, setPendingMagicReference] = useState<GalleryImage | null>(null)
  const [pendingEditResult, setPendingEditResult] = useState<GalleryImage | null>(null)
  const [pending3DImageUrl, setPending3DImageUrl] = useState<string | null>(null)
  const [cadFiles, setCadFiles] = useState<CadFile[]>([])
  const [viewerCadFile, setViewerCadFile] = useState<CadFile | null>(null)
  const aiGeneratedImages = useMemo(
    () => aiGeneratedFolders.flatMap(folder => folder.images.map(image => ({ ...image, source: 'ai' as const }))),
    [aiGeneratedFolders],
  )

  const setActiveProject = (id: string) => {
    setActiveProjectState(projects.find(p => p.id === id) || null)
  }
  const refreshProjects = useCallback(async () => {
    const res = await fetch('/api/customers', { credentials: 'include' })
    if (!res.ok) return
    const data = await res.json()
    if (Array.isArray(data?.customers)) {
      setProjects(data.customers)
      if (data.customers.length) {
        lsSet('projects', data.customers)
      } else {
        lsClear('projects')
      }
      setActiveProjectState(prev => prev ? data.customers.find((p: Project) => p.id === prev.id) || prev : null)
    }
  }, [])
  const addProject = async (input: { fullName: string; email?: string; phone?: string; projectName?: string }) => {
    const res = await fetch('/api/customers', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data?.error || 'Could not add client')
    const project = data.customer as Project
    await refreshProjects()
    return project
  }
  const refreshPortalProject = useCallback(async () => {
    const res = await fetch('/api/portal/project', { credentials: 'include' })
    if (!res.ok) {
      setPortalProject(null)
      lsClear('portal-project')
      return null
    }
    const data = await res.json()
    const project = data?.project as (Project & { intakeDNA?: IntakeDNA }) | undefined
    setPortalProject(project || null)
    if (project) {
      lsSet('portal-project', project)
      // Restore IntakeDNA from DB on refresh
      if (project.intakeDNA) setIntakeDNAState(project.intakeDNA)
    }
    return project || null
  }, [])
  const applyProjectUpdate = (project: Project) => {
    setProjects(prev => prev.map(p => p.id === project.id ? project : p))
    setActiveProjectState(prev => prev?.id === project.id ? project : prev)
    setPortalProject(prev => prev?.id === project.id ? project : prev)
  }

  const updateProject = async (id: string, fields: ProjectUpdateInput): Promise<Project> => {
    const res = await fetch(`/api/customers/${id}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data?.error || 'Could not update customer')
    const project = data.customer as Project
    applyProjectUpdate(project)
    return project
  }

  const setFeatureAccess = async (id: string, feature: FeatureKey, unlocked: boolean) => {
    const optimistic = (project: Project): Project => ({
      ...project,
      cadUnlocked: feature === 'cad' ? unlocked : project.cadUnlocked,
      featureAccess: {
        ...(project.featureAccess || {
          overview: true,
          luna: true,
          designs: true,
          gallery: true,
          cad: project.cadUnlocked,
          timeline: true,
          payments: true,
        }),
        [feature]: unlocked,
      },
    })

    setProjects(prev => prev.map(p => p.id === id ? optimistic(p) : p))
    setActiveProjectState(prev => prev?.id === id ? optimistic(prev) : prev)
    setPortalProject(prev => prev?.id === id ? optimistic(prev) : prev)

    const res = await fetch(`/api/customers/${id}/access`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feature, unlocked }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data?.error || 'Could not update feature access')
    if (data?.customer) applyProjectUpdate(data.customer as Project)
  }

  const setCadUnlocked = async (id: string, unlocked: boolean) => {
    await setFeatureAccess(id, 'cad', unlocked)
  }
  const setIntakeDNA = (d: IntakeDNA) => setIntakeDNAState(d)

  const saveLunaBrief = async (d: IntakeDNA) => {
    setIntakeDNAState(d)
    const projectId = portalProject?.id
    if (!projectId) return
    await fetch('/api/portal/intake-dna', {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ intakeDNA: d, projectId }),
    }).catch(() => { /* best-effort — state already set in memory */ })
  }

  const refreshGallery = async () => {
    const [aiRes, tryonRes] = await Promise.all([
      fetch('/api/gallery/folders', { credentials: 'include' }),
      fetch('/api/gallery/folders?source=tryon', { credentials: 'include' }),
    ])
    if (aiRes.ok) {
      const data = await aiRes.json()
      const folders = Array.isArray(data?.folders) ? data.folders : []
      const mapped = folders.map((folder: GalleryFolder) => ({
        ...folder,
        source: 'ai',
        images: Array.isArray(folder.images)
          ? folder.images.map((image: GalleryImage) => ({ ...image, source: 'ai' as const }))
          : [],
      }))
      setAiGeneratedFolders(mapped)
      void idbSet('gallery', mapped)
    }
    if (tryonRes.ok) {
      const data = await tryonRes.json()
      const folders = Array.isArray(data?.folders) ? data.folders : []
      setTryonFolders(folders.map((folder: GalleryFolder) => ({
        ...folder,
        source: 'tryon' as const,
        images: Array.isArray(folder.images)
          ? folder.images.map((image: GalleryImage) => ({ ...image, source: 'ai' as const }))
          : [],
      })))
    }
  }
  const saveAiGeneratedFolder = async (folder: { name?: string; prompt?: string; images: Array<Omit<GalleryImage, 'id' | 'createdAt' | 'source'>> }) => {
    const res = await fetch('/api/gallery/folders', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: folder.name || new Date().toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }),
        prompt: folder.prompt || '',
        images: folder.images,
      }),
    })
    if (!res.ok) throw new Error('Could not save gallery folder')
    const data = await res.json()
    if (data?.folder) {
      setAiGeneratedFolders(prev => [{
        ...data.folder,
        source: 'ai',
        images: (data.folder.images || []).map((image: GalleryImage) => ({ ...image, source: 'ai' as const })),
      }, ...prev])
    }
  }
  const saveTryonFolder = async (folder: { name?: string; prompt?: string; images: Array<Omit<GalleryImage, 'id' | 'createdAt' | 'source'>> }) => {
    const res = await fetch('/api/gallery/folders', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: folder.name || new Date().toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }),
        prompt: folder.prompt || '',
        source: 'tryon',
        images: folder.images,
      }),
    })
    if (!res.ok) throw new Error('Could not save try-on folder')
    const data = await res.json()
    if (data?.folder) {
      setTryonFolders(prev => [{
        ...data.folder,
        source: 'tryon',
        images: (data.folder.images || []).map((image: GalleryImage) => ({ ...image, source: 'ai' as const })),
      }, ...prev])
    }
  }
  const saveAiGeneratedImage = (image: Omit<GalleryImage, 'id' | 'createdAt' | 'source'>) => {
    void saveAiGeneratedFolder({
      prompt: image.prompt,
      images: [image],
    })
  }
  const renameAiGeneratedFolder = async (id: string, name: string) => {
    const res = await fetch(`/api/gallery/folders/${id}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    if (!res.ok) throw new Error('Could not rename folder')
    setAiGeneratedFolders(prev => prev.map(folder => folder.id === id ? { ...folder, name, updatedAt: new Date().toISOString() } : folder))
  }
  const deleteAiGeneratedFolder = async (id: string) => {
    const res = await fetch(`/api/gallery/folders/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    })
    if (!res.ok) throw new Error('Could not delete folder')
    setAiGeneratedFolders(prev => prev.filter(folder => folder.id !== id))
  }

  const deleteTryonFolder = async (id: string) => {
    const res = await fetch(`/api/gallery/folders/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    })
    if (!res.ok) throw new Error('Could not delete folder')
    setTryonFolders(prev => prev.filter(folder => folder.id !== id))
  }

  const refreshCadFiles = useCallback(async (projectId?: string) => {
    const queryProjectId = projectId || portalProject?.id || activeProject?.id || ''
    const res = await fetch(`/api/cad/files${queryProjectId ? `?projectId=${encodeURIComponent(queryProjectId)}` : ''}`, {
      credentials: 'include',
      cache: 'no-store',
    })
    if (!res.ok) return
    const data = await res.json()
    setCadFiles(Array.isArray(data?.files) ? data.files : [])
  }, [activeProject?.id, portalProject?.id])

  const saveCadFile = async (file: Omit<CadFile, 'id' | 'createdAt' | 'updatedAt'>) => {
    const res = await fetch('/api/cad/files', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...file,
        projectId: file.projectId || portalProject?.id || activeProject?.id,
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data?.error || 'Could not save CAD file')
    const saved = data.file as CadFile
    setCadFiles(prev => [saved, ...prev.filter(item => item.id !== saved.id)])
    return saved
  }

  const deleteCadFile = async (id: string) => {
    const queryProjectId = portalProject?.id || activeProject?.id || ''
    const res = await fetch(`/api/cad/files/${id}${queryProjectId ? `?projectId=${encodeURIComponent(queryProjectId)}` : ''}`, {
      method: 'DELETE',
      credentials: 'include',
    })
    if (!res.ok) throw new Error('Could not delete CAD file')
    setCadFiles(prev => prev.filter(file => file.id !== id))
  }

  const sendImageToCadFiles = async (image: GalleryImage) => {
    await saveCadFile({
      name: `${image.label || 'gallery-image'}.png`,
      url: image.url,
      mimeType: 'image/png',
      extension: 'png',
      size: 0,
      source: 'gallery-image',
      sourceImageId: image.id,
      projectId: portalProject?.id || activeProject?.id,
    })
  }

  useEffect(() => {
    let alive = true

    // Bust stale localStorage cache that may contain old dummy projects
    const cached = lsGet<Project[]>('projects')
    if (cached?.some(p => p.id === 'proj_001' || p.id === 'proj_002' || p.id === 'proj_003')) {
      lsClear('projects')
      setProjects([])
    }

    // Hydrate gallery from IndexedDB (async, doesn't block render)
    idbGet<GalleryFolder[]>('gallery').then(cached => {
      if (cached && alive) setAiGeneratedFolders(cached)
    })

    const projectsLoad = refreshProjects()
    void Promise.allSettled([projectsLoad, refreshGallery(), refreshCadFiles()])
    void Promise.race([
      projectsLoad.catch(() => undefined),
      new Promise(resolve => window.setTimeout(resolve, 2500)),
    ]).finally(() => {
      if (alive) setIsLoading(false)
    })

    return () => { alive = false }
  }, [])

  useEffect(() => {
    if (!activeProject?.id && !portalProject?.id) return
    void refreshCadFiles()
  }, [activeProject?.id, portalProject?.id])

  return (
    <ProjectContext.Provider value={{
      isLoading,
      projects,
      stages: STAGES,
      activeProject,
      portalProject,
      setPortalProject,
      refreshPortalProject,
      addProject,
      updateProject,
      refreshProjects,
      setActiveProject,
      setFeatureAccess,
      setCadUnlocked,
      intakeDNA,
      setIntakeDNA,
      saveLunaBrief,
      aiGeneratedImages,
      aiGeneratedFolders,
      tryonFolders,
      saveAiGeneratedImage,
      saveAiGeneratedFolder,
      saveTryonFolder,
      refreshGallery,
      renameAiGeneratedFolder,
      deleteAiGeneratedFolder,
      deleteTryonFolder,
      pendingMagicReference,
      setPendingMagicReference,
      pendingEditResult,
      setPendingEditResult,
      pending3DImageUrl,
      setPending3DImageUrl,
      cadFiles,
      viewerCadFile,
      setViewerCadFile,
      refreshCadFiles,
      saveCadFile,
      deleteCadFile,
      sendImageToCadFiles,
    }}>
      {children}
    </ProjectContext.Provider>
  )
}

export function useProjects() {
  const ctx = useContext(ProjectContext)
  if (!ctx) throw new Error('useProjects must be used within ProjectProvider')
  return ctx
}
