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

// ─── API-backed helpers ────────────────────────────────────────────────────

export async function fetchMessages(projectId: string): Promise<ProjectMessage[]> {
  try {
    const res = await fetch(`/api/messages/${projectId}`, { credentials: 'include' })
    if (!res.ok) return loadLocalMessages(projectId)
    const rows = await res.json() as Array<Record<string, unknown>>
    return rows.map(r => ({
      id: r.id as string,
      projectId: r.project_id as string,
      author: r.author as MessageAuthor,
      authorName: r.author_name as string,
      text: r.text as string,
      createdAt: r.created_at as string,
      readByJeweller: r.read_by_jeweller as boolean,
      readByCustomer: r.read_by_customer as boolean,
    }))
  } catch {
    return loadLocalMessages(projectId)
  }
}

export async function postMessage(msg: ProjectMessage): Promise<ProjectMessage[]> {
  try {
    const res = await fetch(`/api/messages/${msg.projectId}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: msg.id,
        author: msg.author,
        authorName: msg.authorName,
        text: msg.text,
      }),
    })
    if (!res.ok) throw new Error('api error')
    const rows = await res.json() as Array<Record<string, unknown>>
    return rows.map(r => ({
      id: r.id as string,
      projectId: r.project_id as string,
      author: r.author as MessageAuthor,
      authorName: r.author_name as string,
      text: r.text as string,
      createdAt: r.created_at as string,
      readByJeweller: r.read_by_jeweller as boolean,
      readByCustomer: r.read_by_customer as boolean,
    }))
  } catch {
    saveLocalMessage(msg)
    return loadLocalMessages(msg.projectId)
  }
}

export async function markRead(projectId: string, viewer: MessageAuthor) {
  try {
    await fetch(`/api/messages/${projectId}/read`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ viewer }),
    })
  } catch { /* best-effort */ }
}

export async function seedMessages(projectId: string, customerName: string, projectName: string) {
  const existing = await fetchMessages(projectId)
  if (existing.length) return existing
  const welcome: ProjectMessage = {
    id: `msg_${projectId}_welcome`,
    projectId,
    author: 'jeweller',
    authorName: 'Jeweller',
    text: `Hi ${customerName}, your ${projectName} workspace is ready. Message me here for approvals, appointments, and design questions.`,
    createdAt: new Date().toISOString(),
    readByJeweller: true,
    readByCustomer: false,
  }
  return postMessage(welcome)
}

// ─── LocalStorage fallback ─────────────────────────────────────────────────

const KEY = 'bb-project-messages-v1'

function loadLocalMessages(projectId: string): ProjectMessage[] {
  try {
    const all = JSON.parse(window.localStorage.getItem(KEY) || '[]') as ProjectMessage[]
    return all.filter(m => m.projectId === projectId).sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  } catch { return [] }
}

function saveLocalMessage(msg: ProjectMessage) {
  try {
    const all = JSON.parse(window.localStorage.getItem(KEY) || '[]') as ProjectMessage[]
    const next = [...all.filter(m => m.id !== msg.id), msg]
    window.localStorage.setItem(KEY, JSON.stringify(next))
    window.dispatchEvent(new CustomEvent('bb-project-messages-updated', { detail: { projectId: msg.projectId } }))
  } catch { /* ignore */ }
}

// ─── Legacy exports (kept for any remaining direct callers) ───────────────

export const loadProjectMessages = loadLocalMessages
export const saveProjectMessage = saveLocalMessage
export function seedProjectMessages(projectId: string, customerName: string, projectName: string) {
  const existing = loadLocalMessages(projectId)
  if (existing.length) return existing
  const msg: ProjectMessage = {
    id: `msg_${projectId}_welcome`,
    projectId,
    author: 'jeweller',
    authorName: 'Jeweller',
    text: `Hi ${customerName}, your ${projectName} workspace is ready. Message me here for approvals, appointments, and design questions.`,
    createdAt: new Date().toISOString(),
    readByJeweller: true,
    readByCustomer: false,
  }
  saveLocalMessage(msg)
  return [msg]
}
