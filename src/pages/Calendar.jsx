import React, { useState, useMemo } from 'react'
import Card from '../components/Card'
import PageHeader from '../components/PageHeader'
import Btn from '../components/Btn'
import { Plus, Trash2, ChevronLeft, ChevronRight, Pencil, X } from 'lucide-react'

export const EVENT_TYPES = [
  { value: 'event',    label: 'Event',    color: '#4f6ef7', emoji: '📌' },
  { value: 'birthday', label: 'Birthday', color: '#ef4444', emoji: '🎂' },
  { value: 'reminder', label: 'Reminder', color: '#f59e0b', emoji: '🔔' },
  { value: 'football', label: 'Football', color: '#22c55e', emoji: '⚽' },
  { value: 'holiday',  label: 'Holiday',  color: '#a78bfa', emoji: '✈️' },
  { value: 'workout',  label: 'Workout',  color: '#f97316', emoji: '🏋️' },
]

function typeInfo(type) {
  return EVENT_TYPES.find(t => t.value === type) || EVENT_TYPES[0]
}

function ordinal(n) {
  const s = ['th','st','nd','rd'], v = n % 100
  return n + (s[(v-20)%10] || s[v] || s[0])
}

function getNextBirthday(event) {
  const now = new Date(); now.setHours(0,0,0,0)
  const dob = new Date(event.date)
  const thisYear = now.getFullYear()
  let next = new Date(thisYear, dob.getMonth(), dob.getDate())
  if (next < now) next = new Date(thisYear + 1, dob.getMonth(), dob.getDate())
  const daysUntil = Math.round((next - now) / 86400000)
  const turningAge = next.getFullYear() - dob.getFullYear()
  return { daysUntil, turningAge, nextDate: next }
}

function birthdayDisplayTitle(event) {
  const { turningAge } = getNextBirthday(event)
  // Insert ordinal age before last word or append
  // e.g. "Oscar's bday" -> "Oscar's 30th bday"
  // Strategy: insert before last word if title has multiple words, else append
  const words = event.title.trim().split(/\s+/)
  if (words.length > 1) {
    const last = words.pop()
    return `${words.join(' ')} ${ordinal(turningAge)} ${last}`
  }
  return `${event.title} (${ordinal(turningAge)})`
}

function formatTime(event) {
  if (event.allDay) return 'All day'
  if (!event.time) return ''
  const [h, m] = event.time.split(':').map(Number)
  const ampm = h >= 12 ? 'pm' : 'am'
  return `${h % 12 || 12}:${String(m).padStart(2,'0')}${ampm}`
}

