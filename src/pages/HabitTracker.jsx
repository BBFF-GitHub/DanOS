import React, { useState, useMemo } from 'react'
import Card from '../components/Card'
import PageHeader from '../components/PageHeader'
import Btn from '../components/Btn'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { Plus, Trash2, Pencil, X, Check, Flame, Trophy, TrendingUp } from 'lucide-react'

// ── Helpers ────────────────────────────────────────────────────────
function todayStr() { return new Date().toISOString().slice(0,10) }
function dateStr(d) { return d.toISOString().slice(0,10) }

function addDays(str, n) {
  const d = new Date(str + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return dateStr(d)
}

function daysBetween(a, b) {
  return Math.round((new Date(b+'T12:00:00') - new Date(a+'T12:00:00')) / 86400000)
}

function getLast(n, fromDate = todayStr()) {
  return Array.from({length: n}, (_, i) => addDays(fromDate, -(n-1-i)))
}

const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
const FREQ_LABELS = { daily:'Every day', weekdays:'Weekdays', weekends:'Weekends', custom:'Custom days' }

function isScheduled(habit, dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  const dow = d.getDay() // 0=Sun
  if (habit.freq === 'daily')    return true
  if (habit.freq === 'weekdays') return dow >= 1 && dow <= 5
  if (habit.freq === 'weekends') return dow === 0 || dow === 6
  if (habit.freq === 'custom')   return (habit.days||[]).includes(dow)
  return true
}

function calcStreak(habit) {
  const today = todayStr()
  const done = new Set(habit.completions||[])
  let streak = 0
  let date = today
  // If today isn't scheduled/done yet, start checking from yesterday
  if (!done.has(today)) date = addDays(today, -1)
  while (true) {
    if (!isScheduled(habit, date)) { date = addDays(date, -1); if(daysBetween(date,today)>365) break; continue }
    if (done.has(date)) { streak++; date = addDays(date, -1) }
    else break
    if (daysBetween(date, today) > 365) break
  }
  return streak
}

function calcBestStreak(habit) {
  const done = new Set(habit.completions||[])
  if (!done.size) return 0
  const sorted = [...done].sort()
  let best = 0, cur = 0, prev = null
  for (const d of sorted) {
    if (!isScheduled(habit, d)) continue
    if (prev === null) { cur = 1 }
    else {
      // Check no scheduled day was missed between prev and d
      let missed = false
      let check = addDays(prev, 1)
      while (check < d) {
        if (isScheduled(habit, check)) { missed = true; break }
        check = addDays(check, 1)
      }
      cur = missed ? 1 : cur + 1
    }
    best = Math.max(best, cur)
    prev = d
  }
  return best
}

function completionRate(habit, days = 30) {
  const dates = getLast(days)
  const scheduled = dates.filter(d => isScheduled(habit, d))
  if (!scheduled.length) return 0
  const done = new Set(habit.completions||[])
  const completed = scheduled.filter(d => done.has(d))
  return Math.round(completed.length / scheduled.length * 100)
}

// ── Heatmap cell colours ───────────────────────────────────────────
function heatColor(done, color) {
  if (!done) return 'var(--bg-badge)'
  return color || '#4f6ef7'
}

const EMOJI_OPTIONS = ['💪','🏃','📚','💧','🧘','🥗','😴','✍️','🎯','🚴','🏊','🧹','💊','🌿','🎸','🤸','🧠','❤️','🌅','🚫']
const COLOR_OPTIONS = ['#4f6ef7','#22c55e','#f97316','#ef4444','#a78bfa','#0ea5e9','#fbbf24','#ec4899','#14b8a6','#84cc16']

// ── Habit Form ─────────────────────────────────────────────────────
function HabitForm({ initial, onSave, onCancel }) {
  const [name,   setName]   = useState(initial?.name   || '')
  const [emoji,  setEmoji]  = useState(initial?.emoji  || '⭐')
  const [color,  setColor]  = useState(initial?.color  || '#4f6ef7')
  const [freq,   setFreq]   = useState(initial?.freq   || 'daily')
  const [days,   setDays]   = useState(initial?.days   || [1,2,3,4,5])
  const [note,   setNote]   = useState(initial?.note   || '')

  function save() {
    if (!name.trim()) return
    onSave({ name:name.trim(), emoji, color, freq, days, note })
  }

  return (
    <Card style={{marginBottom:16,border:'1px solid var(--accent-border)'}}>
      <h3 style={{fontSize:'14px',fontWeight:600,marginBottom:'14px'}}>{initial ? 'Edit habit / goal' : 'New habit / goal'}</h3>
      <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>

        {/* Name */}
        <div>
          <label style={{fontSize:'11px',color:'var(--text-muted)',display:'block',marginBottom:'4px'}}>Habit / goal name *</label>
          <input value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Morning run, Read 20 pages, Save £200/month…"
            style={{width:'100%'}} autoFocus onKeyDown={e=>e.key==='Enter'&&save()}/>
        </div>

        {/* Emoji + colour */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
          <div>
            <label style={{fontSize:'11px',color:'var(--text-muted)',display:'block',marginBottom:'6px'}}>Icon</label>
            <div style={{display:'flex',flexWrap:'wrap',gap:'4px'}}>
              {EMOJI_OPTIONS.map(e=>(
                <button key={e} onClick={()=>setEmoji(e)}
                  style={{width:32,height:32,fontSize:'16px',border:`2px solid ${emoji===e?'var(--accent)':'transparent'}`,borderRadius:6,background:emoji===e?'var(--accent-soft)':'var(--bg-input)',cursor:'pointer'}}>
                  {e}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label style={{fontSize:'11px',color:'var(--text-muted)',display:'block',marginBottom:'6px'}}>Colour</label>
            <div style={{display:'flex',flexWrap:'wrap',gap:'6px'}}>
              {COLOR_OPTIONS.map(c=>(
                <button key={c} onClick={()=>setColor(c)}
                  style={{width:28,height:28,borderRadius:'50%',background:c,border:`3px solid ${color===c?'var(--text-primary)':'transparent'}`,cursor:'pointer'}}/>
              ))}
            </div>
          </div>
        </div>

        {/* Frequency */}
        <div>
          <label style={{fontSize:'11px',color:'var(--text-muted)',display:'block',marginBottom:'6px'}}>Frequency</label>
          <div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}>
            {Object.entries(FREQ_LABELS).map(([val,lbl])=>(
              <button key={val} onClick={()=>setFreq(val)}
                style={{padding:'5px 12px',borderRadius:'20px',border:`1px solid ${freq===val?'var(--accent)':'var(--border)'}`,background:freq===val?'var(--accent-soft)':'transparent',color:freq===val?'var(--accent)':'var(--text-secondary)',fontSize:'12px',cursor:'pointer',fontWeight:freq===val?600:400}}>
                {lbl}
              </button>
            ))}
          </div>
          {freq==='custom'&&(
            <div style={{display:'flex',gap:'6px',marginTop:'8px'}}>
              {DAYS.map((d,i)=>(
                <button key={i} onClick={()=>setDays(ds=>ds.includes(i)?ds.filter(x=>x!==i):[...ds,i].sort())}
                  style={{width:36,height:36,borderRadius:'50%',border:`1px solid ${days.includes(i)?color:'var(--border)'}`,background:days.includes(i)?color+'22':'transparent',color:days.includes(i)?color:'var(--text-muted)',fontSize:'11px',fontWeight:600,cursor:'pointer'}}>
                  {d.slice(0,1)}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Note */}
        <div>
          <label style={{fontSize:'11px',color:'var(--text-muted)',display:'block',marginBottom:'4px'}}>Note / why (optional)</label>
          <input value={note} onChange={e=>setNote(e.target.value)} placeholder="Your motivation for this habit or goal…" style={{width:'100%'}}/>
        </div>

        <div style={{display:'flex',gap:'8px'}}>
          <Btn onClick={save} disabled={!name.trim()}>{initial ? 'Save changes' : 'Add habit / goal'}</Btn>
          <Btn variant="ghost" onClick={onCancel}>Cancel</Btn>
        </div>
      </div>
    </Card>
  )
}

// ── Heatmap (12 weeks) ─────────────────────────────────────────────
function Heatmap({ habit }) {
  const today = todayStr()
  // Start from 12 weeks ago, on a Sunday
  const startDate = (() => {
    const d = new Date(today + 'T12:00:00')
    d.setDate(d.getDate() - 83) // ~12 weeks back
    // rewind to Sunday
    d.setDate(d.getDate() - d.getDay())
    return dateStr(d)
  })()

  const weeks = []
  let cur = startDate
  for (let w = 0; w < 13; w++) {
    const week = []
    for (let d = 0; d < 7; d++) {
      week.push(cur)
      cur = addDays(cur, 1)
      if (cur > addDays(today, 1)) break
    }
    weeks.push(week)
    if (cur > addDays(today, 1)) break
  }

  const done = new Set(habit.completions||[])
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

  return (
    <div style={{overflowX:'auto'}}>
      {/* Month labels */}
      <div style={{display:'flex',gap:3,marginBottom:3,paddingLeft:0}}>
        {weeks.map((week,wi)=>{
          const firstDay = new Date(week[0]+'T12:00:00')
          return (
            <div key={wi} style={{width:12,fontSize:'9px',color:'var(--text-muted)',flexShrink:0,overflow:'hidden'}}>
              {firstDay.getDate()<=7 ? months[firstDay.getMonth()] : ''}
            </div>
          )
        })}
      </div>
      <div style={{display:'flex',gap:3}}>
        {weeks.map((week,wi)=>(
          <div key={wi} style={{display:'flex',flexDirection:'column',gap:3}}>
            {week.map(date=>{
              const scheduled = isScheduled(habit, date)
              const completed = done.has(date)
              const future = date > today
              return (
                <div key={date} title={date} style={{
                  width:12, height:12, borderRadius:2,
                  background: future ? 'transparent' : !scheduled ? 'var(--bg-card)' : completed ? habit.color : 'var(--bg-badge)',
                  border: future ? '1px solid var(--border)' : 'none',
                  opacity: future ? 0.3 : 1,
                  flexShrink: 0,
                }}/>
              )
            })}
          </div>
        ))}
      </div>
      <div style={{display:'flex',gap:4,alignItems:'center',marginTop:6}}>
        <span style={{fontSize:'9px',color:'var(--text-muted)'}}>Less</span>
        {['var(--bg-badge)',habit.color+'66',habit.color+'aa',habit.color].map((c,i)=>(
          <div key={i} style={{width:12,height:12,borderRadius:2,background:c}}/>
        ))}
        <span style={{fontSize:'9px',color:'var(--text-muted)'}}>More</span>
      </div>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────
export default function HabitTracker() {
  const [habits, setHabits] = useLocalStorage('danos-habits', [])
  const [tab,    setTab]    = useState('today')   // today | all | stats
  const [showForm, setShowForm] = useState(false)
  const [editing,  setEditing]  = useState(null)  // habit id being edited
  const [expanded, setExpanded] = useState(null)  // habit id expanded for heatmap

  const today = todayStr()
  const todayHabits = habits.filter(h => isScheduled(h, today))

  function toggleToday(id) {
    setHabits(prev => prev.map(h => {
      if (h.id !== id) return h
      const done = new Set(h.completions||[])
      done.has(today) ? done.delete(today) : done.add(today)
      return {...h, completions: [...done]}
    }))
  }

  function addHabit(data) {
    setHabits(prev => [...prev, {...data, id: Date.now().toString(), completions: [], createdAt: today}])
    setShowForm(false)
  }

  function saveEdit(data) {
    setHabits(prev => prev.map(h => h.id===editing ? {...h,...data} : h))
    setEditing(null)
  }

  function deleteHabit(id) {
    if (!window.confirm('Delete this habit and all its history?')) return
    setHabits(prev => prev.filter(h => h.id !== id))
  }

  // Overall stats
  const overallStats = useMemo(() => {
    const total = habits.length
    const todayDone = todayHabits.filter(h => (h.completions||[]).includes(today)).length
    const avgRate = total ? Math.round(habits.reduce((a,h) => a+completionRate(h,30), 0)/total) : 0
    const topStreak = habits.reduce((best,h) => { const s=calcStreak(h); return s>best?s:best }, 0)
    return { total, todayDone, todayTotal: todayHabits.length, avgRate, topStreak }
  }, [habits, today])

  return (
    <div>
      <PageHeader title="🔥 Momentum"
        subtitle={habits.length ? `${overallStats.todayDone}/${overallStats.todayTotal} done today · ${overallStats.avgRate}% avg last 30 days` : 'Your habit & goal tracker'}
        action={<Btn onClick={()=>{setShowForm(true);setEditing(null)}}><Plus size={14}/> Add habit / goal</Btn>}
      />

      {/* Page intro  -  always shown */}
      <div style={{padding:'12px 16px',background:'var(--accent-soft)',borderRadius:'var(--radius)',border:'1px solid var(--accent-border)',marginBottom:'16px',fontSize:'13px',color:'var(--text-secondary)',lineHeight:1.7}}>
        <strong style={{color:'var(--accent)'}}>Momentum</strong> is your personal habit and goal tracker.
        Add anything you want to build consistency around  -  daily exercise, reading, hydration, a new skill, a goal you're working towards.
        Check in each day, watch your streaks grow, and see your progress over time.
      </div>

      {/* Form */}
      {showForm&&!editing&&<HabitForm onSave={addHabit} onCancel={()=>setShowForm(false)}/>}
      {editing&&<HabitForm initial={habits.find(h=>h.id===editing)} onSave={saveEdit} onCancel={()=>setEditing(null)}/>}

      {/* Empty state */}
      {habits.length===0&&!showForm&&(
        <Card style={{textAlign:'center',padding:'48px'}}>
          <p style={{fontSize:'36px',marginBottom:'12px'}}>🌱</p>
          <p style={{fontSize:'15px',fontWeight:600,marginBottom:'6px'}}>No habits yet</p>
          <p style={{fontSize:'13px',color:'var(--text-muted)',marginBottom:'20px'}}>Start small  -  add one habit and build from there.</p>
          <Btn onClick={()=>setShowForm(true)}><Plus size={14}/> Add your first habit</Btn>
        </Card>
      )}

      {habits.length>0&&(
        <>
          {/* Tabs */}
          <div style={{display:'flex',gap:'6px',marginBottom:'16px'}}>
            {[['today','📅 Today'],['all','📋 All habits'],['stats','📊 Stats']].map(([id,lbl])=>(
              <button key={id} onClick={()=>setTab(id)}
                style={{padding:'6px 14px',borderRadius:'20px',border:`1px solid ${tab===id?'var(--accent)':'var(--border)'}`,background:tab===id?'var(--accent-soft)':'transparent',color:tab===id?'var(--accent)':'var(--text-secondary)',fontSize:'13px',cursor:'pointer',fontWeight:tab===id?600:400}}>
                {lbl}
              </button>
            ))}
          </div>

          {/* TODAY TAB */}
          {tab==='today'&&(
            <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
              {todayHabits.length===0&&(
                <Card style={{textAlign:'center',padding:'32px'}}>
                  <p style={{fontSize:'14px',color:'var(--text-muted)'}}>No habits scheduled for today 🎉</p>
                </Card>
              )}
              {todayHabits.map(h=>{
                const done = (h.completions||[]).includes(today)
                const streak = calcStreak(h)
                return (
                  <button key={h.id} onClick={()=>toggleToday(h.id)}
                    style={{display:'flex',alignItems:'center',gap:'14px',padding:'14px 16px',borderRadius:'var(--radius)',border:`2px solid ${done?h.color:'var(--border)'}`,background:done?h.color+'12':'var(--bg-card)',cursor:'pointer',textAlign:'left',transition:'all 0.15s',width:'100%'}}>
                    {/* Check circle */}
                    <div style={{width:40,height:40,borderRadius:'50%',border:`2px solid ${done?h.color:'var(--border)'}`,background:done?h.color:'transparent',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,transition:'all 0.15s'}}>
                      {done ? <Check size={20} color="#fff" strokeWidth={3}/> : <span style={{fontSize:'20px'}}>{h.emoji}</span>}
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <p style={{fontSize:'14px',fontWeight:600,color:done?h.color:'var(--text-primary)',textDecoration:done?'line-through':undefined,marginBottom:'2px'}}>{h.name}</p>
                      <p style={{fontSize:'12px',color:'var(--text-muted)'}}>{FREQ_LABELS[h.freq]||h.freq}{h.note&&` · ${h.note}`}</p>
                    </div>
                    {streak>0&&(
                      <div style={{display:'flex',alignItems:'center',gap:'3px',flexShrink:0}}>
                        <Flame size={14} color="#f97316"/>
                        <span style={{fontSize:'13px',fontWeight:700,color:'#f97316'}}>{streak}</span>
                      </div>
                    )}
                  </button>
                )
              })}

              {/* Quick week view */}
              <Card style={{marginTop:4}}>
                <p style={{fontSize:'12px',fontWeight:600,color:'var(--text-muted)',marginBottom:'10px',textTransform:'uppercase',letterSpacing:'0.05em'}}>This week</p>
                <div style={{display:'flex',flexDirection:'column',gap:'6px'}}>
                  {todayHabits.map(h=>{
                    const week = getLast(7)
                    const done = new Set(h.completions||[])
                    return (
                      <div key={h.id} style={{display:'flex',alignItems:'center',gap:'8px'}}>
                        <span style={{fontSize:'14px',width:20,textAlign:'center'}}>{h.emoji}</span>
                        <span style={{fontSize:'12px',flex:1,minWidth:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',color:'var(--text-secondary)'}}>{h.name}</span>
                        <div style={{display:'flex',gap:'3px'}}>
                          {week.map(d=>{
                            const sched = isScheduled(h,d)
                            const comp  = done.has(d)
                            const isTod = d===today
                            return (
                              <div key={d} title={d} style={{width:18,height:18,borderRadius:3,background:!sched?'transparent':comp?h.color:'var(--bg-badge)',border:isTod?`1px solid ${h.color}`:'1px solid transparent',opacity:!sched?0.15:1}}/>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </Card>
            </div>
          )}

          {/* ALL HABITS TAB */}
          {tab==='all'&&(
            <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
              {habits.map(h=>{
                const streak = calcStreak(h)
                const best   = calcBestStreak(h)
                const rate   = completionRate(h, 30)
                const isExp  = expanded===h.id
                const todayDone = (h.completions||[]).includes(today)
                return (
                  <Card key={h.id} style={{borderLeft:`3px solid ${h.color}`}}>
                    <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
                      <div style={{width:40,height:40,borderRadius:'50%',background:h.color+'22',border:`2px solid ${h.color}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'20px',flexShrink:0}}>
                        {h.emoji}
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <p style={{fontSize:'14px',fontWeight:600,marginBottom:'2px'}}>{h.name}</p>
                        <p style={{fontSize:'11px',color:'var(--text-muted)'}}>{FREQ_LABELS[h.freq]||h.freq}{h.note&&` · ${h.note}`}</p>
                      </div>
                      <div style={{display:'flex',gap:'12px',alignItems:'center',flexShrink:0}}>
                        {streak>0&&<div style={{textAlign:'center'}}>
                          <p style={{fontSize:'14px',fontWeight:700,color:'#f97316',lineHeight:1}}>🔥{streak}</p>
                          <p style={{fontSize:'9px',color:'var(--text-muted)'}}>streak</p>
                        </div>}
                        <div style={{textAlign:'center'}}>
                          <p style={{fontSize:'14px',fontWeight:700,color:h.color,lineHeight:1}}>{rate}%</p>
                          <p style={{fontSize:'9px',color:'var(--text-muted)'}}>30d</p>
                        </div>
                        {isScheduled(h,today)&&(
                          <button onClick={()=>toggleToday(h.id)}
                            style={{width:32,height:32,borderRadius:'50%',border:`2px solid ${todayDone?h.color:'var(--border)'}`,background:todayDone?h.color:'transparent',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',flexShrink:0}}>
                            {todayDone&&<Check size={14} color="#fff" strokeWidth={3}/>}
                          </button>
                        )}
                        <button onClick={()=>setExpanded(isExp?null:h.id)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)',fontSize:'12px',padding:'0 2px'}}>
                          {isExp?'▲':'▼'}
                        </button>
                        <button onClick={()=>{setEditing(h.id);setShowForm(false)}} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)'}}><Pencil size={13}/></button>
                        <button onClick={()=>deleteHabit(h.id)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--danger)'}}><Trash2 size={13}/></button>
                      </div>
                    </div>
                    {isExp&&(
                      <div style={{marginTop:'14px',paddingTop:'14px',borderTop:'1px solid var(--border)'}}>
                        <div style={{display:'flex',gap:'16px',marginBottom:'12px',flexWrap:'wrap'}}>
                          {[['🔥 Current streak',`${streak} days`],['🏆 Best streak',`${best} days`],['📊 30-day rate',`${rate}%`],['📅 Total done',`${(h.completions||[]).length} times`]].map(([lbl,val])=>(
                            <div key={lbl}>
                              <p style={{fontSize:'10px',color:'var(--text-muted)',marginBottom:'2px'}}>{lbl}</p>
                              <p style={{fontSize:'14px',fontWeight:700,color:h.color}}>{val}</p>
                            </div>
                          ))}
                        </div>
                        <Heatmap habit={h}/>
                      </div>
                    )}
                  </Card>
                )
              })}
            </div>
          )}

          {/* STATS TAB */}
          {tab==='stats'&&(
            <div style={{display:'flex',flexDirection:'column',gap:'16px'}}>
              {/* Headline */}
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))',gap:'10px'}}>
                {[
                  ['🌱','Total habits',habits.length,'var(--accent)'],
                  ['✅','Today done',`${overallStats.todayDone}/${overallStats.todayTotal}`,'var(--success)'],
                  ['🔥','Best streak today',overallStats.topStreak,'#f97316'],
                  ['📊','Avg 30-day rate',`${overallStats.avgRate}%`,'var(--warning)'],
                ].map(([em,lbl,val,color])=>(
                  <Card key={lbl} style={{textAlign:'center',padding:'16px'}}>
                    <p style={{fontSize:'22px',marginBottom:'4px'}}>{em}</p>
                    <p style={{fontFamily:'var(--font-display)',fontSize:'20px',fontWeight:700,color,lineHeight:1}}>{val}</p>
                    <p style={{fontSize:'11px',color:'var(--text-muted)',marginTop:'4px'}}>{lbl}</p>
                  </Card>
                ))}
              </div>

              {/* Per-habit breakdown */}
              {habits.map(h=>{
                const streak = calcStreak(h)
                const best   = calcBestStreak(h)
                const rate   = completionRate(h, 30)
                return (
                  <Card key={h.id}>
                    <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'12px'}}>
                      <span style={{fontSize:'20px'}}>{h.emoji}</span>
                      <p style={{fontSize:'14px',fontWeight:600,flex:1}}>{h.name}</p>
                      <span style={{fontSize:'12px',color:'var(--text-muted)'}}>{FREQ_LABELS[h.freq]}</span>
                    </div>
                    {/* 30-day bar */}
                    <div style={{marginBottom:'12px'}}>
                      <div style={{display:'flex',justifyContent:'space-between',fontSize:'11px',color:'var(--text-muted)',marginBottom:'4px'}}>
                        <span>30-day completion</span><span style={{fontWeight:600,color:h.color}}>{rate}%</span>
                      </div>
                      <div style={{height:6,background:'var(--bg-badge)',borderRadius:3,overflow:'hidden'}}>
                        <div style={{height:'100%',width:`${rate}%`,background:h.color,borderRadius:3,transition:'width 0.4s'}}/>
                      </div>
                    </div>
                    <div style={{display:'flex',gap:'16px'}}>
                      <div><p style={{fontSize:'10px',color:'var(--text-muted)'}}>Current streak</p><p style={{fontWeight:700,color:'#f97316'}}>🔥 {streak} days</p></div>
                      <div><p style={{fontSize:'10px',color:'var(--text-muted)'}}>Best streak</p><p style={{fontWeight:700,color:h.color}}>🏆 {best} days</p></div>
                      <div><p style={{fontSize:'10px',color:'var(--text-muted)'}}>Total check-ins</p><p style={{fontWeight:700,color:'var(--text-secondary)'}}>{(h.completions||[]).length}</p></div>
                    </div>
                    <div style={{marginTop:'12px'}}>
                      <Heatmap habit={h}/>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
