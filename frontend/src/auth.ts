export interface UserProfile {
  firstName: string
  lastName: string
  email: string
}

export async function authenticate(mode: 'login' | 'register', payload: Record<string, string>): Promise<UserProfile> {
  let response: Response
  try {
    response = await fetch(`/auth/${mode}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000),
    })
  } catch {
    throw new Error('Unable to reach the server. Please try again shortly.')
  }
  const data: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const message = data && typeof data === 'object' && 'message' in data && typeof data.message === 'string' ? data.message : 'Something went wrong. Please try again.'
    throw new Error(message)
  }
  if (!data || typeof data !== 'object' || !('firstName' in data) || !('lastName' in data) || !('email' in data) || typeof data.firstName !== 'string' || typeof data.lastName !== 'string' || typeof data.email !== 'string') {
    throw new Error('The server returned an unexpected response. Please try again.')
  }
  return { firstName: data.firstName, lastName: data.lastName, email: data.email }
}
