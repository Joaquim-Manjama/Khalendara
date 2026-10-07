import assert from 'node:assert/strict'
import { Buffer } from 'node:buffer'
import { readFile } from 'node:fs/promises'
import { test, after } from 'node:test'
import ts from 'typescript'

const source = await readFile(new URL('./auth.ts', import.meta.url), 'utf8')
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } })
const { authenticate } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`)
const originalFetch = globalThis.fetch
after(() => { globalThis.fetch = originalFetch })
const user = { firstName: 'Test', lastName: 'User', email: 'test@example.com' }

test('login and registration send the backend contract and return the profile', async () => {
  for (const mode of ['login', 'register']) {
    const payload = mode === 'login' ? { email: user.email, password: 'example' } : { ...user, password: 'example' }
    globalThis.fetch = async (url, options) => {
      assert.equal(url, `/auth/${mode}`)
      assert.equal(options.method, 'POST')
      assert.deepEqual(JSON.parse(options.body), payload)
      return Response.json(user)
    }
    assert.deepEqual(await authenticate(mode, payload), user)
  }
})
test('backend authentication errors retain their messages', async () => {
  for (const [status, message] of [[401, 'Incorrect password!'], [404, 'This email is not registered!'], [409, 'An account with this email already exists!']]) {
    globalThis.fetch = async () => Response.json({ message }, { status })
    await assert.rejects(authenticate('login', {}), { message })
  }
})
test('network failures and invalid responses produce useful errors', async () => {
  globalThis.fetch = async () => { throw new TypeError('Failed to fetch') }
  await assert.rejects(authenticate('login', {}), /Unable to reach the server/)
  globalThis.fetch = async () => new Response('<html>Error</html>', { status: 500 })
  await assert.rejects(authenticate('login', {}), /Something went wrong/)
  globalThis.fetch = async () => Response.json({})
  await assert.rejects(authenticate('login', {}), /unexpected response/)
})
