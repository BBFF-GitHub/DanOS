import React, { useState, useMemo } from 'react'
import { Sun, Moon, Settings, X, Camera, LayoutDashboard, CalendarDays, Lightbulb, ShoppingCart, Heart, Shuffle, Trophy, GraduationCap, FolderOpen, Hammer, Flag, Activity, Wallet, Gamepad2, Dumbbell, Brain, Car, Timer, NotebookPen, Sprout } from 'lucide-react'
import Btn from '../components/Btn'

const ALL_MODULES = [
  { id: 'dashboard', label: 'Dashboard',         icon: LayoutDashboard, color: '#4f6ef7', emoji: '🖥️',  desc: 'Overview of everything',           phase: 1 },
  { id: 'calendar',  label: 'Calendar',           icon: CalendarDays,    color: '#22c55e', emoji: '📅',  desc: 'Events & birthdays',               phase: 1 },
  { id: 'ideas',     label: 'Ideas Wall',         icon: Lightbulb,       color: '#f59e0b', emoji: '💡',  desc: 'Your sticky thoughts',             phase: 1 },
  { id: 'shopping',  label: 'Shopping',           icon: ShoppingCart,    color: '#34d974', emoji: '🛒',  desc: 'Lists & stock',                    phase: 1 },
  { id: 'pickmeup',  label: 'Pick-me-up',         icon: Heart,           color: '#ff6b9d', emoji: '❤️',  desc: 'Verses & encouragement',           phase: 1 },
  { id: 'wheel',     label: 'Wheel of Decide',    icon: Shuffle,         color: '#a78bfa', emoji: '🎡',  desc: 'Spin to pick what to do',          phase: 2 },
  { id: '92club',    label: '92 Club',            icon: Trophy,          color: '#f59e0b', emoji: '⚽',  desc: 'Ground tracker & fixtures',        phase: 2 },
  { id: 'coaching',  label: 'Coaching & Quals',   icon: GraduationCap,   color: '#6b84f8', emoji: '🎓',  desc: 'Qualifications tracker',           phase: 2 },
  { id: 'projects',  label: 'My Projects',        icon: FolderOpen,      color: '#f97316', emoji: '🚀',  desc: 'Apps & project links',             phase: 2 },
  { id: 'reno',      label: 'House Reno',         icon: Hammer,          color: '#84cc16', emoji: '🏠',  desc: 'Projects & to-do lists',           phase: 2 },
  { id: 'f1sim',     label: 'F1 Sim',             icon: Flag,            color: '#ef4444', emoji: '🏎️',  desc: 'Career mode race tracker',         phase: 3 },
  { id: 'fitness',   label: 'Fitness',             icon: Activity,        color: '#f97316', emoji: '💪',  desc: 'Activity log & Strava/Apple',      phase: 3 },
  { id: 'workout',   label: 'Workout Guide',       icon: Dumbbell,        color: '#a78bfa', emoji: '🏋️',  desc: 'Exercises & AI workout plans',     phase: 3 },
  { id: 'focus',     label: 'Focus Timer',         icon: Timer,           color: '#0ea5e9', emoji: '⏱️',  desc: 'Pomodoro & deep work timer',       phase: 3 },
  { id: 'journal',   label: 'Journal',             icon: NotebookPen,     color: '#8b5cf6', emoji: '📓',  desc: 'Daily check-ins & reflections',    phase: 3 },
  { id: 'habits',    label: 'Momentum',            icon: Sprout,          color: '#22c55e', emoji: '🔥',  desc: 'Habit & goal tracker  -  build streaks, stay consistent', phase: 3 },
  { id: 'quiz',      label: 'Knowledge Quiz',      icon: Brain,           color: '#6b84f8', emoji: '🧠',  desc: 'F1 & football quiz',               phase: 3 },
  { id: 'models',    label: 'F1 Models',           icon: Car,             color: '#ef4444', emoji: '🏎️',  desc: 'Diecast & Lego collection',        phase: 4 },
  { id: 'finance',     label: 'Finance',           icon: Wallet,          color: '#22c55e', emoji: '💷',  desc: 'Open Banking dashboard',           phase: 4 },
  { id: 'playstation', label: 'PlayStation',       icon: Gamepad2,        color: '#003087', emoji: '🎮',  desc: 'Trophy tracker',                   phase: 4 },
]






function ProfilePic({ config, setConfig }) {
  const fileRef = React.useRef()
  const src = config.profilePic || '/dan.jpeg'

  function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      setConfig(c => ({ ...c, profilePic: ev.target.result }))
    }
    reader.readAsDataURL(file)
  }

  return (
    <div style={{ display: 'inline-block', marginBottom: '16px', position: 'relative' }}>
      <img
        src={src}
        alt="Dan"
        style={{ width: 88, height: 88, borderRadius: '50%', objectFit: 'cover', objectPosition: 'center top', border: '3px solid var(--accent)', boxShadow: '0 8px 24px rgba(79,110,247,0.35)', display: 'block' }}
        onError={e => { e.target.src = '/dan.jpeg' }}
      />
      <button
        onClick={() => fileRef.current?.click()}
        title="Change photo"
        style={{ position: 'absolute', bottom: 2, right: 2, width: 26, height: 26, borderRadius: '50%', background: 'var(--accent)', border: '2px solid var(--bg-app)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.3)' }}
      >
        <Camera size={12} color="#fff" />
      </button>
      <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
    </div>
  )
}

