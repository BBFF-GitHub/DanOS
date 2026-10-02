import React, { useState, useMemo, useEffect, useCallback } from 'react'
import Card from '../components/Card'
import PageHeader from '../components/PageHeader'
import Btn from '../components/Btn'
import { Plus, Trash2, Pencil, X, RefreshCw, Wifi, WifiOff, ExternalLink, AlertCircle } from 'lucide-react'

const PSN_API = 'http://localhost:5757'

// ─── Trophy config ────────────────────────────────────────────────
const TROPHY_TYPES = [
  { value:'platinum', label:'Platinum', icon:'🏆', pts:300, style:{ bg:'linear-gradient(135deg,#c8a8e0,#e8d8f8)', color:'#6b21a8', border:'#a78bfa' } },
  { value:'gold',     label:'Gold',     icon:'🥇', pts:90,  style:{ bg:'linear-gradient(135deg,#f59e0b,#fde68a)', color:'#92400e', border:'#fbbf24' } },
  { value:'silver',   label:'Silver',   icon:'🥈', pts:30,  style:{ bg:'linear-gradient(135deg,#9ca3af,#e5e7eb)', color:'#374151', border:'#d1d5db' } },
  { value:'bronze',   label:'Bronze',   icon:'🥉', pts:15,  style:{ bg:'linear-gradient(135deg,#cd7f32,#e8c080)', color:'#7c2d12', border:'#d97706' } },
]
function trophyInfo(type) { return TROPHY_TYPES.find(t=>t.value===type)||TROPHY_TYPES[3] }

const PLATFORMS = ['PS5','PS4','PS3','PS2','PS1','PSVR2']
const GENRES    = ['Action','Adventure','RPG','Sports','Racing','FPS','Puzzle','Horror','Platform','Simulation','Strategy','Fighting','Other']

const EMPTY_GAME    = { title:'', platform:'PS5', coverUrl:'', genre:'', notes:'' }
const EMPTY_TROPHY  = { name:'', description:'', type:'bronze', earned:false, hidden:false }

// ─── PSN API helpers ──────────────────────────────────────────────
async function psnFetch(path, opts={}) {
  const r = await fetch(`${PSN_API}${path}`, { ...opts, headers:{ 'Content-Type':'application/json' } })
  if (!r.ok) {
    const err = await r.json().catch(()=>({ error:`HTTP ${r.status}` }))
    throw new Error(err.error || `HTTP ${r.status}`)
  }
  return r.json()
}

