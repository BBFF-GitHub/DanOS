import React, { useState } from 'react'
import Card from '../components/Card'
import PageHeader from '../components/PageHeader'
import Btn from '../components/Btn'
import { Plus, Trash2, Pencil, X, ExternalLink, BookOpen, Award, Target, Clock } from 'lucide-react'

const STATUSES = [
  { value: 'interested',   label: 'Interested',   color: '#9aa0b0', bg: 'var(--bg-badge)' },
  { value: 'planning',     label: 'Planning',     color: '#f59e0b', bg: 'var(--warning-soft)' },
  { value: 'in-progress',  label: 'In progress',  color: '#4f6ef7', bg: 'var(--accent-soft)' },
  { value: 'on-hold',      label: 'On hold',      color: '#f97316', bg: '#fff3e8' },
  { value: 'completed',    label: 'Completed ✓',  color: '#22c55e', bg: 'var(--success-soft)' },
]

const CATEGORIES = ['Dating & Relationships', 'Personal Development', 'Mindset', 'Business & Entrepreneurship', 'Fitness Coaching', 'Spiritual', 'Qualification', 'Course', 'Other']

const DEFAULT_QUALS = [
  { id: 1, title: 'Dating With Gracie', category: 'Dating & Relationships', status: 'in-progress', provider: 'Dating With Gracie', url: 'https://www.datingwithgracie.com', notes: 'Dating coaching programme  -  building confidence and social skills', targetDate: '', progress: 30 },
  { id: 2, title: 'Personal Development Reading', category: 'Personal Development', status: 'in-progress', provider: 'Self-directed', url: '', notes: 'Working through a reading list of key personal development books', targetDate: '', progress: 20 },
  { id: 3, title: 'Mindset & Positive Thinking', category: 'Mindset', status: 'planning', provider: '', url: '', notes: 'Course or programme to work on mindset and positivity', targetDate: '', progress: 0 },
]

function statusInfo(val) {
  return STATUSES.find(s => s.value === val) || STATUSES[0]
}

const EMPTY_FORM = { title: '', category: 'Coaching', status: 'interested', provider: '', url: '', notes: '', targetDate: '', progress: 0 }

