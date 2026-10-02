import React, { useState, useRef } from 'react'
import Card from '../components/Card'
import PageHeader from '../components/PageHeader'
import Btn from '../components/Btn'
import { Plus, Trash2, RefreshCw, X, Heart, Search, Loader } from 'lucide-react'

const TYPES = [
  { value: 'bible', label: '📖 Bible verse', color: '#6b84f8' },
  { value: 'quote', label: '💬 Quote', color: '#f59e0b' },
  { value: 'message', label: '💌 Message', color: '#ff6b9d' },
]

const POPULAR_VERSES = [
  'John 3:16', 'Philippians 4:13', 'Jeremiah 29:11', 'Romans 8:28',
  'Psalm 23:1', 'Isaiah 40:31', 'Proverbs 3:5', 'Matthew 11:28',
  'Psalm 46:1', '2 Timothy 1:7', 'Romans 15:13', 'Psalm 119:105',
]

const DEFAULT_VERSES = [
  { id: 1, type: 'bible', text: "I can do all things through Christ who strengthens me.", source: "Philippians 4:13", favourite: false },
  { id: 2, type: 'bible', text: "For I know the plans I have for you, declares the Lord, plans to prosper you and not to harm you, plans to give you hope and a future.", source: "Jeremiah 29:11", favourite: false },
  { id: 3, type: 'quote', text: "The secret of getting ahead is getting started.", source: "Mark Twain", favourite: false },
  { id: 4, type: 'quote', text: "You are braver than you believe, stronger than you seem, and smarter than you think.", source: "A.A. Milne", favourite: false },
]

function typeColor(type) {
  return TYPES.find(t => t.value === type)?.color || 'var(--accent)'
}

