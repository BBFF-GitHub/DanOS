import React, { useState, useMemo, useEffect } from 'react'
import Card from '../components/Card'
import PageHeader from '../components/PageHeader'
import Btn from '../components/Btn'
import { Plus, Trash2, Pencil, ExternalLink, X, Activity, Flame, Clock, TrendingUp } from 'lucide-react'

const ACTIVITY_TYPES = [
  { value: 'run', label: 'Run', emoji: '🏃', color: '#f97316' },
  { value: 'cycle', label: 'Cycle', emoji: '🚴', color: '#0ea5e9' },
  { value: 'walk', label: 'Walk', emoji: '🚶', color: '#22c55e' },
  { value: 'gym', label: 'Gym', emoji: '🏋️', color: '#a78bfa' },
  { value: 'swim', label: 'Swim', emoji: '🏊', color: '#06b6d4' },
  { value: 'hike', label: 'Hike', emoji: '🥾', color: '#84cc16' },
  { value: 'yoga', label: 'Yoga', emoji: '🧘', color: '#ec4899' },
  { value: 'hiit', label: 'HIIT', emoji: '⚡', color: '#ef4444' },
  { value: 'other', label: 'Other', emoji: '💪', color: '#6b7280' },
]

const EMPTY_FORM = { type: 'run', date: new Date().toISOString().slice(0, 10), duration: '', distance: '', distanceUnit: 'km', calories: '', notes: '', effort: 3 }

function typeInfo(val) {
  return ACTIVITY_TYPES.find(t => t.value === val) || ACTIVITY_TYPES[0]
}

