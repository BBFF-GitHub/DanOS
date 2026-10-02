import React, { useState, useMemo, useEffect } from 'react'
import Card from '../components/Card'
import PageHeader from '../components/PageHeader'
import Btn from '../components/Btn'
import { Plus, Trash2, Pencil, ExternalLink, CheckCircle2, Circle, X, Settings, Upload, RefreshCw } from 'lucide-react'

const MG_BASE = 'http://localhost:5959'

// The 92  -  editable list, correct as of 2024/25
const DEFAULT_92 = [
  // Premier League (20)
  { id:1,  name:'Arsenal',          ground:'Emirates Stadium',                league:'Premier League' },
  { id:2,  name:'Aston Villa',       ground:'Villa Park',                      league:'Premier League' },
  { id:3,  name:'Bournemouth',       ground:'Vitality Stadium',                league:'Premier League' },
  { id:4,  name:'Brentford',         ground:'Gtech Community Stadium',         league:'Premier League' },
  { id:5,  name:'Brighton',          ground:'Amex Stadium',                    league:'Premier League' },
  { id:6,  name:'Chelsea',           ground:'Stamford Bridge',                 league:'Premier League' },
  { id:7,  name:'Crystal Palace',    ground:'Selhurst Park',                   league:'Premier League' },
  { id:8,  name:'Everton',           ground:'Goodison Park',                   league:'Premier League' },
  { id:9,  name:'Fulham',            ground:'Craven Cottage',                  league:'Premier League' },
  { id:10, name:'Ipswich Town',      ground:'Portman Road',                    league:'Premier League' },
  { id:11, name:'Leicester City',    ground:'King Power Stadium',              league:'Premier League' },
  { id:12, name:'Liverpool',         ground:'Anfield',                         league:'Premier League' },
  { id:13, name:'Manchester City',   ground:'Etihad Stadium',                  league:'Premier League' },
  { id:14, name:'Manchester United', ground:'Old Trafford',                    league:'Premier League' },
  { id:15, name:'Newcastle United',  ground:"St. James' Park",                 league:'Premier League' },
  { id:16, name:'Nottm Forest',      ground:'City Ground',                     league:'Premier League' },
  { id:17, name:'Southampton',       ground:"St. Mary's Stadium",              league:'Premier League' },
  { id:18, name:'Tottenham Hotspur', ground:'Tottenham Hotspur Stadium',       league:'Premier League' },
  { id:19, name:'West Ham United',   ground:'London Stadium',                  league:'Premier League' },
  { id:20, name:'Wolverhampton',     ground:'Molineux',                        league:'Premier League' },
  // Championship (24)
  { id:21, name:'Blackburn Rovers',  ground:'Ewood Park',                      league:'Championship' },
  { id:22, name:'Bristol City',      ground:'Ashton Gate',                     league:'Championship' },
  { id:23, name:'Burnley',           ground:'Turf Moor',                       league:'Championship' },
  { id:24, name:'Cardiff City',      ground:'Cardiff City Stadium',            league:'Championship' },
  { id:25, name:'Coventry City',     ground:'Coventry Building Society Arena', league:'Championship' },
  { id:26, name:'Derby County',      ground:'Pride Park Stadium',              league:'Championship' },
  { id:27, name:'Hull City',         ground:'MKM Stadium',                     league:'Championship' },
  { id:28, name:'Leeds United',      ground:'Elland Road',                     league:'Championship' },
  { id:29, name:'Luton Town',        ground:'Kenilworth Road',                 league:'Championship' },
  { id:30, name:'Middlesbrough',     ground:'Riverside Stadium',               league:'Championship' },
  { id:31, name:'Millwall',          ground:'The Den',                         league:'Championship' },
  { id:32, name:'Norwich City',      ground:'Carrow Road',                     league:'Championship' },
  { id:33, name:'Oxford United',     ground:'Kassam Stadium',                  league:'Championship' },
  { id:34, name:'Plymouth Argyle',   ground:'Home Park',                       league:'Championship' },
  { id:35, name:'Portsmouth',        ground:'Fratton Park',                    league:'Championship' },
  { id:36, name:'Preston North End', ground:'Deepdale',                        league:'Championship' },
  { id:37, name:'QPR',               ground:'Loftus Road',                     league:'Championship' },
  { id:38, name:'Sheffield United',  ground:'Bramall Lane',                    league:'Championship' },
  { id:39, name:'Stoke City',        ground:'Bet365 Stadium',                  league:'Championship' },
  { id:40, name:'Sunderland',        ground:'Stadium of Light',                league:'Championship' },
  { id:41, name:'Swansea City',      ground:'Swansea.com Stadium',             league:'Championship' },
  { id:42, name:'Watford',           ground:'Vicarage Road',                   league:'Championship' },
  { id:43, name:'West Brom',         ground:'The Hawthorns',                   league:'Championship' },
  { id:44, name:'Sheffield Wednesday',ground:'Hillsborough',                   league:'Championship' },
  // League One (24)
  { id:45, name:'Birmingham City',   ground:"St Andrew's",                     league:'League One' },
  { id:46, name:'Barnsley',          ground:'Oakwell',                         league:'League One' },
  { id:47, name:'Blackpool',         ground:'Bloomfield Road',                 league:'League One' },
  { id:48, name:'Bolton Wanderers',  ground:'Toughsheet Community Stadium',    league:'League One' },
  { id:49, name:'Bristol Rovers',    ground:'Memorial Stadium',                league:'League One' },
  { id:50, name:'Burton Albion',     ground:'Pirelli Stadium',                 league:'League One' },
  { id:51, name:'Cambridge United',  ground:'Abbey Stadium',                   league:'League One' },
  { id:52, name:'Charlton Athletic', ground:'The Valley',                      league:'League One' },
  { id:53, name:'Exeter City',       ground:'St James Park',                   league:'League One' },
  { id:54, name:'Huddersfield Town', ground:"John Smith's Stadium",            league:'League One' },
  { id:55, name:'Lincoln City',      ground:'LNER Stadium',                    league:'League One' },
  { id:56, name:'MK Dons',           ground:'Stadium MK',                      league:'League One' },
  { id:57, name:'Northampton Town',  ground:'Sixfields Stadium',               league:'League One' },
  { id:58, name:'Peterborough Utd',  ground:'London Road',                     league:'League One' },
  { id:59, name:'Reading',           ground:'Select Car Leasing Stadium',      league:'League One' },
  { id:60, name:'Rotherham United',  ground:'New York Stadium',                league:'League One' },
  { id:61, name:'Shrewsbury Town',   ground:'Croud Meadow',                    league:'League One' },
  { id:62, name:'Stevenage',         ground:'Lamex Stadium',                   league:'League One' },
  { id:63, name:'Wigan Athletic',    ground:'DW Stadium',                      league:'League One' },
  { id:64, name:'Wrexham',           ground:'Racecourse Ground',               league:'League One' },
  { id:65, name:'Stockport County',  ground:'Edgeley Park',                    league:'League One' },
  { id:66, name:'Wycombe Wanderers', ground:'Adams Park',                      league:'League One' },
  { id:67, name:'Leyton Orient',     ground:'Brisbane Road',                   league:'League One' },
  { id:68, name:'Crawley Town',      ground:'Broadfield Stadium',              league:'League One' },
  // League Two (24)
  { id:69, name:'AFC Wimbledon',     ground:'Plough Lane',                     league:'League Two' },
  { id:70, name:'Accrington Stanley',ground:'Wham Stadium',                    league:'League Two' },
  { id:71, name:'Bradford City',     ground:'Valley Parade',                   league:'League Two' },
  { id:72, name:'Bromley',           ground:'Hayes Lane',                      league:'League Two' },
  { id:73, name:'Carlisle United',   ground:'Brunton Park',                    league:'League Two' },
  { id:74, name:'Cheltenham Town',   ground:'Jonny-Rocks Stadium',             league:'League Two' },
  { id:75, name:'Chesterfield',      ground:'SMH Group Stadium',               league:'League Two' },
  { id:76, name:'Colchester United', ground:'JobServe Community Stadium',      league:'League Two' },
  { id:77, name:'Crewe Alexandra',   ground:'Alexandra Stadium',               league:'League Two' },
  { id:78, name:'Doncaster Rovers',  ground:'Eco-Power Stadium',               league:'League Two' },
  { id:79, name:'Fleetwood Town',    ground:'Highbury Stadium',                league:'League Two' },
  { id:80, name:'Gillingham',        ground:'Priestfield Stadium',             league:'League Two' },
  { id:81, name:'Grimsby Town',      ground:'Blundell Park',                   league:'League Two' },
  { id:82, name:'Harrogate Town',    ground:'The EnviroVent Stadium',          league:'League Two' },
  { id:83, name:'Morecambe',         ground:'Mazuma Mobile Stadium',           league:'League Two' },
  { id:84, name:'Newport County',    ground:'Rodney Parade',                   league:'League Two' },
  { id:85, name:'Notts County',      ground:'Meadow Lane',                     league:'League Two' },
  { id:86, name:'Port Vale',         ground:'Vale Park',                       league:'League Two' },
  { id:87, name:'Salford City',      ground:'Peninsula Stadium',               league:'League Two' },
  { id:88, name:'Swindon Town',      ground:'County Ground',                   league:'League Two' },
  { id:89, name:'Tranmere Rovers',   ground:'Prenton Park',                    league:'League Two' },
  { id:90, name:'Walsall',           ground:'Poundland Bescot Stadium',        league:'League Two' },
  { id:91, name:'AFC Bournemouth U21',ground:'Vitality Stadium',               league:'League Two' },
  { id:92, name:'Newport County AFC',ground:'Rodney Parade',                   league:'League Two' },
]

