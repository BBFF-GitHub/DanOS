import React, { useState, useEffect, useRef, useCallback } from 'react'
import Card from '../components/Card'
import PageHeader from '../components/PageHeader'
import Btn from '../components/Btn'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { Play, Pause, RotateCcw, SkipForward, Plus, Trash2, Check, X } from 'lucide-react'

// ── Presets ────────────────────────────────────────────────────────
const DEFAULT_PRESETS = [
  { id:'pomodoro',  label:'Pomodoro',    work:25, rest:5,  long:15, rounds:4 },
  { id:'deep',      label:'Deep Work',   work:50, rest:10, long:20, rounds:3 },
  { id:'short',     label:'Quick Focus', work:15, rest:3,  long:10, rounds:4 },
]

function fmt(secs) {
  const m = Math.floor(secs / 60).toString().padStart(2,'0')
  const s = (secs % 60).toString().padStart(2,'0')
  return `${m}:${s}`
}

function ring(pct, r=88) {
  const circ = 2 * Math.PI * r
  return circ - (circ * pct)
}

// ── Main Component ─────────────────────────────────────────────────
export default function FocusTimer() {
  const [timerData, setTimerData] = useLocalStorage('danos-focus-timer', {
    customPresets: [],
    taskLog: [],
    totalFocusMins: 0,
    sessionsCompleted: 0,
    ringStyle: 'chime',    // chime | bell | pulse | silent
    ringDuration: 3,       // seconds
  })

  // Active timer state (not persisted  -  resets on refresh intentionally)
  const [preset,       setPreset]      = useState(DEFAULT_PRESETS[0])
  const [phase,        setPhase]       = useState('work')  // work | rest | longrest
  const [round,        setRound]       = useState(1)
  const [remaining,    setRemaining]   = useState(DEFAULT_PRESETS[0].work * 60)
  const [running,      setRunning]     = useState(false)
  const [done,         setDone]        = useState(false)
  const [taskInput,    setTaskInput]   = useState('')
  const [currentTask,  setCurrentTask] = useState('')
  const [showSettings, setShowSettings]= useState(false)
  const [newPreset,    setNewPreset]   = useState({label:'',work:25,rest:5,long:15,rounds:4})
  const intervalRef = useRef(null)
  const audioCtx    = useRef(null)

  const allPresets = [...DEFAULT_PRESETS, ...(timerData.customPresets||[])]

  // ── Sound ──────────────────────────────────────────────────────
  function playBeep(freq=880, duration=0.3, vol=0.3) {
    try {
      if (!audioCtx.current) audioCtx.current = new (window.AudioContext||window.webkitAudioContext)()
      const ctx = audioCtx.current
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      osc.frequency.value = freq
      osc.type = 'sine'
      gain.gain.setValueAtTime(vol, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + duration)
    } catch {}
  }

  function playRing(style, duration) {
    if (style === 'silent') return
    const d = duration || 3
    const ctx = audioCtx.current || (audioCtx.current = new (window.AudioContext||window.webkitAudioContext)())
    const endTime = ctx.currentTime + d

    if (style === 'chime') {
      // Ascending chime  -  repeats until duration
      const notes = [523, 659, 784, 1047]
      let t = ctx.currentTime
      while (t < endTime - 0.5) {
        notes.forEach((freq, i) => {
          const osc = ctx.createOscillator(); const gain = ctx.createGain()
          osc.connect(gain); gain.connect(ctx.destination)
          osc.frequency.value = freq; osc.type = 'sine'
          gain.gain.setValueAtTime(0.15, t + i*0.13)
          gain.gain.exponentialRampToValueAtTime(0.001, t + i*0.13 + 0.4)
          osc.start(t + i*0.13); osc.stop(t + i*0.13 + 0.4)
        })
        t += 0.7
      }
    } else if (style === 'bell') {
      // Deep bell  -  single resonant tone
      let t = ctx.currentTime
      while (t < endTime - 0.8) {
        const osc = ctx.createOscillator(); const gain = ctx.createGain()
        osc.connect(gain); gain.connect(ctx.destination)
        osc.frequency.value = 440; osc.type = 'triangle'
        gain.gain.setValueAtTime(0.25, t)
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.8)
        osc.start(t); osc.stop(t + 0.8)
        t += 1.2
      }
    } else if (style === 'pulse') {
      // Short quick pulses
      let t = ctx.currentTime
      while (t < endTime - 0.1) {
        const osc = ctx.createOscillator(); const gain = ctx.createGain()
        osc.connect(gain); gain.connect(ctx.destination)
        osc.frequency.value = 880; osc.type = 'square'
        gain.gain.setValueAtTime(0.1, t)
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08)
        osc.start(t); osc.stop(t + 0.08)
        t += 0.25
      }
    }
  }

  function playComplete() {
    try {
      if (!audioCtx.current) audioCtx.current = new (window.AudioContext||window.webkitAudioContext)()
      playRing(timerData.ringStyle||'chime', timerData.ringDuration||3)
    } catch {}
  }

  function testRing() {
    try {
      if (!audioCtx.current) audioCtx.current = new (window.AudioContext||window.webkitAudioContext)()
      playRing(timerData.ringStyle||'chime', Math.min(timerData.ringDuration||3, 2))
    } catch {}
  }

  // ── Timer tick ─────────────────────────────────────────────────
  const advance = useCallback(() => {
    setRemaining(prev => {
      if (prev > 1) return prev - 1
      // Phase complete
      playComplete()
      setRunning(false)
      setPhase(ph => {
        setRound(r => {
          const isLongRest = ph === 'work' && r % preset.rounds === 0
          const nextPhase = ph === 'work'
            ? (isLongRest ? 'longrest' : 'rest')
            : 'work'
          const nextRound = ph !== 'work' ? r + 1 : r

          // Log completed focus session
          if (ph === 'work') {
            setTimerData(td => ({
              ...td,
              totalFocusMins: (td.totalFocusMins||0) + preset.work,
              sessionsCompleted: (td.sessionsCompleted||0) + 1,
              taskLog: currentTask ? [{
                task: currentTask,
                mins: preset.work,
                date: new Date().toISOString().slice(0,10),
                preset: preset.label,
              }, ...(td.taskLog||[])].slice(0,100) : td.taskLog,
            }))
          }

          const nextDuration =
            nextPhase === 'work'     ? preset.work * 60 :
            nextPhase === 'longrest' ? preset.long * 60 :
                                       preset.rest * 60
          setRemaining(nextDuration)
          return nextRound
        })
        return ph === 'work' ? (ph === 'work' ? 'rest' : 'work') : 'work'
      })
      return 0
    })
  }, [preset, currentTask, setTimerData])

  // Fix advance  -  simpler re-implementation to avoid closure issues
  const tickRef = useRef(null)
  tickRef.current = { preset, round, phase, currentTask }

  useEffect(() => {
    if (!running) { clearInterval(intervalRef.current); return }
    intervalRef.current = setInterval(() => {
      setRemaining(prev => {
        if (prev > 1) return prev - 1
        const { preset, round, phase, currentTask } = tickRef.current
        clearInterval(intervalRef.current)
        setRunning(false)
        playComplete()
        const isLastRound = round >= preset.rounds && phase === 'work'
        const isLongRest  = phase === 'work' && round % preset.rounds === 0
        const nextPhase   = phase === 'work' ? (isLongRest ? 'longrest' : 'rest') : 'work'
        const nextRound   = phase !== 'work' ? round + 1 : round
        const nextSecs    = nextPhase === 'work' ? preset.work*60 : nextPhase === 'longrest' ? preset.long*60 : preset.rest*60
        if (phase === 'work') {
          setTimerData(td => ({
            ...td,
            totalFocusMins: (td.totalFocusMins||0) + preset.work,
            sessionsCompleted: (td.sessionsCompleted||0) + 1,
            taskLog: currentTask ? [{
              task: currentTask, mins: preset.work,
              date: new Date().toISOString().slice(0,10), preset: preset.label,
            }, ...(td.taskLog||[])].slice(0,100) : (td.taskLog||[]),
          }))
        }
        setPhase(nextPhase)
        setRound(nextRound)
        setRemaining(nextSecs)
        return 0
      })
    }, 1000)
    return () => clearInterval(intervalRef.current)
  }, [running])

  function applyPreset(p) {
    setPreset(p); setPhase('work'); setRound(1)
    setRemaining(p.work * 60); setRunning(false)
  }

  function reset() {
    setRunning(false)
    setPhase('work'); setRound(1)
    setRemaining(preset.work * 60)
  }

  function skip() {
    setRunning(false)
    const isLongRest = phase === 'work' && round % preset.rounds === 0
    const next = phase === 'work' ? (isLongRest ? 'longrest' : 'rest') : 'work'
    const nextRound = phase !== 'work' ? round + 1 : round
    setPhase(next); setRound(nextRound)
    setRemaining(next === 'work' ? preset.work*60 : next === 'longrest' ? preset.long*60 : preset.rest*60)
  }

  const total     = phase === 'work' ? preset.work*60 : phase === 'longrest' ? preset.long*60 : preset.rest*60
  const pct       = remaining / total
  const isWork    = phase === 'work'
  const phaseColor= isWork ? '#4f6ef7' : phase === 'longrest' ? '#22c55e' : '#f97316'
  const phaseName = isWork ? 'Focus' : phase === 'longrest' ? 'Long Break' : 'Short Break'

  const SIZE = 240, R = 96, CX = SIZE/2

  return (
    <div>
      <PageHeader title="⏱ Focus Timer"
        subtitle={`${(timerData.totalFocusMins||0).toLocaleString()} mins focused · ${timerData.sessionsCompleted||0} sessions`}
        action={<Btn variant="ghost" size="sm" onClick={()=>setShowSettings(s=>!s)}>⚙️ {showSettings?'Hide':'Settings'}</Btn>}
      />

      <div style={{display:'grid',gridTemplateColumns:'1fr 340px',gap:'20px',alignItems:'start'}}>

        {/* ── Left: main timer ─────────────────────────────────── */}
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'20px'}}>

          {/* Preset pills */}
          <div style={{display:'flex',gap:'8px',flexWrap:'wrap',justifyContent:'center'}}>
            {allPresets.map(p=>(
              <button key={p.id||p.label} onClick={()=>applyPreset(p)}
                style={{padding:'6px 16px',borderRadius:'20px',border:`1px solid ${preset.id===p.id||preset.label===p.label?phaseColor:'var(--border)'}`,background:preset.id===p.id||preset.label===p.label?phaseColor+'22':'transparent',color:preset.id===p.id||preset.label===p.label?phaseColor:'var(--text-secondary)',fontSize:'13px',cursor:'pointer',fontWeight:preset.label===p.label?600:400}}>
                {p.label}
              </button>
            ))}
          </div>

          {/* Task input */}
          {!currentTask ? (
            <div style={{display:'flex',gap:'8px',width:'100%',maxWidth:380}}>
              <input value={taskInput} onChange={e=>setTaskInput(e.target.value)}
                onKeyDown={e=>e.key==='Enter'&&taskInput.trim()&&setCurrentTask(taskInput.trim())}
                placeholder="What are you working on? (optional)"
                style={{flex:1,fontSize:'13px',padding:'8px 12px'}}
              />
              <Btn size="sm" onClick={()=>taskInput.trim()&&setCurrentTask(taskInput.trim())} disabled={!taskInput.trim()}>Set</Btn>
            </div>
          ) : (
            <div style={{display:'flex',alignItems:'center',gap:'8px',padding:'8px 14px',background:'var(--accent-soft)',borderRadius:'var(--radius)',border:'1px solid var(--accent-border)'}}>
              <span style={{fontSize:'13px',color:'var(--accent)',fontWeight:500}}>🎯 {currentTask}</span>
              <button onClick={()=>{setCurrentTask('');setTaskInput('')}} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)',padding:'0 2px'}}><X size={13}/></button>
            </div>
          )}

          {/* SVG Ring Timer */}
          <div style={{position:'relative',userSelect:'none'}}>
            <svg width={SIZE} height={SIZE}>
              {/* Background track */}
              <circle cx={CX} cy={CX} r={R} fill="none" stroke="var(--border)" strokeWidth={10}/>
              {/* Progress arc */}
              <circle cx={CX} cy={CX} r={R} fill="none"
                stroke={phaseColor} strokeWidth={10}
                strokeLinecap="round"
                strokeDasharray={2*Math.PI*R}
                strokeDashoffset={ring(pct, R)}
                transform={`rotate(-90 ${CX} ${CX})`}
                style={{transition:'stroke-dashoffset 0.8s linear,stroke 0.4s'}}
              />
              {/* Centre text */}
              <text x={CX} y={CX-18} textAnchor="middle" fontSize="13" fill="var(--text-muted)" fontWeight="600"
                style={{textTransform:'uppercase',letterSpacing:'0.1em'}}>{phaseName}</text>
              <text x={CX} y={CX+20} textAnchor="middle" fontSize="42" fill="var(--text-primary)"
                fontFamily="var(--font-display)" fontWeight="700">{fmt(remaining)}</text>
              <text x={CX} y={CX+44} textAnchor="middle" fontSize="12" fill="var(--text-muted)">
                Round {round} of {preset.rounds}
              </text>
            </svg>
          </div>

          {/* Controls */}
          <div style={{display:'flex',gap:'12px',alignItems:'center'}}>
            <button onClick={reset} title="Reset"
              style={{background:'var(--bg-input)',border:'1px solid var(--border)',borderRadius:'50%',width:40,height:40,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:'var(--text-secondary)'}}>
              <RotateCcw size={16}/>
            </button>
            <button onClick={()=>setRunning(r=>!r)}
              style={{background:phaseColor,border:'none',borderRadius:'50%',width:64,height:64,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:'#fff',boxShadow:`0 4px 20px ${phaseColor}66`,transition:'transform 0.1s'}}>
              {running ? <Pause size={26}/> : <Play size={26} style={{marginLeft:3}}/>}
            </button>
            <button onClick={skip} title="Skip phase"
              style={{background:'var(--bg-input)',border:'1px solid var(--border)',borderRadius:'50%',width:40,height:40,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:'var(--text-secondary)'}}>
              <SkipForward size={16}/>
            </button>
          </div>

          {/* Phase indicator dots */}
          <div style={{display:'flex',gap:'8px'}}>
            {Array.from({length:preset.rounds}).map((_,i)=>(
              <div key={i} style={{display:'flex',gap:'3px',alignItems:'center'}}>
                <div style={{width:8,height:8,borderRadius:'50%',background:i<round-1?phaseColor:i===round-1&&isWork?phaseColor:'var(--border)',opacity:i<round-1?1:i===round-1?1:0.3,transition:'background 0.3s'}}/>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right: log + settings ─────────────────────────────── */}
        <div style={{display:'flex',flexDirection:'column',gap:'16px'}}>

          {showSettings && (
            <>
            <Card>
              <h3 style={{fontFamily:'var(--font-display)',fontSize:'14px',fontWeight:600,marginBottom:'12px'}}>Ring settings</h3>
              <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
                <div>
                  <label style={{fontSize:'11px',color:'var(--text-muted)',display:'block',marginBottom:'6px'}}>Ring style</label>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'6px'}}>
                    {[['chime','🎵 Chime'],['bell','🔔 Bell'],['pulse','📳 Pulse'],['silent','🔇 Silent']].map(([val,label])=>(
                      <button key={val} onClick={()=>setTimerData(td=>({...td,ringStyle:val}))}
                        style={{padding:'8px',borderRadius:'var(--radius-sm)',border:`1px solid ${(timerData.ringStyle||'chime')===val?'var(--accent)':'var(--border)'}`,background:(timerData.ringStyle||'chime')===val?'var(--accent-soft)':'transparent',color:(timerData.ringStyle||'chime')===val?'var(--accent)':'var(--text-secondary)',cursor:'pointer',fontSize:'12px',fontWeight:(timerData.ringStyle||'chime')===val?600:400}}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={{fontSize:'11px',color:'var(--text-muted)',display:'block',marginBottom:'6px'}}>Ring duration: <strong>{timerData.ringDuration||3}s</strong></label>
                  <input type="range" min={1} max={10} value={timerData.ringDuration||3}
                    onChange={e=>setTimerData(td=>({...td,ringDuration:parseInt(e.target.value)}))}
                    style={{width:'100%',accentColor:'var(--accent)'}}
                  />
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:'10px',color:'var(--text-muted)'}}>
                    <span>1s</span><span>10s</span>
                  </div>
                </div>
                <button onClick={testRing}
                  style={{padding:'7px',borderRadius:'var(--radius-sm)',border:'1px solid var(--border)',background:'var(--bg-input)',cursor:'pointer',color:'var(--text-secondary)',fontSize:'12px'}}>
                  🔊 Test ring
                </button>
              </div>
            </Card>

            <Card>
              <h3 style={{fontFamily:'var(--font-display)',fontSize:'14px',fontWeight:600,marginBottom:'12px'}}>Custom preset</h3>
              <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
                <input value={newPreset.label} onChange={e=>setNewPreset(p=>({...p,label:e.target.value}))} placeholder="Preset name" style={{fontSize:'12px'}}/>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'6px'}}>
                  {[['work','Focus (min)'],['rest','Short break'],['long','Long break'],['rounds','Rounds']].map(([k,label])=>(
                    <div key={k}>
                      <label style={{fontSize:'10px',color:'var(--text-muted)',display:'block',marginBottom:'2px'}}>{label}</label>
                      <input type="number" value={newPreset[k]} onChange={e=>setNewPreset(p=>({...p,[k]:parseInt(e.target.value)||0}))} style={{fontSize:'12px',width:'100%'}}/>
                    </div>
                  ))}
                </div>
                <Btn size="sm" onClick={()=>{
                  if (!newPreset.label.trim()) return
                  setTimerData(td=>({...td,customPresets:[...(td.customPresets||[]),{...newPreset,id:'custom_'+Date.now()}]}))
                  setNewPreset({label:'',work:25,rest:5,long:15,rounds:4})
                }} disabled={!newPreset.label.trim()}><Plus size={13}/> Add preset</Btn>
              </div>
              {(timerData.customPresets||[]).length>0&&(
                <div style={{marginTop:'10px',display:'flex',flexDirection:'column',gap:'4px'}}>
                  {timerData.customPresets.map((p,i)=>(
                    <div key={i} style={{display:'flex',alignItems:'center',gap:'8px',fontSize:'12px',padding:'4px 0'}}>
                      <span style={{flex:1}}>{p.label}  -  {p.work}m focus / {p.rest}m break</span>
                      <button onClick={()=>setTimerData(td=>({...td,customPresets:(td.customPresets||[]).filter((_,j)=>j!==i)}))} style={{background:'none',border:'none',cursor:'pointer',color:'var(--danger)'}}><Trash2 size={12}/></button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
            </>
          )}

          {/* Stats */}
          <Card>
            <h3 style={{fontFamily:'var(--font-display)',fontSize:'14px',fontWeight:600,marginBottom:'12px'}}>Focus stats</h3>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',marginBottom:'12px'}}>
              {[
                ['⏱','Total focus',`${Math.round((timerData.totalFocusMins||0)/60)}h ${(timerData.totalFocusMins||0)%60}m`],
                ['🔥','Sessions',timerData.sessionsCompleted||0],
              ].map(([em,label,val])=>(
                <div key={label} style={{textAlign:'center',padding:'10px',background:'var(--bg-input)',borderRadius:'var(--radius-sm)'}}>
                  <p style={{fontSize:'18px',marginBottom:'2px'}}>{em}</p>
                  <p style={{fontFamily:'var(--font-display)',fontSize:'16px',fontWeight:700,color:'var(--accent)'}}>{val}</p>
                  <p style={{fontSize:'10px',color:'var(--text-muted)'}}>{label}</p>
                </div>
              ))}
            </div>
            {timerData.totalFocusMins>0&&<button onClick={()=>{if(window.confirm('Reset all focus stats?'))setTimerData(td=>({...td,totalFocusMins:0,sessionsCompleted:0,taskLog:[]}))}} style={{fontSize:'11px',color:'var(--text-muted)',background:'none',border:'none',cursor:'pointer',padding:0}}>Reset stats</button>}
          </Card>

          {/* Task log */}
          {(timerData.taskLog||[]).length>0&&(
            <Card>
              <h3 style={{fontFamily:'var(--font-display)',fontSize:'14px',fontWeight:600,marginBottom:'12px'}}>Recent sessions</h3>
              <div style={{display:'flex',flexDirection:'column',gap:'4px',maxHeight:280,overflowY:'auto'}}>
                {(timerData.taskLog||[]).slice(0,20).map((entry,i)=>(
                  <div key={i} style={{display:'flex',alignItems:'center',gap:'8px',padding:'6px 8px',background:'var(--bg-input)',borderRadius:'var(--radius-sm)',fontSize:'12px'}}>
                    <span style={{color:'var(--accent)',flexShrink:0}}>⏱ {entry.mins}m</span>
                    <span style={{flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{entry.task}</span>
                    <span style={{color:'var(--text-muted)',flexShrink:0,fontSize:'10px'}}>{entry.date}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