function formatDuration(mins) {
  if (!mins) return ''
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function getWeekStart(date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = (day === 0 ? -6 : 1) - day
  d.setDate(d.getDate() + diff)
  d.setHours(0,0,0,0)
  return d
}

const STRAVA_BASE = 'http://localhost:5858'

function StravaSync({ activities, setActivities }) {
  const [status,      setStatus]      = useState(null)   // null | {connected, athlete}
  const [checking,    setChecking]    = useState(false)
  const [syncing,     setSyncing]     = useState(false)
  const [syncMsg,     setSyncMsg]     = useState('')
  const [showSetup,   setShowSetup]   = useState(false)
  const [clientId,    setClientId]    = useState('')
  const [clientSecret,setClientSecret]= useState('')
  const [savingCreds, setSavingCreds] = useState(false)

  async function checkStatus() {
    setChecking(true)
    try {
      const r = await fetch(`${STRAVA_BASE}/status`)
      const d = await r.json()
      setStatus(d)
    } catch {
      setStatus(null) // server not running
    }
    setChecking(false)
  }

  // Check on mount
  useEffect(()=>{ checkStatus() },[])

  async function saveCredentials() {
    setSavingCreds(true)
    try {
      await fetch(`${STRAVA_BASE}/credentials`, {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ client_id: clientId, client_secret: clientSecret })
      })
      setSyncMsg('Credentials saved. Now click Connect Strava.')
    } catch {
      setSyncMsg('Could not reach strava_server.py  -  is it running?')
    }
    setSavingCreds(false)
  }

  async function connectStrava() {
    try {
      const r = await fetch(`${STRAVA_BASE}/auth-url?client_id=${encodeURIComponent(clientId)}`)
      const d = await r.json()
      if (d.url) {
        window.open(d.url, '_blank', 'width=600,height=700')
        setSyncMsg('Complete authorisation in the browser window, then click Check connection.')
      }
    } catch {
      setSyncMsg('Could not reach strava_server.py  -  make sure it\'s running: python strava_server.py')
    }
  }

  async function syncActivities() {
    setSyncing(true)
    setSyncMsg('Fetching activities from Strava...')
    try {
      // Find the most recent Strava activity date to only fetch new ones
      const stravaActivities = activities.filter(a => a.source === 'strava')
      let afterTs = ''
      if (stravaActivities.length > 0) {
        const latest = stravaActivities.reduce((a,b) => a.date > b.date ? a : b)
        afterTs = Math.floor(new Date(latest.date).getTime() / 1000)
      }

      const url = afterTs
        ? `${STRAVA_BASE}/activities?per_page=200&after=${afterTs}`
        : `${STRAVA_BASE}/activities?per_page=200`

      let page = 1
      let allNew = []
      while (true) {
        const r = await fetch(`${url}&page=${page}`)
        const d = await r.json()
        if (d.error) { setSyncMsg(`Error: ${d.error}`); break }
        if (!d.activities?.length) break
        allNew = [...allNew, ...d.activities]
        if (d.activities.length < 200) break
        page++
      }

      if (allNew.length === 0) {
        setSyncMsg('Already up to date  -  no new activities found.')
        setSyncing(false)
        return
      }

      // Merge: add new, skip duplicates (by stravaId)
      setActivities(prev => {
        const existing = new Set(prev.filter(a=>a.stravaId).map(a=>a.stravaId))
        const toAdd = allNew.filter(a => !existing.has(a.stravaId))
        const merged = [...prev, ...toAdd].sort((a,b) => b.date.localeCompare(a.date))
        setSyncMsg(`✅ Synced ${toAdd.length} new activities (${allNew.length - toAdd.length} already existed).`)
        return merged
      })
    } catch (e) {
      setSyncMsg(`Sync failed: ${e.message}`)
    }
    setSyncing(false)
  }

  async function disconnect() {
    await fetch(`${STRAVA_BASE}/disconnect`).catch(()=>{})
    setStatus({ connected: false })
    setSyncMsg('Disconnected from Strava.')
  }

  const serverRunning = status !== null
  const connected     = status?.connected

  return (
    <Card style={{ marginBottom: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: 36, height: 36, borderRadius: '8px', background: '#fc4c02', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>🚴</div>
          <div>
            <p style={{ fontSize: '14px', fontWeight: 600 }}>Strava Sync</p>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              {!serverRunning ? '⚠️ strava_server.py not running  -  run: python strava_server.py'
                : connected ? `✅ Connected${status.athlete?.name ? ` as ${status.athlete.name}` : ''}`
                : '○ Not connected'}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          {serverRunning && !connected && (
            <Btn variant="secondary" size="sm" onClick={() => setShowSetup(s => !s)}>
              ⚙️ Setup
            </Btn>
          )}
          {serverRunning && !connected && clientId && (
            <Btn size="sm" onClick={connectStrava} style={{ background: '#fc4c02', borderColor: '#fc4c02' }}>
              Connect Strava
            </Btn>
          )}
          {serverRunning && !connected && (
            <Btn variant="ghost" size="sm" onClick={checkStatus}>
              {checking ? 'Checking...' : 'Check connection'}
            </Btn>
          )}
          {connected && (
            <>
              <Btn size="sm" onClick={syncActivities} disabled={syncing} style={{ background: '#fc4c02', borderColor: '#fc4c02' }}>
                {syncing ? '⟳ Syncing...' : '⟳ Sync now'}
              </Btn>
              <Btn variant="ghost" size="sm" onClick={disconnect}>Disconnect</Btn>
            </>
          )}
          {!serverRunning && (
            <Btn variant="ghost" size="sm" onClick={checkStatus}>{checking ? 'Checking...' : 'Retry'}</Btn>
          )}
        </div>
      </div>

      {/* Setup panel */}
      {showSetup && !connected && (
        <div style={{ marginTop: '14px', padding: '14px', background: 'var(--bg-input)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
          <p style={{ fontSize: '13px', fontWeight: 600, marginBottom: '10px' }}>Connect your Strava account</p>
          <ol style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: '12px', paddingLeft: '16px' }}>
            <li>Go to <a href="https://www.strava.com/settings/api" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>strava.com/settings/api</a> and create an app</li>
            <li>Set <strong>Authorization Callback Domain</strong> to: <code style={{ background: 'var(--bg-badge)', padding: '1px 5px', borderRadius: 3 }}>localhost</code></li>
            <li>Copy your Client ID and Client Secret below</li>
            <li>Click Save, then Connect Strava</li>
          </ol>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>Client ID</label>
              <input value={clientId} onChange={e => setClientId(e.target.value)} placeholder="12345" style={{ width: 100 }} />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>Client Secret</label>
              <input value={clientSecret} onChange={e => setClientSecret(e.target.value)} placeholder="abc123..." type="password" style={{ width: 220 }} />
            </div>
            <Btn size="sm" onClick={saveCredentials} disabled={savingCreds || !clientId || !clientSecret}>
              {savingCreds ? 'Saving...' : 'Save credentials'}
            </Btn>
          </div>
        </div>
      )}

      {syncMsg && (
        <p style={{ fontSize: '12px', color: syncMsg.startsWith('✅') ? 'var(--success)' : syncMsg.startsWith('⚠️') || syncMsg.includes('failed') || syncMsg.includes('Error') ? 'var(--danger)' : 'var(--text-secondary)', marginTop: '10px' }}>
          {syncMsg}
        </p>
      )}
    </Card>
  )
}

export default function FitnessPage({ fitnessData, setFitnessData }) {
  const activities = fitnessData.activities || []
  function setActivities(fn) { setFitnessData(prev => ({ ...prev, activities: typeof fn === 'function' ? fn(prev.activities || []) : fn })) }

  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [filterType, setFilterType] = useState('all')
  const [filterRange, setFilterRange] = useState('all') // all | week | month | year
  const [tab, setTab] = useState('log') // log | stats
  const [logPage, setLogPage] = useState(1)
  const LOG_PAGE_SIZE = 20 // 2 cols × 10 rows

  function openNew() { setForm({ ...EMPTY_FORM, date: new Date().toISOString().slice(0,10) }); setEditId(null); setShowForm(true) }
  function openEdit(a) { setForm({ type: a.type, date: a.date, duration: a.duration || '', distance: a.distance || '', distanceUnit: a.distanceUnit || 'km', calories: a.calories || '', notes: a.notes || '', effort: a.effort || 3 }); setEditId(a.id); setShowForm(true) }

  function save() {
    const entry = { ...form, duration: form.duration ? parseInt(form.duration) : null, distance: form.distance ? parseFloat(form.distance) : null, calories: form.calories ? parseInt(form.calories) : null }
    if (editId) {
      setActivities(prev => prev.map(a => a.id === editId ? { ...a, ...entry } : a))
    } else {
      setActivities(prev => [...prev, { id: Date.now(), ...entry }])
    }
    setForm(EMPTY_FORM); setEditId(null); setShowForm(false)
  }

  function deleteActivity(id) { setActivities(prev => prev.filter(a => a.id !== id)) }

  // Filter
  const filtered = useMemo(() => {
    const now = new Date()
    return activities.filter(a => {
      if (filterType !== 'all' && a.type !== filterType) return false
      if (filterRange === 'week') {
        const ws = getWeekStart(now)
        return new Date(a.date) >= ws
      }
      if (filterRange === 'month') {
        return new Date(a.date).getMonth() === now.getMonth() && new Date(a.date).getFullYear() === now.getFullYear()
      }
      if (filterRange === 'year') {
        return new Date(a.date).getFullYear() === now.getFullYear()
      }
      return true
    }).sort((a,b) => new Date(b.date) - new Date(a.date))
  }, [activities, filterType, filterRange])

  // Reset to page 1 when filters change
  useEffect(()=>{ setLogPage(1) }, [filterType, filterRange])

  // Stats
  const stats = useMemo(() => {
    const src = filtered
    if (!src.length) return null
    const totalDuration = src.reduce((a, x) => a + (x.duration || 0), 0)
    const totalDistance = src.reduce((a, x) => a + (x.distance || 0), 0)
    const totalCals = src.reduce((a, x) => a + (x.calories || 0), 0)
    const byType = ACTIVITY_TYPES.map(t => ({ ...t, count: src.filter(a => a.type === t.value).length })).filter(t => t.count > 0).sort((a,b) => b.count - a.count)
    const runs = src.filter(a => a.type === 'run' && a.distance)
    const longestRun = runs.length ? Math.max(...runs.map(a => a.distance)) : null
    const streak = calcStreak(activities)
    return { count: src.length, totalDuration, totalDistance: Math.round(totalDistance * 10)/10, totalCals, byType, longestRun, streak }
  }, [filtered, activities])

  function calcStreak(acts) {
    if (!acts.length) return 0
    const dates = [...new Set(acts.map(a => a.date))].sort().reverse()
    if (!dates.length) return 0
    let streak = 0
    let check = new Date(); check.setHours(0,0,0,0)
    for (const d of dates) {
      const dd = new Date(d); dd.setHours(0,0,0,0)
      const diff = Math.round((check - dd) / 86400000)
      if (diff <= 1) { streak++; check = dd } else break
    }
    return streak
  }

  const effortLabels = ['','Easy','Light','Moderate','Hard','Max']
  const effortColors = ['','var(--success)','#84cc16','var(--warning)','#f97316','var(--danger)']

  return (
    <div>
      <PageHeader
        title="💪 Fitness"
        subtitle="Activity log, stats, and Strava sync"
        action={<Btn onClick={openNew}><Plus size={14} /> Log activity</Btn>}
      />

      {/* Strava sync card */}
      <StravaSync activities={activities} setActivities={setActivities} />

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '16px' }}>
        <Btn variant={tab === 'log' ? 'primary' : 'secondary'} size="sm" onClick={() => setTab('log')}>Activity log</Btn>
        <Btn variant={tab === 'stats' ? 'primary' : 'secondary'} size="sm" onClick={() => setTab('stats')}>Stats</Btn>
      </div>

      {/* Add/edit form */}
      {showForm && (
        <Card style={{ marginBottom: '20px', border: '1px solid var(--accent-border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600 }}>{editId ? 'Edit activity' : 'Log activity'}</h3>
            <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={16} /></button>
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
            {ACTIVITY_TYPES.map(t => (
              <button key={t.value} onClick={() => setForm(f => ({...f, type: t.value}))} style={{ padding: '5px 12px', borderRadius: '20px', border: form.type === t.value ? `1px solid ${t.color}` : '1px solid var(--border)', background: form.type === t.value ? t.color + '22' : 'var(--bg-input)', color: form.type === t.value ? t.color : 'var(--text-secondary)', fontSize: '12px', cursor: 'pointer' }}>
                {t.emoji} {t.label}
              </button>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
            <div><label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>Date</label><input type="date" value={form.date} onChange={e => setForm(f => ({...f, date: e.target.value}))} /></div>
            <div><label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>Duration (mins)</label><input type="number" value={form.duration} onChange={e => setForm(f => ({...f, duration: e.target.value}))} placeholder="45" /></div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <div style={{ flex: 1 }}><label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>Distance</label><input type="number" step="0.01" value={form.distance} onChange={e => setForm(f => ({...f, distance: e.target.value}))} placeholder="5.0" /></div>
              <div style={{ width: 64 }}><label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>Unit</label>
                <select value={form.distanceUnit} onChange={e => setForm(f => ({...f, distanceUnit: e.target.value}))}>
                  <option value="km">km</option>
                  <option value="mi">mi</option>
                </select>
              </div>
            </div>
            <div><label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>Calories</label><input type="number" value={form.calories} onChange={e => setForm(f => ({...f, calories: e.target.value}))} placeholder="350" /></div>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Effort: <span style={{ color: effortColors[form.effort], fontWeight: 600 }}>{effortLabels[form.effort]}</span></label>
              <input type="range" min="1" max="5" value={form.effort} onChange={e => setForm(f => ({...f, effort: parseInt(e.target.value)}))} style={{ width: '100%', accentColor: effortColors[form.effort] }} />
            </div>
            <div style={{ gridColumn: '1/-1' }}><label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>Notes</label><input value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} placeholder="How did it go?" /></div>
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
            <Btn onClick={save}>{editId ? 'Save changes' : 'Log it'}</Btn>
            <Btn variant="ghost" onClick={() => setShowForm(false)}>Cancel</Btn>
          </div>
        </Card>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '4px' }}>
          {[['all','All time'],['week','This week'],['month','This month'],['year','This year']].map(([val,lb]) => (
            <button key={val} onClick={() => setFilterRange(val)} style={{ padding: '4px 10px', borderRadius: '20px', border: filterRange === val ? '1px solid var(--accent)' : '1px solid var(--border)', background: filterRange === val ? 'var(--accent-soft)' : 'var(--bg-card)', color: filterRange === val ? 'var(--accent)' : 'var(--text-secondary)', fontSize: '12px', cursor: 'pointer' }}>{lb}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '4px', marginLeft: '4px' }}>
          <button onClick={() => setFilterType('all')} style={{ padding: '4px 10px', borderRadius: '20px', border: filterType === 'all' ? '1px solid var(--accent)' : '1px solid var(--border)', background: filterType === 'all' ? 'var(--accent-soft)' : 'var(--bg-card)', color: filterType === 'all' ? 'var(--accent)' : 'var(--text-secondary)', fontSize: '12px', cursor: 'pointer' }}>All types</button>
          {ACTIVITY_TYPES.filter(t => activities.some(a => a.type === t.value)).map(t => (
            <button key={t.value} onClick={() => setFilterType(t.value)} style={{ padding: '4px 10px', borderRadius: '20px', border: filterType === t.value ? `1px solid ${t.color}` : '1px solid var(--border)', background: filterType === t.value ? t.color + '22' : 'var(--bg-card)', color: filterType === t.value ? t.color : 'var(--text-secondary)', fontSize: '12px', cursor: 'pointer' }}>{t.emoji} {t.label}</button>
          ))}
        </div>
      </div>

      {tab === 'log' && (
        <>
          {filtered.length === 0 ? (
            <Card style={{ textAlign: 'center', padding: '40px' }}>
              <p style={{ fontSize: '28px', marginBottom: '10px' }}>🏃</p>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '6px' }}>No activities logged yet.</p>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Hit "Log activity" to start tracking!</p>
            </Card>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {filtered.slice((logPage-1)*LOG_PAGE_SIZE, logPage*LOG_PAGE_SIZE).map(a => {
                  const ti = typeInfo(a.type)
                  const d = new Date(a.date)
                  return (
                    <Card key={a.id} style={{ padding: '12px 14px', borderLeft: `3px solid ${ti.color}` }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: 36, height: 36, borderRadius: '8px', background: ti.color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>{ti.emoji}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '2px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 600 }}>{ti.label}</span>
                            {a.effort && <span style={{ fontSize: '10px', padding: '1px 5px', borderRadius: '4px', background: effortColors[a.effort] + '22', color: effortColors[a.effort], fontWeight: 600 }}>{effortLabels[a.effort]}</span>}
                          </div>
                          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '3px' }}>{d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</p>
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {a.duration && <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>⏱ {formatDuration(a.duration)}</span>}
                            {a.distance && <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>📍 {a.distance}{a.distanceUnit || 'km'}</span>}
                            {a.calories && <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>🔥 {a.calories} kcal</span>}
                          </div>
                          {a.notes && <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '2px' }}>{a.notes}</p>}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flexShrink: 0 }}>
                          <button onClick={() => openEdit(a)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><Pencil size={12} /></button>
                          <button onClick={() => deleteActivity(a.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><Trash2 size={12} /></button>
                        </div>
                      </div>
                    </Card>
                  )
                })}
              </div>
              {filtered.length > LOG_PAGE_SIZE && (
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center', marginTop: '16px' }}>
                  <button onClick={() => setLogPage(p => Math.max(1, p-1))} disabled={logPage===1}
                    style={{ padding: '6px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'transparent', cursor: logPage===1?'not-allowed':'pointer', color: logPage===1?'var(--text-muted)':'var(--text-secondary)', fontSize: '13px' }}>← Prev</button>
                  <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Page {logPage} of {Math.ceil(filtered.length/LOG_PAGE_SIZE)} · {filtered.length} activities</span>
                  <button onClick={() => setLogPage(p => Math.min(Math.ceil(filtered.length/LOG_PAGE_SIZE), p+1))} disabled={logPage>=Math.ceil(filtered.length/LOG_PAGE_SIZE)}
                    style={{ padding: '6px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'transparent', cursor: logPage>=Math.ceil(filtered.length/LOG_PAGE_SIZE)?'not-allowed':'pointer', color: logPage>=Math.ceil(filtered.length/LOG_PAGE_SIZE)?'var(--text-muted)':'var(--text-secondary)', fontSize: '13px' }}>Next →</button>
                </div>
              )}
            </>
          )}
        </>
      )}

      {tab === 'stats' && (
        <>
          {!stats ? (
            <Card style={{ textAlign: 'center', padding: '40px' }}>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>No activities to analyse yet.</p>
            </Card>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '20px' }}>
                {[
                  ['🏃', 'Activities', stats.count, 'var(--accent)'],
                  ['⏱', 'Total time', formatDuration(stats.totalDuration) || ' - ', 'var(--text-primary)'],
                  [stats.totalDistance > 0 ? '📍' : null, 'Distance', stats.totalDistance > 0 ? `${stats.totalDistance}km` : null, 'var(--success)'],
                  [stats.totalCals > 0 ? '🔥' : null, 'Calories', stats.totalCals > 0 ? `${stats.totalCals.toLocaleString()}` : null, 'var(--warning)'],
                  ['🔥', 'Streak', `${stats.streak} day${stats.streak !== 1 ? 's' : ''}`, 'var(--danger)'],
                  [stats.longestRun ? '📍' : null, 'Longest run', stats.longestRun ? `${stats.longestRun}km` : null, '#f97316'],
                ].filter(([em]) => em).map(([em, label, val, color]) => (
                  <Card key={label} style={{ padding: '16px', textAlign: 'center' }}>
                    <p style={{ fontSize: '22px', marginBottom: '4px' }}>{em}</p>
                    <p style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 700, color, lineHeight: 1 }}>{val}</p>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>{label}</p>
                  </Card>
                ))}
              </div>

              <Card style={{ marginBottom: '16px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>Activity breakdown</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {stats.byType.map(t => (
                    <div key={t.value} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '16px', minWidth: 24 }}>{t.emoji}</span>
                      <span style={{ fontSize: '13px', flex: 1 }}>{t.label}</span>
                      <div style={{ width: 120, height: 8, background: 'var(--bg-badge)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${(t.count / stats.count) * 100}%`, background: t.color, borderRadius: '4px' }} />
                      </div>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)', minWidth: 20, textAlign: 'right' }}>{t.count}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  )
}
