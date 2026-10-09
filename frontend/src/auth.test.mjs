import assert from 'node:assert/strict'
import { Buffer } from 'node:buffer'
import { readFile } from 'node:fs/promises'
import { test, after } from 'node:test'
import ts from 'typescript'
const source = await readFile(new URL('./auth.ts', import.meta.url), 'utf8')
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } })
const { authenticate, getCurrentUser, SessionExpiredError, createCalendarEvent, getCalendarEvents, cacheCreatedEvent, deleteCalendarEvent } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`)
const originalFetch = globalThis.fetch
after(() => { globalThis.fetch = originalFetch })
const user = { id: 'user-123', firstName: 'Test', lastName: 'User', email: 'test@example.com' }
test('login and registration accept text responses and include cookies', async () => {
  for (const mode of ['login', 'register']) {
    const payload = { email: user.email, password: 'example' }
    globalThis.fetch = async (url, options) => {
      assert.equal(url, `/auth/${mode}`)
      assert.equal(options.method, 'POST')
      assert.equal(options.credentials, 'include')
      assert.deepEqual(JSON.parse(options.body), payload)
      return new Response('Successful')
    }
    assert.equal(await authenticate(mode, payload), undefined)
  }
})
test('user profile is fetched from /users/me with the session cookie', async () => {
  globalThis.fetch = async (url, options) => {
    assert.equal(url, '/users/me')
    assert.equal(options.credentials, 'include')
    return Response.json(user)
  }
  assert.deepEqual(await getCurrentUser(), user)
})
test('backend authentication errors retain their messages', async () => {
  for (const [status, message] of [[401, 'Incorrect password!'], [404, 'This email is not registered!'], [409, 'An account with this email already exists!']]) {
    globalThis.fetch = async () => Response.json({ message }, { status })
    await assert.rejects(authenticate('login', {}), { message })
  }
})
test('expired sessions and invalid profiles are handled separately', async () => {
  for (const status of [401, 403]) {
    globalThis.fetch = async () => new Response(null, { status })
    await assert.rejects(getCurrentUser(), SessionExpiredError)
  }
  for (const profile of [null, {}, { ...user, id: undefined }]) {
    globalThis.fetch = async () => Response.json(profile)
    await assert.rejects(getCurrentUser(), /unexpected user profile/)
  }
})
test('network failures and server errors produce useful feedback', async () => {
  globalThis.fetch = async () => { throw new TypeError('Failed to fetch') }
  await assert.rejects(authenticate('login', {}), /Unable to reach the server/)
  globalThis.fetch = async () => new Response('Error', { status: 500 })
  await assert.rejects(authenticate('login', {}), { message: 'Error' })
})

test('plain-text and JSON string backend errors are displayed verbatim', async () => {
  for (const response of [new Response('The account is locked.', { status: 403 }), Response.json('Please try again later.', { status: 429 })]) {
    const expected = response.clone()
    const message = expected.headers.get('content-type')?.includes('json') ? await expected.json() : await expected.text()
    globalThis.fetch = async () => response
    await assert.rejects(authenticate('login', {}), { message })
  }
})
test('profile authorization errors preserve the backend message', async () => {
  for (const status of [401, 403]) {
    const message = `Session rejected by backend (${status}).`
    globalThis.fetch = async () => Response.json({ message }, { status })
    await assert.rejects(getCurrentUser(), error => error instanceof SessionExpiredError && error.message === message)
  }
})

test('profile cache avoids repeat requests and excludes extra server fields', async () => {
  const values = new Map()
  globalThis.sessionStorage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) }
  try {
    let requests = 0
    globalThis.fetch = async () => { requests++; return Response.json({ ...user, token: 'must-not-be-cached' }) }
    assert.deepEqual(await getCurrentUser(), user)
    assert.deepEqual(await getCurrentUser(), user)
    assert.equal(requests, 1)
    assert.equal(values.get('khalendara-user').includes('must-not-be-cached'), false)
    await getCurrentUser(true)
    assert.equal(requests, 2)
    for (const value of ['invalid JSON', JSON.stringify({ user, savedAt: Date.now() - 6 * 60 * 1000 }), JSON.stringify({ user: { id: user.id }, savedAt: Date.now() })]) {
      values.set('khalendara-user', value)
      await getCurrentUser()
    }
    assert.equal(requests, 5)
    globalThis.fetch = async () => Response.json({ message: 'Expired' }, { status: 401 })
    await assert.rejects(getCurrentUser(true), SessionExpiredError)
    assert.equal(values.has('khalendara-user'), false)
  } finally { delete globalThis.sessionStorage }
})

test('event creation sends the backend contract with authentication cookies', async () => {
  const payload = { title: 'Lunch', description: 'With friends', location: 'Cafe', date: '2026-10-09',
    startTime: '12:33', endTime: '13:30', eventCategory: 'SOCIAL' }
  const saved = { id: 'event-123', ...payload, startTime: '12:33:00', endTime: '13:30:00' }
  globalThis.fetch = async (url, options) => {
    assert.equal(url, '/events/create')
    assert.equal(options.method, 'POST')
    assert.equal(options.credentials, 'include')
    assert.equal(options.headers['Content-Type'], 'application/json')
    assert.deepEqual(JSON.parse(options.body), payload)
    return Response.json(saved)
  }
  assert.deepEqual(await createCalendarEvent(payload), saved)
  globalThis.fetch = async () => Response.json({ message: 'End time must be after start time.' }, { status: 400 })
  await assert.rejects(createCalendarEvent(payload), { message: 'End time must be after start time.' })
  for (const invalid of [{}, { ...saved, description: undefined }, { ...saved, startTime: 'invalid' }]) {
    globalThis.fetch = async () => Response.json(invalid)
    await assert.rejects(createCalendarEvent(payload), /unexpected event response/)
  }
})

test('event list uses GET on cache miss, caches empty lists, and isolates users', async () => {
  const values = new Map()
  globalThis.sessionStorage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) }
  const event = { id: 'event-1', title: 'Lunch', description: '', location: '', date: '2026-10-09',
    startTime: '12:33', endTime: '13:30', eventCategory: 'SOCIAL' }
  let requests = 0
  globalThis.fetch = async (url, options) => {
    requests++
    assert.equal(url, '/events/all'); assert.equal(options.method, 'GET')
    assert.equal(options.credentials, 'include')
    return Response.json([])
  }
  try {
    assert.deepEqual(await getCalendarEvents('one'), [])
    assert.deepEqual(await getCalendarEvents('one'), [])
    assert.equal(requests, 1)
    cacheCreatedEvent('one', event)
    assert.deepEqual(await getCalendarEvents('one'), [event])
    await getCalendarEvents('two'); assert.equal(requests, 2)
    values.set('khalendara-api-events-v2-one', 'invalid')
    await getCalendarEvents('one'); assert.equal(requests, 3)
    values.set('khalendara-api-events-v2-one', JSON.stringify({ events: [], savedAt: Date.now() - 360000 }))
    await getCalendarEvents('one'); assert.equal(requests, 4)
    globalThis.fetch = async () => Response.json([{ ...event, user: { password: 'private' } }])
    assert.deepEqual(await getCalendarEvents('one', true), [event])
    assert.equal(values.get('khalendara-api-events-v2-one').includes('private'), false)
    globalThis.fetch = async () => Response.json({}, { status: 405 })
    await assert.rejects(getCalendarEvents('one', true))
    globalThis.fetch = async () => Response.json([{ ...event, startTime: 'invalid' }])
    await assert.rejects(getCalendarEvents('one', true), /unexpected event list/)
  } finally { delete globalThis.sessionStorage }
})

test('deletion sends DELETE and updates the cache only on success', async () => {
  const values = new Map()
  globalThis.sessionStorage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) }
  const event = { id: 'event/1', title: 'Lunch', description: '', location: '', date: '2026-10-09',
    startTime: '12:33', endTime: '13:30', eventCategory: 'SOCIAL' }
  try {
    globalThis.fetch = async () => Response.json([event])
    await getCalendarEvents('delete-user')
    globalThis.fetch = async () => Response.json({ message: 'Event not found' }, { status: 404 })
    await assert.rejects(deleteCalendarEvent('delete-user', event.id), { message: 'Event not found' })
    assert.deepEqual(await getCalendarEvents('delete-user'), [event])
    for (const response of [Response.json(event), new Response(null, { status: 204 })]) {
      cacheCreatedEvent('delete-user', event)
      globalThis.fetch = async (url, options) => {
        assert.equal(url, '/events/delete/event%2F1')
        assert.equal(options.method, 'DELETE')
        assert.equal(options.credentials, 'include')
        return response
      }
      await deleteCalendarEvent('delete-user', event.id)
      assert.deepEqual(await getCalendarEvents('delete-user'), [])
    }
  } finally { delete globalThis.sessionStorage }
})
