export interface UserProfile {
  id: string
  firstName: string
  lastName: string
  email: string
}
export class SessionExpiredError extends Error {}
const PROFILE_CACHE_KEY = 'khalendara-user'
const PROFILE_CACHE_MAX_AGE = 5 * 60 * 1000
function isUserProfile(data: unknown): data is UserProfile {
  return !!data && typeof data === 'object' && 'id' in data && typeof data.id === 'string' && 'firstName' in data && typeof data.firstName === 'string' && 'lastName' in data && typeof data.lastName === 'string' && 'email' in data && typeof data.email === 'string'
}
export function clearCachedUser() {
  try { sessionStorage.removeItem(PROFILE_CACHE_KEY) } catch { /* Storage may be unavailable. */ }
}
function readCachedUser(): UserProfile | null {
  try {
    const cached = JSON.parse(sessionStorage.getItem(PROFILE_CACHE_KEY) || 'null')
    if (cached && isUserProfile(cached.user) && typeof cached.savedAt === 'number' && cached.savedAt <= Date.now() && Date.now() - cached.savedAt < PROFILE_CACHE_MAX_AGE) return cached.user
  } catch { /* Invalid or unavailable storage falls back to the backend. */ }
  clearCachedUser()
  return null
}
async function request(path: string, options: RequestInit = {}) {
  let response: Response
  try {
    response = await fetch(path, { ...options, credentials: 'include', signal: AbortSignal.timeout(15000) })
  } catch { throw new Error('Unable to reach the server. Please try again shortly.') }
  if (!response.ok) {
    const body = await response.text()
    let data: unknown = null
    try { data = JSON.parse(body) } catch { /* Plain-text errors are also supported. */ }
    const message = data && typeof data === 'object' && 'message' in data && typeof data.message === 'string'
      ? data.message
      : typeof data === 'string' ? data
      : data === null && body.trim() && !/^\s*</.test(body) ? body
      : 'Something went wrong. Please try again.'
    if (response.status === 401 || response.status === 403) {
      clearCachedUser()
      if (path === '/users/me') throw new SessionExpiredError(message)
    }
    throw new Error(message)
  }
  return response
}
export async function authenticate(mode: 'login' | 'register', payload: Record<string, string>): Promise<void> {
  await request(`/auth/${mode}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
}
export async function getCurrentUser(forceRefresh = false): Promise<UserProfile> {
  if (!forceRefresh) {
    const cached = readCachedUser()
    if (cached) return cached
  } else clearCachedUser()
  const response = await request('/users/me')
  const data: unknown = await response.json().catch(() => null)
  if (!isUserProfile(data)) throw new Error('The server returned an unexpected user profile. Please try again.')
  const user = { id: data.id, firstName: data.firstName, lastName: data.lastName, email: data.email }
  try { sessionStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify({ user, savedAt: Date.now() })) } catch { /* The profile still works without storage. */ }
  return user
}