function formatHolidayRange(event) {
  if (!event.dateTo) return new Date(event.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  const from = new Date(event.date)
  const to = new Date(event.dateTo)
  const nights = Math.round((to - from) / 86400000)
  return `${from.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}  -  ${to.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} · ${nights} night${nights !== 1 ? 's' : ''}`
}

function getDaysInMonth(y, m) { return new Date(y, m + 1, 0).getDate() }
function getFirstDay(y, m) { return (new Date(y, m, 1).getDay() + 6) % 7 }

const EMPTY_FORM = { title: '', date: '', dateTo: '', time: '', allDay: true, type: 'event', notes: '', recurrence: 'none', recurrenceEnd: '' }

export const RECURRENCE_OPTIONS = [
  { value: 'none',    label: 'Does not repeat' },
  { value: 'weekly',  label: 'Every week' },
  { value: 'monthly', label: 'Every month' },
  { value: 'yearly',  label: 'Every year' },
]

// Dark-mode friendly date/time input styles injected once
const DATE_INPUT_STYLE = `
  input[type="date"], input[type="time"] {
    color-scheme: dark;
  }
  [data-theme="light"] input[type="date"],
  [data-theme="light"] input[type="time"] {
    color-scheme: light;
  }
`

function EventForm({ form, setForm, onSave, onCancel, isEdit }) {
  return (
    <Card style={{ marginBottom: '20px', border: '1px solid var(--accent-border)' }}>
      <style>{DATE_INPUT_STYLE}</style>
      <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '14px' }}>{isEdit ? 'Edit event' : 'New event'}</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div>
          <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Title</label>
          <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Event name" autoFocus />
        </div>
        <div>
          <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Type</label>
          <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value, allDay: e.target.value === 'birthday' || e.target.value === 'holiday' ? true : f.allDay }))}>
            {EVENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.emoji} {t.label}</option>)}
          </select>
        </div>

        {form.type === 'holiday' ? (
          <>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>From</label>
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>To (return date)</label>
              <input type="date" value={form.dateTo} min={form.date} onChange={e => setForm(f => ({ ...f, dateTo: e.target.value }))} />
            </div>
          </>
        ) : (
          <>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                {form.type === 'birthday' ? 'Date of birth' : 'Date'}
              </label>
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Time</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  <input type="checkbox" checked={form.allDay} onChange={e => setForm(f => ({ ...f, allDay: e.target.checked }))} style={{ width: 'auto', accentColor: 'var(--accent)' }} />
                  All day
                </label>
                {!form.allDay && (
                  <input type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} style={{ flex: 1 }} />
                )}
              </div>
            </div>
          </>
        )}

        <div style={{ gridColumn: '1 / -1' }}>
          <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Notes (optional)</label>
          <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any extra details" />
        </div>

        {form.type !== 'birthday' && form.type !== 'holiday' && (
          <>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Repeat</label>
              <select value={form.recurrence} onChange={e => setForm(f => ({ ...f, recurrence: e.target.value }))}>
                {RECURRENCE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            {form.recurrence !== 'none' && (
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Repeat until (optional)</label>
                <input type="date" value={form.recurrenceEnd} min={form.date} onChange={e => setForm(f => ({ ...f, recurrenceEnd: e.target.value }))} />
              </div>
            )}
          </>
        )}
      </div>

      {form.type === 'birthday' && (
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px', background: 'var(--bg-input)', padding: '8px 10px', borderRadius: 'var(--radius-sm)' }}>
          💡 Enter the actual date of birth  -  DanOS calculates age and shows it every year automatically.
        </p>
      )}
      {form.type === 'holiday' && (
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px', background: 'var(--bg-input)', padding: '8px 10px', borderRadius: 'var(--radius-sm)' }}>
          ✈️ Holiday spans will show across all days on the calendar.
        </p>
      )}
      {form.recurrence !== 'none' && form.type !== 'birthday' && form.type !== 'holiday' && (
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px', background: 'var(--bg-input)', padding: '8px 10px', borderRadius: 'var(--radius-sm)' }}>
          🔁 This will repeat {form.recurrence === 'weekly' ? 'every week' : form.recurrence === 'monthly' ? 'every month' : 'every year'} from the start date{form.recurrenceEnd ? ` until ${new Date(form.recurrenceEnd).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}` : ' (no end date  -  repeats indefinitely, 2 years shown at a time)'}.
        </p>
      )}

      <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
        <Btn onClick={onSave}>{isEdit ? 'Save changes' : 'Save event'}</Btn>
        <Btn variant="ghost" onClick={onCancel}>Cancel</Btn>
      </div>
    </Card>
  )
}

function UpcomingCard({ label, emoji, events, isBirthday }) {
  if (events.length === 0) return null
  return (
    <Card>
      <h3 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span>{emoji}</span> Upcoming {label}
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {events.map(e => {
          if (isBirthday) {
            const { daysUntil, turningAge } = getNextBirthday(e)
            return (
              <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ textAlign: 'center', minWidth: 36 }}>
                  <div style={{ fontSize: '15px', fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--danger)', lineHeight: 1 }}>{ordinal(turningAge)}</div>
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '13px', fontWeight: 500 }}>{e.title}</p>
                  <p style={{ fontSize: '11px', color: daysUntil <= 7 ? 'var(--danger)' : 'var(--text-muted)' }}>
                    {daysUntil === 0 ? 'Today! 🎉' : daysUntil === 1 ? 'Tomorrow!' : `In ${daysUntil} days`}
                  </p>
                </div>
              </div>
            )
          }
          const isHoliday = e.type === 'holiday'
          const d = new Date(e.date)
          const diff = Math.round((d - new Date()) / 86400000)
          return (
            <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ textAlign: 'center', minWidth: 34 }}>
                <div style={{ fontSize: '16px', fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--accent)', lineHeight: 1 }}>{d.getDate()}</div>
                <div style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{d.toLocaleString('default', { month: 'short' })}</div>
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '13px', fontWeight: 500 }}>{e.title}</p>
                <p style={{ fontSize: '11px', color: diff <= 3 ? 'var(--warning)' : 'var(--text-muted)' }}>
                  {isHoliday ? formatHolidayRange(e) : (diff === 0 ? 'Today' : diff === 1 ? 'Tomorrow' : `In ${diff} days`) + (e.time && !e.allDay ? ` · ${formatTime(e)}` : '')}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

