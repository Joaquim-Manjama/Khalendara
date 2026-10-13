export function resizeBoundary(mode: 'start' | 'end', start: number, end: number, deltaPixels: number, hourHeight = 72) {
  const boundary = mode === 'start' ? start : end
  const snapped = Math.round((boundary + deltaPixels / hourHeight) * 4) / 4
  return mode === 'start'
    ? Math.max(8, Math.min(Math.floor((end - .25) * 4) / 4, snapped))
    : Math.min(23, Math.max(Math.ceil((start + .25) * 4) / 4, snapped))
}
