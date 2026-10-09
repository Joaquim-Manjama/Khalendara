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

export interface EventPayload {
  title: string; description: string; location: string; date: string
  startTime: string; endTime: string; eventCategory: string
}
export interface EventDTO extends EventPayload { id: string }
export async function createCalendarEvent(payload: EventPayload): Promise<EventDTO> {
  const response = await request('/events/create', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
  })
  const data = await response.json().catch(() => null)
  if (!isEventDTO(data)) {
    throw new Error('The server returned an unexpected event response. Check your calendar before retrying.')
  }
  return data
}

const EVENT_CACHE_MAX_AGE = 5 * 60 * 1000
const eventCacheKey = (userId: string) => `khalendara-api-events-v2-${userId}`
function isEventDTO(data: unknown): data is EventDTO {
  if (!data || typeof data !== 'object') return false
  const event = data as Record<string, unknown>
  return ['id', 'title', 'description', 'location', 'date', 'startTime', 'endTime', 'eventCategory']
    .every(key => typeof event[key] === 'string')
    && /^\d{4}-\d{2}-\d{2}$/.test(String(event.date))
    && /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d+)?)?$/.test(String(event.startTime))
    && /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d+)?)?$/.test(String(event.endTime))
    && ['PERSONAL', 'WORK', 'FAMILY', 'HEALTH', 'SOCIAL', 'FITNESS'].includes(String(event.eventCategory))
}
function readEventCache(userId: string): EventDTO[] | null {
  try {
    const cached = JSON.parse(sessionStorage.getItem(eventCacheKey(userId)) || 'null')
    if (cached && Array.isArray(cached.events) && cached.events.every(isEventDTO)
        && typeof cached.savedAt === 'number' && cached.savedAt <= Date.now()
        && Date.now() - cached.savedAt < EVENT_CACHE_MAX_AGE) return cached.events
  } catch { /* Invalid or unavailable storage falls back to the server. */ }
  return null
}
function cacheEvents(userId: string, events: EventDTO[]) {
  // Select only event fields; never cache nested user data from entity responses.
  const safeEvents = events.map(({ id, title, description, location, date, startTime, endTime, eventCategory }) =>
    ({ id, title, description, location, date, startTime, endTime, eventCategory }))
  try { sessionStorage.setItem(eventCacheKey(userId), JSON.stringify({ events: safeEvents, savedAt: Date.now() })) }
  catch { /* Events remain available in memory. */ }
  return safeEvents
}
export function cacheCreatedEvent(userId: string, event: EventDTO) {
  const cached = readEventCache(userId)
  if (cached) cacheEvents(userId, [...cached.filter(item => item.id !== event.id), event])
}
export async function getCalendarEvents(userId: string, forceRefresh = false): Promise<EventDTO[]> {
  if (!forceRefresh) {
    const cached = readEventCache(userId)
    if (cached) return cached
  }
  const response = await request('/events/all', { method: 'GET' })
  const data: unknown = await response.json().catch(() => null)
  if (!Array.isArray(data) || !data.every(isEventDTO)) {
    throw new Error('The server returned an unexpected event list. Please try again.')
  }
  return cacheEvents(userId, data)
}

export async function deleteCalendarEvent(userId: string, eventId: string): Promise<void> {
  await request(`/events/delete/${encodeURIComponent(eventId)}`, { method: 'DELETE' })
  const cached = readEventCache(userId)
  if (cached) cacheEvents(userId, cached.filter(event => event.id !== eventId))
}