// ─── Connect PSN Modal ────────────────────────────────────────────
function ConnectModal({ onClose, onConnected }) {
  const [step,    setStep]    = useState('instructions') // instructions | token | connecting | done
  const [npsso,   setNpsso]   = useState('')
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)

  async function connect() {
    if (!npsso.trim()) { setError('Please paste your NPSSO token'); return }
    setLoading(true); setError('')
    try {
      const result = await psnFetch('/auth', {
        method: 'POST',
        body: JSON.stringify({ npsso: npsso.trim() }),
      })
      setStep('done')
      onConnected(result.online_id)
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.65)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:300}}>
      <div style={{background:'var(--bg-card)',borderRadius:'var(--radius-lg)',padding:'28px',width:600,maxWidth:'92vw',maxHeight:'88vh',overflowY:'auto'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'20px'}}>
          <h2 style={{fontFamily:'var(--font-display)',fontSize:'18px',fontWeight:600}}>Connect PlayStation Network</h2>
          <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)'}}><X size={18}/></button>
        </div>

        {step==='instructions'&&(
          <div>
            <div style={{background:'var(--accent-soft)',border:'1px solid var(--accent-border)',borderRadius:'var(--radius)',padding:'14px 16px',marginBottom:'20px',fontSize:'13px',color:'var(--text-secondary)',lineHeight:1.7}}>
              <strong style={{color:'var(--text-primary)'}}>What is an NPSSO token?</strong><br/>
              It's a session cookie from PlayStation.com that proves you're logged in. It's used only locally by the PSN server running on your PC  -  it's never sent anywhere else.
            </div>
            <h3 style={{fontFamily:'var(--font-display)',fontSize:'15px',fontWeight:600,marginBottom:'14px'}}>Step-by-step instructions:</h3>
            <div style={{display:'flex',flexDirection:'column',gap:'12px',marginBottom:'20px'}}>
              {[
                { n:1, text:'Open a browser and go to PlayStation.com', sub:'Any browser works  -  Chrome, Edge, Firefox' },
                { n:2, text:'Sign in to your PlayStation account', sub:'Use your normal PSN email and password' },
                { n:3, text:'Open a new tab and go to this URL:', sub:'https://ca.account.sony.com/api/v1/ssocookie', link:'https://ca.account.sony.com/api/v1/ssocookie' },
                { n:4, text:'You\'ll see a page with JSON text containing "npsso"', sub:'It looks like: {"npsso":"abcd1234..."}  -  copy the long string value (64 characters)' },
                { n:5, text:'Paste the token into DanOS on the next screen', sub:'Then click Connect' },
              ].map(s=>(
                <div key={s.n} style={{display:'flex',gap:'14px',alignItems:'flex-start'}}>
                  <div style={{width:28,height:28,borderRadius:'50%',background:'var(--accent)',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'13px',fontWeight:700,flexShrink:0}}>{s.n}</div>
                  <div>
                    <p style={{fontSize:'13px',fontWeight:500,color:'var(--text-primary)'}}>{s.text}</p>
                    {s.link
                      ? <a href={s.link} target="_blank" rel="noreferrer" style={{fontSize:'12px',color:'var(--accent)',fontFamily:'monospace',display:'flex',alignItems:'center',gap:'4px',marginTop:'3px'}}>{s.link}<ExternalLink size={11}/></a>
                      : <p style={{fontSize:'12px',color:'var(--text-muted)',marginTop:'2px'}}>{s.sub}</p>
                    }
                    {s.sub && s.link && <p style={{fontSize:'12px',color:'var(--text-muted)',marginTop:'2px'}}>{s.sub}</p>}
                  </div>
                </div>
              ))}
            </div>
            <div style={{padding:'12px 14px',background:'var(--warning-soft)',borderRadius:'var(--radius-sm)',fontSize:'12px',color:'var(--text-secondary)',marginBottom:'20px',display:'flex',gap:'8px',alignItems:'flex-start'}}>
              <AlertCircle size={14} color="var(--warning)" style={{flexShrink:0,marginTop:1}}/>
              <span>Also make sure the PSN server is running: open a terminal, go to the <code style={{background:'var(--bg-badge)',padding:'1px 4px',borderRadius:3}}>danos</code> folder, and run <code style={{background:'var(--bg-badge)',padding:'1px 4px',borderRadius:3}}>python psn_server.py</code></span>
            </div>
            <Btn onClick={()=>setStep('token')}>I'm ready  -  enter my token →</Btn>
          </div>
        )}

        {step==='token'&&(
          <div>
            <p style={{fontSize:'13px',color:'var(--text-secondary)',marginBottom:'16px'}}>Paste your NPSSO token below. It should be 64 characters long.</p>
            <div style={{marginBottom:'12px'}}>
              <label style={{fontSize:'12px',color:'var(--text-muted)',display:'block',marginBottom:'4px'}}>NPSSO token</label>
              <input
                value={npsso}
                onChange={e=>setNpsso(e.target.value)}
                placeholder="Paste your 64-character NPSSO token here"
                style={{fontFamily:'monospace',fontSize:'13px'}}
                autoFocus
              />
              {npsso.length > 0 && (
                <p style={{fontSize:'11px',color:npsso.trim().length===64?'var(--success)':'var(--warning)',marginTop:'4px'}}>
                  {npsso.trim().length} characters {npsso.trim().length===64?'✓  -  looks right!':'(should be 64)'}
                </p>
              )}
            </div>
            {error&&(
              <div style={{padding:'10px 12px',background:'var(--danger-soft)',borderRadius:'var(--radius-sm)',color:'var(--danger)',fontSize:'13px',marginBottom:'12px',display:'flex',gap:'8px',alignItems:'flex-start'}}>
                <AlertCircle size={14} style={{flexShrink:0,marginTop:1}}/>
                <div>
                  <strong>Connection failed:</strong> {error}
                  {error.includes('refused')||error.includes('fetch')
                    ? <><br/><span style={{fontSize:'12px'}}>Make sure <code>python psn_server.py</code> is running in your terminal.</span></>
                    : error.includes('npsso')||error.includes('auth')
                    ? <><br/><span style={{fontSize:'12px'}}>Your token may have expired. Go back and get a fresh one from PlayStation.com.</span></>
                    : null
                  }
                </div>
              </div>
            )}
            <div style={{display:'flex',gap:'8px'}}>
              <Btn variant="secondary" onClick={()=>setStep('instructions')}>← Back</Btn>
              <Btn onClick={connect} disabled={loading}>
                {loading?<><RefreshCw size={13} style={{animation:'spin 1s linear infinite'}}/> Connecting…</>:'Connect PSN'}
              </Btn>
            </div>
          </div>
        )}

        {step==='done'&&(
          <div style={{textAlign:'center',padding:'20px'}}>
            <p style={{fontSize:'40px',marginBottom:'12px'}}>✅</p>
            <p style={{fontFamily:'var(--font-display)',fontSize:'18px',fontWeight:600,marginBottom:'8px'}}>Connected!</p>
            <p style={{fontSize:'13px',color:'var(--text-secondary)',marginBottom:'20px'}}>Your PSN account is now linked. Click Sync to import your games and trophies.</p>
            <Btn onClick={onClose}>Done</Btn>
          </div>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────
export default function PlayStationPage({ psData, setPsData }) {
  const games      = psData.games      || []
  const psnProfile = psData.psnProfile || null

  function setGames(fn)   { setPsData(prev=>({...prev,games:typeof fn==='function'?fn(prev.games||[]):fn})) }
  function setProfile(p)  { setPsData(prev=>({...prev,psnProfile:p})) }

  const [tab,          setTab]         = useState('library')
  const [selGameId,    setSelGameId]   = useState(null)
  const [showGameForm, setShowGameForm]= useState(false)
  const [editGameId,   setEditGameId]  = useState(null)
  const [gameForm,     setGameForm]    = useState(EMPTY_GAME)
  const [showTrForm,   setShowTrForm]  = useState(false)
  const [editTrId,     setEditTrId]    = useState(null)
  const [trForm,       setTrForm]      = useState(EMPTY_TROPHY)
  const [filterPlat,   setFilterPlat]  = useState('All')
  const [filterEarned, setFilterEarned]= useState('all')
  const [search,       setSearch]      = useState('')
  const [showConnect,  setShowConnect] = useState(false)
  const [psnStatus,    setPsnStatus]   = useState('unknown')  // unknown | connected | disconnected
  const [syncing,      setSyncing]     = useState(false)
  const [syncStatus,   setSyncStatus]  = useState('')

  const selGame = games.find(g=>g.id===selGameId)

  // ── Check PSN server status ──────────────────────────────────
  const checkStatus = useCallback(async ()=>{
    try {
      const r = await psnFetch('/status')
      setPsnStatus(r.connected?'connected':'disconnected')
      if (r.connected && r.online_id) setProfile({ onlineId: r.online_id })
    } catch {
      setPsnStatus('disconnected')
    }
  },[])

  useEffect(()=>{ checkStatus() },[checkStatus])

  // ── Sync from PSN ────────────────────────────────────────────
  async function syncFromPSN() {
    setSyncing(true); setSyncStatus('Fetching games list…')
    try {
      const { games: psnGames } = await psnFetch('/games')
      setSyncStatus(`Found ${psnGames.length} games. Fetching trophies…`)

      const updated = []
      for (let i = 0; i < psnGames.length; i++) {
        const pg = psnGames[i]
        setSyncStatus(`Fetching trophies… ${i+1}/${psnGames.length}: ${pg.title}`)

        // Map platform
        const platform = pg.platform?.includes('PS5')?'PS5':pg.platform?.includes('PS4')?'PS4':pg.platform?.includes('PS3')?'PS3':'PS4'

        let trophies = []
        try {
          const tr = await psnFetch(`/trophies?np_communication_id=${pg.np_communication_id}&platform=${platform}`)
          trophies = (tr.trophies||[]).map(t=>({
            id:          t.id ?? Date.now(),
            name:        t.name || 'Unknown trophy',
            description: t.description || '',
            type:        t.type || 'bronze',
            earned:      !!t.earned,
            hidden:      !!t.hidden,
            iconUrl:     t.icon_url || null,
            earnedAt:    t.earned_at || null,
          }))
        } catch { /* skip trophy fetch errors for individual games */ }

        const hasPlatinum = trophies.some(t=>t.type==='platinum'&&t.earned)

        updated.push({
          id:               pg.np_communication_id,
          npCommunicationId:pg.np_communication_id,
          title:            pg.title,
          platform,
          coverUrl:         pg.icon_url || '',
          genre:            '',
          notes:            '',
          psnSynced:        true,
          lastSynced:       new Date().toISOString(),
          // Keep user's custom notes/genre if game already exists
          ...(games.find(g=>g.npCommunicationId===pg.np_communication_id) || {}),
          // Always overwrite these from PSN
          trophies,
          platinum:  hasPlatinum,
          progress:  pg.progress || 0,
        })
      }

      setGames(updated)
      setSyncStatus(`✅ Synced ${updated.length} games with trophies!`)
      setTimeout(()=>setSyncStatus(''),3000)
    } catch(e) {
      setSyncStatus(`❌ Sync failed: ${e.message}`)
      setTimeout(()=>setSyncStatus(''),5000)
    }
    setSyncing(false)
  }

  // ── Stats ─────────────────────────────────────────────────────
  const stats = useMemo(()=>{
    const allTr  = games.flatMap(g=>g.trophies||[])
    const earned = allTr.filter(t=>t.earned)
    const byType = TROPHY_TYPES.reduce((acc,tt)=>({...acc,[tt.value]:earned.filter(t=>t.type===tt.value).length}),{})
    const totalPts = earned.reduce((a,t)=>a+(trophyInfo(t.type).pts||0),0)
    const platCount= games.filter(g=>g.platinum).length
    const rates    = games.map(g=>{const tot=g.trophies?.length||0;const don=g.trophies?.filter(t=>t.earned).length||0;return tot>0?Math.round(don/tot*100):g.progress||0})
    const avgComp  = rates.length?Math.round(rates.reduce((a,b)=>a+b,0)/rates.length):0
    return { total:allTr.length, earned:earned.length, byType, totalPts, platCount, avgCompletion:avgComp, gameCount:games.length }
  },[games])

  // ── Game CRUD ─────────────────────────────────────────────────
  function openNewGame()  { setGameForm(EMPTY_GAME); setEditGameId(null); setShowGameForm(true) }
  function openEditGame(g){ setGameForm({title:g.title,platform:g.platform||'PS5',coverUrl:g.coverUrl||'',genre:g.genre||'',notes:g.notes||''}); setEditGameId(g.id); setShowGameForm(true) }
  function saveGame() {
    if (!gameForm.title.trim()) return
    if (editGameId) {
      setGames(prev=>prev.map(g=>g.id===editGameId?{...g,...gameForm}:g))
    } else {
      setGames(prev=>[...prev,{id:Date.now(),...gameForm,trophies:[],platinum:false}])
    }
    setShowGameForm(false); setEditGameId(null)
  }
  function deleteGame(id) {
    if (!window.confirm('Delete this game?')) return
    setGames(prev=>prev.filter(g=>g.id!==id))
    if (selGameId===id) setSelGameId(null)
  }

  // ── Trophy CRUD ───────────────────────────────────────────────
  function openNewTrophy()  { setTrForm(EMPTY_TROPHY); setEditTrId(null); setShowTrForm(true) }
  function openEditTrophy(t){ setTrForm({name:t.name,description:t.description||'',type:t.type,earned:t.earned,hidden:t.hidden||false}); setEditTrId(t.id); setShowTrForm(true) }
  function saveTrophy() {
    if (!trForm.name.trim()||!selGameId) return
    setGames(prev=>prev.map(g=>{
      if (g.id!==selGameId) return g
      const trophies=editTrId?g.trophies.map(t=>t.id===editTrId?{...t,...trForm}:t):[...(g.trophies||[]),{id:Date.now(),...trForm}]
      const platinum=trophies.some(t=>t.type==='platinum'&&t.earned)
      return {...g,trophies,platinum}
    }))
    setShowTrForm(false); setEditTrId(null)
  }
  function toggleTrophy(gameId,trophyId) {
    setGames(prev=>prev.map(g=>{
      if (g.id!==gameId) return g
      const trophies=g.trophies.map(t=>t.id===trophyId?{...t,earned:!t.earned}:t)
      return {...g,trophies,platinum:trophies.some(t=>t.type==='platinum'&&t.earned)}
    }))
  }
  function deleteTrophy(gameId,trophyId) {
    setGames(prev=>prev.map(g=>g.id!==gameId?g:{...g,trophies:g.trophies.filter(t=>t.id!==trophyId)}))
  }

  function gameCompletion(g) {
    if (g.psnSynced && g.progress) return g.progress
    const tot=g.trophies?.length||0; const don=g.trophies?.filter(t=>t.earned).length||0
    return tot>0?Math.round(don/tot*100):0
  }

  const filteredGames = useMemo(()=>games.filter(g=>{
    if (filterPlat!=='All'&&g.platform!==filterPlat) return false
    if (filterEarned==='platinum'&&!g.platinum) return false
    if (filterEarned==='incomplete'&&g.platinum) return false
    if (search&&!g.title.toLowerCase().includes(search.toLowerCase())) return false
    return true
  }),[games,filterPlat,filterEarned,search])

  // ─────────────────────────────────────────────────────────────
  return (
    <div>
      <PageHeader
        title="🎮 PlayStation Trophies"
        subtitle="Trophy tracker  -  manual entry or sync from PSN"
        action={
          <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
            {/* PSN connection status */}
            <div style={{display:'flex',alignItems:'center',gap:'6px',padding:'6px 12px',borderRadius:'20px',border:'1px solid var(--border)',background:'var(--bg-card)',fontSize:'12px',color:psnStatus==='connected'?'var(--success)':'var(--text-muted)'}}>
              {psnStatus==='connected'
                ? <><Wifi size={13}/> {psnProfile?.onlineId || 'PSN connected'}</>
                : <><WifiOff size={13}/> Not connected</>
              }
            </div>
            {psnStatus==='connected'
              ? <Btn variant="secondary" onClick={syncFromPSN} disabled={syncing}>
                  <RefreshCw size={13} style={{animation:syncing?'spin 1s linear infinite':'none'}}/> {syncing?'Syncing…':'Sync PSN'}
                </Btn>
              : <Btn variant="secondary" onClick={()=>setShowConnect(true)}><Wifi size={13}/> Connect PSN</Btn>
            }
            <Btn onClick={openNewGame}><Plus size={14}/> Add game</Btn>
          </div>
        }
      />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Sync status bar */}
      {syncStatus&&(
        <div style={{padding:'10px 14px',borderRadius:'var(--radius)',background:syncStatus.startsWith('✅')?'var(--success-soft)':syncStatus.startsWith('❌')?'var(--danger-soft)':'var(--accent-soft)',color:syncStatus.startsWith('✅')?'var(--success)':syncStatus.startsWith('❌')?'var(--danger)':'var(--accent)',fontSize:'13px',marginBottom:'16px',display:'flex',alignItems:'center',gap:'8px'}}>
          {syncing&&<RefreshCw size={13} style={{animation:'spin 1s linear infinite',flexShrink:0}}/>}
          {syncStatus}
        </div>
      )}

      {/* PSN not running notice */}
      {psnStatus==='disconnected'&&(
        <div style={{padding:'12px 14px',borderRadius:'var(--radius)',background:'var(--bg-card)',border:'1px solid var(--border)',fontSize:'13px',color:'var(--text-secondary)',marginBottom:'16px',display:'flex',alignItems:'center',gap:'10px'}}>
          <WifiOff size={15} color="var(--text-muted)"/>
          <span>PSN server not running  -  manual trophy entry still works fine. To enable PSN sync: open a terminal in the <code style={{background:'var(--bg-badge)',padding:'1px 5px',borderRadius:3}}>danos</code> folder and run <code style={{background:'var(--bg-badge)',padding:'1px 5px',borderRadius:3}}>python psn_server.py</code></span>
          <button onClick={checkStatus} style={{background:'none',border:'none',cursor:'pointer',color:'var(--accent)',fontSize:'12px',marginLeft:'auto',whiteSpace:'nowrap'}}>Retry ↻</button>
        </div>
      )}

      {/* Connect modal */}
      {showConnect&&<ConnectModal onClose={()=>{setShowConnect(false);checkStatus()}} onConnected={id=>{setProfile({onlineId:id});setPsnStatus('connected')}}/>}

      {/* Tabs */}
      <div style={{display:'flex',gap:'6px',marginBottom:'20px'}}>
        {[['library','🎮 Library'],['trophies','🏆 Trophy view'],['stats','📊 Stats']].map(([id,label])=>(
          <Btn key={id} variant={tab===id?'primary':'secondary'} size="sm" onClick={()=>{setTab(id);if(id!=='trophies')setSelGameId(null)}}>{label}</Btn>
        ))}
      </div>

      {/* ══ LIBRARY ══ */}
      {tab==='library'&&(
        <div>
          {showGameForm&&(
            <Card style={{marginBottom:'16px',border:'1px solid var(--accent-border)'}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:'12px'}}>
                <h3 style={{fontSize:'14px',fontWeight:600}}>{editGameId?'Edit game':'Add game manually'}</h3>
                <button onClick={()=>setShowGameForm(false)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)'}}><X size={16}/></button>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:'10px'}}>
                <div style={{gridColumn:'1/-1'}}><label style={{fontSize:'12px',color:'var(--text-muted)',display:'block',marginBottom:'3px'}}>Game title</label>
                  <input value={gameForm.title} onChange={e=>setGameForm(f=>({...f,title:e.target.value}))} placeholder="e.g. God of War Ragnarök" autoFocus /></div>
                <div><label style={{fontSize:'12px',color:'var(--text-muted)',display:'block',marginBottom:'3px'}}>Platform</label>
                  <select value={gameForm.platform} onChange={e=>setGameForm(f=>({...f,platform:e.target.value}))}>
                    {PLATFORMS.map(p=><option key={p} value={p}>{p}</option>)}
                  </select></div>
                <div><label style={{fontSize:'12px',color:'var(--text-muted)',display:'block',marginBottom:'3px'}}>Genre</label>
                  <select value={gameForm.genre} onChange={e=>setGameForm(f=>({...f,genre:e.target.value}))}>
                    <option value="">Select…</option>
                    {GENRES.map(g=><option key={g} value={g}>{g}</option>)}
                  </select></div>
                <div style={{gridColumn:'1/-1'}}><label style={{fontSize:'12px',color:'var(--text-muted)',display:'block',marginBottom:'3px'}}>Cover art URL (optional)</label>
                  <input value={gameForm.coverUrl} onChange={e=>setGameForm(f=>({...f,coverUrl:e.target.value}))} placeholder="https://…"/></div>
                <div style={{gridColumn:'1/-1'}}><label style={{fontSize:'12px',color:'var(--text-muted)',display:'block',marginBottom:'3px'}}>Notes</label>
                  <textarea value={gameForm.notes} onChange={e=>setGameForm(f=>({...f,notes:e.target.value}))} rows={2}/></div>
              </div>
              <div style={{display:'flex',gap:'8px',marginTop:'12px'}}>
                <Btn onClick={saveGame}>{editGameId?'Save changes':'Add game'}</Btn>
                <Btn variant="ghost" onClick={()=>setShowGameForm(false)}>Cancel</Btn>
              </div>
            </Card>
          )}

          {/* Filters */}
          <div style={{display:'flex',gap:'8px',flexWrap:'wrap',marginBottom:'14px',alignItems:'center'}}>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search games…" style={{width:200}}/>
            <div style={{display:'flex',gap:'4px'}}>
              {['All',...PLATFORMS].map(p=>(
                <button key={p} onClick={()=>setFilterPlat(p)} style={{padding:'4px 10px',borderRadius:'20px',border:filterPlat===p?'1px solid var(--accent)':'1px solid var(--border)',background:filterPlat===p?'var(--accent-soft)':'transparent',color:filterPlat===p?'var(--accent)':'var(--text-secondary)',fontSize:'12px',cursor:'pointer'}}>{p}</button>
              ))}
            </div>
            <div style={{display:'flex',gap:'4px',marginLeft:'auto'}}>
              {[['all','All'],['platinum','🏆 Platinum'],['incomplete','Incomplete']].map(([v,l])=>(
                <button key={v} onClick={()=>setFilterEarned(v)} style={{padding:'4px 10px',borderRadius:'20px',border:filterEarned===v?'1px solid var(--accent)':'1px solid var(--border)',background:filterEarned===v?'var(--accent-soft)':'transparent',color:filterEarned===v?'var(--accent)':'var(--text-secondary)',fontSize:'12px',cursor:'pointer'}}>{l}</button>
              ))}
            </div>
          </div>

          {filteredGames.length===0?(
            <Card style={{textAlign:'center',padding:'40px'}}>
              <p style={{fontSize:'28px',marginBottom:'10px'}}>🎮</p>
              <p style={{fontSize:'14px',color:'var(--text-secondary)',marginBottom:'8px'}}>No games yet.</p>
              <p style={{fontSize:'13px',color:'var(--text-muted)',marginBottom:'16px'}}>{psnStatus==='connected'?'Click "Sync PSN" to import all your games automatically.':'Connect your PSN account to sync automatically, or add games manually.'}</p>
              <div style={{display:'flex',gap:'8px',justifyContent:'center'}}>
                {psnStatus!=='connected'&&<Btn variant="secondary" onClick={()=>setShowConnect(true)}><Wifi size={13}/> Connect PSN</Btn>}
                <Btn onClick={openNewGame}><Plus size={14}/> Add manually</Btn>
              </div>
            </Card>
          ):(
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:'12px'}}>
              {filteredGames.map(g=>{
                const pct=gameCompletion(g)
                const earned=g.trophies?.filter(t=>t.earned).length||0
                const total=g.trophies?.length||0
                const byType=TROPHY_TYPES.reduce((acc,tt)=>({...acc,[tt.value]:g.trophies?.filter(t=>t.type===tt.value&&t.earned).length||0}),{})
                return (
                  <div key={g.id} style={{background:'var(--bg-card)',border:`1px solid ${g.platinum?'#a78bfa':'var(--border)'}`,borderRadius:'var(--radius-lg)',overflow:'hidden',cursor:'pointer',transition:'transform 0.15s,box-shadow 0.15s'}}
                    onClick={()=>{setSelGameId(g.id);setTab('trophies')}}
                    onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow='var(--shadow-md)'}}
                    onMouseLeave={e=>{e.currentTarget.style.transform='';e.currentTarget.style.boxShadow=''}}>
                    <div style={{height:100,background:g.platinum?'linear-gradient(135deg,#6d28d9,#a78bfa)':'linear-gradient(135deg,var(--bg-badge),var(--border))',display:'flex',alignItems:'center',justifyContent:'center',position:'relative',overflow:'hidden'}}>
                      {g.coverUrl?<img src={g.coverUrl} alt={g.title} style={{width:'100%',height:'100%',objectFit:'cover'}} onError={e=>e.target.style.display='none'}/>:<span style={{fontSize:'40px'}}>🎮</span>}
                      {g.platinum&&<span style={{position:'absolute',top:6,right:6,fontSize:'18px'}}>🏆</span>}
                      <span style={{position:'absolute',bottom:6,left:8,fontSize:'10px',fontWeight:700,background:'rgba(0,0,0,0.6)',color:'#fff',padding:'2px 6px',borderRadius:4}}>{g.platform}</span>
                      {g.psnSynced&&<span style={{position:'absolute',bottom:6,right:8,fontSize:'9px',background:'rgba(79,110,247,0.85)',color:'#fff',padding:'1px 5px',borderRadius:3,fontWeight:600}}>PSN</span>}
                    </div>
                    <div style={{padding:'12px'}}>
                      <p style={{fontSize:'13px',fontWeight:600,marginBottom:'4px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}} title={g.title}>{g.title}</p>
                      <div style={{display:'flex',gap:'5px',marginBottom:'8px',flexWrap:'wrap'}}>
                        {TROPHY_TYPES.filter(tt=>byType[tt.value]>0).map(tt=>(
                          <span key={tt.value} style={{fontSize:'10px',padding:'1px 5px',borderRadius:'4px',background:tt.style.bg,color:tt.style.color,fontWeight:600}}>{tt.icon}{byType[tt.value]}</span>
                        ))}
                      </div>
                      <div style={{display:'flex',justifyContent:'space-between',marginBottom:'4px'}}>
                        <span style={{fontSize:'11px',color:'var(--text-muted)'}}>{g.psnSynced?`${earned}/${total}`:(`${earned}/${total}`)} trophies</span>
                        <span style={{fontSize:'11px',fontWeight:700,color:pct===100?'var(--success)':pct>=50?'var(--accent)':'var(--text-secondary)'}}>{pct}%</span>
                      </div>
                      <div style={{height:4,background:'var(--bg-badge)',borderRadius:2,overflow:'hidden'}}>
                        <div style={{height:'100%',width:`${pct}%`,background:pct===100?'var(--success)':'var(--accent)',borderRadius:2}}/>
                      </div>
                      <div style={{display:'flex',gap:'6px',marginTop:'10px'}} onClick={e=>e.stopPropagation()}>
                        <button onClick={()=>openEditGame(g)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)',padding:'2px'}}><Pencil size={13}/></button>
                        <button onClick={()=>deleteGame(g.id)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)',padding:'2px'}}><Trash2 size={13}/></button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ══ TROPHY VIEW ══ */}
      {tab==='trophies'&&(
        <div style={{display:'grid',gridTemplateColumns:'220px 1fr',gap:'16px',alignItems:'start'}}>
          <Card style={{padding:'12px'}}>
            <p style={{fontSize:'11px',fontWeight:600,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:'8px'}}>Select game</p>
            <div style={{display:'flex',flexDirection:'column',gap:'2px',maxHeight:500,overflowY:'auto'}}>
              {games.map(g=>{
                const pct=gameCompletion(g)
                const isActive=selGameId===g.id
                return (
                  <button key={g.id} onClick={()=>setSelGameId(g.id)} style={{display:'flex',alignItems:'center',gap:'8px',padding:'7px 10px',borderRadius:'var(--radius-sm)',border:isActive?'1px solid var(--accent)':'1px solid transparent',background:isActive?'var(--accent-soft)':'transparent',cursor:'pointer',textAlign:'left',width:'100%'}}>
                    <div style={{flex:1,minWidth:0}}>
                      <p style={{fontSize:'12px',fontWeight:isActive?600:400,color:isActive?'var(--accent)':'var(--text-primary)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{g.title}</p>
                      <p style={{fontSize:'11px',color:pct===100?'var(--success)':'var(--text-muted)'}}>{g.platform} · {pct}%{g.platinum?' 🏆':''}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </Card>

          <div>
            {!selGame?(
              <Card style={{textAlign:'center',padding:'40px'}}><p style={{color:'var(--text-muted)'}}>Select a game to view trophies</p></Card>
            ):(
              <div>
                <Card style={{marginBottom:'14px',padding:'16px'}}>
                  <div style={{display:'flex',alignItems:'center',gap:'14px',marginBottom:'12px'}}>
                    <div style={{flex:1}}>
                      <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'4px',flexWrap:'wrap'}}>
                        <h2 style={{fontFamily:'var(--font-display)',fontSize:'18px',fontWeight:700}}>{selGame.title}</h2>
                        {selGame.platinum&&<span style={{fontSize:'18px'}}>🏆</span>}
                        <span style={{fontSize:'11px',background:'var(--bg-badge)',padding:'2px 7px',borderRadius:'4px',color:'var(--text-muted)'}}>{selGame.platform}</span>
                        {selGame.psnSynced&&<span style={{fontSize:'11px',background:'var(--accent-soft)',color:'var(--accent)',padding:'2px 7px',borderRadius:'4px',fontWeight:600}}>PSN synced</span>}
                      </div>
                      <div style={{display:'flex',gap:'8px',alignItems:'center',flexWrap:'wrap'}}>
                        {TROPHY_TYPES.map(tt=>{
                          const e=selGame.trophies?.filter(t=>t.type===tt.value&&t.earned).length||0
                          const tot=selGame.trophies?.filter(t=>t.type===tt.value).length||0
                          if (tot===0) return null
                          return <span key={tt.value} style={{fontSize:'12px',padding:'2px 8px',borderRadius:'4px',background:tt.style.bg,color:tt.style.color,fontWeight:600}}>{tt.icon} {e}/{tot}</span>
                        })}
                      </div>
                    </div>
                    <div style={{textAlign:'right'}}>
                      <p style={{fontFamily:'var(--font-display)',fontSize:'24px',fontWeight:700,color:'var(--accent)'}}>{gameCompletion(selGame)}%</p>
                      <p style={{fontSize:'12px',color:'var(--text-muted)'}}>{selGame.trophies?.filter(t=>t.earned).length||0} / {selGame.trophies?.length||0}</p>
                    </div>
                  </div>
                  <div style={{height:8,background:'var(--bg-badge)',borderRadius:4,overflow:'hidden'}}>
                    <div style={{height:'100%',width:`${gameCompletion(selGame)}%`,background:gameCompletion(selGame)===100?'linear-gradient(90deg,#a78bfa,#6d28d9)':'linear-gradient(90deg,var(--accent),#34d974)',borderRadius:4}}/>
                  </div>
                </Card>

                {showTrForm&&(
                  <Card style={{marginBottom:'14px',border:'1px solid var(--accent-border)'}}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:'12px'}}>
                      <h3 style={{fontSize:'14px',fontWeight:600}}>{editTrId?'Edit trophy':'Add trophy'}</h3>
                      <button onClick={()=>setShowTrForm(false)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)'}}><X size={16}/></button>
                    </div>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
                      <div style={{gridColumn:'1/-1'}}><label style={{fontSize:'12px',color:'var(--text-muted)',display:'block',marginBottom:'3px'}}>Name</label>
                        <input value={trForm.name} onChange={e=>setTrForm(f=>({...f,name:e.target.value}))} autoFocus/></div>
                      <div style={{gridColumn:'1/-1'}}><label style={{fontSize:'12px',color:'var(--text-muted)',display:'block',marginBottom:'3px'}}>Description</label>
                        <input value={trForm.description} onChange={e=>setTrForm(f=>({...f,description:e.target.value}))}/></div>
                      <div>
                        <label style={{fontSize:'12px',color:'var(--text-muted)',display:'block',marginBottom:'6px'}}>Type</label>
                        <div style={{display:'flex',gap:'5px',flexWrap:'wrap'}}>
                          {TROPHY_TYPES.map(tt=>(
                            <button key={tt.value} onClick={()=>setTrForm(f=>({...f,type:tt.value}))} style={{padding:'5px 10px',borderRadius:'var(--radius-sm)',border:trForm.type===tt.value?`1px solid ${tt.style.border}`:'1px solid var(--border)',background:trForm.type===tt.value?tt.style.bg:'transparent',color:tt.style.color,fontSize:'12px',cursor:'pointer',fontWeight:trForm.type===tt.value?700:400}}>
                              {tt.icon} {tt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div style={{display:'flex',gap:'16px',alignItems:'center',paddingTop:'20px'}}>
                        <label style={{display:'flex',alignItems:'center',gap:'6px',fontSize:'13px',cursor:'pointer'}}>
                          <input type="checkbox" checked={trForm.earned} onChange={e=>setTrForm(f=>({...f,earned:e.target.checked}))} style={{width:'auto',accentColor:'var(--accent)'}}/>Earned ✓
                        </label>
                        <label style={{display:'flex',alignItems:'center',gap:'6px',fontSize:'13px',cursor:'pointer'}}>
                          <input type="checkbox" checked={trForm.hidden} onChange={e=>setTrForm(f=>({...f,hidden:e.target.checked}))} style={{width:'auto',accentColor:'var(--accent)'}}/>Hidden 🔒
                        </label>
                      </div>
                    </div>
                    <div style={{display:'flex',gap:'8px',marginTop:'12px'}}>
                      <Btn onClick={saveTrophy}>{editTrId?'Save':'Add trophy'}</Btn>
                      <Btn variant="ghost" onClick={()=>setShowTrForm(false)}>Cancel</Btn>
                    </div>
                  </Card>
                )}

                <div style={{display:'flex',justifyContent:'flex-end',marginBottom:'10px'}}>
                  <Btn size="sm" onClick={openNewTrophy}><Plus size={12}/> Add trophy</Btn>
                </div>

                {TROPHY_TYPES.map(tt=>{
                  const typeTrophies=(selGame.trophies||[]).filter(t=>t.type===tt.value)
                  if (!typeTrophies.length) return null
                  return (
                    <div key={tt.value} style={{marginBottom:'16px'}}>
                      <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'8px'}}>
                        <span style={{fontSize:'16px'}}>{tt.icon}</span>
                        <span style={{fontFamily:'var(--font-display)',fontSize:'14px',fontWeight:600}}>{tt.label}</span>
                        <span style={{fontSize:'12px',color:'var(--text-muted)'}}>({typeTrophies.filter(t=>t.earned).length}/{typeTrophies.length})</span>
                      </div>
                      <div style={{display:'flex',flexDirection:'column',gap:'6px'}}>
                        {typeTrophies.map(t=>(
                          <div key={t.id} style={{display:'flex',alignItems:'center',gap:'12px',padding:'10px 14px',borderRadius:'var(--radius)',background:t.earned?tt.style.bg+'44':'var(--bg-input)',border:`1px solid ${t.earned?tt.style.border:'var(--border)'}`,opacity:t.hidden&&!t.earned?0.6:1}}>
                            {t.iconUrl&&t.earned?<img src={t.iconUrl} alt="" style={{width:28,height:28,borderRadius:4,flexShrink:0}}/>:
                              <button onClick={()=>toggleTrophy(selGame.id,t.id)} style={{background:'none',border:'none',cursor:'pointer',fontSize:'20px',flexShrink:0,lineHeight:1}}>
                                {t.earned?tt.icon:'⬜'}
                              </button>
                            }
                            <div style={{flex:1,minWidth:0}}>
                              <p style={{fontSize:'13px',fontWeight:600}}>{t.hidden&&!t.earned?'🔒 Hidden trophy':t.name}</p>
                              {(!t.hidden||t.earned)&&t.description&&<p style={{fontSize:'12px',color:'var(--text-secondary)',marginTop:'2px'}}>{t.description}</p>}
                              {t.earnedAt&&<p style={{fontSize:'11px',color:'var(--text-muted)',marginTop:'2px'}}>Earned {new Date(t.earnedAt).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}</p>}
                            </div>
                            <div style={{display:'flex',gap:'4px',flexShrink:0}}>
                              {!t.iconUrl&&<button onClick={()=>toggleTrophy(selGame.id,t.id)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)',padding:'2px',fontSize:'11px'}}>{t.earned?'Undo':'✓'}</button>}
                              <button onClick={()=>openEditTrophy(t)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)',padding:'2px'}}><Pencil size={12}/></button>
                              <button onClick={()=>deleteTrophy(selGame.id,t.id)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)',padding:'2px'}}><Trash2 size={12}/></button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ STATS ══ */}
      {tab==='stats'&&(
        <div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:'12px',marginBottom:'20px'}}>
            {[
              ['🎮','Games tracked', stats.gameCount,        'var(--accent)'],
              ['🏆','Platinums',     stats.platCount,        '#a78bfa'],
              ['🥇','Gold',          stats.byType.gold,      '#fbbf24'],
              ['🥈','Silver',        stats.byType.silver,    '#9ca3af'],
              ['🥉','Bronze',        stats.byType.bronze,    '#cd7f32'],
              ['⭐','Trophy score',  stats.totalPts.toLocaleString(),'var(--success)'],
              ['📊','Avg completion',`${stats.avgCompletion}%`,'var(--text-secondary)'],
              ['✅','Earned total',  stats.earned,           'var(--success)'],
            ].map(([em,label,val,color])=>(
              <Card key={label} style={{padding:'16px',textAlign:'center'}}>
                <p style={{fontSize:'22px',marginBottom:'4px'}}>{em}</p>
                <p style={{fontFamily:'var(--font-display)',fontSize:'20px',fontWeight:700,color,lineHeight:1}}>{val}</p>
                <p style={{fontSize:'12px',color:'var(--text-muted)',marginTop:'4px'}}>{label}</p>
              </Card>
            ))}
          </div>
          <Card>
            <h3 style={{fontFamily:'var(--font-display)',fontSize:'15px',fontWeight:600,marginBottom:'14px'}}>Game completion</h3>
            <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
              {[...games].sort((a,b)=>gameCompletion(b)-gameCompletion(a)).map(g=>{
                const pct=gameCompletion(g)
                return (
                  <div key={g.id} style={{display:'flex',alignItems:'center',gap:'12px'}}>
                    <p style={{fontSize:'13px',fontWeight:500,minWidth:200,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}} title={g.title}>{g.title}{g.platinum?' 🏆':''}</p>
                    <div style={{flex:1,height:8,background:'var(--bg-badge)',borderRadius:4,overflow:'hidden'}}>
                      <div style={{height:'100%',width:`${pct}%`,background:pct===100?'#a78bfa':'var(--accent)',borderRadius:4}}/>
                    </div>
                    <span style={{fontSize:'12px',fontWeight:700,color:pct===100?'#a78bfa':'var(--text-secondary)',minWidth:36,textAlign:'right'}}>{pct}%</span>
                  </div>
                )
              })}
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
