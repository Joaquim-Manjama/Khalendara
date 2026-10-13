import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { Buffer } from 'node:buffer'
import { test } from 'node:test'
import ts from 'typescript'
const source = await readFile(new URL('./calendarGestures.ts', import.meta.url), 'utf8')
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } })
const { resizeBoundary, moveTimeRange } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`)
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

test('vertical dragging shifts both times in fifteen-minute steps', () => {
  assert.deepEqual(moveTimeRange(9, 10.5, 18), { start: 9.25, end: 10.75 })
  assert.deepEqual(moveTimeRange(9, 10.5, -18), { start: 8.75, end: 10.25 })
  assert.deepEqual(moveTimeRange(9, 10.5, 7), { start: 9, end: 10.5 })
})
test('dragging clamps the whole event to calendar bounds without changing duration', () => {
  assert.deepEqual(moveTimeRange(9, 10.5, -9999), { start: 8, end: 9.5 })
  assert.deepEqual(moveTimeRange(9, 10.5, 9999), { start: 21.5, end: 23 })
  const moved = moveTimeRange(12.55, 13.5, 18)
  assert.equal(moved.start * 4, Math.round(moved.start * 4))
  assert.equal(Math.round((moved.end - moved.start) * 60), 57)
  assert.deepEqual(moveTimeRange(12.55, 13.5, 0), { start: 12.55, end: 13.5 })
})
