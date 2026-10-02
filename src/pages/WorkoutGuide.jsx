import React, { useState, useMemo } from 'react'
import Card from '../components/Card'
import PageHeader from '../components/PageHeader'
import Btn from '../components/Btn'
import { ExternalLink, Dumbbell, ChevronDown, ChevronRight } from 'lucide-react'

// ─── Exercise database ────────────────────────────────────────────
// Each exercise: name, muscles (primary + secondary), type (gym/home/both),
// equipment, difficulty (1-3), youtubeQuery (what to search)
const EXERCISES = [
  // CHEST
  { id:1,  name:'Bench Press',          group:'Chest',    muscles:['Chest','Triceps','Front Delts'],    type:'gym',  equipment:'Barbell',        difficulty:2, yt:'bench press form tutorial' },
  { id:2,  name:'Incline Dumbbell Press',group:'Chest',   muscles:['Upper Chest','Triceps'],            type:'gym',  equipment:'Dumbbells',       difficulty:2, yt:'incline dumbbell press tutorial' },
  { id:3,  name:'Cable Fly',             group:'Chest',   muscles:['Chest','Front Delts'],              type:'gym',  equipment:'Cable machine',   difficulty:2, yt:'cable fly chest tutorial' },
  { id:4,  name:'Dips',                  group:'Chest',   muscles:['Lower Chest','Triceps'],            type:'both', equipment:'Dip bars',        difficulty:2, yt:'chest dips form tutorial' },
  { id:5,  name:'Push-Up',               group:'Chest',   muscles:['Chest','Triceps','Core'],           type:'home', equipment:'None',            difficulty:1, yt:'push up proper form tutorial' },
  { id:6,  name:'Wide Push-Up',          group:'Chest',   muscles:['Outer Chest','Triceps'],            type:'home', equipment:'None',            difficulty:1, yt:'wide push up chest tutorial' },
  { id:7,  name:'Decline Push-Up',       group:'Chest',   muscles:['Upper Chest','Shoulders'],          type:'home', equipment:'Chair',           difficulty:2, yt:'decline push up tutorial' },
  { id:8,  name:'Pec Deck Machine',      group:'Chest',   muscles:['Chest'],                            type:'gym',  equipment:'Machine',         difficulty:1, yt:'pec deck machine tutorial' },

  // BACK
  { id:9,  name:'Pull-Up',               group:'Back',    muscles:['Lats','Biceps','Rhomboids'],        type:'both', equipment:'Pull-up bar',     difficulty:3, yt:'pull up form tutorial beginners' },
  { id:10, name:'Bent-Over Row',          group:'Back',    muscles:['Lats','Rhomboids','Biceps'],        type:'gym',  equipment:'Barbell',         difficulty:2, yt:'bent over barbell row form tutorial' },
  { id:11, name:'Lat Pulldown',           group:'Back',    muscles:['Lats','Biceps'],                    type:'gym',  equipment:'Cable machine',   difficulty:1, yt:'lat pulldown form tutorial' },
  { id:12, name:'Seated Cable Row',       group:'Back',    muscles:['Mid Back','Lats','Biceps'],         type:'gym',  equipment:'Cable machine',   difficulty:1, yt:'seated cable row tutorial' },
  { id:13, name:'Single-Arm Dumbbell Row',group:'Back',   muscles:['Lats','Rhomboids'],                 type:'gym',  equipment:'Dumbbells',       difficulty:1, yt:'single arm dumbbell row tutorial' },
  { id:14, name:'Deadlift',               group:'Back',   muscles:['Lower Back','Glutes','Hamstrings'], type:'gym',  equipment:'Barbell',         difficulty:3, yt:'deadlift form tutorial beginners' },
  { id:15, name:'Superman Hold',          group:'Back',   muscles:['Lower Back','Glutes'],              type:'home', equipment:'None',            difficulty:1, yt:'superman exercise lower back' },
  { id:16, name:'Inverted Row',           group:'Back',   muscles:['Lats','Rhomboids','Biceps'],        type:'home', equipment:'Table/bar',       difficulty:2, yt:'inverted row bodyweight tutorial' },

  // SHOULDERS
  { id:17, name:'Overhead Press',         group:'Shoulders',muscles:['Delts','Triceps','Traps'],       type:'gym',  equipment:'Barbell',         difficulty:2, yt:'overhead press form tutorial' },
  { id:18, name:'Dumbbell Lateral Raise', group:'Shoulders',muscles:['Side Delts'],                   type:'both', equipment:'Dumbbells',       difficulty:1, yt:'lateral raise proper form tutorial' },
  { id:19, name:'Front Raise',            group:'Shoulders',muscles:['Front Delts'],                   type:'both', equipment:'Dumbbells',       difficulty:1, yt:'dumbbell front raise tutorial' },
  { id:20, name:'Face Pull',              group:'Shoulders',muscles:['Rear Delts','Rotator Cuff'],     type:'gym',  equipment:'Cable machine',   difficulty:1, yt:'face pull cable rear delts tutorial' },
  { id:21, name:'Arnold Press',           group:'Shoulders',muscles:['All Delts','Triceps'],           type:'gym',  equipment:'Dumbbells',       difficulty:2, yt:'arnold press tutorial' },
  { id:22, name:'Pike Push-Up',           group:'Shoulders',muscles:['Front Delts','Triceps'],         type:'home', equipment:'None',            difficulty:2, yt:'pike push up shoulder tutorial' },
  { id:23, name:'Wall Handstand Hold',    group:'Shoulders',muscles:['All Delts','Core'],              type:'home', equipment:'Wall',            difficulty:3, yt:'wall handstand hold tutorial' },

  // BICEPS
  { id:24, name:'Barbell Curl',           group:'Biceps',  muscles:['Biceps','Brachialis'],             type:'gym',  equipment:'Barbell',         difficulty:1, yt:'barbell curl form tutorial' },
  { id:25, name:'Dumbbell Hammer Curl',   group:'Biceps',  muscles:['Biceps','Brachialis'],             type:'both', equipment:'Dumbbells',       difficulty:1, yt:'hammer curl tutorial' },
  { id:26, name:'Incline Dumbbell Curl',  group:'Biceps',  muscles:['Long Head Biceps'],               type:'gym',  equipment:'Dumbbells',       difficulty:1, yt:'incline dumbbell curl tutorial' },
  { id:27, name:'Concentration Curl',     group:'Biceps',  muscles:['Biceps Peak'],                    type:'gym',  equipment:'Dumbbells',       difficulty:1, yt:'concentration curl tutorial' },
  { id:28, name:'Chin-Up',               group:'Biceps',   muscles:['Biceps','Lats'],                  type:'both', equipment:'Pull-up bar',     difficulty:2, yt:'chin up biceps tutorial' },
  { id:29, name:'Resistance Band Curl',   group:'Biceps',  muscles:['Biceps'],                         type:'home', equipment:'Resistance band', difficulty:1, yt:'resistance band bicep curl tutorial' },

  // TRICEPS
  { id:30, name:'Tricep Pushdown',        group:'Triceps', muscles:['All Tricep Heads'],               type:'gym',  equipment:'Cable machine',   difficulty:1, yt:'tricep pushdown cable tutorial' },
  { id:31, name:'Skull Crusher',          group:'Triceps', muscles:['Long Head Triceps'],              type:'gym',  equipment:'Barbell/EZ bar',  difficulty:2, yt:'skull crusher tricep tutorial' },
  { id:32, name:'Overhead Tricep Ext.',   group:'Triceps', muscles:['Long Head Triceps'],              type:'both', equipment:'Dumbbells',       difficulty:1, yt:'overhead tricep extension dumbbell tutorial' },
  { id:33, name:'Close-Grip Bench Press', group:'Triceps', muscles:['Triceps','Chest'],                type:'gym',  equipment:'Barbell',         difficulty:2, yt:'close grip bench press triceps tutorial' },
  { id:34, name:'Tricep Dip',             group:'Triceps', muscles:['Triceps','Chest'],                type:'both', equipment:'Bench/bars',      difficulty:2, yt:'tricep dip tutorial' },
  { id:35, name:'Diamond Push-Up',        group:'Triceps', muscles:['Triceps','Chest'],                type:'home', equipment:'None',            difficulty:2, yt:'diamond push up tricep tutorial' },

  // LEGS
  { id:36, name:'Squat',                  group:'Legs',    muscles:['Quads','Glutes','Hamstrings'],    type:'gym',  equipment:'Barbell',         difficulty:2, yt:'squat form tutorial beginners' },
  { id:37, name:'Romanian Deadlift',      group:'Legs',    muscles:['Hamstrings','Glutes','Lower Back'],type:'gym', equipment:'Barbell',         difficulty:2, yt:'romanian deadlift tutorial' },
  { id:38, name:'Leg Press',              group:'Legs',    muscles:['Quads','Glutes'],                 type:'gym',  equipment:'Machine',         difficulty:1, yt:'leg press machine tutorial' },
  { id:39, name:'Walking Lunge',          group:'Legs',    muscles:['Quads','Glutes','Hamstrings'],    type:'both', equipment:'Optional dumbbells',difficulty:2,yt:'walking lunge form tutorial' },
  { id:40, name:'Leg Curl (machine)',     group:'Legs',    muscles:['Hamstrings'],                     type:'gym',  equipment:'Machine',         difficulty:1, yt:'leg curl machine hamstrings tutorial' },
  { id:41, name:'Calf Raise',             group:'Legs',    muscles:['Calves'],                         type:'both', equipment:'Optional weights', difficulty:1, yt:'standing calf raise tutorial' },
  { id:42, name:'Goblet Squat',           group:'Legs',    muscles:['Quads','Glutes','Core'],          type:'both', equipment:'Dumbbell/kettlebell',difficulty:1,yt:'goblet squat tutorial' },
  { id:43, name:'Bulgarian Split Squat',  group:'Legs',    muscles:['Quads','Glutes'],                 type:'both', equipment:'Bench + optional dumbbells',difficulty:3,yt:'bulgarian split squat tutorial' },
  { id:44, name:'Bodyweight Squat',       group:'Legs',    muscles:['Quads','Glutes','Hamstrings'],    type:'home', equipment:'None',            difficulty:1, yt:'bodyweight squat form tutorial' },
  { id:45, name:'Glute Bridge',           group:'Legs',    muscles:['Glutes','Hamstrings'],            type:'home', equipment:'None',            difficulty:1, yt:'glute bridge tutorial' },
  { id:46, name:'Wall Sit',               group:'Legs',    muscles:['Quads'],                          type:'home', equipment:'Wall',            difficulty:1, yt:'wall sit exercise tutorial' },
  { id:47, name:'Jump Squat',             group:'Legs',    muscles:['Quads','Glutes','Calves'],        type:'home', equipment:'None',            difficulty:2, yt:'jump squat tutorial' },

  // CORE
  { id:48, name:'Plank',                  group:'Core',    muscles:['Core','Shoulders'],               type:'home', equipment:'None',            difficulty:1, yt:'perfect plank form tutorial' },
  { id:49, name:'Cable Crunch',           group:'Core',    muscles:['Upper Abs'],                      type:'gym',  equipment:'Cable machine',   difficulty:1, yt:'cable crunch abs tutorial' },
  { id:50, name:'Hanging Leg Raise',      group:'Core',    muscles:['Lower Abs','Hip Flexors'],        type:'gym',  equipment:'Pull-up bar',     difficulty:2, yt:'hanging leg raise abs tutorial' },
  { id:51, name:'Russian Twist',          group:'Core',    muscles:['Obliques'],                       type:'home', equipment:'Optional weight', difficulty:1, yt:'russian twist obliques tutorial' },
  { id:52, name:'Ab Wheel Rollout',       group:'Core',    muscles:['Core','Lats'],                    type:'gym',  equipment:'Ab wheel',        difficulty:3, yt:'ab wheel rollout tutorial' },
  { id:53, name:'Mountain Climber',       group:'Core',    muscles:['Core','Shoulders','Hip Flexors'],  type:'home', equipment:'None',            difficulty:2, yt:'mountain climber exercise tutorial' },
  { id:54, name:'Bicycle Crunch',         group:'Core',    muscles:['Obliques','Abs'],                 type:'home', equipment:'None',            difficulty:1, yt:'bicycle crunch tutorial abs' },
  { id:55, name:'Dead Bug',               group:'Core',    muscles:['Core','Lower Back'],              type:'home', equipment:'None',            difficulty:1, yt:'dead bug exercise tutorial' },
  { id:56, name:'L-Sit Hold',             group:'Core',    muscles:['Core','Triceps','Lats'],          type:'both', equipment:'Parallel bars or floor',difficulty:3,yt:'l-sit tutorial beginners' },

  // GLUTES
  { id:57, name:'Hip Thrust',             group:'Glutes',  muscles:['Glutes','Hamstrings'],            type:'gym',  equipment:'Barbell + bench', difficulty:2, yt:'hip thrust barbell tutorial' },
  { id:58, name:'Cable Kickback',         group:'Glutes',  muscles:['Glutes'],                         type:'gym',  equipment:'Cable machine',   difficulty:1, yt:'cable glute kickback tutorial' },
  { id:59, name:'Sumo Squat',             group:'Glutes',  muscles:['Glutes','Inner Thighs'],          type:'both', equipment:'Optional dumbbell',difficulty:1,yt:'sumo squat glutes tutorial' },
  { id:60, name:'Donkey Kick',            group:'Glutes',  muscles:['Glutes'],                         type:'home', equipment:'None',            difficulty:1, yt:'donkey kick glutes tutorial' },
  { id:61, name:'Fire Hydrant',           group:'Glutes',  muscles:['Glutes','Hip Abductors'],         type:'home', equipment:'None',            difficulty:1, yt:'fire hydrant exercise tutorial' },

  // CARDIO / FULL BODY
  { id:62, name:'Burpee',                 group:'Cardio',  muscles:['Full Body'],                      type:'home', equipment:'None',            difficulty:3, yt:'burpee exercise tutorial' },
  { id:63, name:'Battle Ropes',           group:'Cardio',  muscles:['Arms','Shoulders','Core'],        type:'gym',  equipment:'Battle ropes',    difficulty:2, yt:'battle ropes workout tutorial' },
  { id:64, name:'Box Jump',               group:'Cardio',  muscles:['Legs','Glutes'],                  type:'gym',  equipment:'Box',             difficulty:2, yt:'box jump tutorial' },
  { id:65, name:'Jump Rope',              group:'Cardio',  muscles:['Calves','Cardio'],                type:'both', equipment:'Jump rope',       difficulty:1, yt:'jump rope tutorial beginners' },
  { id:66, name:'High Knees',             group:'Cardio',  muscles:['Hip Flexors','Core','Cardio'],    type:'home', equipment:'None',            difficulty:1, yt:'high knees exercise tutorial' },
  { id:67, name:'Rowing Machine',         group:'Cardio',  muscles:['Back','Arms','Legs'],             type:'gym',  equipment:'Rowing machine',  difficulty:2, yt:'rowing machine technique tutorial' },

  // NECK
  { id:68, name:'Neck Flexion',          group:'Neck',    muscles:['Neck Flexors'],               type:'home', equipment:'None / resistance band',  difficulty:1, yt:'neck flexion exercise tutorial' },
  { id:69, name:'Neck Extension',         group:'Neck',    muscles:['Neck Extensors','Traps'],      type:'home', equipment:'None / resistance band',  difficulty:1, yt:'neck extension exercise tutorial' },
  { id:70, name:'Neck Lateral Flexion',   group:'Neck',    muscles:['Neck Lateral Flexors'],        type:'home', equipment:'None',                    difficulty:1, yt:'neck lateral flexion exercise' },
  { id:71, name:'Neck Rotation',          group:'Neck',    muscles:['Neck Rotators','SCM'],         type:'home', equipment:'None',                    difficulty:1, yt:'neck rotation stretch exercise' },
  { id:72, name:'Neck Resistance Press',  group:'Neck',    muscles:['All Neck Muscles'],            type:'home', equipment:'Hand pressure',           difficulty:1, yt:'isometric neck exercise tutorial' },
  { id:73, name:'Neck Harness Pull',      group:'Neck',    muscles:['Neck Extensors','Traps'],      type:'gym',  equipment:'Neck harness',            difficulty:2, yt:'neck harness exercise tutorial' },
  { id:74, name:'Shrug',                  group:'Neck',    muscles:['Traps','Neck'],                type:'both', equipment:'Dumbbells / Barbell',     difficulty:1, yt:'dumbbell shrug trap neck tutorial' },

  // CHIN
  { id:75, name:'Chin-Up (narrow grip)', group:'Chin',    muscles:['Biceps','Lats','Lower Traps'], type:'both', equipment:'Pull-up bar',             difficulty:2, yt:'chin up narrow grip tutorial' },
  { id:76, name:'Chin Tuck',             group:'Chin',    muscles:['Deep Neck Flexors','Chin'],    type:'home', equipment:'None',                    difficulty:1, yt:'chin tuck exercise neck posture' },
  { id:77, name:'Double Chin Exercise',  group:'Chin',    muscles:['Submental muscles','Jaw'],     type:'home', equipment:'None',                    difficulty:1, yt:'double chin exercise jaw workout' },
  { id:78, name:'Jaw Resistance Press',  group:'Chin',    muscles:['Jaw Muscles','Chin'],          type:'home', equipment:'Hand pressure',           difficulty:1, yt:'jaw resistance exercise facial' },
  { id:79, name:'Ball Squeeze Chin',     group:'Chin',    muscles:['Chin','Jaw','Neck'],           type:'home', equipment:'Small ball',              difficulty:1, yt:'chin jaw ball squeeze exercise' },
  { id:80, name:'Face Pull (high)',      group:'Chin',    muscles:['Rear Delts','Lower Traps','Chin area'],type:'gym',equipment:'Cable machine',     difficulty:1, yt:'high face pull rear delt trap tutorial' },
]