export default function CalendarPage({ events, setEvents }) {
  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [selectedDate, setSelectedDate] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)

  const daysInMonth = getDaysInMonth(viewYear, viewMonth)
  const firstDay = getFirstDay(viewYear, viewMonth)
  const monthName = new Date(viewYear, viewMonth).toLocaleString('default', { month: 'long', year: 'numeric' })

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  function openNew() {
    setForm(EMPTY_FORM)
    setEditingId(null)
    setShowForm(true)
  }

  function openEdit(ev) {
    setForm({ title: ev.title, date: ev.date, dateTo: ev.dateTo || '', time: ev.time || '', allDay: ev.allDay ?? true, type: ev.type, notes: ev.notes || '', recurrence: ev.recurrence || 'none', recurrenceEnd: ev.recurrenceEnd || '' })
    setEditingId(ev.id)
    setShowForm(true)
  }

  function saveEvent() {
    if (!form.title || !form.date) return
    if (editingId) {
      setEvents(prev => prev.map(e => e.id === editingId ? { ...e, ...form } : e))
    } else {
      setEvents(prev => [...prev, { id: Date.now(), ...form }])
    }
    setForm(EMPTY_FORM)
    setEditingId(null)
    setShowForm(false)
  }

  function cancelForm() {
    setForm(EMPTY_FORM)
    setEditingId(null)
    setShowForm(false)
  }

  function deleteEvent(id) {
    setEvents(prev => prev.filter(e => e.id !== id))
  }

  // Build date → events map, handling recurring birthdays, holiday ranges, and custom recurrence
  const eventsByDate = useMemo(() => {
    const map = {}
    const addTo = (key, event) => {
      if (!map[key]) map[key] = []
      if (!map[key].find(x => x.id === event.id && x.occurrenceDate === key)) map[key].push({ ...event, occurrenceDate: key })
    }
    // Window for generating occurrences when there's no explicit end date
    const windowStart = new Date(today.getFullYear() - 1, 0, 1)
    const windowEnd   = new Date(today.getFullYear() + 2, 11, 31)

    events.forEach(e => {
      if (e.type === 'birthday') {
        const dob = new Date(e.date)
        for (let y = today.getFullYear() - 1; y <= today.getFullYear() + 2; y++) {
          const key = `${y}-${String(dob.getMonth()+1).padStart(2,'0')}-${String(dob.getDate()).padStart(2,'0')}`
          addTo(key, e)
        }
      } else if (e.type === 'holiday' && e.dateTo) {
        const from = new Date(e.date)
        const to = new Date(e.dateTo)
        for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
          const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
          addTo(key, e)
        }
      } else if (e.recurrence && e.recurrence !== 'none') {
        const start = new Date(e.date)
        const end = e.recurrenceEnd ? new Date(e.recurrenceEnd) : windowEnd
        let cursor = new Date(start)
        let safety = 0
        while (cursor <= end && cursor <= windowEnd && safety < 1000) {
          if (cursor >= windowStart) {
            const key = `${cursor.getFullYear()}-${String(cursor.getMonth()+1).padStart(2,'0')}-${String(cursor.getDate()).padStart(2,'0')}`
            addTo(key, e)
          }
          if (e.recurrence === 'weekly') cursor.setDate(cursor.getDate() + 7)
          else if (e.recurrence === 'monthly') cursor.setMonth(cursor.getMonth() + 1)
          else if (e.recurrence === 'yearly') cursor.setFullYear(cursor.getFullYear() + 1)
          safety++
        }
      } else {
        addTo(e.date, e)
      }
    })
    return map
  }, [events])

  const selectedDateStr = selectedDate
    ? `${viewYear}-${String(viewMonth+1).padStart(2,'0')}-${String(selectedDate).padStart(2,'0')}`
    : null
  const selectedEvents = selectedDateStr ? (eventsByDate[selectedDateStr] || []) : []

  const now = new Date(); now.setHours(0,0,0,0)
  const limit = new Date(now); limit.setDate(limit.getDate() + 60)

  function getNextOccurrence(e) {
    if (!e.recurrence || e.recurrence === 'none') return new Date(e.date)
    const start = new Date(e.date)
    const end = e.recurrenceEnd ? new Date(e.recurrenceEnd) : null
    let cursor = new Date(start)
    let safety = 0
    while (cursor < now && safety < 1000) {
      if (e.recurrence === 'weekly') cursor.setDate(cursor.getDate() + 7)
      else if (e.recurrence === 'monthly') cursor.setMonth(cursor.getMonth() + 1)
      else if (e.recurrence === 'yearly') cursor.setFullYear(cursor.getFullYear() + 1)
      safety++
    }
    if (end && cursor > end) return null
    return cursor
  }

  const upcomingByType = useMemo(() => {
    const result = {}
    EVENT_TYPES.forEach(t => { result[t.value] = [] })
    events.forEach(e => {
      if (e.type === 'birthday') {
        const { daysUntil } = getNextBirthday(e)
        if (daysUntil <= 60) result.birthday.push(e)
      } else if (e.recurrence && e.recurrence !== 'none') {
        const next = getNextOccurrence(e)
        if (next) {
          const d = new Date(next); d.setHours(0,0,0,0)
          if (d >= now && d <= limit) result[e.type]?.push({ ...e, date: d.toISOString().slice(0,10) })
        }
      } else {
        const d = new Date(e.date); d.setHours(0,0,0,0)
        if (d >= now && d <= limit) result[e.type]?.push(e)
      }
    })
    Object.keys(result).forEach(k => {
      if (k === 'birthday') result[k].sort((a,b) => getNextBirthday(a).daysUntil - getNextBirthday(b).daysUntil)
      else result[k].sort((a,b) => new Date(a.date) - new Date(b.date))
      result[k] = result[k].slice(0, 5)
    })
    return result
  }, [events])

  return (
    <div>
      <style>{DATE_INPUT_STYLE}</style>
      <PageHeader
        title="Calendar"
        subtitle="Events, birthdays, football, reminders"
        action={<Btn onClick={openNew}><Plus size={14} /> Add event</Btn>}
      />

      {showForm && (
        <EventForm form={form} setForm={setForm} onSave={saveEvent} onCancel={cancelForm} isEdit={!!editingId} />
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '16px', alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Monthly calendar grid */}
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <button onClick={prevMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '4px' }}><ChevronLeft size={18} /></button>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 600 }}>{monthName}</h2>
              <button onClick={nextMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '4px' }}><ChevronRight size={18} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '4px' }}>
              {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (
                <div key={d} style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, padding: '4px 0' }}>{d}</div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
              {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1
                const ds = `${viewYear}-${String(viewMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
                const dayEvents = eventsByDate[ds] || []
                const isToday = day === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear()
                const isSel = selectedDate === day
                // check if inside a holiday range
                const hasHoliday = dayEvents.some(e => e.type === 'holiday')
                return (
                  <div
                    key={day}
                    onClick={() => setSelectedDate(isSel ? null : day)}
                    style={{
                      minHeight: '54px', borderRadius: 'var(--radius-sm)', padding: '4px 3px', cursor: 'pointer',
                      background: isSel ? 'var(--accent-soft)' : hasHoliday ? 'rgba(167,139,250,0.12)' : isToday ? 'var(--bg-badge)' : 'transparent',
                      border: isToday ? '1px solid var(--accent-border)' : '1px solid transparent',
                    }}
                  >
                    <span style={{ fontSize: '12px', fontWeight: isToday ? 700 : 400, color: isToday ? 'var(--accent)' : 'var(--text-primary)', display: 'block', textAlign: 'center', lineHeight: 1.6 }}>{day}</span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1px', justifyContent: 'center' }}>
                      {[...new Map(dayEvents.map(e => [e.id, e])).values()].slice(0, 3).map((e) => (
                        <span key={e.id} title={e.title} style={{ fontSize: '10px', lineHeight: 1 }}>{typeInfo(e.type).emoji}</span>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>

          {/* Selected day detail */}
          {selectedDate && (
            <Card>
              <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>
                {new Date(viewYear, viewMonth, selectedDate).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
              </h3>
              {selectedEvents.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Nothing on this day.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {[...new Map(selectedEvents.map(e => [e.id, e])).values()].map(e => {
                    const info = typeInfo(e.type)
                    const isBday = e.type === 'birthday'
                    const isHol = e.type === 'holiday'
                    const ageInfo = isBday ? getNextBirthday(e) : null
                    return (
                      <div key={e.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '10px 12px', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', borderLeft: `3px solid ${info.color}` }}>
                        <span style={{ fontSize: '16px', flexShrink: 0 }}>{info.emoji}</span>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: '13px', fontWeight: 500 }}>
                            {isBday ? birthdayDisplayTitle(e) : e.title}
                          </p>
                          {isBday && ageInfo && <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>Turning {ordinal(ageInfo.turningAge)}</p>}
                          {isHol && <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>{formatHolidayRange(e)}</p>}
                          {!isBday && !isHol && e.allDay && <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>All day</p>}
                          {!isBday && !isHol && !e.allDay && e.time && <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>⏰ {formatTime(e)}</p>}
                          {e.recurrence && e.recurrence !== 'none' && <p style={{ fontSize: '11px', color: 'var(--accent)', marginTop: '2px' }}>🔁 Repeats {e.recurrence}</p>}
                          {e.notes && <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>{e.notes}</p>}
                        </div>
                        <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                          <button onClick={() => openEdit(e)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px' }} title="Edit"><Pencil size={13} /></button>
                          <button onClick={() => deleteEvent(e.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px' }} title="Delete"><Trash2 size={13} /></button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </Card>
          )}

          {/* Birthdays list  -  sorted by day/month, not year */}
          {(() => {
            const birthdays = [...events].filter(e => e.type === 'birthday')
              .sort((a, b) => {
                const da = new Date(a.date), db = new Date(b.date)
                const aKey = da.getMonth() * 100 + da.getDate()
                const bKey = db.getMonth() * 100 + db.getDate()
                return aKey - bKey
              })
            return (
              <Card>
                <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>🎂 Birthdays ({birthdays.length})</h3>
                {birthdays.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No birthdays saved yet.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '280px', overflowY: 'auto' }}>
                    {birthdays.map(e => {
                      const dob = new Date(e.date)
                      const { turningAge, daysUntil } = getNextBirthday(e)
                      return (
                        <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)' }}>
                          <span style={{ fontSize: '14px', flexShrink: 0 }}>🎂</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: '12px', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {birthdayDisplayTitle(e)}
                            </p>
                            <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              {dob.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                              {' · '}
                              <span style={{ color: daysUntil <= 14 ? 'var(--danger)' : 'var(--text-muted)' }}>
                                {daysUntil === 0 ? 'Today! 🎉' : daysUntil === 1 ? 'Tomorrow!' : `${daysUntil}d away`}
                              </span>
                            </p>
                          </div>
                          <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                            <button onClick={() => openEdit(e)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }} title="Edit"><Pencil size={12} /></button>
                            <button onClick={() => deleteEvent(e.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }} title="Delete"><Trash2 size={12} /></button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </Card>
            )
          })()}

          {/* All other events  -  sorted by date ascending */}
          {(() => {
            const nonBirthdays = [...events]
              .filter(e => e.type !== 'birthday')
              .sort((a, b) => new Date(a.date) - new Date(b.date))
            return (
              <Card>
                <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>📅 Events ({nonBirthdays.length})</h3>
                {nonBirthdays.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No events yet. Hit "Add event" to start!</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '280px', overflowY: 'auto' }}>
                    {nonBirthdays.map(e => {
                      const info = typeInfo(e.type)
                      const isHol = e.type === 'holiday'
                      return (
                        <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)' }}>
                          <span style={{ fontSize: '14px', flexShrink: 0 }}>{info.emoji}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: '12px', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.title}{e.recurrence && e.recurrence !== 'none' ? ' 🔁' : ''}</p>
                            <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              {isHol
                                ? formatHolidayRange(e)
                                : new Date(e.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) + (e.allDay ? ' · All day' : e.time ? ` · ${formatTime(e)}` : '')}
                            </p>
                          </div>
                          <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                            <button onClick={() => openEdit(e)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }} title="Edit"><Pencil size={12} /></button>
                            <button onClick={() => deleteEvent(e.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }} title="Delete"><Trash2 size={12} /></button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </Card>
            )
          })()}
        </div>

        {/* Right: upcoming by type */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <UpcomingCard label="Birthdays" emoji="🎂" events={upcomingByType.birthday} isBirthday={true} />
          <UpcomingCard label="Football" emoji="⚽" events={upcomingByType.football} />
          <UpcomingCard label="Reminders" emoji="🔔" events={upcomingByType.reminder} />
          <UpcomingCard label="Holidays" emoji="✈️" events={upcomingByType.holiday} />
          <UpcomingCard label="Workouts" emoji="🏋️" events={upcomingByType.workout} />
          <UpcomingCard label="Events" emoji="📌" events={upcomingByType.event} />
        </div>
      </div>
    </div>
  )
}
