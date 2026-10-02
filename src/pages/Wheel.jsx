import React, { useState, useRef, useEffect, useMemo } from 'react'
import Card from '../components/Card'
import PageHeader from '../components/PageHeader'
import Btn from '../components/Btn'
import { Plus, Trash2, Pencil, Filter, Settings, ExternalLink, Link2 } from 'lucide-react'

const DEFAULT_CATEGORIES = [
  { id: 1, name: 'Workouts & Gym',   emoji: '🏋️', color: '#f97316', entries: ['Chest & Triceps','Back & Biceps','Legs & Glutes','Shoulders & Core','Full Body HIIT','Run  -  5K','Run  -  10K','Cycling session','Yoga / Stretch','Rest day (active)'] },
  { id: 2, name: 'House Reno',        emoji: '🏠', color: '#f59e0b', entries: ['Living room touch-ups','Garden tidy','Kitchen deep clean','Garage sort-out','Painting / decorating','Fix something broken','Declutter a room','DIY project'] },
  { id: 3, name: 'Coaching & Quals',  emoji: '🎓', color: '#a78bfa', entries: ['Study session','Watch coaching webinar','Review course notes','Practice assessment','Portfolio work','Mentor catch-up','Read coaching book'] },
  { id: 4, name: 'PS Sim / F1 Racing',emoji: '🏎️', color: '#ef4444', entries: ['Career mode race','Time trial  -  beat PB','Online ranked race','Setup tuning session','Watch replay & analyse','Custom championship race'] },
  { id: 5, name: 'PlayStation',        emoji: '🎮', color: '#6b84f8', entries: ['Continue current game','Trophy hunting session','Try a new game','Play something relaxing','Co-op with a friend','Platinum run'] },
  { id: 6, name: 'EAFC',               emoji: '⚽', color: '#22c55e', entries: ['Ultimate Team session','Career mode match','Squad Battles grind','Division Rivals','Volta Football','Pro Clubs with mates'] },
  { id: 7, name: 'F1 Career Mode',     emoji: '🏁', color: '#e11d48', entries: ['Race weekend','Sprint race weekend','Testing & development','Review standings','Update career tracker'] },
  { id: 8, name: 'BBFF Fantasy F1',    emoji: '🏆', color: '#0ea5e9', entries: ['Check standings','Plan next race picks','Review last race points','Check trade deadline','Scout driver stats'] },
  { id: 9, name: 'Chill & Social',     emoji: '😎', color: '#34d974', entries: ['Watch a film','Catch up with a mate','Go for a walk','Cook something new','Read a book','Watch football','Listen to a podcast','Do absolutely nothing'] },
]


// ── Page options for redirect configuration ─────────────────────
// Per-entry rules: { entry: 'exact text', page: 'pageid', params: {} }
// params for f1sim: { year: 2026 }
// params for workout: { group: 'Chest' }


const PAGE_OPTIONS = [
  { id: '', label: ' -  No redirect  - ' },
  { id: 'f1sim',       label: '🏎️ F1 Sim',          hasYear: true },
  { id: 'workout',     label: '🏋️ Workout Guide',    hasGroup: true },
  { id: 'fitness',     label: '💪 Fitness' },
  { id: 'reno',        label: '🏠 House Reno' },
  { id: 'coaching',    label: '🎓 Coaching & Quals' },
  { id: 'playstation', label: '🎮 PlayStation' },
  { id: 'projects',    label: '📁 My Projects' },
  { id: '92club',      label: '⚽ 92 Club' },
  { id: 'quiz',        label: '🧠 Knowledge Quiz' },
  { id: 'finance',     label: '💷 Finance' },
  { id: 'ideas',       label: '💡 Ideas' },
  { id: 'calendar',    label: '📅 Calendar' },
  { id: 'shopping',    label: '🛒 Shopping' },
  { id: 'focus',       label: '⏱️ Focus Timer' },
  { id: 'journal',     label: '📓 Journal' },
  { id: 'habits',      label: '🔥 Momentum' },
  { id: 'models',      label: '🏎️ F1 Models' },
  { id: 'dashboard',   label: '📊 Dashboard' },
]
const PAGE_LABELS = Object.fromEntries(PAGE_OPTIONS.filter(p=>p.id).map(p=>[p.id, p.label]))

