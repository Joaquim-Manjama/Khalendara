export function resizeBoundary(mode: 'start' | 'end', start: number, end: number, deltaPixels: number, hourHeight = 72) {
  const boundary = mode === 'start' ? start : end
  const snapped = Math.round((boundary + deltaPixels / hourHeight) * 4) / 4
  return mode === 'start'
    ? Math.max(8, Math.min(Math.floor((end - .25) * 4) / 4, snapped))
    : Math.min(23, Math.max(Math.ceil((start + .25) * 4) / 4, snapped))
}

export function moveTimeRange(start: number, end: number, deltaPixels: number, hourHeight = 72) {
  // Keep horizontal-only moves from rounding manually entered event times.
  if (Math.abs(deltaPixels) < hourHeight / 8) return { start, end }
  const startMinutes = Math.round(start * 60)
  const durationMinutes = Math.round(end * 60) - startMinutes
  const snappedMinutes = Math.round((startMinutes + deltaPixels / hourHeight * 60) / 15) * 15
  const latestStart = Math.floor((23 * 60 - durationMinutes) / 15) * 15
  const movedStart = Math.max(8 * 60, Math.min(latestStart, snappedMinutes))
  return { start: movedStart / 60, end: (movedStart + durationMinutes) / 60 }
}
