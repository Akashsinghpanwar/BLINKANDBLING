export type MessageAuthor = 'jeweller' | 'customer'

export type ProjectMessage = {
  id: string
  projectId: string
  author: MessageAuthor
  authorName: string
  text: string
  createdAt: string
  readByJeweller?: boolean
  readByCustomer?: boolean
}

const messageStorageKey = 'bb-project-messages-v1'

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

export function loadProjectMessages(projectId: string): ProjectMessage[] {
  if (!canUseStorage()) return []
  try {
    const raw = window.localStorage.getItem(messageStorageKey)
    const all = raw ? JSON.parse(raw) as ProjectMessage[] : []
    return Array.isArray(all)
      ? all.filter(message => message.projectId === projectId).sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      : []
  } catch {
    return []
  }
}

export function saveProjectMessage(message: ProjectMessage) {
  if (!canUseStorage()) return
  const raw = window.localStorage.getItem(messageStorageKey)
  const all = raw ? JSON.parse(raw) as ProjectMessage[] : []
  const next = Array.isArray(all) ? [...all.filter(item => item.id !== message.id), message] : [message]
  window.localStorage.setItem(messageStorageKey, JSON.stringify(next))
  window.dispatchEvent(new CustomEvent('bb-project-messages-updated', { detail: { projectId: message.projectId } }))
}

export function seedProjectMessages(projectId: string, customerName: string, projectName: string) {
  const existing = loadProjectMessages(projectId)
  if (existing.length) return existing

  const now = new Date()
  const seeded: ProjectMessage[] = [
    {
      id: `msg_${projectId}_welcome`,
      projectId,
      author: 'jeweller',
      authorName: 'Jeweller',
      text: `Hi ${customerName}, your ${projectName} workspace is ready. You can message me here for approvals, appointments, and design questions.`,
      createdAt: now.toISOString(),
      readByJeweller: true,
      readByCustomer: false,
    },
  ]
  seeded.forEach(saveProjectMessage)
  return seeded
}
