import React from 'react'
import { LayoutDashboard, CalendarDays, Lightbulb, ShoppingCart, Heart, Sun, Moon, Shuffle, Trophy, GraduationCap, FolderOpen, Hammer, Flag, Activity, Wallet, Gamepad2, Dumbbell, Brain, Car, Timer, NotebookPen, Sprout } from 'lucide-react'

const PHASE1 = [
  { id: 'dashboard', label: 'Dashboard',    icon: LayoutDashboard },
  { id: 'calendar',  label: 'Calendar',     icon: CalendarDays },
  { id: 'ideas',     label: 'Ideas Wall',   icon: Lightbulb },
  { id: 'shopping',  label: 'Shopping',     icon: ShoppingCart },
  { id: 'pickmeup',  label: 'Pick-me-up',   icon: Heart },
]
const PHASE2 = [
  { id: 'wheel',     label: 'Wheel of Decide',  icon: Shuffle },
  { id: '92club',    label: '92 Club',           icon: Trophy },
  { id: 'coaching',  label: 'Coaching & Quals',  icon: GraduationCap },
  { id: 'projects',  label: 'My Projects',       icon: FolderOpen },
  { id: 'reno',      label: 'House Reno',        icon: Hammer },
]
const PHASE3 = [
  { id: 'f1sim',     label: 'F1 Sim',            icon: Flag },
  { id: 'fitness',   label: 'Fitness',           icon: Activity },
  { id: 'workout',   label: 'Workout Guide',     icon: Dumbbell },
  { id: 'focus',     label: 'Focus Timer',       icon: Timer },
  { id: 'journal',   label: 'Journal',           icon: NotebookPen },
  { id: 'habits',    label: 'Momentum',          icon: Sprout },
  { id: 'quiz',      label: 'Knowledge Quiz',    icon: Brain },
  { id: 'models',    label: 'F1 Models',         icon: Car },
]
const PHASE4 = [
  { id: 'finance',     label: 'Finance',         icon: Wallet },
  { id: 'playstation', label: 'PlayStation',     icon: Gamepad2 },
]

const s = {
  aside: { width: 'var(--sidebar-width)', background: 'var(--bg-sidebar)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', height: '100vh', position: 'fixed', top: 0, left: 0, zIndex: 100, overflowY: 'auto' },
  logo: { display: 'flex', alignItems: 'center', gap: '10px', padding: '0 18px', height: 'var(--header-height)', borderBottom: '1px solid var(--border)', flexShrink: 0 },
  logoImg: { width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', objectPosition: 'center top', border: '2px solid var(--accent)', flexShrink: 0 },
  logoText: { fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '16px', color: 'var(--text-primary)', letterSpacing: '-0.3px' },
  nav: { flex: 1, padding: '10px 8px', overflowY: 'auto' },
  label: { fontSize: '10px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', padding: '8px 10px 4px' },
  item: (active) => ({ display: 'flex', alignItems: 'center', gap: '9px', padding: '8px 10px', borderRadius: 'var(--radius-sm)', cursor: 'pointer', background: active ? 'var(--accent-soft)' : 'transparent', color: active ? 'var(--accent)' : 'var(--text-secondary)', fontWeight: active ? 500 : 400, fontSize: '13px', border: 'none', width: '100%', textAlign: 'left', marginBottom: '1px' }),
  footer: { padding: '10px 8px', borderTop: '1px solid var(--border)' },
}

export default function Sidebar({ active, onNavigate, theme, onToggleTheme, profilePic, osName='DanOS' }) {
  return (
    <aside style={s.aside}>
      <button
        onClick={() => onNavigate('landing')}
        style={{ ...s.logo, cursor: 'pointer', background: 'none', border: 'none', width: '100%', textAlign: 'left' }}
        title="Go to Home"
      >
        <img src={profilePic || "/dan.jpeg"} alt="OS" style={s.logoImg} onError={e => { e.target.src = "/dan.jpeg" }} />
        <span style={s.logoText}>{osName}</span>
      </button>
      <nav style={s.nav}>

        {PHASE1.map(({ id, label, icon: Icon }) => (
          <button key={id} style={s.item(active === id)} onClick={() => onNavigate(id)}><Icon size={15} /> {label}</button>
        ))}

        {PHASE2.map(({ id, label, icon: Icon }) => (
          <button key={id} style={s.item(active === id)} onClick={() => onNavigate(id)}><Icon size={15} /> {label}</button>
        ))}

        {PHASE3.map(({ id, label, icon: Icon }) => (
          <button key={id} style={s.item(active === id)} onClick={() => onNavigate(id)}><Icon size={15} /> {label}</button>
        ))}

        {PHASE4.map(({ id, label, icon: Icon }) => (
          <button key={id} style={s.item(active === id)} onClick={() => onNavigate(id)}><Icon size={15} /> {label}</button>
        ))}

      </nav>
      <div style={s.footer}>
        <button style={{ ...s.item(false), gap: '9px' }} onClick={onToggleTheme}>
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          {theme === 'dark' ? 'Light mode' : 'Dark mode'}
        </button>
      </div>
    </aside>
  )
}