function BibleSearch({ onSelect }) {
  const [query, setQuery] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function lookup(ref) {
    const r = ref || query.trim()
    if (!r) return
    setLoading(true); setError(''); setResult(null)
    try {
      const encoded = encodeURIComponent(r)
      const res = await fetch(`https://bible-api.com/${encoded}`)
      const data = await res.json()
      if (data.error) { setError(`Verse not found. Try e.g. "John 3:16"`); setLoading(false); return }
      setResult({ text: data.text.trim(), source: data.reference })
    } catch {
      setError('Could not reach Bible API. Check your internet connection.')
    }
    setLoading(false)
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && lookup()}
          placeholder="e.g. John 3:16 or Psalm 23:1-3"
          autoFocus
        />
        <Btn onClick={() => lookup()} disabled={loading}>
          {loading ? <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Search size={14} />}
        </Btn>
      </div>

      {/* Popular suggestions */}
      <div style={{ marginBottom: '12px' }}>
        <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>POPULAR VERSES</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
          {POPULAR_VERSES.map(v => (
            <button
              key={v}
              onClick={() => { setQuery(v); lookup(v) }}
              style={{ padding: '3px 10px', borderRadius: '20px', border: '1px solid var(--border)', background: 'var(--bg-input)', fontSize: '12px', color: 'var(--text-secondary)', cursor: 'pointer' }}
            >{v}</button>
          ))}
        </div>
      </div>

      {error && <p style={{ fontSize: '13px', color: 'var(--danger)', marginBottom: '10px' }}>{error}</p>}

      {result && (
        <div style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent-border)', borderRadius: 'var(--radius)', padding: '14px 16px', marginBottom: '10px' }}>
          <p style={{ fontSize: '14px', fontStyle: 'italic', lineHeight: 1.7, color: 'var(--text-primary)', marginBottom: '8px' }}>"{result.text}"</p>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px' }}> -  {result.source}</p>
          <Btn onClick={() => onSelect(result)} size="sm"><Plus size={13} /> Add to my collection</Btn>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

export default function PickMeUp({ pickmeups, setPickmeups }) {
  const [featured, setFeatured] = useState(() => pickmeups.length > 0 ? pickmeups[Math.floor(Math.random() * pickmeups.length)] : null)
  const [showForm, setShowForm] = useState(false)
  const [formType, setFormType] = useState('bible')
  const [filter, setFilter] = useState('all')
  const [form, setForm] = useState({ text: '', source: '' })

  function addEntry(entry) {
    const newEntry = { id: Date.now(), type: formType, ...entry, favourite: false }
    setPickmeups(prev => [...prev, newEntry])
    setFeatured(newEntry)
    setForm({ text: '', source: '' })
    setShowForm(false)
  }

  function addManual() {
    if (!form.text.trim()) return
    addEntry(form)
  }

  function deleteEntry(id) {
    setPickmeups(prev => {
      const next = prev.filter(e => e.id !== id)
      if (featured?.id === id) setFeatured(next[0] || null)
      return next
    })
  }

  function toggleFavourite(id) {
    setPickmeups(prev => prev.map(e => e.id === id ? { ...e, favourite: !e.favourite } : e))
    if (featured?.id === id) setFeatured(f => f ? { ...f, favourite: !f.favourite } : f)
  }

  function randomise() {
    const pool = filtered.length > 0 ? filtered : pickmeups
    if (!pool.length) return
    setFeatured(pool[Math.floor(Math.random() * pool.length)])
  }

  function loadDefaults() {
    setPickmeups(prev => {
      const existing = new Set(prev.map(e => e.text))
      const toAdd = DEFAULT_VERSES.filter(v => !existing.has(v.text)).map(v => ({ ...v, id: Date.now() + Math.random() }))
      const next = [...prev, ...toAdd]
      if (!featured && next.length > 0) setFeatured(next[0])
      return next
    })
  }

  const filtered = filter === 'all' ? pickmeups
    : filter === 'favourites' ? pickmeups.filter(e => e.favourite)
    : pickmeups.filter(e => e.type === filter)

  return (
    <div>
      <PageHeader
        title="Pick-me-up"
        subtitle="Bible verses, encouragement, and messages to lift you"
        action={
          <div style={{ display: 'flex', gap: '8px' }}>
            {pickmeups.length === 0 && <Btn variant="secondary" onClick={loadDefaults}>Load defaults</Btn>}
            <Btn onClick={() => setShowForm(true)}><Plus size={14} /> Add one</Btn>
          </div>
        }
      />

      {featured && (
        <Card style={{ marginBottom: '24px', border: '1px solid var(--accent-border)', background: 'var(--accent-soft)', textAlign: 'center', padding: '32px 40px' }}>
          <div style={{ fontSize: '28px', marginBottom: '12px' }}>
            {featured.type === 'bible' ? '📖' : featured.type === 'quote' ? '💬' : '💌'}
          </div>
          <p style={{ fontSize: '18px', lineHeight: 1.7, color: 'var(--text-primary)', fontStyle: 'italic', maxWidth: '600px', margin: '0 auto' }}>
            "{featured.text}"
          </p>
          {featured.source && <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '16px' }}> -  {featured.source}</p>}
          <button
            onClick={randomise}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '20px', padding: '8px 16px', borderRadius: '20px', background: 'var(--bg-badge)', border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '13px' }}
          ><RefreshCw size={13} /> Another one</button>
        </Card>
      )}

      {pickmeups.length === 0 && (
        <Card style={{ textAlign: 'center', padding: '40px', marginBottom: '20px' }}>
          <p style={{ fontSize: '32px', marginBottom: '12px' }}>🙏</p>
          <p style={{ fontSize: '15px', color: 'var(--text-primary)', marginBottom: '6px' }}>Nothing saved yet.</p>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>Load some defaults or search the Bible to get started.</p>
          <Btn onClick={loadDefaults}>Load defaults</Btn>
        </Card>
      )}

      {showForm && (
        <Card style={{ marginBottom: '20px', border: '1px solid var(--accent-border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div style={{ display: 'flex', gap: '6px' }}>
              {TYPES.map(t => (
                <button
                  key={t.value}
                  onClick={() => setFormType(t.value)}
                  style={{ padding: '5px 12px', borderRadius: '20px', border: formType === t.value ? '1px solid var(--accent)' : '1px solid var(--border)', background: formType === t.value ? 'var(--accent-soft)' : 'var(--bg-input)', color: formType === t.value ? 'var(--accent)' : 'var(--text-secondary)', fontSize: '12px', cursor: 'pointer', fontFamily: 'var(--font-body)' }}
                >{t.label}</button>
              ))}
            </div>
            <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={16} /></button>
          </div>

          {formType === 'bible' ? (
            <BibleSearch onSelect={r => addEntry(r)} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <textarea
                value={form.text}
                onChange={e => setForm(f => ({ ...f, text: e.target.value }))}
                placeholder={formType === 'quote' ? 'Quote text...' : 'Message...'}
                rows={3}
              />
              <input
                value={form.source}
                onChange={e => setForm(f => ({ ...f, source: e.target.value }))}
                placeholder={formType === 'quote' ? 'Author' : 'From (e.g. Mum)'}
              />
              <div style={{ display: 'flex', gap: '8px' }}>
                <Btn onClick={addManual}>Save</Btn>
                <Btn variant="ghost" onClick={() => setShowForm(false)}>Cancel</Btn>
              </div>
            </div>
          )}
        </Card>
      )}

      {pickmeups.length > 0 && (
        <>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
            {[['all','All'], ['bible','📖 Bible'], ['quote','💬 Quotes'], ['message','💌 Messages'], ['favourites','⭐ Favourites']].map(([val, label]) => (
              <button key={val} onClick={() => setFilter(val)} style={{ padding: '4px 12px', borderRadius: '20px', border: filter === val ? '1px solid var(--accent)' : '1px solid var(--border)', background: filter === val ? 'var(--accent-soft)' : 'var(--bg-card)', color: filter === val ? 'var(--accent)' : 'var(--text-secondary)', fontSize: '12px', cursor: 'pointer' }}>{label}</button>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filtered.map(entry => (
              <Card key={entry.id} style={{ padding: '14px 16px', borderLeft: `3px solid ${typeColor(entry.type)}` }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '14px', color: 'var(--text-primary)', lineHeight: 1.6, fontStyle: 'italic' }}>"{entry.text}"</p>
                    {entry.source && <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}> -  {entry.source}</p>}
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                    <button onClick={() => { setFeatured(entry); window.scrollTo({ top: 0, behavior: 'smooth' }) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '14px' }} title="Feature this">✨</button>
                    <button onClick={() => toggleFavourite(entry.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: entry.favourite ? '#ff6b9d' : 'var(--text-muted)' }}>
                      <Heart size={15} fill={entry.favourite ? '#ff6b9d' : 'none'} />
                    </button>
                    <button onClick={() => deleteEntry(entry.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><Trash2 size={14} /></button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
