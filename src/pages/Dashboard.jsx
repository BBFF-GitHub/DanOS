import React, { useState, useMemo, useRef, useEffect } from 'react'
import GridLayout from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import Card from '../components/Card'
import { Settings, X, Plus } from 'lucide-react'
import UKGroundsMap from '../components/UKGroundsMap'
import Btn from '../components/Btn'

function useContainerWidth() {
  const ref = useRef(null)
  const [width, setWidth] = useState(900)
  useEffect(() => {
    if (!ref.current) return
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        setWidth(Math.floor(entry.contentRect.width))
      }
    })
    ro.observe(ref.current)
    setWidth(Math.floor(ref.current.getBoundingClientRect().width))
    return () => ro.disconnect()
  }, [])
  return [ref, width]
}

// ─── Helpers ──────────────────────────────────────────────────────
const EVENT_EMOJI = { event:'📌', birthday:'🎂', reminder:'🔔', football:'⚽', holiday:'✈️', workout:'🏋️' }

function ordinal(n) {
  const s=['th','st','nd','rd'],v=n%100
  return n+(s[(v-20)%10]||s[v]||s[0])
}
function getNextBirthday(event) {
  const now=new Date(),dob=new Date(event.date),ty=now.getFullYear()
  let next=new Date(ty,dob.getMonth(),dob.getDate())
  if (next<now) next=new Date(ty+1,dob.getMonth(),dob.getDate())
  return {daysUntil:Math.round((next-now)/86400000),nextDate:next,turningAge:next.getFullYear()-dob.getFullYear()}
}
function getNextOccurrence(event) {
  if (!event.recurrence || event.recurrence === 'none') return new Date(event.date)
  const now = new Date(); now.setHours(0,0,0,0)
  const start = new Date(event.date)
  const end = event.recurrenceEnd ? new Date(event.recurrenceEnd) : null
  let cursor = new Date(start)
  let safety = 0
  while (cursor < now && safety < 1000) {
    if (event.recurrence === 'weekly') cursor.setDate(cursor.getDate() + 7)
    else if (event.recurrence === 'monthly') cursor.setMonth(cursor.getMonth() + 1)
    else if (event.recurrence === 'yearly') cursor.setFullYear(cursor.getFullYear() + 1)
    safety++
  }
  if (end && cursor > end) return null
  return cursor
}

// ─── Font options ─────────────────────────────────────────────────
const FONT_OPTS=[
  {key:'xs',size:'11px',label:'XS'},
  {key:'sm',size:'13px',label:'S'},
  {key:'md',size:'15px',label:'M'},
  {key:'lg',size:'18px',label:'L'},
  {key:'xl',size:'22px',label:'XL'},
]
function getFontSize(fontKey){ return FONT_OPTS.find(f=>f.key===fontKey)?.size||'13px' }

// ─── Tile catalogue ───────────────────────────────────────────────
const TILE_CATALOGUE=[
  {id:'pickmeup',  label:'❤️ Pick-me-up'},
  {id:'stats',     label:'📊 Stats'},
  {id:'upcoming',  label:'📅 Upcoming'},
  {id:'birthdays', label:'🎂 Birthdays'},
  {id:'ideas',     label:'💡 Ideas'},
  {id:'shopping',  label:'🛒 Shopping'},
  {id:'92club',    label:'⚽ 92 Club'},
  {id:'f1',        label:'🏎️ F1 Sim'},
  {id:'fitness',   label:'💪 Fitness'},
  {id:'finance',   label:'💷 Finance'},
]

// react-grid-layout layout items: x(0-3), y(row), w(cols), h(row units, 1 unit=80px)
const DEFAULT_LAYOUT_ITEMS = [
  {i:'pickmeup',  x:0,y:0,w:4,h:2},
  {i:'birthdays', x:0,y:2,w:1,h:5},
  {i:'upcoming',  x:1,y:2,w:1,h:5},
  {i:'fitness',   x:2,y:2,w:1,h:2},
  {i:'ideas',     x:3,y:2,w:1,h:2},
  {i:'finance',   x:2,y:4,w:1,h:3},
  {i:'shopping',  x:3,y:4,w:1,h:2},
  {i:'92club',    x:3,y:6,w:1,h:2},
]

// Per-tile extra config (content options)
const DEFAULT_TILE_CONFIGS={
  upcoming: {maxItems:7},
  birthdays:{maxItems:5,daysAhead:90},
  ideas:    {maxItems:5},
  shopping: {showAllLists:false,maxItems:8},
  stats:    {show:['events','ideas','shopping','pickmeups']},
  f1:       {showWins:true,showPodiums:true,showLastRace:true},
  fitness:  {period:'week'},
  finance:  {showSpend:true,showIncome:true,showNet:true},
  '92club': {showRecent:true},
  pickmeup: {showSource:true},
}

