/**
 * BackgroundJobManager
 *
 * Mounted once at the app root (inside AppProvider + ProjectProvider, outside
 * the router). It runs a polling loop for all active image-gen and 3D-gen jobs
 * stored in useBackgroundJobs. Because this component never unmounts, generation
 * continues even when the user navigates away from Magic Movement or 3D Studio.
 *
 * On completion it:
 *   - fires a browser Notification
 *   - fires an in-app toast via showToast
 *   - saves image-gen results to the gallery
 */
import { useEffect, useRef } from 'react'
import { useBackgroundJobs, type ImageGenJob, type ThreeDJob } from '../store/backgroundJobs'
import { useApp } from '../context/AppContext'
import { useProjects } from '../context/ProjectContext'

const POLL_INTERVAL_MS = 3000

// ── Browser notification helpers ─────────────────────────────────────────────

function requestNotificationPermission() {
  if (!('Notification' in window)) return
  if (Notification.permission === 'default') {
    void Notification.requestPermission()
  }
}

function fireNotification(title: string, body: string) {
  if (!('Notification' in window)) return
  if (Notification.permission !== 'granted') return
  try {
    new Notification(title, {
      body,
      icon: '/favicon.ico',
      tag: 'bbready-job',
    })
  } catch {
    // Some browsers block notifications silently
  }
}

// ── Per-job poll helpers ──────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type UpdateFn = (id: string, patch: Record<string, any>) => void
type SaveGalleryFn = ReturnType<typeof useProjects>['saveAiGeneratedFolder']
type ToastFn = ReturnType<typeof useApp>['showToast']

async function pollImageJob(
  job: ImageGenJob,
  updateJob: UpdateFn,
  showToast: ToastFn,
  saveGallery: SaveGalleryFn,
) {
  try {
    const res = await fetch(`/api/ai-render/jobs/${job.id}`, { cache: 'no-store' })
    const data = await res.json().catch(() => null)
    if (!res.ok || !data) return

    if (data.status === 'completed') {
      updateJob(job.id, {
        status: 'completed',
        completedAt: Date.now(),
        result: data.result,
      })

      // Save to gallery once
      const imgUrl: string | undefined =
        typeof data.result?.imageUrl === 'string' ? data.result.imageUrl
        : Array.isArray(data.result?.images) ? (data.result.images[0] as { url: string } | undefined)?.url
        : undefined

      if (imgUrl && !job.gallerySaved) {
        const images: Array<{ url: string; label: string; prompt?: string; angle?: string }> =
          Array.isArray(data.result?.images) && data.result.images.length
            ? (data.result.images as Array<{ angle: string; url: string }>).map(img => ({
                url: img.url,
                label: `${img.angle} - ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
                prompt: job.prompt,
                angle: img.angle,
              }))
            : [{
                url: imgUrl,
                label: `Concept - ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
                prompt: job.prompt,
              }]

        void saveGallery({
          name: new Date().toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }),
          prompt: job.prompt,
          images,
        }).catch(() => {})

        updateJob(job.id, { gallerySaved: true })
      }

      // Notify once
      if (!job.notified) {
        fireNotification('Design ready ✨', `Your ${job.category.replace('_', ' ')} concept has been generated.`)
        showToast('Design ready', 'success', 7000)
        updateJob(job.id, { notified: true })
      }

    } else if (data.status === 'failed') {
      updateJob(job.id, {
        status: 'failed',
        completedAt: Date.now(),
        error: typeof data.error === 'string' ? data.error : 'Image generation failed',
      })

      if (!job.notified) {
        const msg = typeof data.error === 'string' ? data.error : 'Image generation failed'
        fireNotification('Design failed', msg)
        showToast(msg, 'error', 6000)
        updateJob(job.id, { notified: true })
      }

    } else if (data.status === 'running' && job.status !== 'running') {
      updateJob(job.id, { status: 'running' })
    }
  } catch {
    // Transient network error — keep polling
  }
}

async function poll3DJob(
  job: ThreeDJob,
  updateJob: UpdateFn,
  showToast: ToastFn,
) {
  try {
    const res = await fetch(`/api/cad/image-to-3d/status/${job.id}`)
    const data = await res.json().catch(() => null)
    if (!res.ok || !data) return

    if (data.status === 'SUCCEEDED') {
      updateJob(job.id, {
        status: 'done',
        completedAt: Date.now(),
        progress: 100,
        glbUrl: (data.model_urls as { glb?: string } | undefined)?.glb,
        thumbnailUrl: typeof data.thumbnail_url === 'string' ? data.thumbnail_url : undefined,
      })

      if (!job.notified) {
        fireNotification(
          '3D model ready',
          `Your 3D model for "${job.imageName}" is ready. Go to 3D Studio to view it.`,
        )
        showToast('3D model ready — go to 3D Studio to view it', 'success', 8000)
        updateJob(job.id, { notified: true })
      }

    } else if (data.status === 'FAILED' || data.status === 'EXPIRED') {
      const msg =
        typeof (data.task_error as { message?: string } | undefined)?.message === 'string'
          ? (data.task_error as { message: string }).message
          : '3D model generation failed'

      updateJob(job.id, {
        status: 'failed',
        completedAt: Date.now(),
        error: msg,
      })

      if (!job.notified) {
        fireNotification('3D generation failed', msg)
        showToast(msg, 'error', 6000)
        updateJob(job.id, { notified: true })
      }

    } else {
      // Still processing — update progress
      const progress = typeof data.progress === 'number' ? data.progress : job.progress
      if (progress !== job.progress) {
        updateJob(job.id, { progress })
      }
    }
  } catch {
    // Transient error — keep polling
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function BackgroundJobManager() {
  const { showToast } = useApp()
  const { saveAiGeneratedFolder } = useProjects()

  // Keep stable refs so the polling interval always uses the latest callbacks
  const showToastRef = useRef(showToast)
  const saveGalleryRef = useRef(saveAiGeneratedFolder)

  useEffect(() => { showToastRef.current = showToast }, [showToast])
  useEffect(() => { saveGalleryRef.current = saveAiGeneratedFolder }, [saveAiGeneratedFolder])

  // Request browser notification permission on first mount
  useEffect(() => {
    requestNotificationPermission()
  }, [])

  // Single polling loop — reads latest store state on every tick
  useEffect(() => {
    const tick = async () => {
      const { jobs, updateJob } = useBackgroundJobs.getState()

      const promises: Promise<void>[] = []

      for (const job of jobs) {
        if (job.type === 'image-gen' && (job.status === 'queued' || job.status === 'running')) {
          promises.push(pollImageJob(job, updateJob, showToastRef.current, saveGalleryRef.current))
        } else if (job.type === '3d-gen' && job.status === 'processing') {
          promises.push(poll3DJob(job, updateJob, showToastRef.current))
        }
      }

      await Promise.allSettled(promises)
    }

    void tick() // immediate first poll
    const timer = setInterval(() => void tick(), POLL_INTERVAL_MS)
    return () => clearInterval(timer)
  }, []) // empty deps — interval runs for the app lifetime

  return null
}