const EFL_LEAGUES = ['Premier League','Championship','League One','League Two']
const LEAGUE_COLORS = { 'Premier League':'#4f6ef7', Championship:'#f59e0b', 'League One':'#22c55e', 'League Two':'#ef4444' }

const LC = l => LEAGUE_COLORS[l] || '#9aa0b0'

const LEAGUE_ORDER = ['Premier League', 'Championship', 'League One', 'League Two']
function leagueRank(l) {
  const idx = LEAGUE_ORDER.indexOf(l)
  return idx === -1 ? LEAGUE_ORDER.length : idx
}
function sortClubs(arr) {
  return [...arr].sort((a, b) => {
    const lr = leagueRank(a.league) - leagueRank(b.league)
    if (lr !== 0) return lr
    return a.name.localeCompare(b.name)
  })
}

const TABS = ['progress','games','fixtures','import','teamlist']

// ── My Grounds Import Component ───────────────────────────────────
function MyGroundsImport({ clubs92, visited, games, setVis, setGm }) {
  const [serverOk,  setServerOk]  = useState(null)
  const [csvText,   setCsvText]   = useState('')
  const [importing, setImporting] = useState(false)
  const [msg,       setMsg]       = useState(null)
  const [preview,   setPreview]   = useState(null)

  useEffect(()=>{
    fetch(`${MG_BASE}/health`).then(r=>r.ok?setServerOk(true):setServerOk(false)).catch(()=>setServerOk(false))
  },[])

  function matchGroundToClub(groundName) {
    if (!groundName) return null
    const n = groundName.toLowerCase().trim()
    return clubs92.find(c =>
      c.ground?.toLowerCase() === n ||
      c.name?.toLowerCase() === n ||
      c.ground?.toLowerCase().includes(n) ||
      n.includes(c.ground?.toLowerCase())
    )
  }

  async function doImportCsv() {
    if (!csvText.trim()) { setMsg({type:'error',text:'Paste your myGrounds export first.'}); return }
    setImporting(true); setMsg(null)
    try {
      const r = await fetch(`${MG_BASE}/import-csv`, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({csv: csvText})
      })
      const d = await r.json()
      if (d.error) { setMsg({type:'error',text:d.error}); setImporting(false); return }
      setPreview(d.games)
      setMsg({type:'info', text:`Parsed ${d.games.length} entries. Review below then confirm.`})
    } catch(e) {
      setMsg({type:'error', text:'Could not reach mygrounds_server.py  -  is it running? (python mygrounds_server.py)'})
    }
    setImporting(false)
  }

  function confirmImport() {
    if (!preview) return
    const existingIds = new Set(games.map(g=>g.id))
    const newGames = preview.filter(g=>!existingIds.has(g.id))
    setGm(prev=>[...prev,...newGames].sort((a,b)=>b.date.localeCompare(a.date)))
    const newVisited = {...visited}
    newGames.forEach(g=>{
      const club = matchGroundToClub(g.ground)
      if (club) newVisited[club.id] = true
    })
    const newlyMarked = Object.values(newVisited).filter(Boolean).length - Object.values(visited).filter(Boolean).length
    setVis(newVisited)
    setMsg({type:'success', text:`✅ Imported ${newGames.length} new games${newlyMarked > 0 ? `, ${newlyMarked} new grounds marked visited` : ''}.`})
    setPreview(null); setCsvText('')
  }

  return (
    <div style={{display:'flex',flexDirection:'column',gap:'16px'}}>

      {/* App info + server status */}
      <Card>
        <div style={{display:'flex',alignItems:'flex-start',gap:'12px',flexWrap:'wrap'}}>
          <div style={{width:40,height:40,borderRadius:10,background:'#16a34a',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0}}>⚽</div>
          <div style={{flex:1,minWidth:200}}>
            <p style={{fontSize:'14px',fontWeight:600,marginBottom:'3px'}}>myGrounds  -  by Andrew Brook</p>
            <p style={{fontSize:'12px',color:'var(--text-muted)',lineHeight:1.6}}>
              myGrounds is a mobile app for tracking football grounds you've visited. To import your data into DanOS, export from the app and paste it here.
            </p>
          </div>
        </div>
        <div style={{marginTop:'12px',padding:'10px 12px',background:'var(--bg-input)',borderRadius:'var(--radius-sm)',fontSize:'12px',color:'var(--text-secondary)',lineHeight:1.7}}>
          <p style={{fontWeight:600,marginBottom:'4px'}}>How to export from myGrounds:</p>
          <ol style={{paddingLeft:'16px',margin:0}}>
            <li>Open the <strong>myGrounds</strong> app on your phone</li>
            <li>Go to <strong>Settings</strong> or your <strong>Profile</strong></li>
            <li>Look for <strong>Export</strong> or <strong>Share data</strong>  -  this may produce a CSV or plain text list</li>
            <li>Share/copy the export and paste it into the box below</li>
          </ol>
          <p style={{marginTop:'8px',color:'var(--text-muted)',fontStyle:'italic'}}>
            💡 If the app only lets you share a plain list of grounds (one per line), that works too  -  paste it and DanOS will match each ground to your team list.
          </p>
        </div>
      </Card>

      {/* Server status */}
      <div style={{display:'flex',alignItems:'center',gap:'8px',padding:'8px 12px',background:'var(--bg-input)',borderRadius:'var(--radius-sm)',fontSize:'12px'}}>
        <span style={{color:serverOk?'var(--success)':serverOk===false?'var(--danger)':'var(--text-muted)'}}>
          {serverOk===null?'⟳ Checking server...':serverOk?'✅ mygrounds_server.py running':'⚠️ mygrounds_server.py not running'}
        </span>
        {serverOk===false && <span style={{color:'var(--text-muted)'}}> -  run: <code style={{background:'var(--bg-badge)',padding:'1px 4px',borderRadius:3}}>python mygrounds_server.py</code></span>}
        <button onClick={()=>{setServerOk(null);fetch(`${MG_BASE}/health`).then(r=>r.ok?setServerOk(true):setServerOk(false)).catch(()=>setServerOk(false))}}
          style={{marginLeft:'auto',background:'none',border:'1px solid var(--border)',borderRadius:'var(--radius-sm)',cursor:'pointer',color:'var(--text-secondary)',padding:'2px 8px',fontSize:'11px'}}>
          Retry
        </button>
      </div>

      {/* Paste box */}
      <Card>
        <h3 style={{fontSize:'14px',fontWeight:600,marginBottom:'8px'}}>Paste your myGrounds export</h3>
        <p style={{fontSize:'12px',color:'var(--text-muted)',marginBottom:'10px'}}>
          Accepts CSV format (from a full export) or a plain list of ground/club names (one per line). Both will mark matching grounds as visited and add games to your log where details are available.
        </p>
        <textarea
          value={csvText}
          onChange={e=>setCsvText(e.target.value)}
          placeholder={"Paste CSV export here, or one ground/team name per line, e.g.:\n\nAnfield\nOld Trafford\nEtihad Stadium\n\nor full CSV:\n\nDate,Home,Away,Score,Ground,...\n01/09/2023,Liverpool,Newcastle,2-1,Anfield,..."}
          rows={10}
          style={{width:'100%',fontFamily:'monospace',fontSize:'11px',padding:'8px',borderRadius:'var(--radius-sm)',border:'1px solid var(--border)',background:'var(--bg-input)',color:'var(--text-primary)',resize:'vertical',boxSizing:'border-box'}}
        />
        <div style={{marginTop:'10px',display:'flex',gap:'8px',flexWrap:'wrap'}}>
          <Btn onClick={doImportCsv} disabled={importing||!csvText.trim()}>
            {importing?'Parsing...':'Parse & preview'}
          </Btn>
          {csvText && <Btn variant="ghost" onClick={()=>{setCsvText('');setPreview(null);setMsg(null)}}>Clear</Btn>}
        </div>
      </Card>

      {/* Message */}
      {msg && (
        <div style={{padding:'12px 16px',borderRadius:'var(--radius-sm)',background:msg.type==='success'?'var(--success-soft)':msg.type==='error'?'var(--danger-soft)':'var(--accent-soft)',border:`1px solid ${msg.type==='success'?'var(--success)':msg.type==='error'?'var(--danger)':'var(--accent-border)'}`,fontSize:'13px',color:msg.type==='success'?'var(--success)':msg.type==='error'?'var(--danger)':'var(--text-secondary)'}}>
          {msg.text}
        </div>
      )}

      {/* Preview */}
      {preview && preview.length > 0 && (
        <Card>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px',flexWrap:'wrap',gap:'8px'}}>
            <h3 style={{fontSize:'14px',fontWeight:600}}>{preview.length} games parsed</h3>
            <div style={{display:'flex',gap:'8px'}}>
              <Btn onClick={confirmImport}>✅ Confirm import</Btn>
              <Btn variant="ghost" onClick={()=>{setPreview(null);setMsg(null)}}>Cancel</Btn>
            </div>
          </div>
          <div style={{maxHeight:360,overflowY:'auto',display:'flex',flexDirection:'column',gap:'3px'}}>
            {preview.map((g,i)=>{
              const club = matchGroundToClub(g.ground)
              return (
                <div key={i} style={{display:'flex',alignItems:'center',gap:'8px',padding:'7px 10px',background:i%2===0?'var(--bg-card)':'var(--bg-input)',borderRadius:'var(--radius-sm)',fontSize:'12px'}}>
                  <span style={{color:'var(--text-muted)',minWidth:76,flexShrink:0}}>{g.date||' - '}</span>
                  <span style={{flex:1,fontWeight:500,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                    {g.home}{g.homeScore!==''&&g.awayScore!==''?` ${g.homeScore} - ${g.awayScore} `:' vs '}{g.away}
                  </span>
                  <span style={{color:'var(--text-muted)',minWidth:110,textAlign:'right',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flexShrink:0}}>{g.ground||' - '}</span>
                  <span style={{fontSize:'10px',padding:'1px 6px',borderRadius:10,background:club?'var(--success-soft)':'var(--bg-badge)',color:club?'var(--success)':'var(--text-muted)',flexShrink:0,minWidth:60,textAlign:'center'}}>
                    {club?'✓ matched':'unmatched'}
                  </span>
                </div>
              )
            })}
          </div>
          <p style={{fontSize:'11px',color:'var(--text-muted)',marginTop:'8px'}}>
            "Matched" entries will mark that ground as visited in your team list. Unmatched entries are still imported to your games log  -  you can manually tick off the ground on the Progress tab.
          </p>
        </Card>
      )}
    </div>
  )
}

export default function NinetyTwoClub({ clubData, setClubData }) {
  const clubs92   = clubData.clubs92   || DEFAULT_92
  const visited   = clubData.visited   || {}
  const fixtures  = clubData.fixtures  || []
  const games     = clubData.games     || []   // attended games log (92 + beyond)

  function setCl(fn)  { setClubData(p => ({ ...p, clubs92:   typeof fn==='function'?fn(p.clubs92   ||DEFAULT_92):fn })) }
  function setVis(fn) { setClubData(p => ({ ...p, visited:   typeof fn==='function'?fn(p.visited   ||{}):fn })) }
  function setFix(fn) { setClubData(p => ({ ...p, fixtures:  typeof fn==='function'?fn(p.fixtures  ||[]):fn })) }
  function setGm(fn)  { setClubData(p => ({ ...p, games:     typeof fn==='function'?fn(p.games     ||[]):fn })) }

  const [tab, setTab] = useState('progress')
  const [leagueFilter, setLeagueFilter] = useState('All')
  const [showFilter, setShowFilter] = useState('all')
  const [search, setSearch] = useState('')

  // Fixture state
  const [showFixForm, setShowFixForm] = useState(false)
  const [fixForm, setFixForm] = useState({ home:'',away:'',date:'',venue:'',league:'Championship',ticketUrl:'',notes:'' })
  const [editFixId, setEditFixId] = useState(null)

  // Game log state
  const [showGameForm, setShowGameForm] = useState(false)
  const [gameForm, setGameForm] = useState({ home:'',away:'',homeScore:'',awayScore:'',date:'',ground:'',competition:'',country:'England',notes:'' })
  const [editGameId, setEditGameId] = useState(null)

  // Configure state
  const [editClub, setEditClub] = useState(null)  // club being edited
  const [clubEditForm, setClubEditForm] = useState({ name:'',ground:'',league:'Premier League' })
  const [showAddClub, setShowAddClub] = useState(false)
  const [newClub, setNewClub] = useState({ name:'',ground:'',league:'Premier League' })

  const visitedCount = Object.values(visited).filter(Boolean).length
  const pct = Math.round((visitedCount / clubs92.length) * 100)

  const filteredClubs = useMemo(() => sortClubs(clubs92.filter(c => {
    if (leagueFilter !== 'All' && c.league !== leagueFilter) return false
    if (showFilter === 'visited' && !visited[c.id]) return false
    if (showFilter === 'unvisited' && visited[c.id]) return false
    if (search && !c.name.toLowerCase().includes(search.toLowerCase()) && !c.ground?.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })), [clubs92, leagueFilter, showFilter, search, visited])

  const leagueCounts = useMemo(() => {
    const res = {}
    EFL_LEAGUES.forEach(l => { res[l] = { total: clubs92.filter(c=>c.league===l).length, visited: clubs92.filter(c=>c.league===l&&visited[c.id]).length } })
    return res
  }, [clubs92, visited])

  // Game stats
  const stats = useMemo(() => {
    if (!games.length) return null
    const withScore = games.filter(g => g.homeScore !== '' && g.awayScore !== '' && g.homeScore != null)
    const totalGoals = withScore.reduce((a,g) => a + Number(g.homeScore) + Number(g.awayScore), 0)
    const highScoring = withScore.reduce((best, g) => {
      const tot = Number(g.homeScore) + Number(g.awayScore)
      return tot > (Number(best?.homeScore||0)+Number(best?.awayScore||0)) ? g : best
    }, null)
    const countries = [...new Set(games.map(g=>g.country).filter(Boolean))]
    const grounds = [...new Set(games.map(g=>g.ground).filter(Boolean))]
    return { total: games.length, withScore: withScore.length, totalGoals, avgGoals: withScore.length ? (totalGoals/withScore.length).toFixed(1) : 0, highScoring, countries: countries.length, grounds: grounds.length }
  }, [games])

  function toggleVisited(id) { setVis(p => ({ ...p, [id]: !p[id] })) }

  // Fixtures
  function saveFix() {
    if (!fixForm.home || !fixForm.date) return
    if (editFixId) { setFix(p => p.map(f => f.id===editFixId?{...f,...fixForm}:f)); setEditFixId(null) }
    else setFix(p => [...p, { id:Date.now(), ...fixForm }])
    setFixForm({ home:'',away:'',date:'',venue:'',league:'Championship',ticketUrl:'',notes:'' }); setShowFixForm(false)
  }

  // Games log
  function saveGame() {
    if (!gameForm.home || !gameForm.date) return
    if (editGameId) { setGm(p => p.map(g => g.id===editGameId?{...g,...gameForm}:g)); setEditGameId(null) }
    else setGm(p => [...p, { id:Date.now(), ...gameForm }])
    setGameForm({ home:'',away:'',homeScore:'',awayScore:'',date:'',ground:'',competition:'',country:'England',notes:'' }); setShowGameForm(false)
  }

  // Club configure
  function saveClubEdit() {
    setCl(p => p.map(c => c.id===editClub?{...c,...clubEditForm}:c))
    setEditClub(null)
  }
  function deleteClub(id) { setCl(p=>p.filter(c=>c.id!==id)); setVis(p=>{const n={...p};delete n[id];return n}) }
  function addClub() {
    if (!newClub.name.trim()) return
    setCl(p=>[...p,{id:Date.now(),...newClub}])
    setNewClub({name:'',ground:'',league:'Premier League'}); setShowAddClub(false)
  }
  function resetToDefault() { if(window.confirm('Reset to the default 92 clubs? Your visited ticks will be kept where club IDs match.')) setCl(DEFAULT_92) }

  const upcomingFix = [...fixtures].filter(f=>new Date(f.date)>=new Date()).sort((a,b)=>new Date(a.date)-new Date(b.date))
  const pastFix = [...fixtures].filter(f=>new Date(f.date)<new Date()).sort((a,b)=>new Date(b.date)-new Date(a.date))
  const sortedGames = [...games].sort((a,b)=>new Date(b.date)-new Date(a.date))

  return (
    <div>
      <PageHeader title="⚽ 92 Club" subtitle={`${visitedCount} of ${clubs92.length} grounds visited · ${pct}% complete`} action={
        <div style={{display:'flex',gap:'8px'}}>
          {TABS.map(t=>(
            <Btn key={t} variant={tab===t?'primary':'secondary'} onClick={()=>setTab(t)} size="sm">
              {t==='progress'?'Progress':t==='games'?'Games log':t==='fixtures'?'Fixtures':t==='import'?'Import from myGrounds':'Team list'}
            </Btn>
          ))}
        </div>
      } />

      {/* Progress bar header */}
      <Card style={{marginBottom:'20px',padding:'18px 24px'}}>
        <div style={{display:'flex',alignItems:'center',gap:'24px',flexWrap:'wrap'}}>
          <div style={{textAlign:'center'}}>
            <p style={{fontFamily:'var(--font-display)',fontSize:'38px',fontWeight:700,color:'var(--accent)',lineHeight:1}}>{visitedCount}</p>
            <p style={{fontSize:'12px',color:'var(--text-muted)',marginTop:'4px'}}>of {clubs92.length} visited</p>
          </div>
          <div style={{flex:1,minWidth:200}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:'6px'}}>
              <span style={{fontSize:'13px',color:'var(--text-secondary)'}}>Overall progress</span>
              <span style={{fontSize:'13px',fontWeight:600,color:'var(--accent)'}}>{pct}%</span>
            </div>
            <div style={{height:10,background:'var(--bg-badge)',borderRadius:'5px',overflow:'hidden'}}>
              <div style={{height:'100%',width:`${pct}%`,background:'linear-gradient(90deg,var(--accent),#34d974)',borderRadius:'5px',transition:'width 0.4s'}} />
            </div>
            <div style={{display:'flex',gap:'10px',marginTop:'10px',flexWrap:'wrap'}}>
              {EFL_LEAGUES.map(l=>(
                <div key={l} style={{display:'flex',alignItems:'center',gap:'5px'}}>
                  <span style={{width:8,height:8,borderRadius:'50%',background:LC(l),flexShrink:0}} />
                  <span style={{fontSize:'11px',color:'var(--text-secondary)'}}>{l.replace('Premier League','PL').replace('Championship','Ch').replace('League ','L')}: <strong>{leagueCounts[l]?.visited||0}/{leagueCounts[l]?.total||0}</strong></span>
                </div>
              ))}
            </div>
          </div>
          <div style={{textAlign:'center'}}>
            <p style={{fontFamily:'var(--font-display)',fontSize:'38px',fontWeight:700,color:'var(--text-muted)',lineHeight:1}}>{clubs92.length-visitedCount}</p>
            <p style={{fontSize:'12px',color:'var(--text-muted)',marginTop:'4px'}}>remaining</p>
          </div>
          {stats && (
            <div style={{textAlign:'center'}}>
              <p style={{fontFamily:'var(--font-display)',fontSize:'38px',fontWeight:700,color:'var(--success)',lineHeight:1}}>{stats.total}</p>
              <p style={{fontSize:'12px',color:'var(--text-muted)',marginTop:'4px'}}>games logged</p>
            </div>
          )}
        </div>
      </Card>

      {/* PROGRESS TAB */}
      {tab==='progress' && (
        <>
          <div style={{display:'flex',gap:'8px',flexWrap:'wrap',marginBottom:'14px',alignItems:'center'}}>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search club or ground…" style={{width:200}} />
            {['All',...EFL_LEAGUES,...[...new Set(clubs92.filter(c=>!EFL_LEAGUES.includes(c.league)).map(c=>c.league))]].map(l=>(
              <button key={l} onClick={()=>setLeagueFilter(l)} style={{padding:'4px 11px',borderRadius:'20px',border:leagueFilter===l?`1px solid ${l==='All'?'var(--accent)':LC(l)}`:'1px solid var(--border)',background:leagueFilter===l?(l==='All'?'var(--accent-soft)':LC(l)+'22'):'var(--bg-card)',color:leagueFilter===l?(l==='All'?'var(--accent)':LC(l)):'var(--text-secondary)',fontSize:'12px',cursor:'pointer'}}>{l}</button>
            ))}
            <div style={{marginLeft:'auto',display:'flex',gap:'4px'}}>
              {[['all','All'],['visited','✅ Done'],['unvisited','⬜ To go']].map(([v,lb])=>(
                <button key={v} onClick={()=>setShowFilter(v)} style={{padding:'4px 10px',borderRadius:'20px',border:showFilter===v?'1px solid var(--accent)':'1px solid var(--border)',background:showFilter===v?'var(--accent-soft)':'var(--bg-card)',color:showFilter===v?'var(--accent)':'var(--text-secondary)',fontSize:'12px',cursor:'pointer'}}>{lb}</button>
              ))}
            </div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:'8px'}}>
            {filteredClubs.map(club=>{
              const isV=!!visited[club.id]
              const initials=club.name.split(' ').map(w=>w[0]).filter(Boolean).slice(0,3).join('').toUpperCase()
              const lc=LC(club.league)
              // Try Wikipedia commons logo via a proxy-friendly URL
              return (
                <div key={club.id} onClick={()=>toggleVisited(club.id)} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'8px',padding:'12px 10px',background:isV?'var(--success-soft)':'var(--bg-card)',border:`2px solid ${isV?'var(--success)':'var(--border)'}`,borderRadius:'var(--radius)',cursor:'pointer',transition:'all 0.15s',textAlign:'center',position:'relative'}}>
                  {/* Visited tick */}
                  <div style={{position:'absolute',top:6,right:6}}>
                    {isV?<CheckCircle2 size={14} color="var(--success)"/>:<Circle size={14} color="var(--border)"/>}
                  </div>
                  {/* Circular initials badge */}
                  <div style={{width:52,height:52,borderRadius:'50%',background:lc+'33',border:`2px solid ${lc}`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                    <span style={{fontSize:initials.length>2?'12px':'14px',fontWeight:800,color:lc,letterSpacing:'-0.5px'}}>
                      {initials}
                    </span>
                  </div>
                  <div style={{minWidth:0,width:'100%'}}>
                    <p style={{fontSize:'12px',fontWeight:600,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{club.name}</p>
                    <p style={{fontSize:'10px',color:'var(--text-muted)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{club.ground}</p>
                  </div>
                  <span style={{fontSize:'10px',padding:'2px 6px',borderRadius:'3px',background:lc+'22',color:lc,fontWeight:600,flexShrink:0}}>
                    {club.league==='Premier League'?'PL':club.league==='Championship'?'Ch':club.league==='League One'?'L1':club.league==='League Two'?'L2':club.league.slice(0,4)}
                  </span>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* GAMES LOG TAB */}
      {tab==='games' && (
        <div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px'}}>
            <div>
              {stats && (
                <div style={{display:'flex',gap:'16px',flexWrap:'wrap'}}>
                  {[['🏟️','Games logged',stats.total],['⚽','Total goals',stats.totalGoals],['📊','Avg goals/game',stats.avgGoals],['🌍','Countries',stats.countries],['📍','Grounds',stats.grounds]].map(([em,lb,val])=>(
                    <div key={lb} style={{textAlign:'center'}}>
                      <p style={{fontSize:'20px',fontWeight:700,fontFamily:'var(--font-display)',color:'var(--accent)',lineHeight:1}}>{val}</p>
                      <p style={{fontSize:'11px',color:'var(--text-muted)',marginTop:'2px'}}>{em} {lb}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <Btn onClick={()=>{setGameForm({home:'',away:'',homeScore:'',awayScore:'',date:'',ground:'',competition:'',country:'England',notes:''});setEditGameId(null);setShowGameForm(true)}}><Plus size={14}/> Log game</Btn>
          </div>

          {showGameForm && (
            <Card style={{marginBottom:'16px',border:'1px solid var(--accent-border)'}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:'12px'}}>
                <h3 style={{fontSize:'14px',fontWeight:600}}>{editGameId?'Edit game':'Log a game'}</h3>
                <button onClick={()=>setShowGameForm(false)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)'}}><X size={16}/></button>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
                <div><label style={{fontSize:'12px',color:'var(--text-muted)',display:'block',marginBottom:'3px'}}>Home team</label><input value={gameForm.home} onChange={e=>setGameForm(f=>({...f,home:e.target.value}))} placeholder="e.g. Barnsley" /></div>
                <div><label style={{fontSize:'12px',color:'var(--text-muted)',display:'block',marginBottom:'3px'}}>Away team</label><input value={gameForm.away} onChange={e=>setGameForm(f=>({...f,away:e.target.value}))} placeholder="e.g. Bristol Rovers" /></div>
                <div style={{display:'flex',gap:'8px',alignItems:'flex-end'}}>
                  <div style={{flex:1}}><label style={{fontSize:'12px',color:'var(--text-muted)',display:'block',marginBottom:'3px'}}>Home score</label><input type="number" min="0" value={gameForm.homeScore} onChange={e=>setGameForm(f=>({...f,homeScore:e.target.value}))} placeholder="0" /></div>
                  <span style={{fontSize:'16px',fontWeight:700,color:'var(--text-muted)',paddingBottom:'8px'}}> - </span>
                  <div style={{flex:1}}><label style={{fontSize:'12px',color:'var(--text-muted)',display:'block',marginBottom:'3px'}}>Away score</label><input type="number" min="0" value={gameForm.awayScore} onChange={e=>setGameForm(f=>({...f,awayScore:e.target.value}))} placeholder="0" /></div>
                </div>
                <div><label style={{fontSize:'12px',color:'var(--text-muted)',display:'block',marginBottom:'3px'}}>Date</label><input type="date" value={gameForm.date} onChange={e=>setGameForm(f=>({...f,date:e.target.value}))} /></div>
                <div><label style={{fontSize:'12px',color:'var(--text-muted)',display:'block',marginBottom:'3px'}}>Ground / stadium</label><input value={gameForm.ground} onChange={e=>setGameForm(f=>({...f,ground:e.target.value}))} placeholder="Ground name" /></div>
                <div><label style={{fontSize:'12px',color:'var(--text-muted)',display:'block',marginBottom:'3px'}}>Competition</label><input value={gameForm.competition} onChange={e=>setGameForm(f=>({...f,competition:e.target.value}))} placeholder="e.g. Championship, Champions League…" /></div>
                <div><label style={{fontSize:'12px',color:'var(--text-muted)',display:'block',marginBottom:'3px'}}>Country</label><input value={gameForm.country} onChange={e=>setGameForm(f=>({...f,country:e.target.value}))} placeholder="e.g. England, Spain, Germany…" /></div>
                <div style={{gridColumn:'1/-1'}}><label style={{fontSize:'12px',color:'var(--text-muted)',display:'block',marginBottom:'3px'}}>Notes</label><input value={gameForm.notes} onChange={e=>setGameForm(f=>({...f,notes:e.target.value}))} placeholder="Who you went with, any memorable moments…" /></div>
              </div>
              <div style={{display:'flex',gap:'8px',marginTop:'12px'}}>
                <Btn onClick={saveGame}>{editGameId?'Save changes':'Log game'}</Btn>
                <Btn variant="ghost" onClick={()=>setShowGameForm(false)}>Cancel</Btn>
              </div>
            </Card>
          )}

          {sortedGames.length===0?(
            <Card style={{textAlign:'center',padding:'40px'}}>
              <p style={{fontSize:'28px',marginBottom:'10px'}}>🏟️</p>
              <p style={{fontSize:'14px',color:'var(--text-secondary)',marginBottom:'6px'}}>No games logged yet.</p>
              <p style={{fontSize:'13px',color:'var(--text-muted)'}}>Log any game  -  EFL, non-league, European, international  -  it all counts.</p>
            </Card>
          ):(
            <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
              {sortedGames.map(g=>{
                const d=new Date(g.date)
                const hasScore=g.homeScore!==''&&g.awayScore!==''&&g.homeScore!=null
                return (
                  <Card key={g.id} style={{padding:'14px 16px'}}>
                    <div style={{display:'flex',alignItems:'center',gap:'14px',flexWrap:'wrap'}}>
                      <div style={{textAlign:'center',minWidth:36,flexShrink:0}}>
                        <p style={{fontSize:'18px',fontWeight:700,fontFamily:'var(--font-display)',color:'var(--accent)',lineHeight:1}}>{d.getDate()}</p>
                        <p style={{fontSize:'10px',color:'var(--text-muted)',textTransform:'uppercase'}}>{d.toLocaleString('default',{month:'short'})} '{String(d.getFullYear()).slice(2)}</p>
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:'flex',alignItems:'center',gap:'8px',flexWrap:'wrap'}}>
                          <p style={{fontSize:'14px',fontWeight:600}}>{g.home} vs {g.away}</p>
                          {hasScore&&<span style={{fontSize:'15px',fontWeight:700,color:'var(--text-primary)',background:'var(--bg-badge)',padding:'2px 10px',borderRadius:'var(--radius-sm)',fontFamily:'var(--font-display)'}}>{g.homeScore}  -  {g.awayScore}</span>}
                        </div>
                        <div style={{display:'flex',gap:'8px',marginTop:'4px',flexWrap:'wrap'}}>
                          {g.ground&&<span style={{fontSize:'12px',color:'var(--text-secondary)'}}>📍 {g.ground}</span>}
                          {g.competition&&<span style={{fontSize:'12px',color:'var(--text-muted)'}}>🏆 {g.competition}</span>}
                          {g.country&&g.country!=='England'&&<span style={{fontSize:'12px',color:'var(--text-muted)'}}>🌍 {g.country}</span>}
                        </div>
                        {g.notes&&<p style={{fontSize:'12px',color:'var(--text-secondary)',marginTop:'4px',fontStyle:'italic'}}>{g.notes}</p>}
                      </div>
                      <div style={{display:'flex',gap:'4px',flexShrink:0}}>
                        <button onClick={()=>{setGameForm({home:g.home,away:g.away,homeScore:g.homeScore??'',awayScore:g.awayScore??'',date:g.date,ground:g.ground||'',competition:g.competition||'',country:g.country||'England',notes:g.notes||''});setEditGameId(g.id);setShowGameForm(true)}} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)'}}><Pencil size={13}/></button>
                        <button onClick={()=>setGm(p=>p.filter(x=>x.id!==g.id))} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)'}}><Trash2 size={13}/></button>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* FIXTURES TAB */}
      {tab==='fixtures' && (
        <div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px',flexWrap:'wrap',gap:'8px'}}>
            <p style={{fontSize:'13px',color:'var(--text-secondary)'}}>Track games you want to attend. Check BBC or Sky for fixtures, then add them here.</p>
            <div style={{display:'flex',gap:'8px'}}>
              <a href="https://www.bbc.co.uk/sport/football/scores-fixtures" target="_blank" rel="noreferrer" style={{display:'inline-flex',alignItems:'center',gap:'5px',padding:'7px 12px',borderRadius:'var(--radius-sm)',background:'var(--bg-badge)',border:'1px solid var(--border)',color:'var(--text-secondary)',fontSize:'12px',textDecoration:'none'}}><ExternalLink size={12}/> BBC</a>
              <a href="https://www.skysports.com/football/fixtures" target="_blank" rel="noreferrer" style={{display:'inline-flex',alignItems:'center',gap:'5px',padding:'7px 12px',borderRadius:'var(--radius-sm)',background:'var(--bg-badge)',border:'1px solid var(--border)',color:'var(--text-secondary)',fontSize:'12px',textDecoration:'none'}}><ExternalLink size={12}/> Sky</a>
              <Btn onClick={()=>{setFixForm({home:'',away:'',date:'',venue:'',league:'Championship',ticketUrl:'',notes:''});setEditFixId(null);setShowFixForm(true)}}><Plus size={14}/> Add fixture</Btn>
            </div>
          </div>
          {showFixForm&&(
            <Card style={{marginBottom:'16px',border:'1px solid var(--accent-border)'}}>
              <style>{`input[type="datetime-local"],input[type="date"],input[type="time"]{color-scheme:dark}[data-theme="light"] input[type="datetime-local"],[data-theme="light"] input[type="date"],[data-theme="light"] input[type="time"]{color-scheme:light}`}</style>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:'12px'}}>
                <h3 style={{fontSize:'14px',fontWeight:600}}>{editFixId?'Edit':'Add'} fixture</h3>
                <button onClick={()=>setShowFixForm(false)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)'}}><X size={16}/></button>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
                <div><label style={{fontSize:'12px',color:'var(--text-muted)',display:'block',marginBottom:'3px'}}>Home</label><input value={fixForm.home} onChange={e=>setFixForm(f=>({...f,home:e.target.value}))} /></div>
                <div><label style={{fontSize:'12px',color:'var(--text-muted)',display:'block',marginBottom:'3px'}}>Away</label><input value={fixForm.away} onChange={e=>setFixForm(f=>({...f,away:e.target.value}))} /></div>
                <div><label style={{fontSize:'12px',color:'var(--text-muted)',display:'block',marginBottom:'3px'}}>Date & time</label><input type="datetime-local" value={fixForm.date} onChange={e=>setFixForm(f=>({...f,date:e.target.value}))} /></div>
                <div><label style={{fontSize:'12px',color:'var(--text-muted)',display:'block',marginBottom:'3px'}}>League</label><input value={fixForm.league} onChange={e=>setFixForm(f=>({...f,league:e.target.value}))} /></div>
                <div><label style={{fontSize:'12px',color:'var(--text-muted)',display:'block',marginBottom:'3px'}}>Ground</label><input value={fixForm.venue} onChange={e=>setFixForm(f=>({...f,venue:e.target.value}))} /></div>
                <div><label style={{fontSize:'12px',color:'var(--text-muted)',display:'block',marginBottom:'3px'}}>Ticket URL</label><input value={fixForm.ticketUrl} onChange={e=>setFixForm(f=>({...f,ticketUrl:e.target.value}))} placeholder="https://…" /></div>
                <div style={{gridColumn:'1/-1'}}><label style={{fontSize:'12px',color:'var(--text-muted)',display:'block',marginBottom:'3px'}}>Notes</label><input value={fixForm.notes} onChange={e=>setFixForm(f=>({...f,notes:e.target.value}))} /></div>
              </div>
              <div style={{display:'flex',gap:'8px',marginTop:'12px'}}><Btn onClick={saveFix}>{editFixId?'Save':'Add'}</Btn><Btn variant="ghost" onClick={()=>setShowFixForm(false)}>Cancel</Btn></div>
            </Card>
          )}
          {upcomingFix.length===0&&pastFix.length===0?(
            <Card style={{textAlign:'center',padding:'40px'}}><p style={{fontSize:'28px',marginBottom:'10px'}}>📋</p><p style={{fontSize:'14px',color:'var(--text-secondary)'}}>No fixtures tracked yet.</p></Card>
          ):(
            <div style={{display:'flex',flexDirection:'column',gap:'16px'}}>
              {upcomingFix.length>0&&<><p style={{fontSize:'12px',fontWeight:600,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:'4px'}}>Upcoming ({upcomingFix.length})</p>{upcomingFix.map(f=><FixCard key={f.id} f={f} onEdit={()=>{setFixForm({home:f.home,away:f.away,date:f.date,venue:f.venue||'',league:f.league,ticketUrl:f.ticketUrl||'',notes:f.notes||''});setEditFixId(f.id);setShowFixForm(true)}} onDelete={()=>setFix(p=>p.filter(x=>x.id!==f.id))} />)}</>}
              {pastFix.length>0&&<><p style={{fontSize:'12px',fontWeight:600,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:'4px'}}>Past ({pastFix.length})</p>{pastFix.map(f=><FixCard key={f.id} f={f} past onEdit={()=>{setFixForm({home:f.home,away:f.away,date:f.date,venue:f.venue||'',league:f.league,ticketUrl:f.ticketUrl||'',notes:f.notes||''});setEditFixId(f.id);setShowFixForm(true)}} onDelete={()=>setFix(p=>p.filter(x=>x.id!==f.id))} />)}</>}
            </div>
          )}
        </div>
      )}

      {/* IMPORT TAB */}
      {tab==='import' && (
        <MyGroundsImport
          clubs92={clubs92}
          visited={visited}
          games={games}
          setVis={setVis}
          setGm={setGm}
        />
      )}

      {/* TEAM LIST TAB */}
      {tab==='teamlist' && (
        <div>
          <div style={{display:'flex',gap:'8px',marginBottom:'16px',flexWrap:'wrap',alignItems:'center'}}>
            <p style={{fontSize:'13px',color:'var(--text-secondary)',flex:1}}>Edit club names, grounds, and leagues. Add non-EFL clubs, international grounds, non-league teams  -  anything you want to track.</p>
            <Btn variant="secondary" size="sm" onClick={resetToDefault}><Settings size={13}/> Reset to default 92</Btn>
            <Btn onClick={()=>setShowAddClub(true)}><Plus size={14}/> Add club</Btn>
          </div>
          {showAddClub&&(
            <Card style={{marginBottom:'12px',border:'1px solid var(--accent-border)'}}>
              <h3 style={{fontSize:'14px',fontWeight:600,marginBottom:'10px'}}>Add club</h3>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'8px'}}>
                <div><label style={{fontSize:'12px',color:'var(--text-muted)',display:'block',marginBottom:'3px'}}>Club name</label><input value={newClub.name} onChange={e=>setNewClub(f=>({...f,name:e.target.value}))} placeholder="Club name" autoFocus /></div>
                <div><label style={{fontSize:'12px',color:'var(--text-muted)',display:'block',marginBottom:'3px'}}>Ground</label><input value={newClub.ground} onChange={e=>setNewClub(f=>({...f,ground:e.target.value}))} placeholder="Ground name" /></div>
                <div><label style={{fontSize:'12px',color:'var(--text-muted)',display:'block',marginBottom:'3px'}}>League / division</label><input value={newClub.league} onChange={e=>setNewClub(f=>({...f,league:e.target.value}))} placeholder="e.g. National League, Bundesliga…" /></div>
              </div>
              <div style={{display:'flex',gap:'8px',marginTop:'10px'}}><Btn size="sm" onClick={addClub}>Add</Btn><Btn size="sm" variant="ghost" onClick={()=>setShowAddClub(false)}>Cancel</Btn></div>
            </Card>
          )}
          <div style={{display:'flex',flexDirection:'column',gap:'4px'}}>
            {sortClubs(clubs92).map(c=>(
              <div key={c.id}>
                {editClub===c.id?(
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr auto',gap:'8px',padding:'10px',background:'var(--accent-soft)',borderRadius:'var(--radius-sm)',alignItems:'center',marginBottom:'2px'}}>
                    <input value={clubEditForm.name} onChange={e=>setClubEditForm(f=>({...f,name:e.target.value}))} style={{fontSize:'13px'}} />
                    <input value={clubEditForm.ground} onChange={e=>setClubEditForm(f=>({...f,ground:e.target.value}))} style={{fontSize:'13px'}} />
                    <input value={clubEditForm.league} onChange={e=>setClubEditForm(f=>({...f,league:e.target.value}))} style={{fontSize:'13px'}} />
                    <div style={{display:'flex',gap:'4px'}}>
                      <Btn size="sm" onClick={saveClubEdit}>✓</Btn>
                      <Btn size="sm" variant="ghost" onClick={()=>setEditClub(null)}>✕</Btn>
                    </div>
                  </div>
                ):(
                  <div style={{display:'flex',alignItems:'center',gap:'10px',padding:'8px 12px',background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:'var(--radius-sm)',borderLeft:`3px solid ${LC(c.league)}`}}>
                    <div style={{flex:1,minWidth:0}}>
                      <span style={{fontSize:'13px',fontWeight:500}}>{c.name}</span>
                      <span style={{fontSize:'12px',color:'var(--text-muted)',marginLeft:'10px'}}>{c.ground}</span>
                    </div>
                    <span style={{fontSize:'11px',color:LC(c.league),background:LC(c.league)+'22',padding:'2px 7px',borderRadius:'4px',flexShrink:0}}>{c.league}</span>
                    {visited[c.id]&&<CheckCircle2 size={13} color="var(--success)" style={{flexShrink:0}}/>}
                    <button onClick={()=>{setEditClub(c.id);setClubEditForm({name:c.name,ground:c.ground||'',league:c.league})}} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)'}}><Pencil size={13}/></button>
                    <button onClick={()=>deleteClub(c.id)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)'}}><Trash2 size={13}/></button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function FixCard({ f, onEdit, onDelete, past }) {
  const d = new Date(f.date)
  const diff = Math.round((d - new Date()) / 86400000)
  return (
    <Card style={{padding:'12px 16px',opacity:past?0.7:1,borderLeft:`3px solid ${LC(f.league)}`}}>
      <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
        <div style={{textAlign:'center',minWidth:36,flexShrink:0}}>
          <p style={{fontSize:'18px',fontWeight:700,fontFamily:'var(--font-display)',color:'var(--accent)',lineHeight:1}}>{d.getDate()}</p>
          <p style={{fontSize:'10px',color:'var(--text-muted)',textTransform:'uppercase'}}>{d.toLocaleString('default',{month:'short'})}</p>
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:'flex',alignItems:'center',gap:'8px',flexWrap:'wrap'}}>
            <p style={{fontSize:'13px',fontWeight:600}}>{f.home} vs {f.away}</p>
            {f.league&&<span style={{fontSize:'10px',padding:'2px 6px',borderRadius:'4px',background:LC(f.league)+'22',color:LC(f.league),fontWeight:600}}>{f.league}</span>}
            {!past&&diff<=7&&<span style={{fontSize:'10px',padding:'2px 6px',borderRadius:'4px',background:'var(--warning-soft)',color:'var(--warning)',fontWeight:600}}>{diff===0?'Today!':diff===1?'Tomorrow!':`${diff}d`}</span>}
          </div>
          {f.venue&&<p style={{fontSize:'12px',color:'var(--text-secondary)',marginTop:'2px'}}>📍 {f.venue}</p>}
          {f.notes&&<p style={{fontSize:'12px',color:'var(--text-muted)',marginTop:'2px',fontStyle:'italic'}}>{f.notes}</p>}
        </div>
        <div style={{display:'flex',gap:'4px',flexShrink:0}}>
          {f.ticketUrl&&<a href={f.ticketUrl} target="_blank" rel="noreferrer" style={{display:'inline-flex',alignItems:'center',gap:'4px',padding:'4px 8px',borderRadius:'var(--radius-sm)',background:'var(--success-soft)',color:'var(--success)',fontSize:'12px',textDecoration:'none',border:'1px solid var(--success)',fontWeight:500}}>🎟️</a>}
          <button onClick={onEdit} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)'}}><Pencil size={13}/></button>
          <button onClick={onDelete} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)'}}><Trash2 size={13}/></button>
        </div>
      </div>
    </Card>
  )
}