export default function Landing({ config, setConfig, onNavigate, theme, onToggleTheme, pickmeups, events, shoppingLists, ideas }) {
  const [showSettings, setShowSettings] = useState(false)
  const [editConfig, setEditConfig] = useState(config)

  const randomPickup = useMemo(() => pickmeups.length > 0 ? pickmeups[Math.floor(Math.random() * pickmeups.length)] : null, [pickmeups])
  const now = new Date()
  const dateStr = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  function saveSettings() { setConfig(editConfig); setShowSettings(false) }
  function togglePinned(id) {
    setEditConfig(c => ({ ...c, pinnedModules: c.pinnedModules.includes(id) ? c.pinnedModules.filter(m => m !== id) : [...c.pinnedModules, id] }))
  }

  const pinnedModules = ALL_MODULES.filter(m => (config.pinnedModules || []).includes(m.id))


  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-app)', display: 'flex', flexDirection: 'column' }}>
      {/* Top bar */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', padding: '16px 32px', gap: '8px' }}>
        <span style={{ fontSize: '13px', color: 'var(--text-muted)', marginRight: 'auto' }}>{dateStr}</span>
        <button onClick={onToggleTheme} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '7px 10px', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </button>
        <button onClick={() => { setEditConfig(config); setShowSettings(true) }} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '7px 10px', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
          <Settings size={15} /> Customise
        </button>
      </div>

      {/* Hero */}
      <div style={{ textAlign: 'center', padding: '32px 32px 24px' }}>
        <ProfilePic config={config} setConfig={setConfig} />
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '34px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.5px', lineHeight: 1.1, marginBottom: '8px' }}>{config.greeting}</h1>
        <p style={{ fontSize: '16px', color: 'var(--text-secondary)' }}>{config.subtitle}</p>
      </div>



      {/* All modules */}
      {pinnedModules.length > 0 && (
        <ModuleSection label="" modules={pinnedModules} onNavigate={onNavigate} />
      )}



      {/* Pick-me-up quote */}
      {config.showQuote && randomPickup && (
        <div style={{ padding: '0 32px 40px', maxWidth: '680px', margin: '0 auto', width: '100%', textAlign: 'center' }}>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', fontStyle: 'italic', lineHeight: 1.7 }}>"{randomPickup.text}"</p>
          {randomPickup.source && <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}> -  {randomPickup.source}</p>}
        </div>
      )}

      {/* Settings modal */}
      {showSettings && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
          <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: '28px', width: '500px', maxWidth: '90vw', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 600 }}>Customise landing page</h2>
              <button onClick={() => setShowSettings(false)} style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div><label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>OS Name (shown in sidebar)</label><input value={editConfig.osName||'DanOS'} onChange={e => setEditConfig(c => ({ ...c, osName: e.target.value }))} placeholder="DanOS" /></div>
              <div><label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Greeting</label><input value={editConfig.greeting} onChange={e => setEditConfig(c => ({ ...c, greeting: e.target.value }))} /></div>
              <div><label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Subtitle</label><input value={editConfig.subtitle} onChange={e => setEditConfig(c => ({ ...c, subtitle: e.target.value }))} /></div>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>Pinned modules</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  {ALL_MODULES.map(mod => (
                    <label key={mod.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '7px 10px', borderRadius: 'var(--radius-sm)', background: (editConfig.pinnedModules || []).includes(mod.id) ? 'var(--accent-soft)' : 'var(--bg-input)' }}>
                      <input type="checkbox" checked={(editConfig.pinnedModules || []).includes(mod.id)} onChange={() => togglePinned(mod.id)} style={{ width: 'auto', accentColor: 'var(--accent)' }} />
                      <span style={{ fontSize: '16px' }}>{mod.emoji}</span>
                      <span style={{ fontSize: '13px', fontWeight: 500 }}>{mod.label}</span>
        
                    </label>
                  ))}
                </div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '8px 10px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-input)' }}>
                <input type="checkbox" checked={editConfig.showQuote} onChange={() => setEditConfig(c => ({ ...c, showQuote: !c.showQuote }))} style={{ width: 'auto', accentColor: 'var(--accent)' }} />
                <span style={{ fontSize: '13px', fontWeight: 500 }}>Show pick-me-up quote</span>
              </label>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
              <Btn onClick={saveSettings}>Save changes</Btn>
              <Btn variant="ghost" onClick={() => setShowSettings(false)}>Cancel</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}



function ModuleSection({ label, modules, onNavigate }) {
  return (
    <div style={{ padding: '0 32px 20px', maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
      {label && <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px', textAlign: 'center' }}>{label}</p>}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(150px, 1fr))`, gap: '12px' }}>
        {modules.map(mod => (
          <button
            key={mod.id}
            onClick={() => onNavigate(mod.id)}
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px 16px', cursor: 'pointer', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', transition: 'transform 0.15s, box-shadow 0.15s, border-color 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; e.currentTarget.style.borderColor = mod.color }}
            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; e.currentTarget.style.borderColor = 'var(--border)' }}
          >
            <div style={{ width: 46, height: 46, borderRadius: '12px', background: mod.color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>{mod.emoji}</div>
            <div>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{mod.label}</p>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{mod.desc}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