const GROUPS = ['All','Chest','Back','Shoulders','Biceps','Triceps','Legs','Glutes','Core','Cardio','Neck','Chin']
const TYPE_FILTER = ['All','gym','home','both']
const DIFF_LABELS = ['','Beginner','Intermediate','Advanced']
const DIFF_COLORS = ['','var(--success)','var(--warning)','var(--danger)']

function ytUrl(query) {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`
}

function ExerciseCard({ ex }) {
  const [open, setOpen] = useState(false)
  const typeColor = ex.type==='gym'?'#4f6ef7':ex.type==='home'?'#22c55e':'#f59e0b'
  const typeLabel = ex.type==='gym'?'🏋️ Gym':ex.type==='home'?'🏠 Home':'🔀 Both'
  return (
    <Card style={{ padding:0, overflow:'hidden' }}>
      <div onClick={()=>setOpen(o=>!o)} style={{ display:'flex',alignItems:'center',gap:'12px',padding:'12px 16px',cursor:'pointer',background:open?'var(--accent-soft)':'transparent' }}>
        {open?<ChevronDown size={13} color="var(--text-muted)"/>:<ChevronRight size={13} color="var(--text-muted)"/>}
        <div style={{ flex:1,minWidth:0 }}>
          <p style={{ fontSize:'13px',fontWeight:600 }}>{ex.name}</p>
          <p style={{ fontSize:'11px',color:'var(--text-muted)',marginTop:'2px' }}>{ex.muscles.join(' · ')}</p>
        </div>
        <span style={{ fontSize:'11px',padding:'2px 8px',borderRadius:'20px',background:typeColor+'22',color:typeColor,fontWeight:600,flexShrink:0,whiteSpace:'nowrap' }}>{typeLabel}</span>
        <span style={{ fontSize:'11px',padding:'2px 8px',borderRadius:'20px',background:DIFF_COLORS[ex.difficulty]+'22',color:DIFF_COLORS[ex.difficulty],fontWeight:600,flexShrink:0 }}>{DIFF_LABELS[ex.difficulty]}</span>
      </div>
      {open&&(
        <div style={{ borderTop:'1px solid var(--border)',padding:'14px 16px',display:'flex',gap:'16px',alignItems:'flex-start',background:'var(--bg-input)' }}>
          <div style={{ flex:1 }}>
            <p style={{ fontSize:'12px',color:'var(--text-muted)',marginBottom:'6px' }}>
              <strong>Equipment:</strong> {ex.equipment}
            </p>
            <div style={{ display:'flex',flexWrap:'wrap',gap:'5px',marginBottom:'10px' }}>
              {ex.muscles.map(m=>(
                <span key={m} style={{ fontSize:'11px',padding:'2px 8px',borderRadius:'20px',background:'var(--bg-badge)',color:'var(--text-secondary)' }}>{m}</span>
              ))}
            </div>
          </div>
          <a
            href={ytUrl(ex.yt)}
            target="_blank"
            rel="noreferrer"
            style={{ display:'inline-flex',alignItems:'center',gap:'6px',padding:'8px 14px',borderRadius:'var(--radius-sm)',background:'#ff0000',color:'#fff',fontSize:'12px',fontWeight:600,textDecoration:'none',flexShrink:0 }}
          >
            <ExternalLink size={12}/> Watch on YouTube
          </a>
        </div>
      )}
    </Card>
  )
}


// ─── Main component ───────────────────────────────────────────────
export default function WorkoutGuidePage() {
  const [activeGroup,  setActiveGroup]  = useState(() => {
    const g = sessionStorage.getItem('workoutGroup')
    if (g) { sessionStorage.removeItem('workoutGroup'); return g }
    return 'All'
  })
  const [typeFilter,   setTypeFilter]   = useState('All')
  const [diffFilter,   setDiffFilter]   = useState(0)   // 0 = all
  const [search,       setSearch]       = useState('')
  const [page,         setPage]         = useState(1)
  const PAGE_SIZE = 20

  const filtered = useMemo(()=>{
    setPage(1)  // reset to page 1 whenever filters change
    return EXERCISES.filter(ex=>{
      if (activeGroup!=='All'&&ex.group!==activeGroup) return false
      if (typeFilter!=='All'&&ex.type!==typeFilter&&!(typeFilter==='gym'&&ex.type==='both')&&!(typeFilter==='home'&&ex.type==='both')) return false
      if (diffFilter&&ex.difficulty!==diffFilter) return false
      if (search&&!ex.name.toLowerCase().includes(search.toLowerCase())&&!ex.muscles.some(m=>m.toLowerCase().includes(search.toLowerCase()))) return false
      return true
    }).sort((a,b)=>a.difficulty-b.difficulty||a.group.localeCompare(b.group)||a.name.localeCompare(b.name))
  },[activeGroup,typeFilter,diffFilter,search])

  // Group counts for the muscle group pills
  const groupCounts = useMemo(()=>{
    const counts = {}
    GROUPS.forEach(g=>{ counts[g]=g==='All'?EXERCISES.length:EXERCISES.filter(e=>e.group===g).length })
    return counts
  },[])

  return (
    <div>
      <PageHeader
        title="🏋️ Workout Guide"
        subtitle="Browse exercises by muscle group · YouTube tutorials · AI workout plans"

      />

      {/* Muscle group pills */}
      <div style={{ display:'flex',gap:'6px',flexWrap:'wrap',marginBottom:'16px' }}>
        {GROUPS.map(g=>{
          const active=activeGroup===g
          const emoji = { All:'💪',Chest:'🫁',Back:'🔙',Shoulders:'🔝',Biceps:'💪',Triceps:'✋',Legs:'🦵',Glutes:'🍑',Core:'⚡',Cardio:'❤️',Neck:'🧣',Chin:'🦷' }[g]||'💪'
          return (
            <button key={g} onClick={()=>setActiveGroup(g)} style={{ padding:'6px 14px',borderRadius:'20px',border:active?'1px solid var(--accent)':'1px solid var(--border)',background:active?'var(--accent)':'var(--bg-card)',color:active?'#fff':'var(--text-secondary)',fontSize:'13px',fontWeight:active?600:400,cursor:'pointer',display:'flex',alignItems:'center',gap:'6px',transition:'all 0.15s' }}>
              {emoji} {g} <span style={{ fontSize:'11px',opacity:0.7 }}>({groupCounts[g]})</span>
            </button>
          )
        })}
      </div>

      {/* Secondary filters */}
      <div style={{ display:'flex',gap:'8px',flexWrap:'wrap',marginBottom:'20px',alignItems:'center' }}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search exercises or muscles…" style={{ width:220 }}/>
        <div style={{ display:'flex',gap:'4px' }}>
          {[['All','All'],['gym','🏋️ Gym'],['home','🏠 Home'],['both','🔀 Both']].map(([v,l])=>(
            <button key={v} onClick={()=>setTypeFilter(v)} style={{ padding:'5px 11px',borderRadius:'20px',border:typeFilter===v?'1px solid var(--accent)':'1px solid var(--border)',background:typeFilter===v?'var(--accent-soft)':'transparent',color:typeFilter===v?'var(--accent)':'var(--text-secondary)',fontSize:'12px',cursor:'pointer' }}>{l}</button>
          ))}
        </div>
        <div style={{ display:'flex',gap:'4px' }}>
          {[[0,'All levels'],[1,'Beginner'],[2,'Intermediate'],[3,'Advanced']].map(([v,l])=>(
            <button key={v} onClick={()=>setDiffFilter(v)} style={{ padding:'5px 11px',borderRadius:'20px',border:diffFilter===v?`1px solid ${DIFF_COLORS[v]||'var(--accent)'}`:'1px solid var(--border)',background:diffFilter===v?(DIFF_COLORS[v]||'var(--accent)')+'22':'transparent',color:diffFilter===v?(DIFF_COLORS[v]||'var(--accent)'):'var(--text-secondary)',fontSize:'12px',cursor:'pointer' }}>{l}</button>
          ))}
        </div>
        <span style={{ fontSize:'12px',color:'var(--text-muted)',marginLeft:'auto' }}>{filtered.length} exercises</span>
      </div>

      {/* Exercise list */}
      {filtered.length===0?(
        <Card style={{ textAlign:'center',padding:'40px' }}>
          <p style={{ fontSize:'28px',marginBottom:'10px' }}>🔍</p>
          <p style={{ fontSize:'14px',color:'var(--text-secondary)' }}>No exercises match your filters.</p>
        </Card>
      ):(
        <>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'6px' }}>
            {filtered.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE).map(ex=><ExerciseCard key={ex.id} ex={ex}/>)}
          </div>
          {filtered.length > PAGE_SIZE && (
            <div style={{ display:'flex',gap:'8px',justifyContent:'center',alignItems:'center',marginTop:'16px' }}>
              <button
                onClick={()=>setPage(p=>Math.max(1,p-1))}
                disabled={page===1}
                style={{ padding:'6px 14px',borderRadius:'var(--radius-sm)',border:'1px solid var(--border)',background:'transparent',cursor:page===1?'not-allowed':'pointer',color:page===1?'var(--text-muted)':'var(--text-secondary)',fontSize:'13px' }}
              >← Prev</button>
              <span style={{ fontSize:'13px',color:'var(--text-muted)' }}>
                Page {page} of {Math.ceil(filtered.length/PAGE_SIZE)} · {filtered.length} exercises
              </span>
              <button
                onClick={()=>setPage(p=>Math.min(Math.ceil(filtered.length/PAGE_SIZE),p+1))}
                disabled={page>=Math.ceil(filtered.length/PAGE_SIZE)}
                style={{ padding:'6px 14px',borderRadius:'var(--radius-sm)',border:'1px solid var(--border)',background:'transparent',cursor:page>=Math.ceil(filtered.length/PAGE_SIZE)?'not-allowed':'pointer',color:page>=Math.ceil(filtered.length/PAGE_SIZE)?'var(--text-muted)':'var(--text-secondary)',fontSize:'13px' }}
              >Next →</button>
            </div>
          )}
        </>
      )}


    </div>
  )
}
