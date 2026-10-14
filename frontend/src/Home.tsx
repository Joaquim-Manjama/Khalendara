import { useEffect, useRef, useState, type FormEvent, type CSSProperties, type PointerEvent } from 'react'
import { createCalendarEvent, updateCalendarEvent, deleteCalendarEvent, getCalendarEvents, cacheCreatedEvent, type EventDTO, type UserProfile } from './auth'
import './Home.css'
import { resizeBoundary, moveTimeRange } from './calendarGestures'
const areas = [{ name: 'Personal', color: '#e77932', icon: '♙' }, { name: 'Work', color: '#d9348b', icon: '▣' }, { name: 'Family', color: '#ad52bd', icon: '♧' }, { name: 'Health', color: '#7854df', icon: '♡' }, { name: 'Social', color: '#258bce', icon: '✦' }, { name: 'Fitness', color: '#149c89', icon: '⌁' }]
type CalendarEvent = { id: string; title: string; date: string; start: number; end: number; allDay: boolean; area: string; description?: string; location?: string }
const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
const START_HOUR = 8
const END_HOUR = 23
const HOUR_HEIGHT = 72
const hours = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i)
const hourLabel = (hour: number) => `${Math.floor(hour) % 12 || 12}${hour % 1 ? ':' + String(Math.round((hour % 1) * 60)).padStart(2, '0') : ''} ${hour < 12 ? 'AM' : 'PM'}`
const timeHours = (time: string) => Number(time.split(':')[0]) + Number(time.split(':')[1]) / 60
const inputTime = (hour: number) => { const minutes = Math.round(hour * 60); return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}` }
const toCalendarEvent = (saved: EventDTO): CalendarEvent => ({
  id: saved.id, title: saved.title, date: saved.date, start: timeHours(saved.startTime ?? '09:00'), end: timeHours(saved.endTime ?? '10:00'), allDay: saved.allDay === true,
  area: areas.find(area => area.name.toUpperCase() === saved.eventCategory)?.name ?? 'Personal',
  description: saved.description, location: saved.location,
})
export default function Home({ user, toggleTheme }: { user: UserProfile; toggleTheme: () => void }) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const refresh = () => setNow(new Date())
    const timer = window.setInterval(refresh, 1000)
    window.addEventListener('focus', refresh)
    return () => { window.clearInterval(timer); window.removeEventListener('focus', refresh) }
  }, [])
  const gridRef = useRef<HTMLDivElement>(null)
  const gesture = useRef<{ original: CalendarEvent; draft: CalendarEvent; pointerId: number; x: number; y: number; width: number; mode: string; moved: boolean; shift: number } | null>(null)
  const suppressClick = useRef(false)
  const pendingGesture = useRef(false)
  const [preview, setPreview] = useState<{ id: string; start: number; end: number; shift: number } | null>(null)
  const [gestureSaving, setGestureSaving] = useState(false)
  const [gestureMessage, setGestureMessage] = useState('')
  const [offset, setOffset] = useState(0)
  const [search, setSearch] = useState('')
  const [hidden, setHidden] = useState<string[]>([])
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [saving, setSaving] = useState(false)
  const [createError, setCreateError] = useState('')
  const [editing, setEditing] = useState(false)
  const [allDay, setAllDay] = useState(false)
  const [creating, setCreating] = useState(false)
  const [selected, setSelected] = useState<CalendarEvent | null>(null)
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [eventsLoading, setEventsLoading] = useState(true)
  const [eventsError, setEventsError] = useState('')
  const [reloadEvents, setReloadEvents] = useState(0)
  useEffect(() => {
    let active = true
    getCalendarEvents(user.id, reloadEvents > 0).then(saved => {
      if (active) { setEvents(saved.map(toCalendarEvent)); setEventsError('') }
    }).catch(failure => {
      if (active) setEventsError(failure instanceof Error ? failure.message : 'Unable to load events.')
    }).finally(() => { if (active) setEventsLoading(false) })
    return () => { active = false }
  }, [user.id, reloadEvents])
  const monday = new Date(now); monday.setHours(0,0,0,0); monday.setDate(monday.getDate() - (monday.getDay()+6)%7 + offset*7)
  const days = Array.from({ length: 7 }, (_, i) => { const day = new Date(monday); day.setDate(day.getDate()+i); return day })
  const today = dateKey(now)
  const currentHour = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600
  const currentTimeLabel = now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true })
  const visible = events.filter(event => !hidden.includes(event.area) && event.title.toLowerCase().includes(search.toLowerCase()))
  const createEvent = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (saving) return
    const fields = new FormData(event.currentTarget)
    const startTime = allDay ? null : String(fields.get('start')); const endTime = allDay ? null : String(fields.get('end'))
    if (!allDay && endTime! <= startTime!) { setCreateError('End time must be after start time.'); return }
    setSaving(true); setCreateError('')
    try {
      const payload = {
        title: String(fields.get('title')).trim(), description: String(fields.get('description')).trim(),
        location: String(fields.get('location')).trim(), date: String(fields.get('date')),
        startTime, endTime, allDay, eventCategory: String(fields.get('area')).toUpperCase().replaceAll(' ', '_'),
      }
      const saved = editing && selected
        ? await updateCalendarEvent(user.id, selected.id, payload)
        : await createCalendarEvent(payload)
      cacheCreatedEvent(user.id, saved)
      setEvents(current => editing ? current.map(item => item.id === saved.id ? toCalendarEvent(saved) : item) : [...current, toCalendarEvent(saved)])
      if (editing) setSelected(toCalendarEvent(saved))
      setEditing(false)
      setCreating(false)
    } catch (failure) { setCreateError(failure instanceof Error ? failure.message : 'Unable to save event.') }
    finally { setSaving(false) }
  }
  const deleteEvent = async () => {
    if (!selected || deleting) return
    const eventId = selected.id
    setDeleting(true); setDeleteError('')
    try {
      await deleteCalendarEvent(user.id, eventId)
      setEvents(current => current.filter(event => event.id !== eventId))
      setSelected(null)
    } catch (failure) {
      setDeleteError(failure instanceof Error ? failure.message : 'Unable to delete event.')
    } finally { setDeleting(false) }
  }
  const beginGesture = (pointer: PointerEvent<HTMLButtonElement>, event: CalendarEvent) => {
    if (pointer.button !== 0 || pendingGesture.current || eventsLoading) return
    const mode = (pointer.target as HTMLElement).closest<HTMLElement>('[data-resize]')?.dataset.resize ?? 'move'
    pointer.currentTarget.setPointerCapture(pointer.pointerId)
    gesture.current = { original: event, draft: event, pointerId: pointer.pointerId, x: pointer.clientX, y: pointer.clientY,
      width: pointer.currentTarget.parentElement!.getBoundingClientRect().width, mode, moved: false, shift: 0 }
    suppressClick.current = false
  }
  const moveGesture = (pointer: PointerEvent<HTMLButtonElement>) => {
    const current = gesture.current
    if (!current || current.pointerId !== pointer.pointerId) return
    if (!current.moved && Math.hypot(pointer.clientX-current.x, pointer.clientY-current.y) < 5) return
    current.moved = true; suppressClick.current = true
    if (current.mode === 'move') {
      const columns = Array.from(gridRef.current!.querySelectorAll<HTMLElement>('.day-column'))
      const index = columns.findIndex(column => { const rect = column.getBoundingClientRect(); return pointer.clientX >= rect.left && pointer.clientX < rect.right })
      const originalIndex = days.findIndex(day => dateKey(day) === current.original.date)
      current.draft = { ...current.original, ...moveTimeRange(current.original.start, current.original.end, pointer.clientY-current.y), date: index >= 0 ? dateKey(days[index]) : current.original.date }
      current.shift = index >= 0 ? (index-originalIndex)*current.width : 0
    } else {
      current.draft = current.mode === 'start'
        ? { ...current.original, start: resizeBoundary('start', current.original.start, current.original.end, pointer.clientY-current.y) }
        : { ...current.original, end: resizeBoundary('end', current.original.start, current.original.end, pointer.clientY-current.y) }

    }
    setPreview({ id: current.original.id, start: current.draft.start, end: current.draft.end, shift: current.shift })
  }
  const cancelGesture = () => {
    if (gesture.current?.moved) suppressClick.current = true
    gesture.current = null; setPreview(null)
  }
  const finishGesture = async (pointer: PointerEvent<HTMLButtonElement>) => {
    const current = gesture.current
    if (!current || current.pointerId !== pointer.pointerId) return
    gesture.current = null
    if (pointer.currentTarget.hasPointerCapture(pointer.pointerId)) pointer.currentTarget.releasePointerCapture(pointer.pointerId)
    const draft = current.draft
    if (!current.moved || (draft.date === current.original.date && draft.start === current.original.start && draft.end === current.original.end)) { setPreview(null); return }
    pendingGesture.current = true; setGestureSaving(true); setGestureMessage('')
    try {
      const saved = await updateCalendarEvent(user.id, draft.id, {
        title: draft.title, description: draft.description ?? '', location: draft.location ?? '', date: draft.date,
        allDay: false, startTime: inputTime(draft.start), endTime: inputTime(draft.end), eventCategory: draft.area.toUpperCase().replaceAll(' ', '_'),
      })
      setEvents(currentEvents => currentEvents.map(item => item.id === saved.id ? toCalendarEvent(saved) : item))
      setGestureMessage('Event updated.')
    } catch (failure) { setGestureMessage(failure instanceof Error ? failure.message : 'Unable to update event. Your original event has been kept.') }
    finally { pendingGesture.current = false; setGestureSaving(false); setPreview(null) }
  }
  const selectedArea = selected ? areas.find(area => area.name === selected.area) : undefined
  return <div className="calendar-app">
    <aside className="calendar-sidebar"><a className="calendar-brand" href="/home"><span>▦</span>Khalendara<span className="brand-dot">.</span></a><div className="sidebar-body"><p className="nav-caption">YOUR SPACE</p><div className="nav-active">▦ <span>My calendar</span><span className="nav-count">{events.length}</span></div><p className="nav-caption">CATEGORIES</p>{areas.map(area => <button key={area.name} className={`area-button ${hidden.includes(area.name) ? 'area-hidden' : ''}`} onClick={() => setHidden(hidden.includes(area.name) ? hidden.filter(name => name !== area.name) : [...hidden, area.name])} aria-pressed={!hidden.includes(area.name)}><span style={{ color: area.color }}>{area.icon}</span>{area.name}<span className="area-check" style={{ background: hidden.includes(area.name) ? 'transparent' : area.color }}>✓</span></button>)}<div className="sidebar-note"><span>✦</span><strong>A little space for your everyday.</strong><p>Make room for what matters, one day at a time.</p></div></div><div className="sidebar-profile"><span className="avatar">{user.firstName[0]}{user.lastName[0]}</span><div><strong>{user.firstName} {user.lastName}</strong><small>{user.email}</small></div></div></aside>
    <main className="calendar-main"><header className="calendar-topbar"><label className="calendar-search"><span aria-hidden="true">⌕</span><input aria-label="Search events" placeholder="Search your calendar…" value={search} onChange={event => setSearch(event.target.value)}/><kbd>⌕</kbd></label><button className="calendar-button theme-button" onClick={toggleTheme} aria-label="Toggle color theme">◐</button><span className="topbar-avatar avatar" title={`${user.firstName} ${user.lastName}\n${user.email}`}>{user.firstName[0]}{user.lastName[0]}</span></header>
    <section className="calendar-heading"><div><p className="eyebrow">YOUR TIME, YOUR PACE</p><h1>Make space for a good week<span>.</span></h1><p>Welcome back, {user.firstName}. A little clarity goes a long way.</p></div><button className="new-event-button" disabled={eventsLoading || gestureSaving || !!preview} onClick={() => { setCreateError(''); setEditing(false); setSelected(null); setAllDay(false); setCreating(true) }}>＋ New event</button></section>
    <div className="calendar-toolbar"><div className="week-controls"><button className="calendar-button" onClick={() => setOffset(0)}>Today</button><div className="week-arrows"><button aria-label="Previous week" onClick={() => setOffset(offset-1)}>‹</button><button aria-label="Next week" onClick={() => setOffset(offset+1)}>›</button></div><h2>{days[0].toLocaleDateString(undefined,{month:'short',day:'numeric'})} – {days[6].toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'})}</h2></div><div className="calendar-meta"><button className="calendar-button" disabled={eventsLoading || gestureSaving || !!preview} onClick={() => { setEventsLoading(true); setEventsError(''); setReloadEvents(value => value + 1) }}>{eventsLoading ? 'Loading…' : 'Refresh events'}</button><span>{Intl.DateTimeFormat().resolvedOptions().timeZone.replaceAll('_',' ')}</span><span className="view-badge">Week</span></div></div>
    <p className="events-feedback" role="status">{gestureSaving ? 'Saving event…' : gestureMessage || 'Drag an event to change its day or time. Drag its edges to resize. Times snap to 15-minute steps.'}</p>
    {eventsLoading && <p className="events-feedback" role="status">Loading your events…</p>}
    {eventsError && <div className="events-feedback" role="alert">{eventsError} <button className="calendar-button" onClick={() => { setEventsLoading(true); setEventsError(''); setReloadEvents(value => value + 1) }}>Try again</button></div>}
    <div className="calendar-scroll"><div className="week-calendar"><div className="day-headers"><div className="time-zone">GMT{ -now.getTimezoneOffset()/60 >= 0 ? '+' : ''}{-now.getTimezoneOffset()/60}</div>{days.map(day => <div className={`day-header ${dateKey(day) === today ? 'is-today' : ''}`} key={dateKey(day)}><span>{day.toLocaleDateString(undefined,{weekday:'short'})}</span><strong>{day.getDate()}</strong>{dateKey(day) === today && <small>TODAY</small>}</div>)}</div><div className="all-day-row"><div className="all-day-label">All day</div>{days.map(day => <div className="all-day-cell" key={dateKey(day)}>{visible.filter(event => event.allDay && event.date === dateKey(day)).map(event => <button key={event.id} className="all-day-event" style={{ '--event-color': areas.find(area => area.name === event.area)!.color } as CSSProperties} aria-label={`${event.title}, all day, ${event.area}`} title={`${event.title} (All day)`} onClick={() => {setDeleteError('');setEditing(false);setSelected(event)}}>{event.title}</button>)}</div>)}</div><div className="calendar-grid" ref={gridRef} onKeyDown={event => {if(event.key === 'Escape') cancelGesture()}}><div className="hour-column">{hours.map(hour => <div key={hour}>{hourLabel(hour)}</div>)}</div>{days.map(day=><div className="day-column" key={dateKey(day)}>{hours.map(hour => <div className="hour-cell" key={hour}/>)}{visible.filter(event=>!event.allDay && event.date===dateKey(day)).map(event => { const area = areas.find(area=>area.name===event.area)!; const activePreview = preview?.id === event.id ? preview : null; const displayStart = activePreview?.start ?? event.start; const displayEnd = activePreview?.end ?? event.end; return <button className={`event-card ${activePreview ? 'event-card-gesturing' : ''} ${displayEnd-displayStart < .5 ? 'event-card-tiny' : displayEnd-displayStart < 1 ? 'event-card-compact' : ''}`} key={event.id} aria-label={`${event.title}, ${hourLabel(event.start)} to ${hourLabel(event.end)}, ${event.area}`} title={`${event.title}