// Per-tile font key
const DEFAULT_FONT_KEYS = Object.fromEntries(TILE_CATALOGUE.map(c=>[c.id,'sm']))

// ─── Tile content components ──────────────────────────────────────
function PickMeUpTile({pickmeups,cfg,fontSize}){
  const item=useMemo(()=>pickmeups.length>0?pickmeups[Math.floor(Math.random()*pickmeups.length)]:null,[])
  if(!item) return <p style={{color:'var(--text-muted)',fontSize}}>No pick-me-ups saved yet.</p>
  return (
    <div>
      <p style={{fontSize:'11px',color:'var(--text-muted)',marginBottom:'6px'}}>{item.type==='bible'?'📖 Bible verse':item.type==='quote'?'💬 Quote':'💌 Message'}</p>
      <p style={{fontSize,color:'var(--text-primary)',fontStyle:'italic',lineHeight:1.7}}>"{item.text}"</p>
      {cfg.showSource&&item.source&&<p style={{fontSize:'12px',color:'var(--text-muted)',marginTop:'6px'}}> -  {item.source}</p>}
    </div>
  )
}
function StatsTile({events,ideas,shoppingLists,pickmeups,cfg,fontSize,onNavigate}){
  const now=new Date()
  const todayE=events.filter(e=>{const d=new Date(e.date);return d.toDateString()===now.toDateString()})
  const needed=shoppingLists.reduce((a,l)=>a+l.items.filter(i=>!i.checked).length,0)
  const stats=[
    {key:'events',  label:"Today",    value:todayE.length, sub:todayE[0]?.title||'Nothing on', color:'var(--accent)',  page:'calendar'},
    {key:'ideas',   label:'Ideas',    value:ideas.length,  sub:'on the wall',                  color:'var(--warning)', page:'ideas'},
    {key:'shopping',label:'Shopping', value:needed,        sub:'items needed',                 color:'var(--success)', page:'shopping'},
    {key:'pickmeups',label:'Uplifts', value:pickmeups.length,sub:'saved',                      color:'var(--danger)',  page:'pickmeup'},
  ].filter(s=>cfg.show?.includes(s.key))
  return (
    <div style={{display:'grid',gridTemplateColumns:`repeat(${Math.min(stats.length,4)},1fr)`,gap:'10px'}}>
      {stats.map(s=>(
        <button key={s.key} onClick={()=>onNavigate(s.page)} style={{background:'var(--bg-input)',border:'none',borderRadius:'var(--radius)',padding:'12px',cursor:'pointer',textAlign:'left'}}>
          <p style={{fontSize:'10px',color:'var(--text-muted)',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:'4px'}}>{s.label}</p>
          <p style={{fontFamily:'var(--font-display)',fontSize,fontWeight:700,lineHeight:1}}>{s.value}</p>
          <p style={{fontSize:'11px',color:'var(--text-secondary)',marginTop:'4px'}}>{s.sub}</p>
        </button>
      ))}
    </div>
  )
}
function UpcomingTile({events,cfg,fontSize,onNavigate,onlyBirthdays=false}){
  const list=useMemo(()=>{
    const now=new Date();now.setHours(0,0,0,0)
    const daysAhead=cfg.daysAhead||365
    if(onlyBirthdays){
      return events.filter(e=>e.type==='birthday').map(e=>{
        const {daysUntil,nextDate,turningAge}=getNextBirthday(e)
        return {...e,sortDate:nextDate,diff:daysUntil,turningAge}
      }).filter(e=>e.diff<=daysAhead).sort((a,b)=>a.diff-b.diff).slice(0,cfg.maxItems||5)
    }
    const regular=events.filter(e=>e.type!=='birthday').map(e=>{
      const next = getNextOccurrence(e)
      if (!next) return null
      return {...e,sortDate:next,diff:Math.round((next-now)/86400000)}
    }).filter(e=>e && e.diff>=0)
    const bdays=events.filter(e=>e.type==='birthday').map(e=>{
      const {daysUntil,nextDate,turningAge}=getNextBirthday(e)
      return {...e,sortDate:nextDate,diff:daysUntil,turningAge}
    })
    return [...regular,...bdays].sort((a,b)=>a.sortDate-b.sortDate).slice(0,cfg.maxItems||7)
  },[events,cfg,onlyBirthdays])
  if(!list.length) return <p style={{color:'var(--text-muted)',fontSize}}>Nothing upcoming.</p>
  return (
    <div style={{display:'flex',flexDirection:'column',gap:'6px'}}>
      {list.map(ev=>{
        const label=ev.diff===0?'Today':ev.diff===1?'Tomorrow':`${ev.diff}d`
        return (
          <button key={ev.id||ev.date+ev.title} onClick={()=>onNavigate('calendar')} style={{display:'flex',alignItems:'center',gap:'8px',padding:'6px 8px',borderRadius:'var(--radius-sm)',background:'var(--bg-input)',border:'none',cursor:'pointer',textAlign:'left',width:'100%'}}>
            <span style={{fontSize:'14px',flexShrink:0}}>{EVENT_EMOJI[ev.type]||'📌'}</span>
            <p style={{fontSize,flex:1,fontWeight:500,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
              {ev.type==='birthday'&&ev.turningAge?`${ev.title} turns ${ordinal(ev.turningAge)}`:ev.title}
            </p>
            <span style={{fontSize:'11px',fontWeight:600,color:ev.diff<=3?'var(--warning)':'var(--text-muted)',background:'var(--bg-badge)',padding:'2px 5px',borderRadius:3,flexShrink:0}}>{label}</span>
          </button>
        )
      })}
    </div>
  )
}
function IdeasTile({ideas,cfg,fontSize,onNavigate}){
  const recent=[...ideas].sort((a,b)=>b.id-a.id).slice(0,cfg.maxItems||5)
  if(!recent.length) return <p style={{color:'var(--text-muted)',fontSize}}>No ideas yet.</p>
  return (
    <div style={{display:'flex',flexDirection:'column',gap:'5px'}}>
      {recent.map(idea=>(
        <button key={idea.id} onClick={()=>onNavigate('ideas')} style={{display:'flex',alignItems:'flex-start',gap:'7px',padding:'6px 8px',borderRadius:'var(--radius-sm)',background:'var(--bg-input)',border:'none',cursor:'pointer',textAlign:'left',width:'100%'}}>
          <span style={{flexShrink:0,marginTop:1}}>💡</span>
          <p style={{fontSize,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1}}>{idea.title}</p>
        </button>
      ))}
    </div>
  )
}
function ShoppingTile({shoppingLists,cfg,fontSize,onNavigate}){
  const needed=shoppingLists.flatMap(l=>l.items.filter(i=>!i.checked)).slice(0,cfg.maxItems||8)
  if(!needed.length) return <p style={{color:'var(--text-muted)',fontSize}}>All stocked up!</p>
  return (
    <div style={{display:'flex',flexDirection:'column',gap:'4px'}}>
      {needed.map((item,i)=>(
        <div key={i} style={{display:'flex',alignItems:'center',gap:'7px',padding:'5px 8px',borderRadius:'var(--radius-sm)',background:'var(--bg-input)'}}>
          <span style={{width:7,height:7,borderRadius:'50%',background:'var(--accent)',flexShrink:0}}/>
          <p style={{fontSize,flex:1,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{item.name}</p>
          {item.qty>1&&<span style={{fontSize:'11px',color:'var(--text-muted)',flexShrink:0}}>×{item.qty}</span>}
        </div>
      ))}
    </div>
  )
}
function ClubTile({clubData,cfg,fontSize,onNavigate}){
  const visitedObj=clubData.visited||{}
  const clubs92=clubData.clubs92||[]
  const visited=Object.values(visitedObj).filter(Boolean).length
  const total=clubs92.length||92
  const pct=total>0?Math.round((visited/total)*100):0

  return (
    <div style={{display:'flex',flexDirection:'column',gap:'8px',height:'100%'}}>
      {/* Stats row */}
      <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
        <div>
          <p style={{fontFamily:'var(--font-display)',fontSize,fontWeight:700,color:'var(--accent)',lineHeight:1}}>
            {visited}<span style={{fontSize:'12px',color:'var(--text-muted)',fontFamily:'var(--font-body)'}}>/92</span>
          </p>
          <p style={{fontSize:'11px',color:'var(--text-muted)'}}>grounds visited</p>
        </div>
        <div style={{flex:1}}>
          <div style={{height:6,background:'var(--bg-badge)',borderRadius:3,overflow:'hidden'}}>
            <div style={{height:'100%',width:`${pct}%`,background:'var(--success)',borderRadius:3}}/>
          </div>
          <p style={{fontSize:'11px',color:'var(--text-muted)',marginTop:'2px'}}>{pct}% complete</p>
        </div>
      </div>

      {/* Legend */}
      <div style={{display:'flex',gap:'10px',flexWrap:'wrap'}}>
        {[['Premier League','#4f6ef7'],['Championship','#f59e0b'],['League One','#22c55e'],['League Two','#ef4444']].map(([l,c])=>(
          <div key={l} style={{display:'flex',alignItems:'center',gap:'4px'}}>
            <div style={{width:8,height:8,borderRadius:'50%',background:c,flexShrink:0}}/>
            <span style={{fontSize:'10px',color:'var(--text-muted)'}}>{l.replace('League ','L').replace('Premier ','PL').replace('Championship','Champ')}</span>
          </div>
        ))}
      </div>

      {/* Map */}
      <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',minHeight:0}}>
        {clubs92.length > 0 ? (
          <UKGroundsMap clubs92={clubs92} visited={visitedObj} compact />
        ) : (
          <div style={{textAlign:'center',padding:'20px'}}>
            <p style={{fontSize:'32px',marginBottom:'8px'}}>🗺️</p>
            <p style={{fontSize:'12px',color:'var(--text-muted)'}}>No clubs data yet</p>
          </div>
        )}
      </div>
    </div>
  )
}
function F1Tile({f1Data,cfg,fontSize,onNavigate}){
  const seasons=f1Data?.seasons||[]
  const latest=seasons.length?[...seasons].sort((a,b)=>b.year-a.year)[0]:null
  if(!latest) return <p style={{color:'var(--text-muted)',fontSize}}>No F1 data yet.</p>
  const results=latest.results||[]
  const wins=results.filter(r=>r.myPos===1).length
  const pods=results.filter(r=>r.myPos&&r.myPos<=3).length
  const doneC=new Set(results.filter(r=>r.myPos!=null).map(r=>r.raceNum)).size
  const total=(latest.circuits||[]).length
  const lastR=[...results].filter(r=>r.myPos!=null).sort((a,b)=>b.raceNum-a.raceNum)[0]
  return (
    <div>
      <p style={{fontSize:'11px',color:'var(--text-muted)',fontWeight:600,textTransform:'uppercase',marginBottom:'8px'}}>{latest.year}</p>
      <div style={{display:'flex',gap:'14px',marginBottom:'10px'}}>
        {cfg.showWins&&<div><p style={{fontFamily:'var(--font-display)',fontSize,fontWeight:700,color:'#fbbf24',lineHeight:1}}>{wins}</p><p style={{fontSize:'11px',color:'var(--text-muted)'}}>Wins</p></div>}
        {cfg.showPodiums&&<div><p style={{fontFamily:'var(--font-display)',fontSize,fontWeight:700,color:'var(--accent)',lineHeight:1}}>{pods}</p><p style={{fontSize:'11px',color:'var(--text-muted)'}}>Pods</p></div>}
        <div><p style={{fontFamily:'var(--font-display)',fontSize,fontWeight:700,lineHeight:1}}>{doneC}{total>0?`/${total}`:''}</p><p style={{fontSize:'11px',color:'var(--text-muted)'}}>Races</p></div>
      </div>
      {cfg.showLastRace&&lastR&&<p style={{fontSize,color:'var(--text-secondary)',marginBottom:'6px'}}>Last: {lastR.circuit} P{lastR.myPos}</p>}
      <button onClick={()=>onNavigate('f1sim')} style={{fontSize:'12px',color:'var(--accent)',background:'none',border:'none',cursor:'pointer',padding:'0'}}>View →</button>
    </div>
  )
}
function FitnessTile({fitnessData,cfg,fontSize,onNavigate}){
  const acts=fitnessData?.activities||[]
  if(!acts.length) return <p style={{color:'var(--text-muted)',fontSize}}>No activities logged yet.</p>
  const now=new Date(),days=cfg.period==='month'?30:7
  const recent=acts.filter(a=>Math.round((now-new Date(a.date))/86400000)<=days)
  const dur=recent.reduce((a,x)=>a+(x.duration||0),0)
  const dist=recent.reduce((a,x)=>a+(x.distance||0),0)
  const last=[...acts].sort((a,b)=>new Date(b.date)-new Date(a.date))[0]
  const tm={run:'🏃',cycle:'🚴',walk:'🚶',gym:'🏋️',swim:'🏊',hike:'🥾',yoga:'🧘',hiit:'⚡',other:'💪'}
  return (
    <div>
      <p style={{fontSize:'11px',color:'var(--text-muted)',fontWeight:600,textTransform:'uppercase',marginBottom:'8px'}}>This {cfg.period==='month'?'month':'week'}</p>
      <div style={{display:'flex',gap:'14px',marginBottom:'10px'}}>
        <div><p style={{fontFamily:'var(--font-display)',fontSize,fontWeight:700,color:'var(--success)',lineHeight:1}}>{recent.length}</p><p style={{fontSize:'11px',color:'var(--text-muted)'}}>Sessions</p></div>
        {dur>0&&<div><p style={{fontFamily:'var(--font-display)',fontSize,fontWeight:700,color:'var(--accent)',lineHeight:1}}>{Math.round(dur/60)}h</p><p style={{fontSize:'11px',color:'var(--text-muted)'}}>Active</p></div>}
        {dist>0&&<div><p style={{fontFamily:'var(--font-display)',fontSize,fontWeight:700,color:'var(--warning)',lineHeight:1}}>{Math.round(dist*10)/10}</p><p style={{fontSize:'11px',color:'var(--text-muted)'}}>km</p></div>}
      </div>
      {last&&<p style={{fontSize,color:'var(--text-secondary)',marginBottom:'6px'}}>{tm[last.type]||'💪'} {new Date(last.date).toLocaleDateString('en-GB',{day:'numeric',month:'short'})}</p>}
    </div>
  )
}
function FinanceTile({financeData,cfg,fontSize,onNavigate}){
  const txs=financeData?.transactions||[]
  const accounts=financeData?.accounts||[]
  if(!txs.length && !accounts.length) return <p style={{color:'var(--text-muted)',fontSize}}>No transactions yet.</p>

  const now=new Date(),ms=new Date(now.getFullYear(),now.getMonth(),1).toISOString().slice(0,10)
  const mo=txs.filter(t=>t.date>=ms)
  const spend=mo.filter(t=>t.amount<0).reduce((a,t)=>a+Math.abs(t.amount),0)
  const income=mo.filter(t=>t.amount>0).reduce((a,t)=>a+t.amount,0)
  const gbp=n=>new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP'}).format(n)

  // Same calculation as Finance page: starting balance + sum of transactions per account
  const accBalances = {}
  accounts.forEach(a=>{ accBalances[a.name]=a.startingBalance||0 })
  txs.forEach(t=>{ if(t.account) accBalances[t.account]=(accBalances[t.account]||0)+t.amount })
  const totalBalance = Object.values(accBalances).reduce((a,b)=>a+b,0)

  return (
    <div>
      <p style={{fontSize:'11px',color:'var(--text-muted)',fontWeight:600,textTransform:'uppercase',marginBottom:'8px'}}>This month</p>
      <div style={{display:'flex',gap:'12px',flexWrap:'wrap',marginBottom:'12px'}}>
        {cfg.showIncome&&<div><p style={{fontFamily:'var(--font-display)',fontSize,fontWeight:700,color:'var(--success)',lineHeight:1}}>{gbp(income)}</p><p style={{fontSize:'11px',color:'var(--text-muted)'}}>In</p></div>}
        {cfg.showSpend&&<div><p style={{fontFamily:'var(--font-display)',fontSize,fontWeight:700,color:'var(--danger)',lineHeight:1}}>{gbp(spend)}</p><p style={{fontSize:'11px',color:'var(--text-muted)'}}>Out</p></div>}
        {cfg.showNet&&<div><p style={{fontFamily:'var(--font-display)',fontSize,fontWeight:700,color:income>=spend?'var(--success)':'var(--danger)',lineHeight:1}}>{gbp(income-spend)}</p><p style={{fontSize:'11px',color:'var(--text-muted)'}}>Net</p></div>}
      </div>

      {accounts.length>0 && (
        <>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:'6px'}}>
            <p style={{fontSize:'11px',color:'var(--text-muted)',fontWeight:600,textTransform:'uppercase'}}>Accounts</p>
            <p style={{fontSize:'12px',color:'var(--text-secondary)'}}>Total: <strong style={{color:'var(--accent)'}}>{gbp(totalBalance)}</strong></p>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'6px'}}>
            {accounts.map(a=>{
              const bal=accBalances[a.name]||0
              return (
                <div key={a.name} style={{padding:'6px 8px',background:'var(--bg-input)',borderRadius:'var(--radius-sm)',borderLeft:`3px solid ${a.type==='credit'?'var(--danger)':a.type==='savings'?'var(--success)':'var(--accent)'}`,minWidth:0}}>
                  <p style={{fontSize:'10px',fontWeight:600,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{a.name}</p>
                  <p style={{fontFamily:'var(--font-display)',fontSize:'13px',fontWeight:700,color:bal<0?'var(--danger)':'var(--success)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{gbp(bal)}</p>
                </div>
              )
            })}
          </div>
        </>
      )}

    </div>
  )
}

// ─── Config panel ─────────────────────────────────────────────────
function TileConfigPanel({tileId,cfg,fontKey,onChangeCfg,onChangeFont}){
  return (
    <div style={{padding:'10px 12px',background:'var(--bg-app)',borderTop:'1px solid var(--border)',fontSize:'12px',display:'flex',flexDirection:'column',gap:'8px'}}>
      {/* Font size  -  always shown */}
      <label style={{display:'flex',alignItems:'center',gap:'8px'}}>
        Font size:
        <select value={fontKey||'sm'} onChange={e=>onChangeFont(e.target.value)} style={{fontSize:'12px',padding:'2px 6px'}}>
          {FONT_OPTS.map(f=><option key={f.key} value={f.key}>{f.label} ({f.size})</option>)}
        </select>
      </label>
      {tileId==='upcoming'&&<label style={{display:'flex',alignItems:'center',gap:'8px'}}>Max items: <input type="number" min="1" max="20" value={cfg.maxItems||7} onChange={e=>onChangeCfg({...cfg,maxItems:+e.target.value||7})} style={{width:50,fontSize:'12px',padding:'2px 5px'}}/></label>}
      {tileId==='birthdays'&&<><label style={{display:'flex',alignItems:'center',gap:'8px'}}>Max items: <input type="number" min="1" max="20" value={cfg.maxItems||5} onChange={e=>onChangeCfg({...cfg,maxItems:+e.target.value||5})} style={{width:50,fontSize:'12px',padding:'2px 5px'}}/></label><label style={{display:'flex',alignItems:'center',gap:'8px'}}>Days ahead: <input type="number" min="7" max="365" value={cfg.daysAhead||90} onChange={e=>onChangeCfg({...cfg,daysAhead:+e.target.value||90})} style={{width:55,fontSize:'12px',padding:'2px 5px'}}/></label></>}
      {tileId==='ideas'&&<label style={{display:'flex',alignItems:'center',gap:'8px'}}>Max items: <input type="number" min="1" max="15" value={cfg.maxItems||5} onChange={e=>onChangeCfg({...cfg,maxItems:+e.target.value||5})} style={{width:50,fontSize:'12px',padding:'2px 5px'}}/></label>}
      {tileId==='shopping'&&<><label style={{display:'flex',alignItems:'center',gap:'8px'}}>Max items: <input type="number" min="1" max="20" value={cfg.maxItems||8} onChange={e=>onChangeCfg({...cfg,maxItems:+e.target.value||8})} style={{width:50,fontSize:'12px',padding:'2px 5px'}}/></label><label style={{display:'flex',alignItems:'center',gap:'6px',cursor:'pointer'}}><input type="checkbox" checked={!!cfg.showAllLists} onChange={e=>onChangeCfg({...cfg,showAllLists:e.target.checked})} style={{width:'auto'}}/>All lists</label></>}
      {tileId==='stats'&&<div style={{display:'flex',flexWrap:'wrap',gap:'8px'}}>{['events','ideas','shopping','pickmeups'].map(k=><label key={k} style={{display:'flex',alignItems:'center',gap:'4px',cursor:'pointer'}}><input type="checkbox" checked={(cfg.show||[]).includes(k)} onChange={e=>{const s=cfg.show||[];onChangeCfg({...cfg,show:e.target.checked?[...s,k]:s.filter(x=>x!==k)})}} style={{width:'auto'}}/>{k.charAt(0).toUpperCase()+k.slice(1)}</label>)}</div>}
      {tileId==='f1'&&<div style={{display:'flex',flexWrap:'wrap',gap:'8px'}}>{[['showWins','Wins'],['showPodiums','Pods'],['showLastRace','Last race']].map(([k,l])=><label key={k} style={{display:'flex',alignItems:'center',gap:'4px',cursor:'pointer'}}><input type="checkbox" checked={!!cfg[k]} onChange={e=>onChangeCfg({...cfg,[k]:e.target.checked})} style={{width:'auto'}}/>{l}</label>)}</div>}
      {tileId==='fitness'&&<label style={{display:'flex',alignItems:'center',gap:'8px'}}>Period: <select value={cfg.period||'week'} onChange={e=>onChangeCfg({...cfg,period:e.target.value})} style={{fontSize:'12px',padding:'2px 6px'}}><option value="week">This week</option><option value="month">This month</option></select></label>}
      {tileId==='finance'&&<div style={{display:'flex',gap:'10px'}}>{[['showIncome','In'],['showSpend','Out'],['showNet','Net']].map(([k,l])=><label key={k} style={{display:'flex',alignItems:'center',gap:'4px',cursor:'pointer'}}><input type="checkbox" checked={!!cfg[k]} onChange={e=>onChangeCfg({...cfg,[k]:e.target.checked})} style={{width:'auto'}}/>{l}</label>)}</div>}
      {tileId==='pickmeup'&&<label style={{display:'flex',alignItems:'center',gap:'6px',cursor:'pointer'}}><input type="checkbox" checked={!!cfg.showSource} onChange={e=>onChangeCfg({...cfg,showSource:e.target.checked})} style={{width:'auto'}}/>Show source</label>}
    </div>
  )
}

// ─── Main Dashboard ───────────────────────────────────────────────
const ROW_HEIGHT = 80
const COLS = 4

export default function Dashboard({events,ideas,shoppingLists,pickmeups,clubData,f1Data,fitnessData,financeData,dashConfig,setDashConfig,onNavigate}){
  const layoutItems  = dashConfig?.layoutItems  || DEFAULT_LAYOUT_ITEMS
  const tileConfigs  = dashConfig?.tileConfigs  || DEFAULT_TILE_CONFIGS
  const fontKeys     = dashConfig?.fontKeys     || DEFAULT_FONT_KEYS
  const [editing,    setEditing]    = useState(false)
  const [expandedCfg,setExpandedCfg]= useState(null)
  const [showAdd,    setShowAdd]    = useState(false)

  const [gridRef, gridWidth] = useContainerWidth()

  const now=new Date()
  const greeting=now.getHours()<12?'Good morning':now.getHours()<18?'Good afternoon':'Good evening'

  function saveLayout(newLayout){
    setDashConfig(prev=>({...prev, layoutItems: newLayout}))
  }
  function setTileCfg(id,cfg){
    setDashConfig(prev=>({...prev,tileConfigs:{...(prev?.tileConfigs||DEFAULT_TILE_CONFIGS),[id]:cfg}}))
  }
  function setFontKey(id,key){
    setDashConfig(prev=>({...prev,fontKeys:{...(prev?.fontKeys||DEFAULT_FONT_KEYS),[id]:key}}))
  }
  function removeTile(id){
    setDashConfig(prev=>({...prev,layoutItems:(prev?.layoutItems||DEFAULT_LAYOUT_ITEMS).filter(t=>t.i!==id)}))
    setExpandedCfg(null)
  }
  function addTile(id){
    const maxY=layoutItems.reduce((a,t)=>Math.max(a,t.y+t.h),0)
    setDashConfig(prev=>({
      ...prev,
      layoutItems:[...(prev?.layoutItems||DEFAULT_LAYOUT_ITEMS),{i:id,x:0,y:maxY,w:1,h:3}]
    }))
    setShowAdd(false)
  }

  const visibleIds = new Set(layoutItems.map(t=>t.i))
  const availableToAdd=TILE_CATALOGUE.filter(c=>!visibleIds.has(c.id))

  function renderContent(tileId,fontSize){
    const cfg={...(DEFAULT_TILE_CONFIGS[tileId]||{}),...(tileConfigs[tileId]||{})}
    const p={cfg,fontSize,onNavigate}
    switch(tileId){
      case 'pickmeup':  return <PickMeUpTile pickmeups={pickmeups} {...p}/>
      case 'stats':     return <StatsTile events={events} ideas={ideas} shoppingLists={shoppingLists} pickmeups={pickmeups} {...p}/>
      case 'upcoming':  return <UpcomingTile events={events} {...p}/>
      case 'birthdays': return <UpcomingTile events={events} {...p} onlyBirthdays/>
      case 'ideas':     return <IdeasTile ideas={ideas} {...p}/>
      case 'shopping':  return <ShoppingTile shoppingLists={shoppingLists} {...p}/>
      case '92club':    return <ClubTile clubData={clubData} {...p}/>
      case 'f1':        return <F1Tile f1Data={f1Data} {...p}/>
      case 'fitness':   return <FitnessTile fitnessData={fitnessData} {...p}/>
      case 'finance':   return <FinanceTile financeData={financeData||{}} {...p}/>
      default:          return null
    }
  }

  return (
    <div>
      {/* Header */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'20px',flexWrap:'wrap',gap:'10px'}}>
        <div>
          <h1 style={{fontFamily:'var(--font-display)',fontSize:'26px',fontWeight:700,lineHeight:1,marginBottom:'4px'}}>{greeting}, Dan 👋</h1>
          <p style={{fontSize:'13px',color:'var(--text-secondary)'}}>{now.toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</p>
        </div>
        <div style={{display:'flex',gap:'8px'}}>
          {editing&&availableToAdd.length>0&&<Btn variant="secondary" size="sm" onClick={()=>setShowAdd(s=>!s)}><Plus size={13}/> Add tile</Btn>}
          <Btn variant={editing?'primary':'secondary'} size="sm" onClick={()=>{setEditing(e=>!e);setExpandedCfg(null);setShowAdd(false)}}>
            <Settings size={13}/> {editing?'Done':'Customise'}
          </Btn>
        </div>
      </div>

      {/* Add tile panel */}
      {editing&&showAdd&&availableToAdd.length>0&&(
        <div style={{padding:'12px',background:'var(--bg-card)',border:'1px solid var(--accent-border)',borderRadius:'var(--radius)',marginBottom:'14px',display:'flex',flexWrap:'wrap',gap:'8px'}}>
          <p style={{width:'100%',fontSize:'12px',color:'var(--text-muted)',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.06em'}}>Add tile</p>
          {availableToAdd.map(c=>(
            <button key={c.id} onClick={()=>addTile(c.id)} style={{padding:'6px 12px',borderRadius:'var(--radius-sm)',border:'1px solid var(--border)',background:'var(--bg-input)',cursor:'pointer',fontSize:'12px',display:'flex',alignItems:'center',gap:'5px'}}>
              {c.label} <Plus size={11} color="var(--accent)"/>
            </button>
          ))}
        </div>
      )}

      {/* Edit mode hint */}
      {editing&&(
        <div style={{padding:'8px 12px',background:'var(--accent-soft)',borderRadius:'var(--radius)',marginBottom:'14px',fontSize:'12px',color:'var(--accent)',border:'1px solid var(--accent-border)'}}>
          🖱️ <strong>Drag</strong> tiles to rearrange · <strong>Drag the bottom-right corner</strong> to resize · Click <strong>⚙️</strong> to configure content
        </div>
      )}

      {/* THE GRID */}
      <div ref={gridRef}>
      <GridLayout
        layout={layoutItems}
        cols={COLS}
        rowHeight={ROW_HEIGHT}
        width={gridWidth}
        isDraggable={editing}
        isResizable={editing}
        onLayoutChange={saveLayout}
        draggableHandle=".tile-drag-handle"
        margin={[14,14]}
        containerPadding={[0,0]}
        resizeHandles={['se']}
      >
        {layoutItems.map(item=>{
          const tileId=item.i
          const cat=TILE_CATALOGUE.find(c=>c.id===tileId)
          const fontSize=getFontSize(fontKeys[tileId]||'sm')
          const isExpCfg=expandedCfg===tileId
          const totalH=item.h*ROW_HEIGHT+(item.h-1)*14
          return (
            <div key={tileId} style={{height:'100%',overflow:'visible'}}>
              <Card style={{height:'100%',padding:0,overflow:'visible',display:'flex',flexDirection:'column',outline:editing?'2px dashed var(--border)':'none',outlineOffset:1,position:'relative'}}>
                {/* Header */}
                <div className="tile-drag-handle" style={{display:'flex',alignItems:'center',gap:'6px',padding:'9px 12px',borderBottom:'1px solid var(--border)',background:editing?'var(--bg-input)':'transparent',flexShrink:0,cursor:editing?'grab':'default',userSelect:'none'}}>
                  {editing&&<span style={{fontSize:'14px',color:'var(--text-muted)',flexShrink:0}}>⠿</span>}
                  <button
                    onClick={e=>{e.stopPropagation();onNavigate(({pickmeup:'pickmeup',stats:'dashboard',upcoming:'calendar',birthdays:'calendar',ideas:'ideas',shopping:'shopping','92club':'92club',f1:'f1sim',fitness:'fitness',finance:'finance'})[tileId]||tileId)}}
                    style={{fontSize:'13px',fontWeight:600,flex:1,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',background:'none',border:'none',cursor:'pointer',color:'var(--text-primary)',textAlign:'left',padding:0,fontFamily:'var(--font-body)'}}
                    title={`Go to ${cat?.label||tileId}`}
                  >{cat?.label||tileId}</button>
                  {editing&&(
                    <div style={{display:'flex',gap:'2px',flexShrink:0}}>
                      <button onClick={e=>{e.stopPropagation();setExpandedCfg(isExpCfg?null:tileId)}} title="Configure" style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)',padding:'2px'}}><Settings size={13}/></button>
                      <button onClick={e=>{e.stopPropagation();removeTile(tileId)}} title="Remove" style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)',padding:'2px'}}><X size={13}/></button>
                    </div>
                  )}
                </div>

                {/* Body */}
                <div style={{padding:'12px 14px',flex:1,overflowY:'auto',overflowX:'hidden',minHeight:0}} onMouseDown={e=>e.stopPropagation()}>
                  {renderContent(tileId,fontSize)}
                </div>

                {/* Config panel */}
                {editing&&isExpCfg&&(
                  <TileConfigPanel
                    tileId={tileId}
                    cfg={{...(DEFAULT_TILE_CONFIGS[tileId]||{}),...(tileConfigs[tileId]||{})}}
                    fontKey={fontKeys[tileId]||'sm'}
                    onChangeCfg={cfg=>setTileCfg(tileId,cfg)}
                    onChangeFont={key=>setFontKey(tileId,key)}
                  />
                )}
              </Card>
            </div>
          )
        })}
      </GridLayout>
      </div>

      {editing&&layoutItems.length===0&&(
        <div style={{textAlign:'center',padding:'60px',border:'2px dashed var(--border)',borderRadius:'var(--radius-lg)',marginTop:'12px'}}>
          <p style={{fontSize:'28px',marginBottom:'10px'}}>🧩</p>
          <p style={{fontSize:'14px',color:'var(--text-secondary)',marginBottom:'16px'}}>No tiles yet.</p>
          <Btn onClick={()=>setShowAdd(true)}><Plus size={14}/> Add your first tile</Btn>
        </div>
      )}
    </div>
  )
}
