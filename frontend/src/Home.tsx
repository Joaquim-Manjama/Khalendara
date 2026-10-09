import { useEffect, useState, type FormEvent, type CSSProperties } from 'react'
import { createCalendarEvent, deleteCalendarEvent, getCalendarEvents, cacheCreatedEvent, type EventDTO, type UserProfile } from './auth'
import './Home.css'
const areas = [{ name: 'Personal', color: '#e77932', icon: '♙' }, { name: 'Work', color: '#d9348b', icon: '▣' }, { name: 'Family', color: '#ad52bd', icon: '♧' }, { name: 'Health', color: '#7854df', icon: '♡' }, { name: 'Social', color: '#258bce', icon: '✦' }, { name: 'Fitness', color: '#149c89', icon: '⌁' }]
type CalendarEvent = { id: string; title: string; date: string; start: number; end: number; area: string; description?: string; location?: string }
const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
const START_HOUR = 8
const END_HOUR = 23
const HOUR_HEIGHT = 72
const hours = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i)
const hourLabel = (hour: number) => `${Math.floor(hour) % 12 || 12}${hour % 1 ? ':' + String(Math.round((hour % 1) * 60)).padStart(2, '0') : ''} ${hour < 12 ? 'AM' : 'PM'}`
const timeHours = (time: string) => Number(time.split(':')[0]) + Number(time.split(':')[1]) / 60
const toCalendarEvent = (saved: EventDTO): CalendarEvent => ({
  id: saved.id, title: saved.title, date: saved.date, start: timeHours(saved.startTime), end: timeHours(saved.endTime),
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
  const [offset, setOffset] = useState(0)
  const [search, setSearch] = useState('')
  const [hidden, setHidden] = useState<string[]>([])
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [saving, setSaving] = useState(false)
  const [createError, setCreateError] = useState('')
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
    const startTime = String(fields.get('start')); const endTime = String(fields.get('end'))
    if (endTime <= startTime) { setCreateError('End time must be after start time.'); return }
    setSaving(true); setCreateError('')
    try {
      const saved = await createCalendarEvent({
        title: String(fields.get('title')).trim(), description: String(fields.get('description')).trim(),
        location: String(fields.get('location')).trim(), date: String(fields.get('date')),
        startTime, endTime, eventCategory: String(fields.get('area')).toUpperCase().replaceAll(' ', '_'),
      })
      cacheCreatedEvent(user.id, saved)
      setEvents(current => [...current, toCalendarEvent(saved)])
      setCreating(false)
    } catch (failure) { setCreateError(failure instanceof Error ? failure.message : 'Unable to create event.') }
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
  const selectedArea = selected ? areas.find(area => area.name === selected.area) : undefined
  return <div className="calendar-app">
    <aside className="calendar-sidebar"><a className="calendar-brand" href="/home"><span>▦</span>Khalendara<span className="brand-dot">.</span></a><div className="sidebar-body"><p className="nav-caption">YOUR SPACE</p><div className="nav-active">▦ <span>My calendar</span><span className="nav-count">{events.length}</span></div><p className="nav-caption">CATEGORIES</p>{areas.map(area => <button key={area.name} className={`area-button ${hidden.includes(area.name) ? 'area-hidden' : ''}`} onClick={() => setHidden(hidden.includes(area.name) ? hidden.filter(name => name !== area.name) : [...hidden, area.name])} aria-pressed={!hidden.includes(area.name)}><span style={{ color: area.color }}>{area.icon}</span>{area.name}<span className="area-check" style={{ background: hidden.includes(area.name) ? 'transparent' : area.color }}>✓</span></button>)}<div className="sidebar-note"><span>✦</span><strong>A little space for your everyday.</strong><p>Make room for what matters, one day at a time.</p></div></div><div className="sidebar-profile"><span className="avatar">{user.firstName[0]}{user.lastName[0]}</span><div><strong>{user.firstName} {user.lastName}</strong><small>{user.email}</small></div></div></aside>
    <main className="calendar-main"><header className="calendar-topbar"><label className="calendar-search"><span aria-hidden="true">⌕</span><input aria-label="Search events" placeholder="Search your calendar…" value={search} onChange={event => setSearch(event.target.value)}/><kbd>⌕</kbd></label><button className="calendar-button theme-button" onClick={toggleTheme} aria-label="Toggle color theme">◐</button><span className="topbar-avatar avatar" title={`${user.firstName} ${user.lastName}\n${user.email}`}>{user.firstName[0]}{user.lastName[0]}</span></header>
    <section className="calendar-heading"><div><p className="eyebrow">YOUR TIME, YOUR PACE</p><h1>Make space for a good week<span>.</span></h1><p>Welcome back, {user.firstName}. A little clarity goes a long way.</p></div><button className="new-event-button" disabled={eventsLoading} onClick={() => { setCreateError(''); setCreating(true) }}>＋ New event</button></section>
    <div className="calendar-toolbar"><div className="week-controls"><button className="calendar-button" onClick={() => setOffset(0)}>Today</button><div className="week-arrows"><button aria-label="Previous week" onClick={() => setOffset(offset-1)}>‹</button><button aria-label="Next week" onClick={() => setOffset(offset+1)}>›</button></div><h2>{days[0].toLocaleDateString(undefined,{month:'short',day:'numeric'})} – {days[6].toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'})}</h2></div><div className="calendar-meta"><button className="calendar-button" disabled={eventsLoading} onClick={() => { setEventsLoading(true); setEventsError(''); setReloadEvents(value => value + 1) }}>{eventsLoading ? 'Loading…' : 'Refresh events'}</button><span>{Intl.DateTimeFormat().resolvedOptions().timeZone.replaceAll('_',' ')}</span><span className="view-badge">Week</span></div></div>
    {eventsLoading && <p className="events-feedback" role="status">Loading your events…</p>}
    {eventsError && <div className="events-feedback" role="alert">{eventsError} <button className="calendar-button" onClick={() => { setEventsLoading(true); setEventsError(''); setReloadEvents(value => value + 1) }}>Try again</button></div>}
    <div className="calendar-scroll"><div className="week-calendar"><div className="day-headers"><div className="time-zone">GMT{ -now.getTimezoneOffset()/60 >= 0 ? '+' : ''}{-now.getTimezoneOffset()/60}</div>{days.map(day => <div className={`day-header ${dateKey(day) === today ? 'is-today' : ''}`} key={dateKey(day)}><span>{day.toLocaleDateString(undefined,{weekday:'short'})}</span><strong>{day.getDate()}</strong>{dateKey(day) === today && <small>TODAY</small>}</div>)}</div><div className="calendar-grid"><div className="hour-column">{hours.map(hour => <div key={hour}>{hourLabel(hour)}</div>)}</div>{days.map(day=><div className="day-column" key={dateKey(day)}>{hours.map(hour => <div className="hour-cell" key={hour}/>)}{visible.filter(event=>event.date===dateKey(day)).map(event => { const area = areas.find(area=>area.name===event.area)!; return <button className={`event-card ${event.end-event.start < .5 ? 'event-card-tiny' : event.end-event.start < 1 ? 'event-card-compact' : ''}`} key={event.id} aria-label={`${event.title}, ${hourLabel(event.start)} to ${hourLabel(event.end)}, ${event.area}`} title={`${event.title}
${hourLabel(event.start)} – ${hourLabel(event.end)}${event.location ? '\n' + event.location : ''}`} style={{ top: (event.start-START_HOUR)*HOUR_HEIGHT, height: (event.end-event.start)*HOUR_HEIGHT, '--event-color': area.color } as CSSProperties} onClick={()=>{setDeleteError('');setSelected(event)}}><strong className="event-card-title">{event.title}</strong><span className="event-card-time">{hourLabel(event.start)} <span aria-hidden="true">–</span> {hourLabel(event.end)}</span>{event.location && event.end-event.start >= 1.5 && <span className="event-card-location"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>{event.location}</span>}<span className="event-card-category"><i aria-hidden="true"/>{event.area}</span></button> })}{dateKey(day) === today && currentHour >= START_HOUR && currentHour < END_HOUR + 1 && <div className="current-time-indicator" style={{ top: (currentHour - START_HOUR) * HOUR_HEIGHT }} role="img" aria-label={`Current time: ${currentTimeLabel}`}><span>{currentTimeLabel}</span></div>}</div>)}</div></div></div>
    <footer className="calendar-footer"><span><i/> All caught up. Your time is yours.</span><span>New events are saved to your account.</span></footer></main>
    {(creating || selected) && <div className="modal-backdrop" onClick={()=>{if (!saving && !deleting) {setCreating(false);setSelected(null)}}}><section className={`event-modal ${selected ? 'event-details' : ''}`} style={selectedArea ? { '--event-color': selectedArea.color } as CSSProperties : undefined} role="dialog" aria-modal="true" aria-labelledby="event-title" onClick={event=>event.stopPropagation()} onKeyDown={event=>{if(event.key==='Escape'){if (!saving && !deleting) {setCreating(false);setSelected(null)}}}}><button className="close-modal" autoFocus={!!selected} disabled={saving || deleting} aria-label="Close dialog" onClick={()=>{if (!saving && !deleting) {setCreating(false);setSelected(null)}}}>×</button>{selected ? <><div className="event-details-header"><span className="event-details-category"><i aria-hidden="true"/>{selected.area}</span><h2 id="event-title">{selected.title}</h2><span className="event-details-duration">{Math.round((selected.end-selected.start)*60)} min reserved</span></div><dl className="event-details-info"><div><span className="event-detail-icon" aria-hidden="true">▦</span><div><dt>Date</dt><dd>{new Date(`${selected.date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</dd></div></div><div><span className="event-detail-icon" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2" strokeLinecap="round"/></svg></span><div><dt>Time</dt><dd>{hourLabel(selected.start)} <span className="event-detail-separator">—</span> {hourLabel(selected.end)}</dd></div></div>{selected.location && <div><span className="event-detail-icon" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg></span><div><dt>Location</dt><dd>{selected.location}</dd></div></div>}</dl>{selected.description && <div className="event-details-description"><h3>Description</h3><p>{selected.description}</p></div>}{deleteError && <p role="alert" className="event-error">{deleteError}</p>}<div className="event-details-actions"><button className="event-delete-button" disabled={deleting} onClick={() => void deleteEvent()}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7" strokeLinecap="round" strokeLinejoin="round"/></svg>{deleting ? 'Deleting…' : 'Delete event'}</button><button className="calendar-button" disabled={deleting} onClick={() => setSelected(null)}>Done</button></div></> : <><p className="eyebrow">MAKE ROOM FOR WHAT MATTERS</p><h2 id="event-title">A little plan for your day</h2><form onSubmit={createEvent} aria-busy={saving}><fieldset disabled={saving} className="event-fields"><label>Event name<input autoFocus name="title" className="field" required maxLength={100} pattern=".*\S.*" placeholder="What are you making time for?"/></label><label>Description<textarea name="description" className="field" maxLength={100} rows={2}/></label><label>Location<input name="location" className="field" maxLength={100}/></label><label>Date<input className="field" name="date" type="date" defaultValue={dateKey(days[0])} required/></label><div className="event-times">{['start','end'].map(name=><label key={name}>{name==='start'?'Starts':'Ends'}<input className="field" name={name} type="time" required min="08:00" max="23:00" step={60} defaultValue={name === 'start' ? '09:00' : '10:00'}/></label>)}</div><label>Category<select name="area">{areas.map(area=><option key={area.name}>{area.name}</option>)}</select></label><p className="event-disclaimer">Your event will be saved to your account.</p><button className="new-event-button" type="submit">{saving ? 'Creating…' : 'Create event'}</button></fieldset>{createError && <p role="alert" className="event-error">{createError}</p>}</form></>}</section></div>}
  </div>
}
