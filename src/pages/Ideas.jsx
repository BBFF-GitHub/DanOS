import React, { useState } from 'react'
import Card from '../components/Card'
import PageHeader from '../components/PageHeader'
import Btn from '../components/Btn'
import { Plus, Trash2, X } from 'lucide-react'

const COLORS = [
  '#f9e04b', '#ff9f43', '#ff6b9d', '#a29bfe',
  '#74b9ff', '#55efc4', '#fd79a8', '#fdcb6e',
]

const TAGS = ['Idea', 'TODO', 'Someday', 'Project', 'Random', 'Fitness', 'Work', 'Personal']

export default function IdeasWall({ ideas, setIdeas }) {
  const [showForm, setShowForm] = useState(false)
  const [filter, setFilter] = useState('All')
  const [form, setForm] = useState({ title: '', body: '', color: COLORS[0], tag: 'Idea' })
  const [editId, setEditId] = useState(null)

  function save() {
    if (!form.title.trim()) return
    if (editId) {
      setIdeas(prev => prev.map(i => i.id === editId ? { ...i, ...form } : i))
      setEditId(null)
    } else {
      setIdeas(prev => [...prev, { id: Date.now(), ...form, createdAt: new Date().toISOString() }])
    }
    setForm({ title: '', body: '', color: COLORS[0], tag: 'Idea' })
    setShowForm(false)
  }

  function deleteIdea(id) {
    setIdeas(prev => prev.filter(i => i.id !== id))
  }

  function startEdit(idea) {
    setForm({ title: idea.title, body: idea.body, color: idea.color, tag: idea.tag })
    setEditId(idea.id)
    setShowForm(true)
  }

  const allTags = ['All', ...TAGS]
  const filtered = filter === 'All' ? ideas : ideas.filter(i => i.tag === filter)

  return (
    <div>
      <PageHeader
        title="Ideas wall"
        subtitle={`${ideas.length} idea${ideas.length !== 1 ? 's' : ''} pinned`}
        action={<Btn onClick={() => { setShowForm(true); setEditId(null); setForm({ title: '', body: '', color: COLORS[0], tag: 'Idea' }) }}><Plus size={14} /> New idea</Btn>}
      />

      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '20px' }}>
        {allTags.map(tag => (
          <button
            key={tag}
            onClick={() => setFilter(tag)}
            style={{
              padding: '4px 12px',
              borderRadius: '20px',
              border: filter === tag ? '1px solid var(--accent)' : '1px solid var(--border)',
              background: filter === tag ? 'var(--accent-soft)' : 'var(--bg-card)',
              color: filter === tag ? 'var(--accent)' : 'var(--text-secondary)',
              fontSize: '12px',
              fontWeight: filter === tag ? 500 : 400,
              cursor: 'pointer',
            }}
          >{tag}</button>
        ))}
      </div>

      {showForm && (
        <Card style={{ marginBottom: '20px', border: '1px solid var(--accent-border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600 }}>{editId ? 'Edit idea' : 'New idea'}</h3>
            <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={16} /></button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Idea title..." />
            <textarea
              value={form.body}
              onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
              placeholder="More details... (optional)"
              rows={3}
              style={{ resize: 'vertical' }}
            />
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Colour</label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => setForm(f => ({ ...f, color: c }))}
                      style={{ width: 22, height: 22, borderRadius: '50%', background: c, border: form.color === c ? '2px solid var(--text-primary)' : '2px solid transparent', cursor: 'pointer' }}
                    />
                  ))}
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 120 }}>
                <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Tag</label>
                <select value={form.tag} onChange={e => setForm(f => ({ ...f, tag: e.target.value }))}>
                  {TAGS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
            <Btn onClick={save}>{editId ? 'Save changes' : 'Pin it'}</Btn>
            <Btn variant="ghost" onClick={() => setShowForm(false)}>Cancel</Btn>
          </div>
        </Card>
      )}

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
          <p style={{ fontSize: '32px', marginBottom: '12px' }}>💡</p>
          <p style={{ fontSize: '15px' }}>No ideas here yet.</p>
          <p style={{ fontSize: '13px', marginTop: '4px' }}>Hit "New idea" to start pinning your thoughts!</p>
        </div>
      ) : (
        <div style={{ columns: '3 200px', gap: '14px' }}>
          {filtered.map(idea => (
            <div
              key={idea.id}
              style={{
                background: idea.color,
                borderRadius: 'var(--radius)',
                padding: '16px',
                marginBottom: '14px',
                breakInside: 'avoid',
                position: 'relative',
                boxShadow: '2px 3px 8px rgba(0,0,0,0.15)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
                <span style={{ fontSize: '10px', fontWeight: 600, background: 'rgba(0,0,0,0.12)', padding: '2px 8px', borderRadius: '20px', color: 'rgba(0,0,0,0.6)' }}>
                  {idea.tag}
                </span>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button onClick={() => startEdit(idea)} style={{ background: 'rgba(0,0,0,0.1)', border: 'none', borderRadius: 'var(--radius-sm)', width: 22, height: 22, cursor: 'pointer', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✏️</button>
                  <button onClick={() => deleteIdea(idea.id)} style={{ background: 'rgba(0,0,0,0.1)', border: 'none', borderRadius: 'var(--radius-sm)', width: 22, height: 22, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Trash2 size={11} color="rgba(0,0,0,0.5)" />
                  </button>
                </div>
              </div>
              <p style={{ fontSize: '14px', fontWeight: 600, color: 'rgba(0,0,0,0.8)', lineHeight: 1.3, marginBottom: idea.body ? '8px' : 0 }}>{idea.title}</p>
              {idea.body && <p style={{ fontSize: '12px', color: 'rgba(0,0,0,0.6)', lineHeight: 1.5 }}>{idea.body}</p>}
              <p style={{ fontSize: '10px', color: 'rgba(0,0,0,0.35)', marginTop: '10px' }}>
                {new Date(idea.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
