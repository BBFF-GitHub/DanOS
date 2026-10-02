import React, { useState, useMemo } from 'react'
import Card from '../components/Card'
import PageHeader from '../components/PageHeader'
import Btn from '../components/Btn'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { Plus, ChevronLeft, ChevronRight, Trash2, BookOpen, Sun, Moon, Zap, X } from 'lucide-react'

// ── Constants ──────────────────────────────────────────────────────
const MOODS = [
  { value: 5, label: '😄', desc: 'Great' },
  { value: 4, label: '🙂', desc: 'Good' },
  { value: 3, label: '😐', desc: 'Okay' },
  { value: 2, label: '😕', desc: 'Meh' },
  { value: 1, label: '😩', desc: 'Rough' },
]

const ENERGY = [
  { value: 3, label: '⚡⚡⚡', desc: 'High' },
  { value: 2, label: '⚡⚡',  desc: 'Medium' },
  { value: 1, label: '⚡',   desc: 'Low' },
]

const TEMPLATES = [
  {
    id: 'daily',
    label: 'Daily Check-in',
    emoji: '☀️',
    desc: 'Morning intentions + evening reflection',
    sections: [
      { key: 'mood',         type: 'mood',       label: 'How are you feeling?',          placeholder: '' },
      { key: 'energy',       type: 'energy',     label: 'Energy level',                  placeholder: '' },
      { key: 'word',         type: 'text-sm',    label: 'One word for today',            placeholder: 'e.g. Focused, Chaotic, Hopeful…' },
      { key: 'gratitude',    type: 'list3',      label: '3 things I\'m grateful for',    placeholder: ['', '', ''] },
      { key: 'intentions',   type: 'list3',      label: 'Today I want to…',              placeholder: ['Finish something', 'Do one thing for me', 'Connect with someone'] },
      { key: 'brainDump',    type: 'textarea',   label: '🧠 Brain dump',                 placeholder: 'What\'s on your mind? Vent, plan, ramble  -  no rules here.' },
      { key: 'wentWell',     type: 'textarea',   label: '✅ What went well today?',      placeholder: 'Even tiny wins count.' },
      { key: 'improve',      type: 'textarea',   label: '🔄 What would I do differently?', placeholder: 'No self-criticism  -  just honest reflection.' },
    ],
  },
  {
    id: 'vent',
    label: 'Vent Session',
    emoji: '😤',
    desc: 'Get it all out  -  safely',
    sections: [
      { key: 'mood',         type: 'mood',       label: 'Current mood',                  placeholder: '' },
      { key: 'situation',    type: 'textarea',   label: '😤 What happened?',             placeholder: 'Tell it exactly as you\'d tell a mate. Don\'t hold back.' },
      { key: 'feeling',      type: 'textarea',   label: '💭 How is it making you feel?', placeholder: 'Name it  -  frustrated, overlooked, angry, drained…' },
      { key: 'control',      type: 'textarea',   label: '🎮 What\'s in my control?',     placeholder: 'Even one small thing counts.' },
      { key: 'reframe',      type: 'textarea',   label: '🔭 How might I see this differently in a week?', placeholder: 'Future you looking back…' },
      { key: 'release',      type: 'text-sm',    label: '✋ One thing I\'m letting go of', placeholder: 'Write it here, then leave it here.' },
    ],
  },
  {
    id: 'weekly',
    label: 'Weekly Review',
    emoji: '📊',
    desc: 'Step back and see the bigger picture',
    sections: [
      { key: 'highlight',    type: 'textarea',   label: '⭐ Highlight of the week',      placeholder: 'The moment or win you\'d frame on the wall.' },
      { key: 'challenge',    type: 'textarea',   label: '💪 Biggest challenge I overcame', placeholder: 'What did it teach you?' },
      { key: 'gratitude',    type: 'list3',      label: '3 things I\'m grateful for this week', placeholder: ['', '', ''] },
      { key: 'energy',       type: 'energy',     label: 'Overall energy this week',      placeholder: '' },
      { key: 'relationships',type: 'textarea',   label: '🤝 How were my relationships?', placeholder: 'Anyone you should reach out to? Anyone who showed up for you?' },
      { key: 'nextWeek',     type: 'list3',      label: '3 intentions for next week',    placeholder: ['', '', ''] },
      { key: 'freeWrite',    type: 'textarea',   label: '✍️ Anything else?',             placeholder: 'Whatever needs to come out.' },
    ],
  },
  {
    id: 'free',
    label: 'Free Write',
    emoji: '✍️',
    desc: 'Blank page, your rules',
    sections: [
      { key: 'mood',         type: 'mood',       label: 'How are you feeling?',          placeholder: '' },
      { key: 'freeWrite',    type: 'textarea-xl',label: '',                              placeholder: 'Start writing. Don\'t stop until you\'ve said what needs saying.' },
    ],
  },
]