const WORKOUT_GROUPS = ['Biceps','Chest','Back','Shoulders','Legs','Glutes','Triceps','Core','Neck','Chin']

function resolveRedirect(text, entryRules) {
  // Exact entry match first
  const exact = entryRules[text]
  if (exact?.page) return exact
  return null
}

// Common emoji suggestions for the picker
const EMOJI_SUGGESTIONS = [
  '🎯','🎲','🎪','🎨','🎭','🎬','🎤','🎵','🎸','🎹',
  '⚽','🏀','🏈','🎾','🏋️','🏃','🚴','🧘','🏊','⛷️',
  '🏠','🔧','🔨','🪛','🏗️','🌿','🌱','🪴','🌸','🌺',
  '🎓','📚','✏️','📝','💡','🔬','🧪','🎓','📖','🏆',
  '🎮','🕹️','👾','🤖','💻','📱','🖥️','⌨️','🖱️','📡',
  '🏎️','🚗','✈️','🚀','🛸','⚓','🚂','🏍️','🛺','🛶',
  '😎','😄','🥳','🤩','💪','👊','🙌','✌️','👍','❤️',
  '🍕','🍔','🌮','🍜','🍣','☕','🧃','🍺','🥗','🍰',
]

function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = (angleDeg - 90) * Math.PI / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}
function buildSlicePath(cx, cy, r, startAngle, endAngle) {
  const s = polarToCartesian(cx, cy, r, startAngle)
  const e = polarToCartesian(cx, cy, r, endAngle)
  const largeArc = endAngle - startAngle > 180 ? 1 : 0
  return `M${cx},${cy} L${s.x},${s.y} A${r},${r},0,${largeArc},1,${e.x},${e.y} Z`
}

// Assign a unique color per entry from a deterministic palette
const ENTRY_PALETTE = ['#f97316','#f59e0b','#22c55e','#34d974','#0ea5e9','#6b84f8','#a78bfa','#ef4444','#e11d48','#ff6b9d','#14b8a6','#84cc16','#ec4899','#8b5cf6','#06b6d4','#10b981']