${hourLabel(event.start)} – ${hourLabel(event.end)}${event.location ? '\n' + event.location : ''}`} style={{ top: (displayStart-START_HOUR)*HOUR_HEIGHT, height: (displayEnd-displayStart)*HOUR_HEIGHT, transform: activePreview ? `translateX(${activePreview.shift}px)` : undefined, '--event-color': area.color } as CSSProperties} onPointerDown={pointer => beginGesture(pointer, event)} onPointerMove={moveGesture} onPointerUp={pointer => void finishGesture(pointer)} onPointerCancel={cancelGesture} onClick={()=>{if (suppressClick.current) {suppressClick.current=false;return} if (pendingGesture.current) return;setDeleteError('');setEditing(false);setSelected(event)}}><span className="event-resize-handle event-resize-start" data-resize="start" aria-hidden="true"/><strong className="event-card-title">{event.title}</strong><span className="event-card-time">{hourLabel(displayStart)} <span aria-hidden="true">–</span> {hourLabel(displayEnd)}</span>{event.location && event.end-event.start >= 1.5 && <span className="event-card-location"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>{event.location}</span>}<span className="event-card-category"><i aria-hidden="true"/>{event.area}</span><span className="event-resize-handle event-resize-end" data-resize="end" aria-hidden="true"/></button> })}{dateKey(day) === today && currentHour >= START_HOUR && currentHour < END_HOUR + 1 && <div className="current-time-indicator" style={{ top: (currentHour - START_HOUR) * HOUR_HEIGHT }} role="img" aria-label={`Current time: ${currentTimeLabel}`}><span>{currentTimeLabel}</span></div>}</div>)}</div></div></div>
    <footer className="calendar-footer"><span><i/> All caught up. Your time is yours.</span><span>New events are saved to your account.</span></footer></main>
    {(creating || selected) && <div className="modal-backdrop" onClick={()=>{if (!saving && !deleting) {setCreating(false);setEditing(false);setSelected(null)}}}><section className={`event-modal ${selected && !editing ? 'event-details' : ''}`} style={selectedArea ? { '--event-color': selectedArea.color } as CSSProperties : undefined} role="dialog" aria-modal="true" aria-labelledby="event-title" onClick={event=>event.stopPropagation()} onKeyDown={event=>{if(event.key==='Escape'){if (!saving && !deleting) {setCreating(false);setEditing(false);setSelected(null)}}}}><button className="close-modal" autoFocus={!!selected && !editing} disabled={saving || deleting} aria-label="Close dialog" onClick={()=>{if (!saving && !deleting) {setCreating(false);setEditing(false);setSelected(null)}}}>×</button>{selected && !editing ? <><div className="event-details-header"><span className="event-details-category"><i aria-hidden="true"/>{selected.area}</span><h2 id="event-title">{selected.title}</h2><span className="event-details-duration">{selected.allDay ? 'All day' : `${Math.round((selected.end-selected.start)*60)} min reserved`}</span></div><dl className="event-details-info"><div><span className="event-detail-icon" aria-hidden="true">▦</span><div><dt>Date</dt><dd>{new Date(`${selected.date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</dd></div></div><div><span className="event-detail-icon" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2" strokeLinecap="round"/></svg></span><div><dt>Time</dt><dd>{selected.allDay ? 'All day' : <>{hourLabel(selected.start)} <span className="event-detail-separator">—</span> {hourLabel(selected.end)}</>}</dd></div></div>{selected.location && <div><span className="event-detail-icon" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg></span><div><dt>Location</dt><dd>{selected.location}</dd></div></div>}</dl>{selected.description && <div className="event-details-description"><h3>Description</h3><p>{selected.description}</p></div>}{deleteError && <p role="alert" className="event-error">{deleteError}</p>}<div className="event-details-actions"><button className="event-delete-button" disabled={deleting} onClick={() => void deleteEvent()}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7" strokeLinecap="round" strokeLinejoin="round"/></svg>{deleting ? 'Deleting…' : 'Delete event'}</button><div className="event-details-secondary-actions"><button className="calendar-button" disabled={deleting} onClick={() => {setCreateError('');setAllDay(selected.allDay);setEditing(true)}}>Edit event</button><button className="calendar-button" disabled={deleting} onClick={() => setSelected(null)}>Done</button></div></div></> : <><p className="eyebrow">MAKE ROOM FOR WHAT MATTERS</p><h2 id="event-title">{editing ? 'Edit your event' : 'A little plan for your day'}</h2><form key={editing ? selected?.id : 'new'} onSubmit={createEvent} aria-busy={saving}><fieldset disabled={saving} className="event-fields"><label>Event name<input autoFocus defaultValue={editing ? selected?.title : ''} name="title" className="field" required maxLength={100} pattern=".*\S.*" placeholder="What are you making time for?"/></label><label>Description<textarea defaultValue={editing ? selected?.description : ''} name="description" className="field" maxLength={100} rows={2}/></label><label>Location<input defaultValue={editing ? selected?.location : ''} name="location" className="field" maxLength={100}/></label><label>Date<input className="field" name="date" type="date" defaultValue={editing ? selected?.date : dateKey(days[0])} required/></label><label className="all-day-checkbox"><input name="allDay" type="checkbox" checked={allDay} onChange={event => setAllDay(event.target.checked)}/>All-day event</label><div className="event-times" hidden={allDay}>{['start','end'].map(name=><label key={name}>{name==='start'?'Starts':'Ends'}<input className="field" name={name} type="time" disabled={allDay} required={!allDay} min="08:00" max="23:00" step={60} defaultValue={editing && selected ? `${String(Math.floor(name === 'start' ? selected.start : selected.end)).padStart(2, '0')}:${String(Math.round(((name === 'start' ? selected.start : selected.end) % 1) * 60)).padStart(2, '0')}` : name === 'start' ? '09:00' : '10:00'}/></label>)}</div><label>Category<select name="area" defaultValue={editing ? selected?.area : 'Personal'}>{areas.map(area=><option key={area.name}>{area.name}</option>)}</select></label><p className="event-disclaimer">Your event will be saved to your account.</p><button className="new-event-button" type="submit">{saving ? 'Saving…' : editing ? 'Save changes' : 'Create event'}</button>{editing && <button type="button" className="calendar-button" onClick={() => {setEditing(false);setCreateError('')}}>Cancel</button>}</fieldset>{createError && <p role="alert" className="event-error">{createError}</p>}</form></>}</section></div>}
  </div>
}
