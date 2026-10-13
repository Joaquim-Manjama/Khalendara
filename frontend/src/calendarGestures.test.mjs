import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { Buffer } from 'node:buffer'
import { test } from 'node:test'
import ts from 'typescript'
const source = await readFile(new URL('./calendarGestures.ts', import.meta.url), 'utf8')
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } })
const { resizeBoundary } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`)
test('resize snaps in either direction to fifteen minutes', () => {
  assert.equal(resizeBoundary('end', 9, 10, 18), 10.25)
  assert.equal(resizeBoundary('end', 9, 10, -18), 9.75)
  assert.equal(resizeBoundary('start', 9, 10, -18), 8.75)
  assert.equal(resizeBoundary('end', 9, 10, 7), 10)
})
test('resize stays within calendar hours and keeps at least fifteen minutes', () => {
  assert.equal(resizeBoundary('start', 9, 10, -9999), 8)
  assert.equal(resizeBoundary('end', 9, 10, 9999), 23)
  assert.equal(resizeBoundary('start', 9, 10, 9999), 9.75)
  assert.equal(resizeBoundary('end', 9, 10, -9999), 9.25)
  assert.equal(resizeBoundary('end', 9.1, 10, -9999), 9.5)
})