function todayStr() { return new Date().toISOString().slice(0, 10) }

function fmtDate(str) {
  return new Date(str + 'T12:00:00').toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long', year:'numeric' })
}

function moodEmoji(val) { return MOODS.find(m => m.value === val)?.label || ' - ' }
function moodDesc(val)  { return MOODS.find(m => m.value === val)?.desc  || '' }

// ── Empty entry factory ─────────────────────────────────────────────
function blankEntry(templateId) {
  return {
    id:         Date.now().toString(),
    date:       todayStr(),
    templateId,
    data:       {},
    createdAt:  new Date().toISOString(),
  }
}

// ── Section renderers ───────────────────────────────────────────────
function SectionField({ section, value, onChange, readOnly }) {
  const { key, type, label, placeholder } = section

  const inputStyle = {
    width: '100%', fontSize: '14px', padding: '10px 12px',
    borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)',
    background: readOnly ? 'transparent' : 'var(--bg-input)',
    color: 'var(--text-primary)', resize: 'vertical', lineHeight: 1.6,
    boxSizing: 'border-box',
  }

  if (type === 'mood') {
    return (
      <div>
        {label && <p style={{ fontSize: '13px', fontWeight: 600, marginBottom: '10px' }}>{label}</p>}
        {readOnly
          ? <p style={{ fontSize: '24px' }}>{moodEmoji(value)} <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{moodDesc(value)}</span></p>
          : (
            <div style={{ display: 'flex', gap: '10px' }}>
              {MOODS.map(m => (
                <button key={m.value} onClick={() => onChange(m.value)}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', padding: '10px 14px', borderRadius: 'var(--radius)', border: `2px solid ${value === m.value ? 'var(--accent)' : 'var(--border)'}`, background: value === m.value ? 'var(--accent-soft)' : 'transparent', cursor: 'pointer' }}>
                  <span style={{ fontSize: '22px' }}>{m.label}</span>
                  <span style={{ fontSize: '10px', color: value === m.value ? 'var(--accent)' : 'var(--text-muted)', fontWeight: value === m.value ? 600 : 400 }}>{m.desc}</span>
                </button>
              ))}
            </div>
          )
        }
      </div>
    )
  }

  if (type === 'energy') {
    return (
      <div>
        {label && <p style={{ fontSize: '13px', fontWeight: 600, marginBottom: '10px' }}>{label}</p>}
        {readOnly
          ? <p style={{ fontSize: '18px' }}>{ENERGY.find(e => e.value === value)?.label || ' - '} <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{ENERGY.find(e => e.value === value)?.desc}</span></p>
          : (
            <div style={{ display: 'flex', gap: '10px' }}>
              {ENERGY.map(e => (
                <button key={e.value} onClick={() => onChange(e.value)}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', padding: '10px 18px', borderRadius: 'var(--radius)', border: `2px solid ${value === e.value ? 'var(--accent)' : 'var(--border)'}`, background: value === e.value ? 'var(--accent-soft)' : 'transparent', cursor: 'pointer' }}>
                  <span style={{ fontSize: '18px' }}>{e.label}</span>
                  <span style={{ fontSize: '10px', color: value === e.value ? 'var(--accent)' : 'var(--text-muted)', fontWeight: value === e.value ? 600 : 400 }}>{e.desc}</span>
                </button>
              ))}
            </div>
          )
        }
      </div>
    )
  }

  if (type === 'text-sm') {
    return (
      <div>
        {label && <p style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>{label}</p>}
        {readOnly
          ? <p style={{ fontSize: '14px', color: 'var(--text-secondary)', fontStyle: value ? 'normal' : 'italic' }}>{value || ' - '}</p>
          : <input value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={{ ...inputStyle, padding: '8px 12px' }} />
        }
      </div>
    )
  }

  if (type === 'list3') {
    const list = Array.isArray(value) ? value : ['', '', '']
    return (
      <div>
        {label && <p style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>{label}</p>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {[0, 1, 2].map(i => (
            readOnly
              ? <p key={i} style={{ fontSize: '14px', color: list[i] ? 'var(--text-secondary)' : 'var(--text-muted)', fontStyle: list[i] ? 'normal' : 'italic', paddingLeft: '8px', borderLeft: `2px solid ${list[i] ? 'var(--accent)' : 'var(--border)'}` }}>{list[i] || ' - '}</p>
              : (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', width: 16, flexShrink: 0 }}>{i + 1}.</span>
                  <input value={list[i] || ''} onChange={e => { const n = [...list]; n[i] = e.target.value; onChange(n) }}
                    placeholder={Array.isArray(placeholder) ? placeholder[i] : placeholder}
                    style={{ ...inputStyle, padding: '8px 12px', resize: 'none' }}
                  />
                </div>
              )
          ))}
        </div>
      </div>
    )
  }

  const rows = type === 'textarea-xl' ? 16 : 5
  return (
    <div>
      {label && <p style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>{label}</p>}
      {readOnly
        ? <p style={{ fontSize: '14px', color: value ? 'var(--text-secondary)' : 'var(--text-muted)', lineHeight: 1.7, fontStyle: value ? 'normal' : 'italic', whiteSpace: 'pre-wrap' }}>{value || ' - '}</p>
        : <textarea value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows} style={inputStyle} />
      }
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────
export default function Journal() {
  const [entries, setEntries] = useLocalStorage('danos-journal', [])
  const [screen, setScreen]   = useState('list')   // list | write | read
  const [current, setCurrent] = useState(null)     // entry being written/viewed
  const [filterTemplate, setFilterTemplate] = useState('all')

  const filtered = useMemo(() => {
    const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date))
    return filterTemplate === 'all' ? sorted : sorted.filter(e => e.templateId === filterTemplate)
  }, [entries, filterTemplate])

  function startNew(templateId) {
    setCurrent(blankEntry(templateId))
    setScreen('write')
  }

  function saveEntry() {
    if (!current) return
    setEntries(prev => {
      const existing = prev.findIndex(e => e.id === current.id)
      if (existing >= 0) { const n = [...prev]; n[existing] = current; return n }
      return [current, ...prev]
    })
    setScreen('list')
    setCurrent(null)
  }

  function deleteEntry(id) {
    if (!window.confirm('Delete this entry?')) return
    setEntries(prev => prev.filter(e => e.id !== id))
    if (screen === 'read') { setScreen('list'); setCurrent(null) }
  }

  function updateField(key, val) {
    setCurrent(e => ({ ...e, data: { ...e.data, [key]: val } }))
  }

  const template = current ? TEMPLATES.find(t => t.id === current.templateId) : null

  // ── List screen ─────────────────────────────────────────────────
  if (screen === 'list') return (
    <div>
      <PageHeader title="📓 Journal" subtitle={`${entries.length} entr${entries.length === 1 ? 'y' : 'ies'}`} />

      {/* Template picker */}
      <div style={{ marginBottom: '20px' }}>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px', fontWeight: 500 }}>Start a new entry:</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
          {TEMPLATES.map(t => (
            <button key={t.id} onClick={() => startNew(t.id)}
              style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '14px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--bg-card)', cursor: 'pointer', textAlign: 'left', transition: 'border-color 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              <span style={{ fontSize: '24px', flexShrink: 0 }}>{t.emoji}</span>
              <div>
                <p style={{ fontSize: '13px', fontWeight: 600, marginBottom: '3px' }}>{t.label}</p>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.4 }}>{t.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Past entries */}
      {entries.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>Past entries:</p>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginLeft: 'auto' }}>
              {['all', ...TEMPLATES.map(t => t.id)].map(id => {
                const t = TEMPLATES.find(t => t.id === id)
                return (
                  <button key={id} onClick={() => setFilterTemplate(id)}
                    style={{ padding: '3px 10px', borderRadius: '20px', border: `1px solid ${filterTemplate === id ? 'var(--accent)' : 'var(--border)'}`, background: filterTemplate === id ? 'var(--accent-soft)' : 'transparent', color: filterTemplate === id ? 'var(--accent)' : 'var(--text-secondary)', fontSize: '11px', cursor: 'pointer', fontWeight: filterTemplate === id ? 600 : 400 }}>
                    {id === 'all' ? 'All' : `${t?.emoji} ${t?.label}`}
                  </button>
                )
              })}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filtered.map(entry => {
              const t = TEMPLATES.find(t => t.id === entry.templateId)
              const mood = entry.data?.mood
              const preview = entry.data?.brainDump || entry.data?.freeWrite || entry.data?.situation || entry.data?.highlight || ''
              return (
                <button key={entry.id} onClick={() => { setCurrent(entry); setScreen('read') }}
                  style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--bg-card)', cursor: 'pointer', textAlign: 'left', transition: 'border-color 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                >
                  <span style={{ fontSize: '28px', flexShrink: 0 }}>{mood ? moodEmoji(mood) : t?.emoji}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                      <p style={{ fontSize: '13px', fontWeight: 600 }}>{fmtDate(entry.date)}</p>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', padding: '1px 7px', borderRadius: 10, background: 'var(--bg-badge)' }}>{t?.label}</span>
                    </div>
                    {preview && <p style={{ fontSize: '12px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{preview.slice(0, 120)}</p>}
                  </div>
                  <ChevronRight size={16} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                </button>
              )
            })}
          </div>
        </div>
      )}

      {entries.length === 0 && (
        <Card style={{ textAlign: 'center', padding: '48px' }}>
          <p style={{ fontSize: '40px', marginBottom: '12px' }}>📓</p>
          <p style={{ fontSize: '15px', fontWeight: 600, marginBottom: '6px' }}>Your journal is empty</p>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Pick a template above to write your first entry.</p>
        </Card>
      )}
    </div>
  )

  // ── Write screen ────────────────────────────────────────────────
  if (screen === 'write' && current && template) return (
    <div>
      <PageHeader
        title={`${template.emoji} ${template.label}`}
        subtitle={fmtDate(current.date)}
        action={
          <div style={{ display: 'flex', gap: '8px' }}>
            <Btn variant="ghost" size="sm" onClick={() => { setScreen('list'); setCurrent(null) }}><X size={13}/> Discard</Btn>
            <Btn onClick={saveEntry}>Save entry</Btn>
          </div>
        }
      />
      <div style={{ maxWidth: 720, display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {template.sections.map(section => (
          <SectionField
            key={section.key}
            section={section}
            value={current.data[section.key]}
            onChange={val => updateField(section.key, val)}
            readOnly={false}
          />
        ))}
        <div style={{ display: 'flex', gap: '10px', paddingBottom: '40px' }}>
          <Btn onClick={saveEntry} style={{ fontSize: '14px', padding: '12px 28px' }}>Save entry</Btn>
          <Btn variant="ghost" onClick={() => { setScreen('list'); setCurrent(null) }}>Discard</Btn>
        </div>
      </div>
    </div>
  )

  // ── Read screen ─────────────────────────────────────────────────
  if (screen === 'read' && current && template) return (
    <div>
      <PageHeader
        title={`${template.emoji} ${template.label}`}
        subtitle={fmtDate(current.date)}
        action={
          <div style={{ display: 'flex', gap: '8px' }}>
            <Btn variant="ghost" size="sm" onClick={() => { setScreen('list'); setCurrent(null) }}><ChevronLeft size={13}/> Back</Btn>
            <Btn variant="ghost" size="sm" onClick={() => setScreen('write')}>✏️ Edit</Btn>
            <Btn variant="ghost" size="sm" onClick={() => deleteEntry(current.id)} style={{ color: 'var(--danger)' }}><Trash2 size={13}/></Btn>
          </div>
        }
      />
      <div style={{ maxWidth: 720, display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '40px' }}>
        {template.sections.map(section => (
          <SectionField
            key={section.key}
            section={section}
            value={current.data[section.key]}
            onChange={() => {}}
            readOnly={true}
          />
        ))}
      </div>
    </div>
  )

  return null
}