function SpinWheel({ entries, onNavigate, entryRules, onResult }) {
  const [rotation, setRotation] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [landed, setLanded] = useState(null)
  const animRef = useRef(null)
  const currentRotRef = useRef(0)

  // Use a larger wheel
  const SIZE = 560
  const cx = SIZE / 2, cy = SIZE / 2, r = SIZE / 2 - 10

  const slices = useMemo(() => {
    if (!entries.length) return []
    const angle = 360 / entries.length
    return entries.map((e, i) => ({
      text: e,
      startAngle: i * angle,
      endAngle: (i + 1) * angle,
      midAngle: i * angle + angle / 2,
      color: ENTRY_PALETTE[i % ENTRY_PALETTE.length],
    }))
  }, [entries])

  function spin() {
    if (spinning || entries.length < 2) return
    setLanded(null)
    setSpinning(true)

    // Pick winner first, compute rotation to land precisely on it
    const n = entries.length
    const winnerIdx = Math.floor(Math.random() * n)
    const sliceAngle = 360 / n

    // Centre of the winning segment in the wheel's own frame (before rotation)
    const centreInWheel = winnerIdx * sliceAngle + sliceAngle / 2
    // Current rotation mod 360
    const currentMod = ((currentRotRef.current % 360) + 360) % 360
    // How much additional rotation brings that centre to the top (0°)
    let delta = ((-centreInWheel - currentMod + 360) % 360)
    if (delta < 30) delta += 360  // always spin at least a bit on final step

    const extraSpins = (5 + Math.floor(Math.random() * 5)) * 360
    const totalRot = currentRotRef.current + extraSpins + delta

    const duration = 4000 + Math.random() * 1500
    const start = performance.now()
    const startRot = currentRotRef.current

    function animate(now) {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = startRot + (totalRot - startRot) * eased
      currentRotRef.current = current
      setRotation(current)
      if (progress < 1) {
        animRef.current = requestAnimationFrame(animate)
      } else {
        setSpinning(false)
        // Use the pre-determined winner  -  no re-derivation from angle
        setLanded(entries[winnerIdx])
        if (onResult) onResult(entries[winnerIdx])
      }
    }
    animRef.current = requestAnimationFrame(animate)
  }

  useEffect(() => () => cancelAnimationFrame(animRef.current), [])

  if (entries.length === 0) return (
    <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
      <p style={{ fontSize: '40px', marginBottom: '12px' }}>🎡</p>
      <p>No entries in this filter.</p>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
      <div style={{ position: 'relative', width: SIZE, height: SIZE }}>
        {/* Pointer */}
        <div style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', zIndex: 10, fontSize: '34px', filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.4))', lineHeight: 1 }}>▼</div>
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          {/* Outer ring shadow */}
          <circle cx={cx} cy={cy} r={r + 4} fill="none" stroke="rgba(0,0,0,0.15)" strokeWidth="8" />
          <g transform={`rotate(${rotation}, ${cx}, ${cy})`}>
            {slices.map((s, i) => {
              const mid = polarToCartesian(cx, cy, r * 0.65, s.midAngle)
              const labelAngle = s.midAngle - 90
              const maxChars = entries.length > 14 ? 11 : entries.length > 9 ? 14 : 18
              const label = s.text.length > maxChars ? s.text.slice(0, maxChars - 1) + '…' : s.text
              const fontSize = entries.length > 16 ? 10 : entries.length > 10 ? 12 : entries.length > 6 ? 13 : 15
              return (
                <g key={i}>
                  <path d={buildSlicePath(cx, cy, r, s.startAngle, s.endAngle)} fill={s.color} stroke="var(--bg-card)" strokeWidth="2" />
                  <text
                    x={mid.x} y={mid.y}
                    textAnchor="middle" dominantBaseline="middle"
                    transform={`rotate(${labelAngle}, ${mid.x}, ${mid.y})`}
                    fill="white" fontSize={fontSize}
                    fontWeight="700" fontFamily="Inter, sans-serif"
                    style={{ pointerEvents: 'none', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.6))' }}
                  >{label}</text>
                </g>
              )
            })}
            {/* Centre hub */}
            <circle cx={cx} cy={cy} r={22} fill="var(--bg-card)" stroke="var(--border-strong)" strokeWidth="3" />
          </g>
        </svg>
      </div>

      <button
        onClick={spin}
        disabled={spinning}
        style={{
          padding: '16px 56px', borderRadius: '40px',
          background: spinning ? 'var(--bg-badge)' : 'var(--accent)',
          color: spinning ? 'var(--text-muted)' : '#fff',
          fontSize: '18px', fontWeight: 700, border: 'none', cursor: spinning ? 'not-allowed' : 'pointer',
          fontFamily: 'var(--font-display)', letterSpacing: '-0.2px',
          boxShadow: spinning ? 'none' : '0 4px 20px rgba(79,110,247,0.45)',
          transition: 'background 0.2s, box-shadow 0.2s',
        }}
      >{spinning ? 'Spinning…' : '🎡  Spin!'}</button>

      {landed && !spinning && (() => {
        const redirect = resolveRedirect(landed, entryRules)
        const pageLabel = redirect ? PAGE_LABELS[redirect.page] || redirect.page : null
        const handleGo = () => {
          if (!redirect) return
          if (redirect.page === 'workout' && redirect.params?.group) {
            sessionStorage.setItem('workoutGroup', redirect.params.group)
          }
          if (redirect.page === 'f1sim' && redirect.params?.year) {
            sessionStorage.setItem('f1Year', String(redirect.params.year))
          }
          onNavigate(redirect.page)
        }
        const pageOpt = PAGE_OPTIONS.find(p => p.id === redirect?.page)
        const btnLabel = [
          pageOpt?.label,
          redirect?.params?.year ? ` -  ${redirect.params.year}` : '',
          redirect?.params?.group ? ` -  ${redirect.params.group}` : '',
        ].filter(Boolean).join(' ')
        return (
          <div style={{ textAlign: 'center', padding: '18px 32px', background: 'var(--accent-soft)', border: '1px solid var(--accent-border)', borderRadius: 'var(--radius-lg)', maxWidth: 400 }}>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>You landed on</p>
            <p style={{ fontSize: '22px', fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--text-primary)', marginBottom: redirect ? '14px' : '0' }}>{landed}</p>
            {redirect && (
              <button
                onClick={handleGo}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '9px 20px', borderRadius: '20px', background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}
              >
                <ExternalLink size={13} /> {btnLabel}
              </button>
            )}
          </div>
        )
      })()}
    </div>
  )
}