export default function CoachingPage({ coachingData, setCoachingData }) {
  const quals = coachingData.quals || DEFAULT_QUALS
  function setQuals(fn) { setCoachingData(prev => ({ ...prev, quals: typeof fn === 'function' ? fn(prev.quals || DEFAULT_QUALS) : fn })) }

  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterCat, setFilterCat] = useState('all')

  function openNew() { setForm(EMPTY_FORM); setEditId(null); setShowForm(true) }
  function openEdit(q) { setForm({ title: q.title, category: q.category, status: q.status, provider: q.provider || '', url: q.url || '', notes: q.notes || '', targetDate: q.targetDate || '', progress: q.progress || 0 }); setEditId(q.id); setShowForm(true) }

  function save() {
    if (!form.title.trim()) return
    if (editId) {
      setQuals(prev => prev.map(q => q.id === editId ? { ...q, ...form } : q))
    } else {
      setQuals(prev => [...prev, { id: Date.now(), ...form }])
    }
    setForm(EMPTY_FORM); setEditId(null); setShowForm(false)
  }

  function deleteQual(id) { setQuals(prev => prev.filter(q => q.id !== id)) }

  function cycleStatus(id) {
    setQuals(prev => prev.map(q => {
      if (q.id !== id) return q
      const idx = STATUSES.findIndex(s => s.value === q.status)
      return { ...q, status: STATUSES[(idx + 1) % STATUSES.length].value }
    }))
  }

  const filtered = quals.filter(q => {
    if (filterStatus !== 'all' && q.status !== filterStatus) return false
    if (filterCat !== 'all' && q.category !== filterCat) return false
    return true
  })

  const stats = STATUSES.reduce((acc, s) => { acc[s.value] = quals.filter(q => q.status === s.value).length; return acc }, {})

  return (
    <div>
      <PageHeader
        title="Coaching & Qualifications"
        subtitle="Track your learning journey  -  courses, badges, and self-improvement"
        action={<Btn onClick={openNew}><Plus size={14} /> Add qualification</Btn>}
      />

      {/* Stats row */}
      <div className="grid-stats" style={{ marginBottom: '20px' }}>
        {STATUSES.map(s => (
          <div key={s.value} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '14px 16px', borderTop: `3px solid ${s.color}` }}>
            <p style={{ fontSize: '24px', fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--text-primary)', lineHeight: 1 }}>{stats[s.value] || 0}</p>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {showForm && (
        <Card style={{ marginBottom: '20px', border: '1px solid var(--accent-border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600 }}>{editId ? 'Edit qualification' : 'New qualification'}</h3>
            <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={16} /></button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div style={{ gridColumn: '1/-1' }}><label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>Title</label><input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. UEFA C Licence" autoFocus /></div>
            <div><label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>Category</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div><label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>Status</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div><label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>Provider / organisation</label><input value={form.provider} onChange={e => setForm(f => ({ ...f, provider: e.target.value }))} placeholder="e.g. The FA, Coursera…" /></div>
            <div><label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>Target completion</label><input type="date" value={form.targetDate} onChange={e => setForm(f => ({ ...f, targetDate: e.target.value }))} /></div>
            <div style={{ gridColumn: '1/-1' }}><label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>Link / URL</label><input value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} placeholder="https://…" /></div>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>Progress ({form.progress}%)</label>
              <input type="range" min="0" max="100" step="5" value={form.progress} onChange={e => setForm(f => ({ ...f, progress: Number(e.target.value) }))} style={{ width: '100%' }} />
            </div>
            <div style={{ gridColumn: '1/-1' }}><label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>Notes</label><textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Why you want to do this, key things to remember…" /></div>
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
            <Btn onClick={save}>{editId ? 'Save changes' : 'Add'}</Btn>
            <Btn variant="ghost" onClick={() => setShowForm(false)}>Cancel</Btn>
          </div>
        </Card>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px', alignItems: 'center' }}>
        <button onClick={() => setFilterStatus('all')} style={{ padding: '4px 12px', borderRadius: '20px', border: filterStatus === 'all' ? '1px solid var(--accent)' : '1px solid var(--border)', background: filterStatus === 'all' ? 'var(--accent-soft)' : 'var(--bg-card)', color: filterStatus === 'all' ? 'var(--accent)' : 'var(--text-secondary)', fontSize: '12px', cursor: 'pointer' }}>All statuses</button>
        {STATUSES.map(s => (
          <button key={s.value} onClick={() => setFilterStatus(s.value)} style={{ padding: '4px 12px', borderRadius: '20px', border: filterStatus === s.value ? `1px solid ${s.color}` : '1px solid var(--border)', background: filterStatus === s.value ? s.bg : 'var(--bg-card)', color: filterStatus === s.value ? s.color : 'var(--text-secondary)', fontSize: '12px', cursor: 'pointer' }}>{s.label} ({stats[s.value] || 0})</button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card style={{ textAlign: 'center', padding: '40px' }}>
          <p style={{ fontSize: '28px', marginBottom: '10px' }}>🎓</p>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>No qualifications here yet. Add your first one!</p>
        </Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '12px' }}>
          {filtered.map(q => {
            const si = statusInfo(q.status)
            const hasTarget = q.targetDate && new Date(q.targetDate) > new Date()
            const daysLeft = hasTarget ? Math.round((new Date(q.targetDate) - new Date()) / 86400000) : null
            return (
              <Card key={q.id} style={{ padding: '16px', borderTop: `3px solid ${si.color}` }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '10px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>{q.title}</p>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      <button onClick={() => cycleStatus(q.id)} style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: si.bg, color: si.color, border: `1px solid ${si.color}`, cursor: 'pointer', fontWeight: 600 }}>{si.label}</button>
                      <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: 'var(--bg-badge)', color: 'var(--text-secondary)' }}>{q.category}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {q.url && <a href={q.url} target="_blank" rel="noreferrer" style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}><ExternalLink size={13} /></a>}
                    <button onClick={() => openEdit(q)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><Pencil size={13} /></button>
                    <button onClick={() => deleteQual(q.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><Trash2 size={13} /></button>
                  </div>
                </div>

                {q.provider && <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>🏛️ {q.provider}</p>}

                {q.progress > 0 && (
                  <div style={{ marginBottom: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Progress</span>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: q.progress === 100 ? 'var(--success)' : 'var(--text-secondary)' }}>{q.progress}%</span>
                    </div>
                    <div style={{ height: 6, background: 'var(--bg-badge)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${q.progress}%`, background: q.progress === 100 ? 'var(--success)' : si.color, borderRadius: '3px', transition: 'width 0.3s' }} />
                    </div>
                  </div>
                )}

                {daysLeft !== null && (
                  <p style={{ fontSize: '11px', color: daysLeft <= 30 ? 'var(--warning)' : 'var(--text-muted)', marginBottom: '6px' }}>
                    🎯 Target: {new Date(q.targetDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} ({daysLeft}d left)
                  </p>
                )}

                {q.notes && <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5, marginTop: '4px', borderTop: '1px solid var(--border)', paddingTop: '8px' }}>{q.notes}</p>}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
