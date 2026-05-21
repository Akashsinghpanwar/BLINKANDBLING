export type AuthUser = {
  id: string
  email: string
  fullName: string
  role: 'customer' | 'jeweller'
}

async function handleUser(res: Response): Promise<AuthUser> {
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data?.error || `Request failed (${res.status})`)
  }
  return data as AuthUser
}

export async function signup(input: {
  email: string
  password: string
  fullName: string
  role: 'customer' | 'jeweller'
}): Promise<AuthUser> {
  const res = await fetch('/api/auth/signup', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  return handleUser(res)
}

export async function login(input: { email: string; password: string; expectedRole?: 'customer' | 'jeweller' }): Promise<AuthUser> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  return handleUser(res)
}

export async function loginWithCustomerCode(accessCode: string): Promise<AuthUser> {
  const res = await fetch('/api/auth/customer-code', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accessCode }),
  })
  return handleUser(res)
}

export async function resetPasswordDirect(input: {
  email: string
  password: string
  expectedRole?: 'customer' | 'jeweller'
}): Promise<AuthUser> {
  const res = await fetch('/api/auth/password/reset-direct', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  return handleUser(res)
}

export async function logout(): Promise<void> {
  await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
  const { clearAllCache } = await import('./localCache')
  await clearAllCache()
}

export async function getMe(): Promise<AuthUser | null> {
  const res = await fetch('/api/auth/me', { credentials: 'include' })
  if (res.status === 401) return null
  if (!res.ok) throw new Error(`Failed (${res.status})`)
  return res.json()
}