// Emoji picker component
function EmojiPicker({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const [custom, setCustom] = useState('')
  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: 52, height: 38, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-input)', fontSize: '22px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >{value || '🎯'}</button>
      {open && (
        <div style={{ position: 'absolute', top: 44, left: 0, zIndex: 50, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '12px', width: 280, boxShadow: 'var(--shadow-md)' }}>
          <input
            value={custom}
            onChange={e => setCustom(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && custom.trim()) { onChange(custom.trim()); setOpen(false); setCustom('') }}}
            placeholder="Type or paste any emoji…"
            style={{ marginBottom: '10px', fontSize: '14px' }}
            autoFocus
          />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {EMOJI_SUGGESTIONS.map(em => (
              <button key={em} onClick={() => { onChange(em); setOpen(false) }} style={{ width: 34, height: 34, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-input)', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{em}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function WheelPage({ wheelData, setWheelData, onNavigate }) {
  const [activeFilter, setActiveFilter] = useState('all')
  const [history, setHistory] = useState([])
  const [managingCat, setManagingCat] = useState(null)
  const [showNewCat, setShowNewCat] = useState(false)
  const [newCatForm, setNewCatForm] = useState({ name: '', emoji: '🎯', color: '#4f6ef7' })
  const [newEntry, setNewEntry] = useState('')
  const [editEntryIdx, setEditEntryIdx] = useState(null)
  const [editEntryVal, setEditEntryVal] = useState('')
  const categories = wheelData.categories || DEFAULT_CATEGORIES
  function setCategories(fn) {
    setWheelData(prev => ({ ...prev, categories: typeof fn === 'function' ? fn(prev.categories || DEFAULT_CATEGORIES) : fn }))
  }

  // Entry rules: { [entryText]: { page, params } }
  const entryRules = wheelData.entryRules || {}
  function setEntryRule(entry, page, params) {
    setWheelData(prev => {
      const next = { ...(prev.entryRules || {}) }
      if (!page) { delete next[entry] }
      else { next[entry] = { page, params: params || {} } }
      return { ...prev, entryRules: next }
    })
  }

  const allEntries = categories.flatMap(c => c.entries)
  const filteredEntries = useMemo(() => {
    if (activeFilter === 'all') return categories.flatMap(c => c.entries)
    const cat = categories.find(c => c.id === activeFilter)
    return cat ? cat.entries : []
  }, [activeFilter, categories])

  function handleResult(result) {
    const filterLabel = activeFilter === 'all' ? 'All' : categories.find(c => c.id === activeFilter)?.name
    setHistory(h => [{ result, time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }), filter: filterLabel }, ...h].slice(0, 10))
  }

  function addCategory() {
    if (!newCatForm.name.trim()) return
    setCategories(prev => [...prev, { id: Date.now(), ...newCatForm, entries: [] }])
    setNewCatForm({ name: '', emoji: '🎯', color: '#4f6ef7' })
    setShowNewCat(false)
  }
  function deleteCategory(id) {
    setCategories(prev => prev.filter(c => c.id !== id))
    if (managingCat === id) setManagingCat(null)
    if (activeFilter === id) setActiveFilter('all')
  }
  function addEntry(catId) {
    if (!newEntry.trim()) return
    setCategories(prev => prev.map(c => c.id === catId ? { ...c, entries: [...c.entries, newEntry.trim()] } : c))
    setNewEntry('')
  }
  function deleteEntry(catId, idx) {
    setCategories(prev => prev.map(c => c.id === catId ? { ...c, entries: c.entries.filter((_, i) => i !== idx) } : c))
  }
  function saveEditEntry(catId, idx) {
    if (!editEntryVal.trim()) return
    setCategories(prev => prev.map(c => c.id === catId ? { ...c, entries: c.entries.map((e, i) => i === idx ? editEntryVal.trim() : e) } : c))
    setEditEntryIdx(null); setEditEntryVal('')
  }

  const managedCat = categories.find(c => c.id === managingCat)

  return (
    <div>
      <PageHeader title="Wheel of Decide" subtitle="Can't decide what to do? Let the wheel choose." />

      {/* Category filter pills */}
      <Card style={{ padding: '12px 16px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
          <Filter size={13} color="var(--text-muted)" />
          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Filter by category</span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          <button onClick={() => setActiveFilter('all')} style={{ padding: '5px 14px', borderRadius: '20px', border: activeFilter === 'all' ? '1px solid var(--accent)' : '1px solid var(--border)', background: activeFilter === 'all' ? 'var(--accent-soft)' : 'var(--bg-input)', color: activeFilter === 'all' ? 'var(--accent)' : 'var(--text-secondary)', fontSize: '12px', fontWeight: activeFilter === 'all' ? 600 : 400, cursor: 'pointer' }}>
            All ({categories.reduce((a, c) => a + c.entries.length, 0)})
          </button>
          {categories.map(cat => (
            <button key={cat.id} onClick={() => setActiveFilter(cat.id)} style={{ padding: '5px 14px', borderRadius: '20px', border: activeFilter === cat.id ? `1px solid ${cat.color}` : '1px solid var(--border)', background: activeFilter === cat.id ? cat.color + '22' : 'var(--bg-input)', color: activeFilter === cat.id ? cat.color : 'var(--text-secondary)', fontSize: '12px', fontWeight: activeFilter === cat.id ? 600 : 400, cursor: 'pointer' }}>
              {cat.emoji} {cat.name} ({cat.entries.length})
            </button>
          ))}
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '24px', alignItems: 'start' }}>
        {/* Wheel  -  takes up most of the space */}
        <Card style={{ padding: '28px', display: 'flex', justifyContent: 'center' }}>
          <SpinWheel entries={filteredEntries} onResult={handleResult} onNavigate={onNavigate} entryRules={entryRules} />
        </Card>

        {/* Right panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Spin history */}
          {history.length > 0 && (
            <Card>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <h3 style={{ fontSize: '13px', fontWeight: 600 }}>Recent spins</h3>
                <button onClick={() => setHistory([])} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '11px' }}>Clear</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                {history.map((h, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 10px', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '12px', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{h.result}</p>
                      <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{h.filter} · {h.time}</p>
                    </div>
                    {i === 0 && <span style={{ fontSize: '10px', background: 'var(--accent-soft)', color: 'var(--accent)', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>Latest</span>}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Redirect rules  -  add-from-dropdown */}
          {(() => {
            const configured = Object.entries(entryRules).filter(([,r]) => r.page)
            const [newRedirectEntry, setNewRedirectEntry] = React.useState('')
            const [newRedirectPage,  setNewRedirectPage]  = React.useState('')
            const [newRedirectYear,  setNewRedirectYear]  = React.useState('')
            const [newRedirectGroup, setNewRedirectGroup] = React.useState('')
            const [editingEntry,     setEditingEntry]     = React.useState(null)
            const selPageOpt = PAGE_OPTIONS.find(p => p.id === newRedirectPage)

            function addRedirect() {
              if (!newRedirectEntry || !newRedirectPage) return
              const params = {}
              if (selPageOpt?.hasYear  && newRedirectYear)  params.year  = parseInt(newRedirectYear)
              if (selPageOpt?.hasGroup && newRedirectGroup) params.group = newRedirectGroup
              setEntryRule(newRedirectEntry, newRedirectPage, params)
              setNewRedirectEntry(''); setNewRedirectPage(''); setNewRedirectYear(''); setNewRedirectGroup('')
            }

            const [collapsed, setCollapsed] = React.useState(true)

            return (
              <Card>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: collapsed ? 0 : '12px' }}>
                  <div>
                    <h3 style={{ fontSize: '13px', fontWeight: 600 }}>Page redirects</h3>
                    {collapsed && <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{configured.length} redirect{configured.length !== 1 ? 's' : ''} configured</p>}
                  </div>
                  <button onClick={() => setCollapsed(c => !c)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', color: 'var(--text-secondary)', padding: '4px 10px', fontSize: '11px' }}>
                    {collapsed ? '▼ Expand' : '▲ Collapse'}
                  </button>
                </div>

                {!collapsed && (<>

                {/* Add new redirect */}
                <div style={{ background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', padding: '10px', marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '2px' }}>Add redirect</p>
                  <select value={newRedirectEntry} onChange={e => setNewRedirectEntry(e.target.value)} style={{ fontSize: '12px', width: '100%' }}>
                    <option value=""> -  Choose a wheel entry  - </option>
                    {allEntries.filter(e => !entryRules[e]?.page).map((e, i) => (
                      <option key={i} value={e}>{e}</option>
                    ))}
                  </select>
                  <select value={newRedirectPage} onChange={e => { setNewRedirectPage(e.target.value); setNewRedirectYear(''); setNewRedirectGroup('') }} style={{ fontSize: '12px', width: '100%' }}>
                    {PAGE_OPTIONS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                  </select>
                  {selPageOpt?.hasYear && (
                    <input type="number" value={newRedirectYear} onChange={e => setNewRedirectYear(e.target.value)} placeholder="Season year e.g. 2026" style={{ fontSize: '12px' }}/>
                  )}
                  {selPageOpt?.hasGroup && (
                    <select value={newRedirectGroup} onChange={e => setNewRedirectGroup(e.target.value)} style={{ fontSize: '12px', width: '100%' }}>
                      <option value=""> -  Any muscle group  - </option>
                      {WORKOUT_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  )}
                  <Btn size="sm" onClick={addRedirect} disabled={!newRedirectEntry || !newRedirectPage}><Plus size={12}/> Add redirect</Btn>
                </div>

                {/* Configured redirects list */}
                {configured.length === 0 ? (
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>No redirects configured yet.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {configured.map(([entry, rule]) => {
                      const pageOpt = PAGE_OPTIONS.find(p => p.id === rule.page)
                      const isEditing = editingEntry === entry
                      return (
                        <div key={entry} style={{ borderRadius: 'var(--radius-sm)', border: '1px solid var(--accent-border)', overflow: 'hidden' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', background: 'var(--accent-soft)' }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{entry}</p>
                              <p style={{ fontSize: '11px', color: 'var(--accent)' }}>→ {pageOpt?.label}{rule.params?.year ? ` · ${rule.params.year}` : ''}{rule.params?.group ? ` · ${rule.params.group}` : ''}</p>
                            </div>
                            <button onClick={() => setEditingEntry(isEditing ? null : entry)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px 4px', fontSize: '11px' }}>{isEditing ? '▲' : '✏️'}</button>
                            <button onClick={() => setEntryRule(entry, '', {})} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: '2px 4px' }}><Trash2 size={13}/></button>
                          </div>
                          {isEditing && (
                            <div style={{ padding: '10px', background: 'var(--bg-card)', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              <select value={rule.page} onChange={e => setEntryRule(entry, e.target.value, rule.params)} style={{ fontSize: '12px', width: '100%' }}>
                                {PAGE_OPTIONS.filter(p => p.id).map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                              </select>
                              {pageOpt?.hasYear && (
                                <input type="number" value={rule.params?.year || ''} onChange={e => setEntryRule(entry, rule.page, { ...rule.params, year: parseInt(e.target.value) || undefined })} placeholder="Year e.g. 2026" style={{ fontSize: '12px' }}/>
                              )}
                              {pageOpt?.hasGroup && (
                                <select value={rule.params?.group || ''} onChange={e => setEntryRule(entry, rule.page, { ...rule.params, group: e.target.value || undefined })} style={{ fontSize: '12px', width: '100%' }}>
                                  <option value=""> -  Any muscle group  - </option>
                                  {WORKOUT_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                                </select>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
                </>)}
              </Card>
            )
          })()}

          {/* Manage categories */}
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '13px', fontWeight: 600 }}>Categories</h3>
              <Btn size="sm" onClick={() => setShowNewCat(true)}><Plus size={12} /> Add</Btn>
            </div>

            {showNewCat && (
              <div style={{ background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', padding: '12px', marginBottom: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <EmojiPicker value={newCatForm.emoji} onChange={em => setNewCatForm(f => ({ ...f, emoji: em }))} />
                  <input value={newCatForm.name} onChange={e => setNewCatForm(f => ({ ...f, name: e.target.value }))} placeholder="Category name" style={{ flex: 1 }} autoFocus onKeyDown={e => e.key === 'Enter' && addCategory()} />
                </div>
                {/* Native colour picker  -  full spectrum */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <label style={{ fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Colour</label>
                  <input
                    type="color"
                    value={newCatForm.color}
                    onChange={e => setNewCatForm(f => ({ ...f, color: e.target.value }))}
                    style={{ width: 48, height: 32, border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '2px', cursor: 'pointer', background: 'var(--bg-input)' }}
                  />
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{newCatForm.color}</span>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: newCatForm.color, border: '1px solid var(--border)', flexShrink: 0 }} />
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <Btn size="sm" onClick={addCategory}>Save</Btn>
                  <Btn size="sm" variant="ghost" onClick={() => setShowNewCat(false)}>Cancel</Btn>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {categories.map(cat => (
                <div key={cat.id}>
                  <div onClick={() => setManagingCat(managingCat === cat.id ? null : cat.id)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 10px', background: managingCat === cat.id ? 'var(--accent-soft)' : 'var(--bg-input)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', borderLeft: `3px solid ${cat.color}` }}>
                    <span style={{ fontSize: '14px' }}>{cat.emoji}</span>
                    <span style={{ fontSize: '12px', fontWeight: 500, flex: 1 }}>{cat.name}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{cat.entries.length}</span>
                    <button onClick={e => { e.stopPropagation(); deleteCategory(cat.id) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0 2px' }}><Trash2 size={12} /></button>
                  </div>
                  {managingCat === cat.id && (
                    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '0 0 var(--radius-sm) var(--radius-sm)', padding: '10px', marginBottom: '4px' }}>
                      <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                        <input value={newEntry} onChange={e => setNewEntry(e.target.value)} onKeyDown={e => e.key === 'Enter' && addEntry(cat.id)} placeholder="New entry..." style={{ flex: 1, fontSize: '12px' }} />
                        <Btn size="sm" onClick={() => addEntry(cat.id)}><Plus size={12} /></Btn>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', maxHeight: '180px', overflowY: 'auto' }}>
                        {cat.entries.map((entry, idx) => (
                          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {editEntryIdx === `${cat.id}-${idx}` ? (
                              <>
                                <input value={editEntryVal} onChange={e => setEditEntryVal(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveEditEntry(cat.id, idx)} style={{ flex: 1, fontSize: '12px', padding: '4px 8px' }} autoFocus />
                                <Btn size="sm" onClick={() => saveEditEntry(cat.id, idx)}>✓</Btn>
                                <Btn size="sm" variant="ghost" onClick={() => setEditEntryIdx(null)}>✕</Btn>
                              </>
                            ) : (
                              <>
                                <span style={{ flex: 1, fontSize: '12px', color: 'var(--text-secondary)', padding: '3px 0' }}>{entry}</span>
                                <button
                                  onClick={() => { setShowRules(true); setNewRule(r => ({ ...r, match: entry })) }}
                                  title="Create redirect rule for this entry"
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px', fontSize: '10px' }}
                                  >🔗</button>
                                <button onClick={() => { setEditEntryIdx(`${cat.id}-${idx}`); setEditEntryVal(entry) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px' }}><Pencil size={11} /></button>
                                <button onClick={() => deleteEntry(cat.id, idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px' }}><Trash2 size={11} /></button>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
