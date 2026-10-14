import { useEffect, useRef, useState, type FormEvent } from 'react'
import { importCalendarEvents, type EventDTO } from './auth'

export default function ImportCalendarDialog({ userId, categories, onClose, onImported }: {
  userId: string
  categories: string[]
  onClose: () => void
  onImported: (events: EventDTO[]) => void
}) {
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState('')
  const pending = useRef(false)
  const dialog = useRef<HTMLElement>(null)
  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null
    dialog.current?.querySelector<HTMLInputElement>('input')?.focus()
    return () => previousFocus?.focus()
  }, [])

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (pending.current) return
    const fields = new FormData(event.currentTarget)
    pending.current = true
    setImporting(true)
    setError('')
    try {
      const events = await importCalendarEvents(userId, String(fields.get('url')), String(fields.get('category')))
      onImported(events)
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Unable to import this calendar.')
    } finally {
      pending.current = false
      setImporting(false)
    }
  }

  return <div className="modal-backdrop" onClick={() => { if (!pending.current) onClose() }}>
    <section ref={dialog} tabIndex={-1} className="event-modal import-modal" role="dialog" aria-modal="true" aria-labelledby="import-title"
      onClick={event => event.stopPropagation()} onKeyDown={event => {
        if (event.key === 'Escape' && !pending.current) onClose()
        if (event.key !== 'Tab') return
        const controls = Array.from(dialog.current!.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled)'))
        if (!controls.length) { event.preventDefault(); dialog.current?.focus(); return }
        const first = controls[0]; const last = controls[controls.length - 1]
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
      }}>
      <button className="close-modal" type="button" disabled={importing} aria-label="Close import dialog" onClick={onClose}>×</button>
      <p className="eyebrow">BRING YOUR PLANS TOGETHER</p>
      <h2 id="import-title">Import a calendar</h2>
      <p className="import-intro" id="import-description">Paste an iCalendar (.ics) link and choose a category for its events. Events from today onwards will be added to your account.</p>
      <form onSubmit={submit} aria-busy={importing} aria-describedby="import-description">
        <fieldset className="event-fields" disabled={importing}>
          <label>Calendar URL<input className="field" name="url" type="url" required placeholder="https://example.com/calendar.ics" autoComplete="off" spellCheck={false}/></label>
          <label>Category<select name="category" defaultValue="PERSONAL">{categories.map(category => <option key={category} value={category.toUpperCase().replaceAll(' ', '_')}>{category}</option>)}</select></label>
          <p className="event-disclaimer">This imports a copy of the events. Importing the same link again may create duplicates.</p>
          <button className="new-event-button" type="submit">{importing ? 'Importing…' : 'Import events'}</button>
        </fieldset>
        {importing && <p className="event-disclaimer" role="status">Fetching your calendar and saving its events. This may take a moment.</p>}
        {error && <div className="event-error" role="alert">{error}<p className="import-error-note">Some events may already have been saved. Close this dialog and refresh your calendar before retrying.</p></div>}
      </form>
    </section>
  </div>
}
