import { create } from 'zustand'

export interface RenderAngle {
  angle: string
  url: string
}

export interface ImageGenJob {
  id: string          // render job ID from /api/ai-render/jobs
  type: 'image-gen'
  status: 'queued' | 'running' | 'completed' | 'failed'
  prompt: string
  category: string
  startedAt: number
  completedAt?: number
  result?: { imageUrl?: string; images?: RenderAngle[] }
  error?: string
  notified: boolean
  gallerySaved: boolean
}

export interface ThreeDJob {
  id: string          // Meshy taskId
  type: '3d-gen'
  status: 'processing' | 'done' | 'failed'
  imageName: string
  startedAt: number
  completedAt?: number
  progress: number
  glbUrl?: string
  thumbnailUrl?: string
  error?: string
  notified: boolean
}

export type BackgroundJob = ImageGenJob | ThreeDJob

interface BackgroundJobsState {
  jobs: BackgroundJob[]
  addImageJob: (id: string, prompt: string, category: string) => void
  add3DJob: (taskId: string, imageName: string) => void
  /** Apply a partial patch to any job by ID. The caller is responsible for only patching
   *  fields that belong to the job's actual type. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateJob: (id: string, patch: Record<string, any>) => void
  removeJob: (id: string) => void
  cancelAllImageJobs: () => void
}

export const useBackgroundJobs = create<BackgroundJobsState>((set) => ({
  jobs: [],

  addImageJob: (id, prompt, category) =>
    set(state => ({
      jobs: [
        ...state.jobs.filter(j => j.id !== id),
        {
          id,
          type: 'image-gen',
          status: 'queued',
          prompt,
          category,
          startedAt: Date.now(),
          notified: false,
          gallerySaved: false,
        } satisfies ImageGenJob,
      ],
    })),

  add3DJob: (taskId, imageName) =>
    set(state => ({
      jobs: [
        ...state.jobs.filter(j => j.id !== taskId),
        {
          id: taskId,
          type: '3d-gen',
          status: 'processing',
          imageName,
          startedAt: Date.now(),
          progress: 0,
          notified: false,
        } satisfies ThreeDJob,
      ],
    })),

  updateJob: (id, patch) =>
    set(state => ({
      jobs: state.jobs.map(j =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        j.id === id ? ({ ...j, ...(patch as any) } as BackgroundJob) : j,
      ),
    })),

  removeJob: (id) =>
    set(state => ({ jobs: state.jobs.filter(j => j.id !== id) })),

  cancelAllImageJobs: () =>
    set(state => ({
      jobs: state.jobs.filter(j => j.type !== 'image-gen'),
    })),
}))
