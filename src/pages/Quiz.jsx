import React, { useState, useRef } from 'react'
import Card from '../components/Card'
import PageHeader from '../components/PageHeader'
import Btn from '../components/Btn'
import { RefreshCw, Trophy, Zap, Target, ChevronRight, Check, X, Plus, Trash2, Pencil, BookOpen } from 'lucide-react'
import { getQuestion, getBankSize, QUESTION_BANK } from '../quizData'
import { getChallengeTopics, getChallengeBank, getDualModeQuestions } from '../quizChallenges'
import { useLocalStorage } from '../hooks/useLocalStorage'

// ─── Topic config ──────────────────────────────────────────────────
const TOPICS = [
  { id:'f1_winners',       label:'F1 Race Winners',   emoji:'🏎️', color:'#ef4444', description:'Who won each Grand Prix from 1993 to present' },
  { id:'f1_general',       label:'F1 General',         emoji:'🏁', color:'#f97316', description:'Constructors, records, champions, circuits' },
  { id:'football_english', label:'English Football',   emoji:'⚽', color:'#4f6ef7', description:'Premier League, EFL, FA Cup history' },
  { id:'football_world',   label:'World Cup',          emoji:'🌍', color:'#22c55e', description:'FIFA World Cup history  -  all tournaments' },
  { id:'mixed',            label:'Mixed Bag',          emoji:'🎲', color:'#a78bfa', description:'All topics combined  -  keep you on your toes' },
]

const MODES = [
  { id:'quickfire', label:'Quick Fire', emoji:'⚡', description:'10 questions · score at the end', total:10 },
  { id:'endless',   label:'Endless',   emoji:'♾️', description:'Keep going until you get one wrong', total:Infinity },
]

// ─── Answer checking ───────────────────────────────────────────────
function normalise(s) {
  return s.toLowerCase()
    .replace(/[^a-z0-9\s]/g,'')
    .replace(/\s+/g,' ')
    .trim()
}

function checkAnswer(userAnswer, correctAnswer) {
  const u = normalise(userAnswer)
  const c = normalise(correctAnswer)
  if (u === c) return true
  // Partial: user answer contained in correct or vice versa
  if (c.includes(u) && u.length >= 3) return true
  if (u.includes(c) && c.length >= 3) return true
  // Surname match for names
  const cWords = c.split(' ')
  const uWords = u.split(' ')
  if (cWords.length > 1 && uWords.length === 1 && cWords[cWords.length-1] === uWords[0]) return true
  if (uWords.length > 1 && cWords.length === 1 && uWords[uWords.length-1] === cWords[0]) return true
  return false
}

const DUAL_QUESTIONS = getDualModeQuestions()

function pickQuestion(topicId, usedIdxs, customQs) {
  const allTopics = TOPICS.filter(t=>t.id!=='mixed').map(t=>t.id)
  const topics = topicId === 'mixed' ? allTopics : [topicId]
  const shuffledTopics = [...topics].sort(()=>Math.random()-0.5)
  for (const tid of shuffledTopics) {
    const overrides = customQs[`_overrides_${tid}`]||{}
    const builtIn = (QUESTION_BANK[tid]||[]).map((q,i)=>{
      const ov = overrides[i]
      return ov
        ? {question:ov.question,answer:ov.answer,hint:ov.hint||'',fact:ov.fact||'',_idx:i,_topic:tid,_custom:false}
        : {question:q.q,answer:q.a,hint:q.h,fact:q.f,_idx:i,_topic:tid,_custom:false}
    })
    const custom  = (customQs[tid]||[]).map((q,i)=>({...q,_idx:1000+i,_topic:tid,_custom:true}))
    // Also include dual-mode challenge questions for this topic
    const dual = (DUAL_QUESTIONS[tid]||[]).map((q,i)=>({
      question:q.q, answer:q.a, hint:q.h, fact:q.f, _idx:5000+i, _topic:tid, _custom:false, _dual:true
    }))
    const combined = [...builtIn,...custom,...dual]
    const used = usedIdxs[tid]||[]
    const available = combined.filter(q=>!used.includes(q._idx))
    if (available.length) return available[Math.floor(Math.random()*available.length)]
  }
  return null
}

const EMPTY_Q = { question:'', answer:'', hint:'', fact:'' }

