import React, { useState } from 'react'
import Card from '../components/Card'
import PageHeader from '../components/PageHeader'
import Btn from '../components/Btn'
import { Plus, Trash2, Pencil, ExternalLink, X, Globe } from 'lucide-react'

const DEFAULT_PROJECTS = [
  {
    id: 1,
    name: 'EAFC Career Mode Tracker',
    emoji: '⚽',
    description: 'Track your EAFC career mode seasons, stats, transfers and more.',
    url: '',
    color: '#22c55e',
    tags: ['Gaming', 'Football'],
    status: 'active',
  },
  {
    id: 2,
    name: 'F1 Career Mode Tracker',
    emoji: '🏎️',
    description: 'Follow your F1 career through every season, race results and standings.',
    url: '',
    color: '#ef4444',
    tags: ['Gaming', 'F1'],
    status: 'active',
  },
  {
    id: 3,
    name: 'BBFF Fantasy F1',
    emoji: '🏆',
    description: 'Bennett Brothers Fantasy F1  -  league standings, picks, and race results.',
    url: '',
    color: '#f59e0b',
    tags: ['Fantasy', 'F1'],
    status: 'active',
  },
]

const PALETTE = ['#4f6ef7','#22c55e','#ef4444','#f59e0b','#a78bfa','#f97316','#0ea5e9','#ff6b9d','#34d974','#e11d48']
const STATUS_OPTIONS = [{ value: 'active', label: '🟢 Active' }, { value: 'wip', label: '🟡 In progress' }, { value: 'paused', label: '⏸️ Paused' }, { value: 'idea', label: '💡 Idea' }]
const EMPTY_FORM = { name: '', emoji: '🚀', description: '', url: '', color: PALETTE[0], tags: '', status: 'active' }

export default function MyProjectsPage({ projects, setProjects }) {
  const allProjects = projects.length > 0 ? projects : DEFAULT_PROJECTS
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)

  function openNew() { setForm(EMPTY_FORM); setEditId(null); setShowForm(true) }
  function openEdit(p) {
    setForm({ name: p.name, emoji: p.emoji, description: p.description, url: p.url || '', color: p.color, tags: (p.tags || []).join(', '), status: p.status || 'active' })
    setEditId(p.id); setShowForm(true)
  }

  function save() {
    if (!form.name.trim()) return
    const entry = { ...form, tags: form.tags.split(',').map(t => t.trim()).filter(Boolean) }
    if (editId) {
      setProjects(prev => (prev.length > 0 ? prev : DEFAULT_PROJECTS).map(p => p.id === editId ? { ...p, ...entry } : p))
    } else {
      setProjects(prev => [...(prev.length > 0 ? prev : DEFAULT_PROJECTS), { id: Date.now(), ...entry }])
    }
    setForm(EMPTY_FORM); setEditId(null); setShowForm(false)
  }

  function deleteProject(id) {
    setProjects(prev => (prev.length > 0 ? prev : DEFAULT_PROJECTS).filter(p => p.id !== id))
  }

  const statusLabel = v => STATUS_OPTIONS.find(s => s.value === v)?.label || v

  return (
    <div>
      <PageHeader
        title="My Projects"
        subtitle="Links and quick access to all your apps and projects"
        action={<Btn onClick={openNew}><Plus size={14} /> Add project</Btn>}
      />

      {showForm && (
        <Card style={{ marginBottom: '20px', border: '1px solid var(--accent-border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600 }}>{editId ? 'Edit project' : 'New project'}</h3>
            <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={16} /></button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <div style={{ width: 80 }}><label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>Icon</label><input value={form.emoji} onChange={e => setForm(f => ({ ...f, emoji: e.target.value }))} style={{ textAlign: 'center', fontSize: '20px' }} /></div>
              <div style={{ flex: 1 }}><label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>Name</label><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Project name" autoFocus /></div>
            </div>
            <div><label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>Status</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div style={{ gridColumn: '1/-1' }}><label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>Description</label><input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="What is this project?" /></div>
            <div style={{ gridColumn: '1/-1' }}><label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>URL</label><input value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} placeholder="https://…" /></div>
            <div><label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>Tags (comma separated)</label><input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="Gaming, Football, F1" /></div>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Colour</label>
              <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                {PALETTE.map(c => <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))} style={{ width: 22, height: 22, borderRadius: '50%', background: c, border: form.color === c ? '2px solid var(--text-primary)' : '2px solid transparent', cursor: 'pointer' }} />)}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
            <Btn onClick={save}>{editId ? 'Save changes' : 'Add project'}</Btn>
            <Btn variant="ghost" onClick={() => setShowForm(false)}>Cancel</Btn>
          </div>
        </Card>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '14px' }}>
        {allProjects.map(project => (
          <Card key={project.id} style={{ padding: '20px', borderTop: `3px solid ${project.color}`, display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: 48, height: 48, borderRadius: '12px', background: project.color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', flexShrink: 0 }}>
                  {project.emoji}
                </div>
                <div>
                  <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>{project.name}</p>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{statusLabel(project.status)}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                <button onClick={() => openEdit(project)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><Pencil size={13} /></button>
                <button onClick={() => deleteProject(project.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><Trash2 size={13} /></button>
              </div>
            </div>

            {project.description && <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{project.description}</p>}

            {(project.tags || []).length > 0 && (
              <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                {project.tags.map(tag => <span key={tag} style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: 'var(--bg-badge)', color: 'var(--text-secondary)' }}>{tag}</span>)}
              </div>
            )}

            {project.url ? (
              <a href={project.url} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: 'var(--radius-sm)', background: project.color, color: '#fff', fontSize: '13px', fontWeight: 500, textDecoration: 'none', marginTop: 'auto', alignSelf: 'flex-start' }}>
                <ExternalLink size={13} /> Open app
              </a>
            ) : (
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: 'auto' }}>No URL set  -  click edit to add a link</p>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}