// ─── Main Quiz Page ────────────────────────────────────────────────
// ─── Challenge Mode ────────────────────────────────────────────────
function ChallengeMode({ topic: preSelectedTopic, onBack, quizStats, setQuizStats }) {
  const CTOPICS = getChallengeTopics()
  const [cTopic,   setCTopic]   = useState(preSelectedTopic||null)
  const [cScreen,  setCScreen]  = useState(preSelectedTopic?'playing':'home')  // home | playing | result
  const [challenge, setChallenge] = useState(()=>{
    if (preSelectedTopic) {
      const bank = getChallengeBank(preSelectedTopic.id)
      return bank[Math.floor(Math.random()*bank.length)]||null
    }
    return null
  })
  const [used,      setUsed]    = useState([])
  const [answers,   setAnswers] = useState(()=>{
    if (preSelectedTopic) {
      const bank = getChallengeBank(preSelectedTopic.id)
      const q = bank[0]
      return q?.type==='podium' ? Array(3).fill('') : []
    }
    return []
  })
  const [input,     setInput]   = useState('')   // for guess_player
  const [submitted, setSubmitted] = useState(false)
  const [correct,   setCorrect] = useState(false)
  const [score,     setScore]   = useState(0)
  const [total,     setTotal]   = useState(0)
  const [history,   setHistory] = useState([])
  const inputRef = useRef()

  function startChallenge(topic) {
    setCTopic(topic)
    setUsed([]); setScore(0); setTotal(0); setHistory([])
    const bank = getChallengeBank(topic.id)
    const q = bank[Math.floor(Math.random()*bank.length)]
    setChallenge(q)
    setAnswers(Array(q.type==='podium'?3:0).fill(''))
    setInput('')
    setSubmitted(false)
    setCScreen('playing')
    setTimeout(()=>inputRef.current?.focus(),50)
  }

  function nextChallenge() {
    const bank = getChallengeBank(cTopic.id)
    const available = bank.filter((_,i)=>!used.includes(i))
    if (!available.length) {
      setQuizStats(prev=>[{
        date: new Date().toISOString(),
        topic: cTopic.id, topicLabel: cTopic.label,
        mode: 'challenge',
        score, total,
        pct: total>0?Math.round(score/total*100):0,
      },...prev].slice(0,100))
      setCScreen('result')
      return
    }
    const idx = bank.indexOf(available[Math.floor(Math.random()*available.length)])
    setUsed(u=>[...u,idx])
    setChallenge(bank[idx])
    setAnswers(Array(bank[idx].type==='podium'?3:0).fill(''))
    setInput('')
    setSubmitted(false)
  }

  function submit() {
    if (submitted) return
    let isCorrect = false
    if (challenge.type === 'podium') {
      isCorrect = challenge.positions.every((p,i)=>
        p.toLowerCase() === (answers[i]||'').toLowerCase().trim()
      )
    } else if (challenge.type === 'multi') {
      isCorrect = input === challenge.a
    } else if (challenge.type === 'formation' || challenge.type === 'player_profile' || challenge.type === 'free' || challenge.type === 'guess_player' || challenge.type === 'guess_team') {
      const u = input.toLowerCase().trim()
      const c = challenge.a.toLowerCase()
      isCorrect = u === c || c.includes(u) || u.includes(c.split(' ').slice(0,2).join(' '))
    }
    setCorrect(isCorrect)
    setSubmitted(true)
    if (isCorrect) setScore(s=>s+1)
    setTotal(t=>t+1)
    setHistory(h=>[...h,{q:challenge.q, a:challenge.a, userAnswer: challenge.type==='podium'?answers.join(' / '):input, correct:isCorrect}])
  }

  const allDriversForPodium = challenge?.type==='podium' ? [
    'Michael Schumacher','Lewis Hamilton','Max Verstappen','Sebastian Vettel','Ayrton Senna',
    'Mika Hakkinen','Fernando Alonso','Kimi Raikkonen','Damon Hill','Nigel Mansell',
    'Alain Prost','Rubens Barrichello','Valtteri Bottas','Nico Rosberg','David Coulthard',
    'Mark Webber','Daniel Ricciardo','Jenson Button','Ralf Schumacher','Juan Pablo Montoya',
    'Charles Leclerc','Lando Norris','Carlos Sainz Jr','Sergio Perez','George Russell',
    'Pierre Gasly','Esteban Ocon','Lance Stroll','Oscar Piastri','Felipe Massa',
    'Jarno Trulli','Giancarlo Fisichella','Eddie Irvine','Robert Kubica','Nick Heidfeld',
    // WC/football players
    'England','Brazil','Germany','France','Italy','Argentina','Netherlands','Spain',
    'Portugal','Uruguay','Croatia','Belgium','Hungary','Poland','Czechoslovakia',
  ] : []

  // World Cup / football teams for podium guessing
  const podiumOptions = challenge?.type==='podium' ? allDriversForPodium : []

  if (cScreen === 'home') return (
    <div>
      <PageHeader title="⚔️ Challenge Mode" subtitle="Podiums, multi-choice, player & team guessers"
        action={<Btn variant="ghost" size="sm" onClick={onBack}><X size={13}/> Back</Btn>}
      />
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:'10px'}}>
        {CTOPICS.map(t=>(
          <button key={t.id} onClick={()=>startChallenge(t)}
            style={{display:'flex',alignItems:'center',gap:'12px',padding:'16px',borderRadius:'var(--radius)',border:`1px solid var(--border)`,background:'var(--bg-card)',cursor:'pointer',textAlign:'left',transition:'border-color 0.15s'}}
            onMouseEnter={e=>e.currentTarget.style.borderColor=t.color}
            onMouseLeave={e=>e.currentTarget.style.borderColor='var(--border)'}
          >
            <span style={{fontSize:'28px',flexShrink:0}}>{t.emoji}</span>
            <div>
              <p style={{fontSize:'13px',fontWeight:600,color:t.color,marginBottom:'2px'}}>{t.label}</p>
              <p style={{fontSize:'11px',color:'var(--text-muted)'}}>{t.description} · {getChallengeBank(t.id).length} challenges</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )

  if (cScreen === 'result') return (
    <div>
      <PageHeader title="⚔️ Challenge Results" subtitle={cTopic?.label}
        action={<Btn variant="ghost" size="sm" onClick={()=>setCScreen('home')}><X size={13}/> Back</Btn>}
      />
      <Card style={{maxWidth:600,margin:'0 auto',textAlign:'center',padding:'32px'}}>
        <p style={{fontSize:'48px',marginBottom:'12px'}}>{score===total?'🏆':score>=total*0.7?'⭐':'👍'}</p>
        <h2 style={{fontFamily:'var(--font-display)',fontSize:'28px',fontWeight:700,marginBottom:'6px'}}>{score} / {total}</h2>
        <p style={{fontSize:'14px',color:'var(--text-secondary)',marginBottom:'24px'}}>{score===total?'Perfect!':score>=total*0.7?'Great effort!':'Keep practising!'}</p>
        {history.length>0&&(
          <div style={{textAlign:'left',marginBottom:'20px',maxHeight:300,overflowY:'auto',display:'flex',flexDirection:'column',gap:'5px'}}>
            {history.map((h,i)=>(
              <div key={i} style={{padding:'8px 10px',background:h.correct?'var(--success-soft)':'var(--danger-soft)',borderRadius:'var(--radius-sm)',border:`1px solid ${h.correct?'var(--success)':'var(--danger)'}`,fontSize:'12px'}}>
                <p style={{fontWeight:500,marginBottom:'2px'}}>{h.correct?'✅':'❌'} {h.q}</p>
                <p style={{color:'var(--text-muted)'}}>Answer: <strong>{h.a}</strong>{!h.correct&&<> · You said: <em>{h.userAnswer}</em></>}</p>
              </div>
            ))}
          </div>
        )}
        <div style={{display:'flex',gap:'10px',justifyContent:'center'}}>
          <Btn onClick={()=>startChallenge(cTopic)}>Play again</Btn>
          <Btn variant="secondary" onClick={onBack}>Change topic</Btn>
        </div>
      </Card>
    </div>
  )

  if (!challenge) return null
  const topicInfo = CTOPICS.find(t=>t.id===cTopic?.id)

  return (
    <div>
      <PageHeader title="⚔️ Challenge Mode" subtitle={topicInfo?.label}
        action={<Btn variant="ghost" size="sm" onClick={()=>setCScreen('home')}><X size={13}/> Quit</Btn>}
      />
      <div style={{display:'flex',gap:'10px',alignItems:'center',marginBottom:'16px'}}>
        <span style={{fontSize:'12px',color:'var(--text-muted)'}}>Challenge {total+1}</span>
        <span style={{fontSize:'13px',fontWeight:700,color:'var(--success)',marginLeft:'auto'}}>✓ {score}</span>
      </div>

      <Card style={{maxWidth:700,padding:'28px'}}>
        <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'16px'}}>
          <span style={{fontSize:'16px'}}>{topicInfo?.emoji}</span>
          <span style={{fontSize:'11px',fontWeight:600,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.06em'}}>
            {challenge.type==='podium'?'🥇 Guess the podium in order':
             challenge.type==='multi'?'🔘 Multiple choice':
             challenge.type==='free'?'✍️ Free answer':
             challenge.type==='player_profile'?'🕵️ Guess the player':
             challenge.type==='formation'?'🎽 Guess the team from the formation':
             challenge.type==='guess_player'?'🕵️ Guess the player':
             '🎽 Guess the team'}
          </span>
        </div>

        {/* Question text (not shown for player_profile  -  the card IS the question) */}
        {challenge.q&&challenge.type!=='player_profile'&&challenge.type!=='formation'&&(
          <p style={{fontFamily:'var(--font-display)',fontSize:'18px',fontWeight:600,lineHeight:1.5,marginBottom:'22px'}}>{challenge.q}</p>
        )}

        {/* PLAYER PROFILE TYPE */}
        {challenge.type==='player_profile'&&challenge.profile&&(
          <div style={{marginBottom:'20px'}}>
            <p style={{fontFamily:'var(--font-display)',fontSize:'16px',fontWeight:600,marginBottom:'14px'}}>Who is this player?</p>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0',border:'1px solid var(--border)',borderRadius:'var(--radius)',overflow:'hidden',marginBottom:'16px'}}>
              {[
                ['🌍 Nationality', challenge.profile.nationality, challenge.profile.cc],
                ['📍 Position', challenge.profile.position, null],
                ['👕 Shirt numbers', challenge.profile.shirts?.join(', '), null],
                ['🏟️ Clubs', challenge.profile.clubs?.join(' → '), null],
              ].map(([label,val,cc],i)=>(
                <div key={label} style={{padding:'10px 14px',background:i%2===0?'var(--bg-card)':'var(--bg-input)',borderBottom:'1px solid var(--border)'}}>
                  <p style={{fontSize:'10px',color:'var(--text-muted)',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:'3px'}}>{label}</p>
                  <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                    {cc&&<img src={`https://flagcdn.com/w40/${cc}.png`} alt={val||''} style={{height:14,borderRadius:2,flexShrink:0}} onError={e=>e.target.style.display='none'}/>}
                    <p style={{fontSize:'13px',color:'var(--text-primary)',lineHeight:1.4}}>{val}</p>
                  </div>
                </div>
              ))}
              <div style={{padding:'10px 14px',gridColumn:'1/-1',background:'var(--bg-card)',borderBottom:'none'}}>
                <p style={{fontSize:'10px',color:'var(--text-muted)',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:'6px'}}>🏆 Achievements</p>
                <div style={{display:'flex',flexWrap:'wrap',gap:'5px'}}>
                  {challenge.profile.achievements?.map((a,i)=>(
                    <span key={i} style={{fontSize:'11px',padding:'2px 8px',borderRadius:10,background:'var(--warning-soft)',color:'var(--warning)',fontWeight:500}}>{a}</span>
                  ))}
                </div>
              </div>
            </div>
            <input ref={inputRef} value={input} onChange={e=>setInput(e.target.value)}
              onKeyDown={e=>e.key==='Enter'&&!submitted&&submit()}
              placeholder="Type the player's name..."
              disabled={submitted}
              style={{width:'100%',fontSize:'15px',padding:'10px 14px',borderRadius:'var(--radius)',border:`2px solid ${submitted?correct?'var(--success)':'var(--danger)':'var(--border)'}`,background:'var(--bg-input)',transition:'border-color 0.2s',boxSizing:'border-box'}}
            />
          </div>
        )}

        {/* FORMATION / GUESS THE TEAM TYPE */}
        {challenge.type==='formation'&&challenge.lineup&&(()=>{
          const ROW_ORDER = {ST:0,CF:0,RW:0,LW:0,SS:0,RAM:1,CAM:1,LAM:1,RM:1,LM:1,CM:2,CDM:3,RB:4,CB:4,LB:4,RWB:4,LWB:4,GK:5}
          // Sort within each row: L-side on left, centre, R-side on right
          const LATERAL = {LW:0,LM:0,LAM:0,LB:0,LWB:0,CF:1,CAM:1,CDM:1,GK:1,CB:1,CM:1,SS:1,ST:1.5,RM:2,RAM:2,RW:2,RB:2,RWB:2}
          const rowMap = {}
          challenge.lineup.forEach(p=>{
            const r = ROW_ORDER[p.pos]??2
            if(!rowMap[r]) rowMap[r]=[]
            rowMap[r].push(p)
          })
          const rows = Object.keys(rowMap).sort((a,b)=>Number(a)-Number(b)).map(k=>
            [...rowMap[k]].sort((a,b)=>(LATERAL[a.pos]??1)-(LATERAL[b.pos]??1))
          )
          const isNational = challenge.national===true
          return (
            <div style={{marginBottom:'20px'}}>
              <div style={{display:'flex',alignItems:'baseline',gap:'10px',marginBottom:'12px'}}>
                <p style={{fontFamily:'var(--font-display)',fontSize:'16px',fontWeight:600}}>
                  {isNational?'Which national squad is this?':'Which club squad is this?'}
                </p>
                {challenge.year&&<span style={{fontSize:'13px',color:'var(--text-muted)'}}>{challenge.year}</span>}
              </div>
              <div style={{display:'flex',justifyContent:'center',marginBottom:'12px'}}>
                <div style={{background:'#3d8b3d',borderRadius:6,position:'relative',overflow:'hidden',width:280,boxSizing:'border-box'}}>
                  {/* Grass stripes */}
                  {Array.from({length:8}).map((_,i)=>(
                    <div key={i} style={{position:'absolute',top:0,bottom:0,left:`${i*12.5}%`,width:'12.5%',background:i%2===0?'#3a8b3a':'#3d8b3d',pointerEvents:'none'}}/>
                  ))}
                  {/* Pitch markings */}
                  <div style={{position:'absolute',inset:6,border:'2px solid rgba(255,255,255,0.7)',pointerEvents:'none'}}/>
                  <div style={{position:'absolute',left:'20%',right:'20%',top:6,height:38,border:'2px solid rgba(255,255,255,0.7)',borderTop:'none',pointerEvents:'none'}}/>
                  <div style={{position:'absolute',left:'37%',right:'37%',top:6,height:13,border:'2px solid rgba(255,255,255,0.7)',borderTop:'none',pointerEvents:'none'}}/>
                  <div style={{position:'absolute',left:6,right:6,top:'50%',height:2,background:'rgba(255,255,255,0.7)',pointerEvents:'none'}}/>
                  <div style={{position:'absolute',left:'50%',top:'50%',width:50,height:50,border:'2px solid rgba(255,255,255,0.7)',borderRadius:'50%',transform:'translate(-50%,-50%)',pointerEvents:'none'}}/>
                  <div style={{position:'absolute',left:'50%',top:'50%',width:5,height:5,background:'rgba(255,255,255,0.9)',borderRadius:'50%',transform:'translate(-50%,-50%)',pointerEvents:'none'}}/>
                  <div style={{position:'absolute',left:'20%',right:'20%',bottom:6,height:38,border:'2px solid rgba(255,255,255,0.7)',borderBottom:'none',pointerEvents:'none'}}/>
                  <div style={{position:'absolute',left:'37%',right:'37%',bottom:6,height:13,border:'2px solid rgba(255,255,255,0.7)',borderBottom:'none',pointerEvents:'none'}}/>
                  {/* Corner arcs */}
                  {[[6,6,'0 100% 0 0'],[6,'auto',null,6,'100% 0 0 0'],['auto',6,null,'auto','0 0 100% 0'],['auto','auto',null,'auto','0 0 0 100%']].map((_,ci)=>{
                    const corners = [{top:6,left:6,br:'0 0 100% 0'},{top:6,right:6,br:'0 0 0 100%'},{bottom:6,left:6,br:'0 100% 0 0'},{bottom:6,right:6,br:'100% 0 0 0'}]
                    const c = corners[ci]
                    return <div key={ci} style={{position:'absolute',...c,width:12,height:12,border:'2px solid rgba(255,255,255,0.7)',borderRadius:c.br,pointerEvents:'none'}}/>
                  })}
                  {/* Players */}
                  <div style={{display:'flex',flexDirection:'column',justifyContent:'space-between',position:'relative',zIndex:1,padding:'20px 4px',minHeight:460}}>
                    {rows.map((row,ri)=>(
                      <div key={ri} style={{display:'flex',justifyContent:'space-evenly',alignItems:'center'}}>
                        {row.map((player,pi)=>(
                          <div key={pi} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:2,flex:1,maxWidth:60}}>
                            <div style={{width:38,height:38,borderRadius:'50%',overflow:'hidden',border:'2px solid rgba(255,255,255,0.9)',boxShadow:'0 2px 6px rgba(0,0,0,0.5)',background:isNational?(player.bg||'#555'):'#444',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                              {isNational ? (
                                <span style={{fontSize:'8px',fontWeight:800,color:'#fff',textAlign:'center',textShadow:'0 1px 2px rgba(0,0,0,0.8)',lineHeight:1.1,padding:'0 1px'}}>
                                  {(player.abbr||player.club?.slice(0,3)||'?').toUpperCase()}
                                </span>
                              ) : player.cc ? (
                                <img src={`https://flagcdn.com/w80/${player.cc}.png`} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}} onError={e=>e.target.style.display='none'}/>
                              ) : (
                                <span style={{fontSize:'9px',color:'#ccc'}}>?</span>
                              )}
                            </div>
                            <span style={{fontSize:'7px',color:'rgba(255,255,255,0.95)',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.02em',textShadow:'0 1px 2px rgba(0,0,0,0.9)',textAlign:'center',lineHeight:1.1}}>
                              {player.pos}
                            </span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <p style={{fontSize:'11px',color:'var(--text-muted)',marginBottom:'10px',textAlign:'center'}}>{challenge.formation}</p>
              <input ref={inputRef} value={input} onChange={e=>setInput(e.target.value)}
                onKeyDown={e=>e.key==='Enter'&&!submitted&&submit()}
                placeholder={isNational?'Type the national team…':'Type the club or squad name…'}
                disabled={submitted}
                style={{width:'100%',fontSize:'15px',padding:'10px 14px',borderRadius:'var(--radius)',border:`2px solid ${submitted?correct?'var(--success)':'var(--danger)':'var(--border)'}`,background:'var(--bg-input)',transition:'border-color 0.2s',boxSizing:'border-box'}}
              />
            </div>
          )
        })()}

        {/* PODIUM TYPE */}
        {challenge.type==='podium'&&(
          <div style={{display:'flex',flexDirection:'column',gap:'10px',marginBottom:'16px'}}>
            {['🥇 1st place','🥈 2nd place','🥉 3rd place'].map((label,i)=>(
              <div key={i}>
                <label style={{fontSize:'11px',color:'var(--text-muted)',display:'block',marginBottom:'3px'}}>{label}</label>
                <input
                  ref={i===0?inputRef:null}
                  list={`podium-suggestions-${i}`}
                  value={answers[i]||''}
                  onChange={e=>setAnswers(a=>{const n=[...a];n[i]=e.target.value;return n})}
                  placeholder="Start typing a name..."
                  disabled={submitted}
                  style={{width:'100%',fontSize:'14px',padding:'8px 12px',borderRadius:'var(--radius)',border:`2px solid ${submitted?(answers[i]?.toLowerCase()===challenge.positions[i]?.toLowerCase()?'var(--success)':'var(--danger)'):'var(--border)'}`,background:'var(--bg-input)',transition:'border-color 0.2s'}}
                />
                <datalist id={`podium-suggestions-${i}`}>
                  {podiumOptions.map(p=><option key={p} value={p}/>)}
                </datalist>
                {submitted&&<p style={{fontSize:'11px',color:answers[i]?.toLowerCase()===challenge.positions[i]?.toLowerCase()?'var(--success)':'var(--danger)',marginTop:'3px'}}>{answers[i]?.toLowerCase()===challenge.positions[i]?.toLowerCase()?'✓ Correct!':'✗ Was: '+challenge.positions[i]}</p>}
              </div>
            ))}
          </div>
        )}

        {/* FREE-TEXT TYPE */}
        {challenge.type==='free'&&(
          <div style={{marginBottom:'16px'}}>
            <input ref={inputRef} value={input} onChange={e=>setInput(e.target.value)}
              onKeyDown={e=>e.key==='Enter'&&!submitted&&submit()}
              placeholder="Type your answer..." disabled={submitted}
              style={{width:'100%',fontSize:'15px',padding:'10px 14px',borderRadius:'var(--radius)',border:`2px solid ${submitted?correct?'var(--success)':'var(--danger)':'var(--border)'}`,background:'var(--bg-input)',transition:'border-color 0.2s',boxSizing:'border-box'}}
            />
          </div>
        )}

        {/* MULTI-CHOICE TYPE */}
        {challenge.type==='multi'&&(
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',marginBottom:'16px'}}>
            {challenge.options.map(opt=>{
              const isCorrect = opt===challenge.a
              const isSelected = input===opt
              let bg='var(--bg-input)', border='var(--border)', color='var(--text-primary)'
              if (submitted) {
                if (isCorrect) { bg='var(--success-soft)'; border='var(--success)'; color='var(--success)' }
                else if (isSelected&&!isCorrect) { bg='var(--danger-soft)'; border='var(--danger)'; color='var(--danger)' }
              } else if (isSelected) {
                bg='var(--accent-soft)'; border='var(--accent)'; color='var(--accent)'
              }
              return (
                <button key={opt} onClick={()=>!submitted&&setInput(opt)}
                  style={{padding:'12px 16px',borderRadius:'var(--radius)',border:`2px solid ${border}`,background:bg,color,cursor:submitted?'default':'pointer',textAlign:'left',fontSize:'13px',fontWeight:isSelected?600:400,transition:'all 0.15s'}}>
                  {submitted&&isCorrect?'✓ ':submitted&&isSelected&&!isCorrect?'✗ ':''}{opt}
                </button>
              )
            })}
          </div>
        )}

        {/* OLD GUESS PLAYER/TEAM (text format, kept for backwards compat) */}
        {(challenge.type==='guess_player'||challenge.type==='guess_team')&&(
          challenge.options ? (
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',marginBottom:'16px'}}>
              {challenge.options.map(opt=>{
                const isCorrect = opt===challenge.a
                const isSelected = input===opt
                let bg='var(--bg-input)', border='var(--border)', color='var(--text-primary)'
                if (submitted) {
                  if (isCorrect) { bg='var(--success-soft)'; border='var(--success)'; color='var(--success)' }
                  else if (isSelected) { bg='var(--danger-soft)'; border='var(--danger)'; color='var(--danger)' }
                } else if (isSelected) {
                  bg='var(--accent-soft)'; border='var(--accent)'; color='var(--accent)'
                }
                return (
                  <button key={opt} onClick={()=>!submitted&&setInput(opt)}
                    style={{padding:'12px 16px',borderRadius:'var(--radius)',border:`2px solid ${border}`,background:bg,color,cursor:submitted?'default':'pointer',textAlign:'left',fontSize:'13px',fontWeight:isSelected?600:400,transition:'all 0.15s'}}>
                    {submitted&&isCorrect?'✓ ':submitted&&isSelected&&!isCorrect?'✗ ':''}{opt}
                  </button>
                )
              })}
            </div>
          ) : (
            <input ref={inputRef} value={input} onChange={e=>setInput(e.target.value)}
              onKeyDown={e=>e.key==='Enter'&&!submitted&&submit()}
              placeholder="Type your answer..." disabled={submitted}
              style={{width:'100%',fontSize:'15px',padding:'10px 14px',borderRadius:'var(--radius)',border:`2px solid ${submitted?correct?'var(--success)':'var(--danger)':'var(--border)'}`,background:'var(--bg-input)',marginBottom:'12px',transition:'border-color 0.2s'}}
            />
          )
        )}

        {/* Hint */}
        {!submitted&&<p style={{fontSize:'12px',color:'var(--text-muted)',marginBottom:'12px',fontStyle:'italic'}}>💡 {challenge.h}</p>}

        {/* Result feedback */}
        {submitted&&(
          <div style={{padding:'12px 14px',borderRadius:'var(--radius-sm)',background:correct?'var(--success-soft)':'var(--danger-soft)',border:`1px solid ${correct?'var(--success)':'var(--danger)'}`,marginBottom:'16px'}}>
            <p style={{fontSize:'14px',fontWeight:700,color:correct?'var(--success)':'var(--danger)',marginBottom:'4px'}}>{correct?'✅ Correct!':'❌ Not quite'}</p>
            {!correct&&challenge.type!=='podium'&&<p style={{fontSize:'13px',color:'var(--text-secondary)',marginBottom:'4px'}}>Answer: <strong>{challenge.a}</strong></p>}
            {challenge.f&&<p style={{fontSize:'12px',color:'var(--text-muted)',fontStyle:'italic'}}>💡 {challenge.f}</p>}
          </div>
        )}

        <div style={{display:'flex',gap:'8px',justifyContent:'space-between',alignItems:'center'}}>
          {!submitted ? (
            <Btn onClick={submit} disabled={
              challenge.type==='podium'?answers.some(a=>!a.trim()):
              !input.trim()
            }>Submit answer</Btn>
          ) : (
            <Btn onClick={nextChallenge}>Next challenge <ChevronRight size={14}/></Btn>
          )}
          {submitted&&<Btn variant="ghost" size="sm" onClick={()=>setCScreen('result')}>See results</Btn>}
        </div>
      </Card>
    </div>
  )
}

// ─── AI Question Generator ─────────────────────────────────────────
const TOPIC_PROMPTS = {
  f1_winners:       'Generate 5 F1 Race Winners quiz questions. Format: JSON array of {q,a,h,f} where q=question about who won a specific Grand Prix in a specific year, a=winning driver full name, h=subtle hint, f=interesting fact.',
  f1_general:       'Generate 5 F1 General Knowledge quiz questions (champions, records, circuits, constructors). Format: JSON array of {q,a,h,f}.',
  football_english: 'Generate 5 English Football quiz questions (Premier League, FA Cup, EFL history). Format: JSON array of {q,a,h,f}.',
  football_world:   'Generate 5 World Cup quiz questions (winners, top scorers, host nations, famous moments). Format: JSON array of {q,a,h,f}.',
  guess_player:     `Generate 3 Guess the Player challenges using the player_profile format. Return a JSON array of objects with this exact structure:
{"type":"player_profile","a":"Full Player Name","profile":{"nationality":"Nationality","flag":"🏴󠁧󠁢󠁥󠁮󠁧󠁿","position":"Position","clubs":["Club1","Club2"],"shirts":["9"],"achievements":["Achievement 1","Achievement 2"]},"h":"subtle hint","f":"interesting fact"}
Use real, well-known footballers. Include the correct national flag emoji.`,
  guess_team:       `Generate 3 Guess the Team (formation) challenges. Return a JSON array of objects:
{"type":"formation","a":"Team Name Year","options":["Team A","Team B","Team C","Team D"],"formation":"4-4-2","lineup":[{"flag":"🇧🇷","pos":"GK","name":"Name"},...],"h":"hint","f":"fact"}
lineup must have exactly 11 players. Use famous squads. pos values: GK, RB, CB, LB, RWB, LWB, CM, CDM, CAM, RM, LM, RAM, LAM, ST, CF, RW, LW`,
  pl_seasons:       'Generate 5 Premier League quiz questions (winners, top scorers, memorable moments). Format: JSON array of {q,a,options:["A","B","C","D"],h,f} with type:"multi" and dual:true.',
  wc_questions:     'Generate 5 World Cup trivia questions. Format: JSON array of {q,a,options:["A","B","C","D"],h,f} with type:"multi" and dual:true.',
}

function AiGenerator({ topicId, isChallengeTopic, onAdd }) {
  const [generating, setGenerating] = useState(false)
  const [preview,    setPreview]    = useState(null)
  const [error,      setError]      = useState('')
  const [selected,   setSelected]   = useState([])

  const prompt = TOPIC_PROMPTS[topicId]
  if (!prompt) return null

  async function generate() {
    setGenerating(true); setError(''); setPreview(null); setSelected([])
    try {
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          model:'claude-sonnet-4-6',
          max_tokens:1000,
          system:'You are a quiz question generator. Always respond with valid JSON only  -  no markdown, no explanation, no backticks. Just the raw JSON array.',
          messages:[{role:'user',content:prompt}]
        })
      })
      const data = await resp.json()
      if (data.error) { setError(`API error: ${data.error.message}`); setGenerating(false); return }
      const text = data.content?.[0]?.text||''
      const clean = text.replace(/```json|```/g,'').trim()
      const questions = JSON.parse(clean)
      if (!Array.isArray(questions)) throw new Error('Not an array')
      setPreview(questions)
      setSelected(questions.map((_,i)=>i))
    } catch(e) {
      setError(`Failed to generate: ${e.message}. Make sure VITE_ANTHROPIC_KEY is set in .env.local`)
    }
    setGenerating(false)
  }

  function addSelected() {
    const toAdd = preview.filter((_,i)=>selected.includes(i))
    onAdd(toAdd)
    setPreview(null); setSelected([])
  }

  return (
    <div style={{display:'inline-flex',flexDirection:'column',gap:'8px'}}>
      <Btn size="sm" variant="secondary" onClick={generate} disabled={generating} style={{background:'linear-gradient(135deg,#7c3aed22,#4f6ef722)',borderColor:'#7c3aed66'}}>
        {generating ? '⟳ Generating...' : '✨ Generate with AI'}
      </Btn>
      {error && <p style={{fontSize:'11px',color:'var(--danger)',maxWidth:300}}>{error}</p>}
      {preview && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',zIndex:100,display:'flex',alignItems:'center',justifyContent:'center',padding:'20px'}}>
          <div style={{background:'var(--bg-card)',borderRadius:'var(--radius)',padding:'24px',maxWidth:600,width:'100%',maxHeight:'80vh',overflowY:'auto',boxShadow:'0 20px 60px rgba(0,0,0,0.4)'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px'}}>
              <h3 style={{fontFamily:'var(--font-display)',fontSize:'16px',fontWeight:700}}>✨ AI Generated  -  Review & Add</h3>
              <button onClick={()=>{setPreview(null);setSelected([])}} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)'}}><X size={16}/></button>
            </div>
            <p style={{fontSize:'12px',color:'var(--text-muted)',marginBottom:'14px'}}>Tick the ones you want to add. Always review AI answers before saving  -  they may need corrections.</p>
            <div style={{display:'flex',flexDirection:'column',gap:'8px',marginBottom:'16px'}}>
              {preview.map((q,i)=>{
                const isSel = selected.includes(i)
                return (
                  <div key={i} onClick={()=>setSelected(s=>s.includes(i)?s.filter(x=>x!==i):[...s,i])}
                    style={{padding:'12px',borderRadius:'var(--radius-sm)',border:`1px solid ${isSel?'var(--accent)':'var(--border)'}`,background:isSel?'var(--accent-soft)':'var(--bg-input)',cursor:'pointer',transition:'all 0.15s'}}>
                    <div style={{display:'flex',gap:'8px',alignItems:'flex-start'}}>
                      <div style={{width:16,height:16,borderRadius:3,border:`2px solid ${isSel?'var(--accent)':'var(--border)'}`,background:isSel?'var(--accent)':'transparent',flexShrink:0,marginTop:2,display:'flex',alignItems:'center',justifyContent:'center'}}>
                        {isSel&&<Check size={10} color="#fff"/>}
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        {q.type==='player_profile' ? (
                          <>
                            <p style={{fontSize:'12px',fontWeight:600,marginBottom:'2px'}}>🕵️ {q.a}</p>
                            <p style={{fontSize:'11px',color:'var(--text-muted)'}}>{q.profile?.nationality} · {q.profile?.position} · {q.profile?.clubs?.join(', ')}</p>
                          </>
                        ) : q.type==='formation' ? (
                          <>
                            <p style={{fontSize:'12px',fontWeight:600,marginBottom:'2px'}}>🎽 {q.a}</p>
                            <p style={{fontSize:'11px',color:'var(--text-muted)'}}>{q.formation} · {q.lineup?.map(p=>p.flag).join(' ')}</p>
                          </>
                        ) : (
                          <>
                            <p style={{fontSize:'12px',fontWeight:500,marginBottom:'2px'}}>{q.q}</p>
                            <p style={{fontSize:'11px',color:'var(--success)'}}>✓ {q.a}</p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            <div style={{display:'flex',gap:'8px'}}>
              <Btn onClick={addSelected} disabled={selected.length===0}>Add {selected.length} selected</Btn>
              <Btn variant="ghost" onClick={generate} disabled={generating}>{generating?'Generating...':'Regenerate'}</Btn>
              <Btn variant="ghost" onClick={()=>{setPreview(null);setSelected([])}}>Cancel</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function QuizPage() {
  const [customQs, setCustomQs] = useLocalStorage('danos-quiz-custom', {})
  const [quizStats, setQuizStats] = useLocalStorage('danos-quiz-stats', [])
  const [screen,   setScreen]   = useState('home')   // home | playing | result | manage | stats
  const [topic,    setTopic]    = useState(null)
  const [mode,     setMode]     = useState(null)

  // Manage screen state
  const [manageTopic, setManageTopic] = useState(TOPICS[0])
  const [editingIdx,  setEditingIdx]  = useState(null)  // null = new, number = editing existing
  const [qForm,       setQForm]       = useState(EMPTY_Q)
  const [showForm,    setShowForm]    = useState(false)
  const [filter,      setFilter]      = useState('all') // all | builtin | custom

  // Playing state
  const [question,  setQuestion]  = useState(null)
  const [userAnswer,setUserAnswer]= useState('')
  const [submitted, setSubmitted] = useState(false)
  const [correct,   setCorrect]   = useState(false)
  const [showHint,  setShowHint]  = useState(false)
  const [score,     setScore]     = useState(0)
  const [qNum,      setQNum]      = useState(0)
  const [usedIdxs,  setUsedIdxs] = useState({})   // {topicId: [idx, ...]}
  const [history,   setHistory]  = useState([])   // [{q,a,correct}]
  const [streak,    setStreak]   = useState(0)
  const inputRef = useRef()

  function startGame() {
    if (!topic || !mode) return
    setUsedIdxs({})
    setScore(0)
    setQNum(0)
    setHistory([])
    setStreak(0)
    const q = pickQuestion(topic.id, {}, customQs)
    if (!q) return
    setQuestion(q)
    setUserAnswer('')
    setSubmitted(false)
    setShowHint(false)
    setScreen('playing')
    setTimeout(()=>inputRef.current?.focus(),50)
  }

  function submit() {
    if (!userAnswer.trim() || submitted) return
    const isCorrect = checkAnswer(userAnswer, question.answer)
    setCorrect(isCorrect)
    setSubmitted(true)
    const newHistory = [...history, { question:question.question, answer:question.answer, userAnswer, correct:isCorrect }]
    setHistory(newHistory)
    if (isCorrect) {
      setScore(s=>s+1)
      setStreak(s=>s+1)
    } else {
      if (mode.id === 'endless') {
        const newHistory2 = newHistory
        const finalScore = score // correct count before this wrong one
        setTimeout(()=>{
          setQuizStats(prev=>[{
            date: new Date().toISOString(),
            topic: topic.id, topicLabel: topic.label,
            mode: mode.id,
            score: finalScore,
            total: newHistory2.length,
            pct: newHistory2.length>0?Math.round(finalScore/newHistory2.length*100):0,
          }, ...prev].slice(0,100))
          setHistory(newHistory2)
          setScreen('result')
        }, 2200)
        return
      }
      setStreak(0)
    }
  }

  function nextQuestion() {
    const newNum = qNum + 1
    if (mode.id === 'quickfire' && newNum >= mode.total) {
      setQuizStats(prev=>[{
        date: new Date().toISOString(),
        topic: topic.id, topicLabel: topic.label,
        mode: mode.id,
        score: score + (correct?1:0),
        total: mode.total,
        pct: Math.round((score+(correct?1:0))/mode.total*100),
      }, ...prev].slice(0,100))
      setScreen('result')
      return
    }
    // Mark used
    const qTopic = question._topic || topic.id
    const newUsed = { ...usedIdxs, [qTopic]: [...(usedIdxs[qTopic]||[]), question._idx] }
    setUsedIdxs(newUsed)
    const q = pickQuestion(topic.id, newUsed, customQs)
    if (!q) { setScreen('result'); return }
    setQuestion(q)
    setQNum(newNum)
    setUserAnswer('')
    setSubmitted(false)
    setShowHint(false)
    setTimeout(()=>inputRef.current?.focus(),50)
  }

  function handleKey(e) {
    if (e.key === 'Enter') {
      if (!submitted) submit()
      else if (correct || mode.id !== 'endless') nextQuestion()
    }
  }

  const bankSizes = TOPICS.filter(t=>t.id!=='mixed').map(t=>({id:t.id,size:getBankSize(t.id)}))
  const totalQuestions = bankSizes.reduce((a,t)=>a+t.size,0)

  // ── Screens ──────────────────────────────────────────────────────
  const CTOPICS = getChallengeTopics()
  const isChallenge = mode?.id === 'challenge'

  if (screen === 'home') return (
    <div>
      <PageHeader title="🧠 Knowledge Quiz" subtitle={`${totalQuestions} questions · works offline`}
        action={
          <div style={{display:'flex',gap:'8px'}}>
            {quizStats.length>0&&<Btn variant="secondary" size="sm" onClick={()=>setScreen('stats')}><Trophy size={13}/> Stats</Btn>}
            <Btn variant="secondary" size="sm" onClick={()=>setScreen('manage')}><BookOpen size={13}/> Manage questions</Btn>
          </div>
        }
      />

      {/* Step 1: Choose mode */}
      <Card style={{marginBottom:'16px'}}>
        <h3 style={{fontFamily:'var(--font-display)',fontSize:'15px',fontWeight:600,marginBottom:'14px'}}>1. Choose a game mode</h3>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'8px'}}>
          {[...MODES, {id:'challenge',label:'Challenge Mode',emoji:'⚔️',description:'Podiums, multi-choice, guess the player & team'}].map(m=>{
            const active = mode?.id===m.id
            return (
              <button key={m.id} onClick={()=>{setMode(m);setTopic(null)}}
                style={{display:'flex',alignItems:'center',gap:'12px',padding:'12px',borderRadius:'var(--radius)',border:`1px solid ${active?'var(--accent)':'var(--border)'}`,background:active?'var(--accent-soft)':'transparent',cursor:'pointer',textAlign:'left'}}>
                <span style={{fontSize:'24px',flexShrink:0}}>{m.emoji}</span>
                <div style={{flex:1,minWidth:0}}>
                  <p style={{fontSize:'13px',fontWeight:600,color:active?'var(--accent)':'var(--text-primary)'}}>{m.label}</p>
                  <p style={{fontSize:'11px',color:'var(--text-muted)',lineHeight:1.4}}>{m.description}</p>
                </div>
                {active&&<Check size={14} color="var(--accent)" style={{flexShrink:0}}/>}
              </button>
            )
          })}
        </div>
      </Card>

      {/* Step 2: Choose topic (changes based on mode) */}
      {mode && (
        <Card style={{marginBottom:'16px'}}>
          <h3 style={{fontFamily:'var(--font-display)',fontSize:'15px',fontWeight:600,marginBottom:'14px'}}>
            2. Choose a topic
          </h3>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))',gap:'8px'}}>
            {(isChallenge ? CTOPICS : TOPICS).map(t=>{
              const sz = isChallenge ? getChallengeBank(t.id).length : (t.id==='mixed'?totalQuestions:getBankSize(t.id))
              const active = topic?.id===t.id
              return (
                <button key={t.id} onClick={()=>setTopic(t)}
                  style={{display:'flex',alignItems:'center',gap:'12px',padding:'12px',borderRadius:'var(--radius)',border:`1px solid ${active?t.color:'var(--border)'}`,background:active?t.color+'18':'transparent',cursor:'pointer',textAlign:'left'}}>
                  <span style={{fontSize:'22px',flexShrink:0}}>{t.emoji}</span>
                  <div style={{flex:1,minWidth:0}}>
                    <p style={{fontSize:'13px',fontWeight:600,color:active?t.color:'var(--text-primary)'}}>{t.label}</p>
                    <p style={{fontSize:'11px',color:'var(--text-muted)'}}>{t.description} · {sz} {isChallenge?'challenges':'questions'}</p>
                  </div>
                  {active&&<Check size={14} color={t.color} style={{flexShrink:0}}/>}
                </button>
              )
            })}
          </div>
        </Card>
      )}

      {/* Start button */}
      {mode && topic && (
        <div style={{display:'flex',justifyContent:'flex-end'}}>
          <Btn
            onClick={()=>{
              if (isChallenge) setScreen('challenge')
              else startGame()
            }}
            style={{fontSize:'15px',padding:'12px 28px'}}
          >
            {isChallenge?`Start ${topic.label} challenges →`:'Start Quiz →'}
          </Btn>
        </div>
      )}
    </div>
  )

  if (screen === 'challenge') {
    return <ChallengeMode topic={topic} onBack={()=>setScreen('home')} quizStats={quizStats} setQuizStats={setQuizStats}/>
  }

  if (screen === 'stats') {
    const byTopic = {}
    TOPICS.filter(t=>t.id!=='mixed').forEach(t=>{ byTopic[t.id]={attempts:0,totalScore:0,totalQs:0,best:0,label:t.label,emoji:t.emoji,color:t.color} })
    quizStats.forEach(s=>{
      const t = byTopic[s.topic]
      if (!t) return
      t.attempts++
      t.totalScore+=s.score
      t.totalQs+=s.total
      t.best=Math.max(t.best,s.pct)
    })
    const overallPct = quizStats.length ? Math.round(quizStats.reduce((a,s)=>a+s.pct,0)/quizStats.length) : 0

    return (
      <div>
        <PageHeader title="📊 Quiz Stats" subtitle={`${quizStats.length} attempts tracked`}
          action={<Btn variant="ghost" size="sm" onClick={()=>setScreen('home')}><X size={13}/> Back</Btn>}
        />
        {/* Headline stats */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:'12px',marginBottom:'20px'}}>
          {[
            ['🎯','Attempts',quizStats.length,'var(--accent)'],
            ['✅','Avg score',`${overallPct}%`,'var(--success)'],
            ['🔥','Best streak',Math.max(0,...quizStats.filter(s=>s.mode==='endless').map(s=>s.score)),'#fbbf24'],
            ['🏆','Perfect scores',quizStats.filter(s=>s.pct===100).length,'var(--warning)'],
          ].map(([em,label,val,color])=>(
            <Card key={label} style={{padding:'16px',textAlign:'center'}}>
              <p style={{fontSize:'22px',marginBottom:'4px'}}>{em}</p>
              <p style={{fontFamily:'var(--font-display)',fontSize:'22px',fontWeight:700,color,lineHeight:1}}>{val}</p>
              <p style={{fontSize:'12px',color:'var(--text-muted)',marginTop:'4px'}}>{label}</p>
            </Card>
          ))}
        </div>

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px',marginBottom:'20px'}}>
          {/* Per-topic breakdown */}
          <Card>
            <h3 style={{fontFamily:'var(--font-display)',fontSize:'14px',fontWeight:600,marginBottom:'12px'}}>By topic</h3>
            {Object.values(byTopic).filter(t=>t.attempts>0).map(t=>(
              <div key={t.label} style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'8px'}}>
                <span style={{fontSize:'16px',flexShrink:0}}>{t.emoji}</span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:'3px'}}>
                    <span style={{fontSize:'12px',fontWeight:500}}>{t.label}</span>
                    <span style={{fontSize:'11px',color:'var(--text-muted)'}}>{t.attempts} attempts · best {t.best}%</span>
                  </div>
                  <div style={{height:5,background:'var(--bg-badge)',borderRadius:3,overflow:'hidden'}}>
                    <div style={{height:'100%',width:`${t.totalQs>0?Math.round(t.totalScore/t.totalQs*100):0}%`,background:t.color,borderRadius:3}}/>
                  </div>
                </div>
                <span style={{fontSize:'12px',fontWeight:700,color:t.color,minWidth:32,textAlign:'right'}}>{t.totalQs>0?Math.round(t.totalScore/t.totalQs*100):0}%</span>
              </div>
            ))}
            {Object.values(byTopic).every(t=>t.attempts===0)&&<p style={{fontSize:'13px',color:'var(--text-muted)'}}>No attempts yet.</p>}
          </Card>

          {/* Recent attempts */}
          <Card>
            <h3 style={{fontFamily:'var(--font-display)',fontSize:'14px',fontWeight:600,marginBottom:'12px'}}>Recent attempts</h3>
            <div style={{display:'flex',flexDirection:'column',gap:'6px',maxHeight:280,overflowY:'auto'}}>
              {quizStats.slice(0,20).map((s,i)=>{
                const topicInfo = TOPICS.find(t=>t.id===s.topic)
                return (
                  <div key={i} style={{display:'flex',alignItems:'center',gap:'10px',padding:'7px 10px',background:'var(--bg-input)',borderRadius:'var(--radius-sm)'}}>
                    <span style={{fontSize:'14px',flexShrink:0}}>{topicInfo?.emoji||'🧠'}</span>
                    <div style={{flex:1,minWidth:0}}>
                      <p style={{fontSize:'12px',fontWeight:500,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{s.topicLabel} · {s.mode==='quickfire'?'Quick Fire':'Endless'}</p>
                      <p style={{fontSize:'11px',color:'var(--text-muted)'}}>{new Date(s.date).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}</p>
                    </div>
                    <div style={{textAlign:'right',flexShrink:0}}>
                      <p style={{fontFamily:'var(--font-display)',fontSize:'14px',fontWeight:700,color:s.pct>=70?'var(--success)':s.pct>=40?'var(--warning)':'var(--danger)'}}>{s.mode==='quickfire'?`${s.score}/${s.total}`:`${s.score} streak`}</p>
                      <p style={{fontSize:'10px',color:'var(--text-muted)'}}>{s.pct}%</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        </div>

        <div style={{textAlign:'right'}}>
          <Btn variant="ghost" size="sm" onClick={()=>{if(window.confirm('Clear all quiz stats?'))setQuizStats([])}}>Clear stats</Btn>
        </div>
      </div>
    )
  }

  if (screen === 'manage') {
    const CTOPICS_ALL = getChallengeTopics()
    const isChallengeTopic = CTOPICS_ALL.some(t=>t.id===manageTopic.id)
    const tid = manageTopic.id === 'mixed' ? 'f1_winners' : manageTopic.id

    // For challenge topics: load from CHALLENGES bank + custom overrides
    const challengeBank = isChallengeTopic ? getChallengeBank(tid) : []
    const challengeOverrides = (customQs[`_coverrides_${tid}`]||{})  // challenge overrides

    const overrides = isChallengeTopic ? {} : (customQs[`_overrides_${tid}`]||{})
    const builtIn = isChallengeTopic
      ? challengeBank.map((q,i)=>{
          const ov = challengeOverrides[i]
          // question text: .q for most types, synthesised for player_profile/formation
          const displayQ = q.q || (q.type==='player_profile' ? `Player profile: ${q.a}` : q.type==='formation' ? `${q.a} (${q.year||''})` : q.a)
          const displayA = q.a || q.positions?.join(' / ')
          const base = {
            question:displayQ, answer:displayA, hint:q.h||'', fact:q.f||'',
            type:q.type, positions:q.positions, dual:q.dual,
            // full original for editing
            _orig:q,
            _idx:i, _custom:false, _overridden:!!ov, _challenge:true
          }
          return ov ? {...base,...ov,_overridden:true,_orig:q} : base
        })
      : (QUESTION_BANK[tid]||[]).map((q,i)=>{
          const ov = overrides[i]
          return ov
            ? {...ov, question:ov.question, answer:ov.answer, hint:ov.hint||'', fact:ov.fact||'', _idx:i, _custom:false, _overridden:true}
            : {question:q.q, answer:q.a, hint:q.h||'', fact:q.f||'', _idx:i, _custom:false, _overridden:false}
        })
    const custom = (customQs[tid]||[]).map((q,i)=>{
      const displayQ = q.question || q.q || (q.type==='player_profile' ? `Player profile: ${q.a}` : q.type==='formation' ? `${q.a} (${q.year||''})` : q.a||'')
      const displayA = q.answer || q.a || ''
      return {...q, question:displayQ, answer:displayA, _idx:i, _custom:true}
    })
    const shown  = filter==='custom'?custom : filter==='builtin'?builtIn : [...builtIn,...custom]

    function saveQuestion() {
      if (!qForm.answer?.trim()) return
      if (editingIdx!=null && !qForm._editingCustom) {
        // Override a built-in
        const key = isChallengeTopic ? `_coverrides_${tid}` : `_overrides_${tid}`
        const save = tid==='guess_player' ? {
          answer: qForm.answer,
          profile: {
            nationality: qForm.nationality||'',
            cc: qForm.cc||'',
            position: qForm.position||'',
            shirts: (qForm.shirts||'').split(',').map(s=>s.trim()).filter(Boolean),
            clubs: (qForm.clubs||'').split(',').map(s=>s.trim()).filter(Boolean),
            achievements: (qForm.achievements||'').split('\n').map(s=>s.trim()).filter(Boolean),
          },
          hint: qForm.hint, fact: qForm.fact
        } : tid==='guess_team' ? {
          answer: qForm.answer, year: qForm.year, formation: qForm.formation,
          hint: qForm.hint, fact: qForm.fact
        } : {
          question: qForm.question, answer: qForm.answer,
          hint: qForm.hint, fact: qForm.fact
        }
        setCustomQs(prev=>({...prev,[key]:{...(prev[key]||{}),[editingIdx]:save}}))
      } else {
        // New custom or editing existing custom
        const save = tid==='guess_player' ? {
          type:'player_profile',
          a: qForm.answer,
          profile: {
            nationality: qForm.nationality||'',
            cc: qForm.cc||'',
            position: qForm.position||'',
            shirts: (qForm.shirts||'').split(',').map(s=>s.trim()).filter(Boolean),
            clubs: (qForm.clubs||'').split(',').map(s=>s.trim()).filter(Boolean),
            achievements: (qForm.achievements||'').split('\n').map(s=>s.trim()).filter(Boolean),
          },
          h: qForm.hint||'', f: qForm.fact||''
        } : tid==='guess_team' ? {
          type:'formation',
          a: qForm.answer, year: qForm.year||'', formation: qForm.formation||'4-4-2',
          national: false, lineup: [],
          h: qForm.hint||'', f: qForm.fact||''
        } : {
          question: qForm.question, answer: qForm.answer,
          hint: qForm.hint||'', fact: qForm.fact||''
        }
        setCustomQs(prev=>{
          const list=[...(prev[tid]||[])]
          if (editingIdx!=null) list[editingIdx]=save
          else list.push(save)
          return {...prev,[tid]:list}
        })
      }
      setQForm(EMPTY_Q); setEditingIdx(null); setShowForm(false)
    }
    function deleteCustom(idx) {
      setCustomQs(prev=>({...prev,[tid]:(prev[tid]||[]).filter((_,i)=>i!==idx)}))
    }
    function resetOverride(idx) {
      const key = isChallengeTopic ? `_coverrides_${tid}` : `_overrides_${tid}`
      setCustomQs(prev=>{const ov={...(prev[key]||{})};delete ov[idx];return {...prev,[key]:ov}})
    }
    function editBuiltIn(q) {
      // Populate form fields based on type
      const orig = q._orig || q
      if (tid==='guess_player') {
        const profile = orig.profile || {}
        setQForm({
          answer: orig.a||q.answer||'',
          nationality: profile.nationality||'',
          cc: profile.cc||'',
          position: profile.position||'',
          shirts: (profile.shirts||[]).join(', '),
          clubs: (profile.clubs||[]).join(', '),
          achievements: (profile.achievements||[]).join('\n'),
          hint: orig.h||q.hint||'',
          fact: orig.f||q.fact||'',
          type: 'player_profile',
          _editingCustom: false,
        })
      } else if (tid==='guess_team') {
        setQForm({
          answer: orig.a||q.answer||'',
          year: orig.year||'',
          formation: orig.formation||'',
          hint: orig.h||q.hint||'',
          fact: orig.f||q.fact||'',
          type: 'formation',
          _editingCustom: false,
        })
      } else {
        setQForm({question:q.question,answer:q.answer,hint:q.hint||'',fact:q.fact||'',_editingCustom:false})
      }
      setEditingIdx(q._idx); setShowForm(true)
    }
    function editCustom(q,idx) {
      if (q.type==='player_profile') {
        const profile = q.profile || {}
        setQForm({
          answer: q.a||'',
          nationality: profile.nationality||'',
          cc: profile.cc||'',
          position: profile.position||'',
          shirts: (profile.shirts||[]).join(', '),
          clubs: (profile.clubs||[]).join(', '),
          achievements: (profile.achievements||[]).join('\n'),
          hint: q.h||'',
          fact: q.f||'',
          type: 'player_profile',
          _editingCustom: true,
        })
      } else if (q.type==='formation') {
        setQForm({
          answer: q.a||q.answer||'',
          year: q.year||'',
          formation: q.formation||'',
          hint: q.h||q.hint||'',
          fact: q.f||q.fact||'',
          type: 'formation',
          _editingCustom: true,
        })
      } else {
        setQForm({question:q.question||q.q||'',answer:q.answer||q.a||'',hint:q.hint||q.h||'',fact:q.fact||q.f||'',_editingCustom:true})
      }
      setEditingIdx(idx); setShowForm(true)
    }
    function toggleDual(idx) {
      // Toggle whether a challenge question also appears in Quickfire/Endless
      const key = `_coverrides_${tid}`
      const current = customQs[key]?.[idx]||{}
      const wasDual = current.dual ?? challengeBank[idx]?.dual ?? false
      setCustomQs(prev=>({...prev,[key]:{...(prev[key]||{}),[idx]:{...current,dual:!wasDual}}}))
    }

    const overrideCount = isChallengeTopic ? Object.keys(challengeOverrides).length : Object.keys(overrides).length

    return (
      <div>
        <PageHeader title="🧠 Manage Questions" subtitle="Add, edit or remove quiz questions"
          action={<Btn variant="ghost" size="sm" onClick={()=>{setScreen('home');setShowForm(false);setQForm(EMPTY_Q)}}><X size={13}/> Back</Btn>}
        />

        {/* Topic tabs  -  Standard then Challenge */}
        <div style={{display:'flex',gap:'6px',flexWrap:'wrap',marginBottom:'8px'}}>
          <span style={{fontSize:'11px',color:'var(--text-muted)',fontWeight:600,textTransform:'uppercase',alignSelf:'center',paddingRight:4}}>Standard:</span>
          {TOPICS.filter(t=>t.id!=='mixed').map(t=>(
            <button key={t.id} onClick={()=>{setManageTopic(t);setShowForm(false);setQForm(EMPTY_Q);setEditingIdx(null)}}
              style={{padding:'5px 12px',borderRadius:'20px',border:`1px solid ${manageTopic.id===t.id?t.color:'var(--border)'}`,background:manageTopic.id===t.id?t.color+'18':'transparent',color:manageTopic.id===t.id?t.color:'var(--text-secondary)',fontSize:'12px',cursor:'pointer',fontWeight:manageTopic.id===t.id?700:400}}>
              {t.emoji} {t.label} <span style={{opacity:0.6}}>({(QUESTION_BANK[t.id]||[]).length}+{(customQs[t.id]||[]).length})</span>
            </button>
          ))}
        </div>
        <div style={{display:'flex',gap:'6px',flexWrap:'wrap',marginBottom:'16px'}}>
          <span style={{fontSize:'11px',color:'var(--text-muted)',fontWeight:600,textTransform:'uppercase',alignSelf:'center',paddingRight:4}}>Challenge:</span>
          {CTOPICS_ALL.map(t=>(
            <button key={t.id} onClick={()=>{setManageTopic(t);setShowForm(false);setQForm(EMPTY_Q);setEditingIdx(null)}}
              style={{padding:'5px 12px',borderRadius:'20px',border:`1px solid ${manageTopic.id===t.id?t.color:'var(--border)'}`,background:manageTopic.id===t.id?t.color+'18':'transparent',color:manageTopic.id===t.id?t.color:'var(--text-secondary)',fontSize:'12px',cursor:'pointer',fontWeight:manageTopic.id===t.id?700:400}}>
              {t.emoji} {t.label} <span style={{opacity:0.6}}>({challengeBank.length||getChallengeBank(t.id).length})</span>
            </button>
          ))}
        </div>

        {/* Add/edit form */}
        {showForm ? (
          <Card style={{marginBottom:'16px',border:'1px solid var(--accent-border)'}}>
            <h3 style={{fontSize:'14px',fontWeight:600,marginBottom:'4px'}}>
              {editingIdx!=null&&!qForm._editingCustom?'Edit built-in question':editingIdx!=null?'Edit question':'Add new question'}
            </h3>
            {editingIdx!=null&&!qForm._editingCustom&&<p style={{fontSize:'12px',color:'var(--text-muted)',marginBottom:'10px'}}>Edits override the built-in. Reset any time to restore the original.</p>}

            {/* PLAYER PROFILE form */}
            {(tid==='guess_player'||qForm.type==='player_profile') ? (
              <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
                  <div>
                    <label style={{fontSize:'11px',color:'var(--text-muted)',display:'block',marginBottom:'3px'}}>Player name (answer) *</label>
                    <input value={qForm.answer||''} onChange={e=>setQForm(f=>({...f,answer:e.target.value}))} placeholder="e.g. Thierry Henry" style={{width:'100%'}} autoFocus/>
                  </div>
                  <div>
                    <label style={{fontSize:'11px',color:'var(--text-muted)',display:'block',marginBottom:'3px'}}>Nationality</label>
                    <input value={qForm.nationality||''} onChange={e=>setQForm(f=>({...f,nationality:e.target.value}))} placeholder="e.g. French"/>
                  </div>
                  <div>
                    <label style={{fontSize:'11px',color:'var(--text-muted)',display:'block',marginBottom:'3px'}}>Country code (for flag)</label>
                    <input value={qForm.cc||''} onChange={e=>setQForm(f=>({...f,cc:e.target.value}))} placeholder="e.g. fr, gb-eng, ar"/>
                  </div>
                  <div>
                    <label style={{fontSize:'11px',color:'var(--text-muted)',display:'block',marginBottom:'3px'}}>Position</label>
                    <input value={qForm.position||''} onChange={e=>setQForm(f=>({...f,position:e.target.value}))} placeholder="e.g. Striker"/>
                  </div>
                  <div>
                    <label style={{fontSize:'11px',color:'var(--text-muted)',display:'block',marginBottom:'3px'}}>Shirt numbers (comma-separated)</label>
                    <input value={qForm.shirts||''} onChange={e=>setQForm(f=>({...f,shirts:e.target.value}))} placeholder="e.g. 14, 12"/>
                  </div>
                  <div>
                    <label style={{fontSize:'11px',color:'var(--text-muted)',display:'block',marginBottom:'3px'}}>Clubs (comma-separated, in order)</label>
                    <input value={qForm.clubs||''} onChange={e=>setQForm(f=>({...f,clubs:e.target.value}))} placeholder="e.g. Monaco, Arsenal, Barcelona"/>
                  </div>
                </div>
                <div>
                  <label style={{fontSize:'11px',color:'var(--text-muted)',display:'block',marginBottom:'3px'}}>Achievements (one per line)</label>
                  <textarea value={qForm.achievements||''} onChange={e=>setQForm(f=>({...f,achievements:e.target.value}))} rows={3} placeholder={"World Cup 2022\n8× Ballon d'Or\nChampions League 2015"} style={{width:'100%',fontSize:'12px',padding:'8px',borderRadius:'var(--radius-sm)',border:'1px solid var(--border)',background:'var(--bg-input)',resize:'vertical',boxSizing:'border-box'}}/>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
                  <div>
                    <label style={{fontSize:'11px',color:'var(--text-muted)',display:'block',marginBottom:'3px'}}>Hint</label>
                    <input value={qForm.hint||''} onChange={e=>setQForm(f=>({...f,hint:e.target.value}))} placeholder="A subtle clue"/>
                  </div>
                  <div>
                    <label style={{fontSize:'11px',color:'var(--text-muted)',display:'block',marginBottom:'3px'}}>Interesting fact</label>
                    <input value={qForm.fact||''} onChange={e=>setQForm(f=>({...f,fact:e.target.value}))} placeholder="Shown after answering"/>
                  </div>
                </div>
                <div style={{display:'flex',gap:'8px'}}>
                  <Btn onClick={saveQuestion} disabled={!qForm.answer?.trim()}>Save</Btn>
                  <Btn variant="ghost" onClick={()=>{setShowForm(false);setQForm(EMPTY_Q);setEditingIdx(null)}}>Cancel</Btn>
                </div>
              </div>
            ) : (tid==='guess_team'||qForm.type==='formation') ? (
              /* FORMATION form */
              <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
                <p style={{fontSize:'12px',color:'var(--text-muted)'}}>
                  For formation questions, editing the answer name, hint and fact is supported here.
                  For full lineup changes, open the file in your editor:
                </p>
                <div style={{display:'flex',alignItems:'center',gap:'6px',padding:'8px 10px',background:'var(--bg-input)',borderRadius:'var(--radius-sm)',border:'1px solid var(--border)'}}>
                  <code style={{fontSize:'11px',color:'var(--text-secondary)',flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',userSelect:'all'}}>V:\Code\DanOS\src\quizChallenges.js</code>
                  <button
                    onClick={()=>{
                      navigator.clipboard.writeText('V:\\Code\\DanOS\\src\\quizChallenges.js')
                        .then(()=>{
                          const btn = document.activeElement
                          const orig = btn.textContent
                          btn.textContent = '✓ Copied!'
                          setTimeout(()=>btn.textContent=orig, 1500)
                        })
                    }}
                    style={{fontSize:'11px',padding:'3px 8px',borderRadius:'var(--radius-sm)',border:'1px solid var(--border)',background:'transparent',cursor:'pointer',color:'var(--text-secondary)',flexShrink:0,whiteSpace:'nowrap'}}>
                    📋 Copy path
                  </button>
                </div>
                <p style={{fontSize:'11px',color:'var(--text-muted)'}}>Tip: In VS Code press <kbd style={{fontSize:'10px',padding:'1px 5px',borderRadius:3,border:'1px solid var(--border)',background:'var(--bg-badge)'}}>Ctrl+P</kbd> and paste the path to jump straight to the file.</p>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
                  <div>
                    <label style={{fontSize:'11px',color:'var(--text-muted)',display:'block',marginBottom:'3px'}}>Squad/team name (answer) *</label>
                    <input value={qForm.answer||''} onChange={e=>setQForm(f=>({...f,answer:e.target.value}))} placeholder="e.g. Arsenal Invincibles" style={{width:'100%'}} autoFocus/>
                  </div>
                  <div>
                    <label style={{fontSize:'11px',color:'var(--text-muted)',display:'block',marginBottom:'3px'}}>Year / season</label>
                    <input value={qForm.year||''} onChange={e=>setQForm(f=>({...f,year:e.target.value}))} placeholder="e.g. 2003-04"/>
                  </div>
                  <div>
                    <label style={{fontSize:'11px',color:'var(--text-muted)',display:'block',marginBottom:'3px'}}>Formation</label>
                    <input value={qForm.formation||''} onChange={e=>setQForm(f=>({...f,formation:e.target.value}))} placeholder="e.g. 4-3-3"/>
                  </div>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
                  <div>
                    <label style={{fontSize:'11px',color:'var(--text-muted)',display:'block',marginBottom:'3px'}}>Hint</label>
                    <input value={qForm.hint||''} onChange={e=>setQForm(f=>({...f,hint:e.target.value}))} placeholder="A subtle clue"/>
                  </div>
                  <div>
                    <label style={{fontSize:'11px',color:'var(--text-muted)',display:'block',marginBottom:'3px'}}>Interesting fact</label>
                    <input value={qForm.fact||''} onChange={e=>setQForm(f=>({...f,fact:e.target.value}))} placeholder="Shown after answering"/>
                  </div>
                </div>
                <div style={{display:'flex',gap:'8px'}}>
                  <Btn onClick={saveQuestion} disabled={!qForm.answer?.trim()}>Save</Btn>
                  <Btn variant="ghost" onClick={()=>{setShowForm(false);setQForm(EMPTY_Q);setEditingIdx(null)}}>Cancel</Btn>
                </div>
              </div>
            ) : (
              /* STANDARD form  -  podium, free, multi */
              <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
                <div>
                  <label style={{fontSize:'11px',color:'var(--text-muted)',display:'block',marginBottom:'3px'}}>Question <span style={{color:'var(--danger)'}}>*</span></label>
                  <input value={qForm.question||''} onChange={e=>setQForm(f=>({...f,question:e.target.value}))} placeholder="e.g. Who won the 2023 British Grand Prix?" style={{width:'100%'}} autoFocus/>
                </div>
                <div>
                  <label style={{fontSize:'11px',color:'var(--text-muted)',display:'block',marginBottom:'3px'}}>Answer <span style={{color:'var(--danger)'}}>*</span></label>
                  <input value={qForm.answer||''} onChange={e=>setQForm(f=>({...f,answer:e.target.value}))} placeholder="e.g. Max Verstappen" style={{width:'100%'}}/>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
                  <div>
                    <label style={{fontSize:'11px',color:'var(--text-muted)',display:'block',marginBottom:'3px'}}>Hint (optional)</label>
                    <input value={qForm.hint||''} onChange={e=>setQForm(f=>({...f,hint:e.target.value}))} placeholder="A subtle clue"/>
                  </div>
                  <div>
                    <label style={{fontSize:'11px',color:'var(--text-muted)',display:'block',marginBottom:'3px'}}>Interesting fact (optional)</label>
                    <input value={qForm.fact||''} onChange={e=>setQForm(f=>({...f,fact:e.target.value}))} placeholder="Shown after answering"/>
                  </div>
                </div>
                <div style={{display:'flex',gap:'8px'}}>
                  <Btn onClick={saveQuestion} disabled={!(qForm.question||'').trim()||!(qForm.answer||'').trim()}>{editingIdx!=null?'Save changes':'Add question'}</Btn>
                  <Btn variant="ghost" onClick={()=>{setShowForm(false);setQForm(EMPTY_Q);setEditingIdx(null)}}>Cancel</Btn>
                </div>
              </div>
            )}
          </Card>
        ) : (
          <div style={{display:'flex',gap:'8px',marginBottom:'14px',alignItems:'center',flexWrap:'wrap'}}>
            <Btn size="sm" onClick={()=>{setShowForm(true);setQForm(EMPTY_Q);setEditingIdx(null)}}><Plus size={13}/> Add question</Btn>
            <AiGenerator
              topicId={tid}
              isChallengeTopic={isChallengeTopic}
              onAdd={(questions)=>{
                if (isChallengeTopic) {
                  setCustomQs(prev=>({...prev,[tid]:[...(prev[tid]||[]),...questions]}))
                } else {
                  setCustomQs(prev=>({...prev,[tid]:[...(prev[tid]||[]),...questions]}))
                }
              }}
            />
            {overrideCount>0&&<span style={{fontSize:'12px',color:'var(--warning)'}}>✏️ {overrideCount} built-in question{overrideCount!==1?'s':''} edited</span>}
            <div style={{display:'flex',gap:'4px',marginLeft:'auto'}}>
              {[['all','All'],['builtin','Built-in'],['custom','My questions']].map(([v,l])=>(
                <button key={v} onClick={()=>setFilter(v)} style={{padding:'4px 10px',borderRadius:'20px',border:`1px solid ${filter===v?'var(--accent)':'var(--border)'}`,background:filter===v?'var(--accent-soft)':'transparent',color:filter===v?'var(--accent)':'var(--text-secondary)',fontSize:'12px',cursor:'pointer'}}>{l}</button>
              ))}
            </div>
          </div>
        )}

        {/* Question list */}
        <Card style={{padding:0,overflow:'hidden'}}>
          <div style={{maxHeight:'60vh',overflowY:'auto'}}>
            {shown.length===0 ? (
              <p style={{padding:'32px',textAlign:'center',color:'var(--text-muted)',fontSize:'13px'}}>
                {filter==='custom'?'No custom questions yet  -  add one above.':'No questions found.'}
              </p>
            ) : shown.map((q,i)=>(
              <div key={i} style={{display:'flex',alignItems:'flex-start',gap:'12px',padding:'12px 14px',borderBottom:'1px solid var(--border)',background:i%2===0?'var(--bg-card)':'var(--bg-input)'}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:'flex',alignItems:'center',gap:'6px',marginBottom:'3px',flexWrap:'wrap'}}>
                    {q._custom&&<span style={{fontSize:'10px',padding:'1px 6px',borderRadius:10,background:'var(--accent-soft)',color:'var(--accent)',fontWeight:600}}>Custom</span>}
                    {q._overridden&&<span style={{fontSize:'10px',padding:'1px 6px',borderRadius:10,background:'var(--warning-soft)',color:'var(--warning)',fontWeight:600}}>Edited</span>}
                    {q._challenge&&q.dual&&<span style={{fontSize:'10px',padding:'1px 6px',borderRadius:10,background:'var(--success-soft)',color:'var(--success)',fontWeight:600}}>Also in Quickfire</span>}
                    <p style={{fontSize:'13px',fontWeight:500}}>{q.question}</p>
                  </div>
                  <p style={{fontSize:'12px',color:'var(--success)'}}>✓ {q.answer||q.positions?.join(' / ')}</p>
                  {q.hint&&<p style={{fontSize:'11px',color:'var(--text-muted)'}}>💡 {q.hint}</p>}
                </div>
                <div style={{display:'flex',gap:'4px',flexShrink:0}}>
                  {q._challenge&&!q._custom&&(
                    <button onClick={()=>toggleDual(q._idx)}
                      title={q.dual?'Remove from Quickfire/Endless':'Add to Quickfire/Endless'}
                      style={{background:'none',border:`1px solid ${q.dual?'var(--success)':'var(--border)'}`,cursor:'pointer',color:q.dual?'var(--success)':'var(--text-muted)',padding:'2px 5px',borderRadius:4,fontSize:'10px'}}>
                      {q.dual?'⚡QF':'+QF'}
                    </button>
                  )}
                  {q._custom ? (
                    <>
                      <button onClick={()=>editCustom(q,q._idx)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)',padding:'3px'}} title="Edit"><Pencil size={13}/></button>
                      <button onClick={()=>deleteCustom(q._idx)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--danger)',padding:'3px'}} title="Delete"><Trash2 size={13}/></button>
                    </>
                  ) : (
                    <>
                      <button onClick={()=>editBuiltIn(q)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)',padding:'3px'}} title="Edit answer"><Pencil size={13}/></button>
                      {q._overridden&&<button onClick={()=>resetOverride(q._idx)} style={{background:'none',border:'1px solid var(--border)',cursor:'pointer',color:'var(--text-muted)',padding:'2px 6px',borderRadius:4,fontSize:'10px'}} title="Reset to original">Reset</button>}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    )
  }

  if (screen === 'result') return (
    <div>
      <PageHeader title="🧠 Knowledge Quiz" subtitle="Results" />
      <Card style={{maxWidth:600,margin:'0 auto',textAlign:'center',padding:'32px'}}>
        <p style={{fontSize:'48px',marginBottom:'12px'}}>{score===mode.total?'🏆':score>=(mode.total||qNum)*0.7?'⭐':score>0?'👍':'😅'}</p>
        <h2 style={{fontFamily:'var(--font-display)',fontSize:'28px',fontWeight:700,marginBottom:'6px'}}>
          {mode.id==='quickfire' ? `${score} / ${mode.total}` : `${score} in a row!`}
        </h2>
        <p style={{fontSize:'14px',color:'var(--text-secondary)',marginBottom:'24px'}}>
          {mode.id==='endless' ? `You got ${score} correct before your first wrong answer`
            : score===mode.total ? 'Perfect score! You\'re a proper expert!'
            : score >= mode.total*0.7 ? 'Great score!'
            : 'Keep practising!'}
        </p>

        {/* Answer history */}
        {history.length>0&&(
          <div style={{textAlign:'left',marginBottom:'24px'}}>
            <p style={{fontSize:'12px',color:'var(--text-muted)',fontWeight:600,textTransform:'uppercase',marginBottom:'8px'}}>Review</p>
            <div style={{display:'flex',flexDirection:'column',gap:'6px',maxHeight:300,overflowY:'auto'}}>
              {history.map((h,i)=>(
                <div key={i} style={{display:'flex',gap:'10px',padding:'8px 10px',background:h.correct?'var(--success-soft)':'var(--danger-soft)',borderRadius:'var(--radius-sm)',border:`1px solid ${h.correct?'var(--success)':'var(--danger)'}`}}>
                  <span style={{flexShrink:0,marginTop:1}}>{h.correct?'✅':'❌'}</span>
                  <div style={{flex:1,minWidth:0}}>
                    <p style={{fontSize:'12px',fontWeight:500}}>{h.question}</p>
                    <p style={{fontSize:'11px',color:'var(--text-muted)'}}>Answer: <strong>{h.answer}</strong>{!h.correct&&<> · You said: <em>{h.userAnswer}</em></>}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{display:'flex',gap:'10px',justifyContent:'center'}}>
          <Btn onClick={startGame}>Play again</Btn>
          <Btn variant="secondary" onClick={()=>{setScreen('home');setTopic(null);setMode(null)}}>Change settings</Btn>
          <Btn variant="ghost" onClick={()=>setScreen('stats')}><Trophy size={13}/> Stats</Btn>
        </div>
      </Card>
    </div>
  )

  // Playing screen
  if (!question) return null
  const topicInfo = TOPICS.find(t=>t.id===(question._topic||topic?.id))||topic
  const progress = mode.id==='quickfire' ? (qNum / mode.total) * 100 : null

  return (
    <div>
      <PageHeader
        title="🧠 Knowledge Quiz"
        subtitle={`${topicInfo?.label} · ${mode?.label}`}
        action={<Btn variant="ghost" size="sm" onClick={()=>setScreen('home')}><X size={13}/> Quit</Btn>}
      />

      {/* Progress / streak */}
      <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'16px'}}>
        {progress!==null&&(
          <div style={{flex:1}}>
            <div style={{height:6,background:'var(--bg-badge)',borderRadius:3,overflow:'hidden'}}>
              <div style={{height:'100%',width:`${progress}%`,background:'var(--accent)',borderRadius:3,transition:'width 0.3s'}}/>
            </div>
            <p style={{fontSize:'11px',color:'var(--text-muted)',marginTop:'3px'}}>Question {qNum+1} of {mode.total}</p>
          </div>
        )}
        {mode.id==='endless'&&<p style={{fontSize:'12px',color:'var(--text-muted)'}}>Question {qNum+1}</p>}
        <div style={{display:'flex',gap:'10px',flexShrink:0}}>
          <span style={{fontSize:'13px',fontWeight:700,color:'var(--success)'}}>✓ {score}</span>
          {streak>=3&&<span style={{fontSize:'13px',fontWeight:700,color:'#fbbf24'}}>🔥 {streak}</span>}
        </div>
      </div>

      {/* Question card */}
      <Card style={{maxWidth:680,margin:'0 auto',padding:'28px'}}>
        <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'18px'}}>
          <span style={{fontSize:'16px'}}>{topicInfo?.emoji}</span>
          <span style={{fontSize:'11px',fontWeight:600,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.06em'}}>{topicInfo?.label}</span>
        </div>

        <p style={{fontFamily:'var(--font-display)',fontSize:'19px',fontWeight:600,lineHeight:1.5,marginBottom:'24px',color:'var(--text-primary)'}}>{question.question}</p>

        {showHint&&!submitted&&(
          <div style={{padding:'10px 14px',background:'var(--warning-soft)',borderRadius:'var(--radius-sm)',marginBottom:'14px',fontSize:'13px',color:'var(--text-secondary)',border:'1px solid var(--warning)'}}>
            💡 Hint: {question.hint}
          </div>
        )}

        <div style={{display:'flex',gap:'8px',marginBottom:'14px'}}>
          <input
            ref={inputRef}
            value={userAnswer}
            onChange={e=>setUserAnswer(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Type your answer…"
            disabled={submitted}
            style={{flex:1,fontSize:'15px',padding:'10px 14px',borderRadius:'var(--radius)',border:`2px solid ${submitted?correct?'var(--success)':'var(--danger)':'var(--border)'}`,background:'var(--bg-input)',transition:'border-color 0.2s'}}
          />
          {!submitted&&(
            <>
              <Btn onClick={submit} disabled={!userAnswer.trim()}>Submit</Btn>
              {!showHint&&<Btn variant="ghost" onClick={()=>setShowHint(true)}>Hint</Btn>}
            </>
          )}
        </div>

        {submitted&&(
          <div style={{padding:'14px 16px',borderRadius:'var(--radius)',background:correct?'var(--success-soft)':'var(--danger-soft)',border:`1px solid ${correct?'var(--success)':'var(--danger)'}`,marginBottom:'16px'}}>
            <p style={{fontSize:'15px',fontWeight:700,color:correct?'var(--success)':'var(--danger)',marginBottom:'4px'}}>
              {correct?'✅ Correct!':'❌ Not quite'}
            </p>
            {!correct&&<p style={{fontSize:'13px',color:'var(--text-secondary)',marginBottom:'4px'}}>The answer was: <strong>{question.answer}</strong></p>}
            {question.fact&&<p style={{fontSize:'12px',color:'var(--text-muted)',fontStyle:'italic'}}>💡 {question.fact}</p>}
          </div>
        )}

        {submitted&&(correct||mode.id!=='endless')&&(
          <div style={{textAlign:'right'}}>
            <Btn onClick={nextQuestion}>
              {mode.id==='quickfire'&&qNum+1>=mode.total ? 'See results' : 'Next question'} <ChevronRight size={14}/>
            </Btn>
          </div>
        )}
      </Card>
    </div>
  )
}
