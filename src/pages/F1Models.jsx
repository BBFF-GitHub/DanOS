import React, { useState, useMemo } from 'react'
import Card from '../components/Card'
import PageHeader from '../components/PageHeader'
import Btn from '../components/Btn'
import { Plus, Trash2, Pencil, X, Package, Search } from 'lucide-react'
import IMPORT from '../f1ModelsData.json'

const CAR_MAKES    = ['Burago','Greenlight','Hot Wheels','Lego','Minichamps','Panini','Quartzo','Revell','Solido','Spark','Other']
const CAR_SIZES    = ['1:12','1:18','1:24','1:43','Other']
const HELMET_MAKES = ['Funkopop','Minichamps','Minimax','Spark','Other']
const HELMET_SIZES = ['1:2','1:5','1:8','Other']

const EMPTY_CAR    = { year:'', carNum:'', driver:'', team:'', carName:'', make:'', size:'1:43', packed:false }
const EMPTY_HELMET = { year:'', driver:'', team:'', raceName:'', make:'', size:'1:8', packed:false }

// Stats colour by make
const MAKE_COLORS = {
  'Minichamps':'#4f6ef7','Panini':'#f59e0b','Hot Wheels':'#ef4444',
  'Spark':'#22c55e','Lego':'#a78bfa','Burago':'#f97316','Greenlight':'#0ea5e9',
  'Revell':'#ec4899','Solido':'#34d974','Quartzo':'#6b7280','Other':'#9ca3af',
}

export default function F1ModelsPage({ modelsData, setModelsData }) {
  // Seed from import if no data yet
  const cars    = modelsData?.cars    || IMPORT.cars.map((c,i) => ({...c, id: i+1}))
  const helmets = modelsData?.helmets || IMPORT.helmets.map((h,i) => ({...h, id: i+1}))

  function setCars(fn)    { setModelsData(prev=>({...prev, cars: typeof fn==='function'?fn(prev?.cars||cars):fn})) }
  function setHelmets(fn) { setModelsData(prev=>({...prev, helmets: typeof fn==='function'?fn(prev?.helmets||helmets):fn})) }

  const [tab,         setTab]        = useState('cars')    // cars | helmets | stats
  const [search,      setSearch]     = useState('')
  const [filterMake,  setFilterMake] = useState('All')
  const [filterSize,  setFilterSize] = useState('All')
  const [filterTeam,  setFilterTeam] = useState('All')
  const [filterPacked,setFilterPacked]=useState('all')     // all | packed | unpacked
  const [showForm,    setShowForm]   = useState(false)
  const [editId,      setEditId]     = useState(null)
  const [carForm,     setCarForm]    = useState(EMPTY_CAR)
  const [helForm,     setHelForm]    = useState(EMPTY_HELMET)

  // ── Derived filter options ──────────────────────────────────────
  const carTeams = useMemo(()=>['All',...new Set(cars.map(c=>c.team).filter(Boolean).sort())],[cars])

  // ── Filtered lists ──────────────────────────────────────────────
  const filteredCars = useMemo(()=> cars.filter(c=>{
    const s = search.toLowerCase()
    if (s && !`${c.driver} ${c.team} ${c.carName} ${c.carNum} ${c.year} ${c.make}`.toLowerCase().includes(s)) return false
    if (filterMake!=='All' && c.make!==filterMake) return false
    if (filterSize!=='All' && c.size!==filterSize) return false
    if (filterTeam!=='All' && c.team!==filterTeam) return false
    if (filterPacked==='packed'   && !c.packed)  return false
    if (filterPacked==='unpacked' && c.packed)   return false
    return true
  }).sort((a,b)=>b.year-a.year||a.driver?.localeCompare(b.driver)), [cars,search,filterMake,filterSize,filterTeam,filterPacked])

  const filteredHelmets = useMemo(()=> helmets.filter(h=>{
    const s = search.toLowerCase()
    if (s && !`${h.driver} ${h.team} ${h.raceName} ${h.year} ${h.make}`.toLowerCase().includes(s)) return false
    if (filterMake!=='All' && h.make!==filterMake) return false
    if (filterSize!=='All' && h.size!==filterSize) return false
    if (filterPacked==='packed'   && !h.packed)  return false
    if (filterPacked==='unpacked' && h.packed)   return false
    return true
  }).sort((a,b)=>b.year-a.year||a.driver?.localeCompare(b.driver)), [helmets,search,filterMake,filterSize,filterPacked])

  // ── Stats ────────────────────────────────────────────────────────
  const stats = useMemo(()=>{
    const byMake    = {}
    const byTeam    = {}
    const bySize    = {}
    const byDecade  = {}
    cars.forEach(c=>{
      byMake[c.make]  = (byMake[c.make]  || 0) + 1
      byTeam[c.team]  = (byTeam[c.team]  || 0) + 1
      bySize[c.size]  = (bySize[c.size]  || 0) + 1
      const dec = Math.floor(c.year/10)*10
      byDecade[dec]   = (byDecade[dec]   || 0) + 1
    })
    return {
      totalCars: cars.length, totalHelmets: helmets.length,
      packed: cars.filter(c=>c.packed).length,
      unpacked: cars.filter(c=>!c.packed).length,
      byMake: Object.entries(byMake).sort((a,b)=>b[1]-a[1]),
      byTeam: Object.entries(byTeam).sort((a,b)=>b[1]-a[1]).slice(0,10),
      bySize: Object.entries(bySize).sort((a,b)=>b[1]-a[1]),
      byDecade: Object.entries(byDecade).sort((a,b)=>a[0]-b[0]),
    }
  },[cars,helmets])

  // ── CRUD ─────────────────────────────────────────────────────────
  function saveCar() {
    if (!carForm.driver || !carForm.year) return
    if (editId) {
      setCars(prev=>prev.map(c=>c.id===editId?{...c,...carForm,year:+carForm.year}:c))
    } else {
      setCars(prev=>[...prev,{...carForm,id:Date.now(),year:+carForm.year}])
    }
    setShowForm(false); setEditId(null); setCarForm(EMPTY_CAR)
  }

  function saveHelmet() {
    if (!helForm.driver || !helForm.year) return
    if (editId) {
      setHelmets(prev=>prev.map(h=>h.id===editId?{...h,...helForm,year:+helForm.year}:h))
    } else {
      setHelmets(prev=>[...prev,{...helForm,id:Date.now(),year:+helForm.year}])
    }
    setShowForm(false); setEditId(null); setHelForm(EMPTY_HELMET)
  }

  function deleteCar(id)    { if (window.confirm('Delete this model?')) setCars(prev=>prev.filter(c=>c.id!==id)) }
  function deleteHelmet(id) { if (window.confirm('Delete this item?'))  setHelmets(prev=>prev.filter(h=>h.id!==id)) }

  function editCar(c) {
    setCarForm({year:c.year,carNum:c.carNum||'',driver:c.driver||'',team:c.team||'',carName:c.carName||'',make:c.make||'',size:c.size||'1:43',packed:!!c.packed})
    setEditId(c.id); setShowForm(true)
  }
  function editHelmet(h) {
    setHelForm({year:h.year,driver:h.driver||'',team:h.team||'',raceName:h.raceName||'',make:h.make||'',size:h.size||'1:8',packed:!!h.packed})
    setEditId(h.id); setShowForm(true)
  }

  const isCars = tab==='cars'

  return (
    <div>
      <PageHeader
        title="🏎️ F1 Models Collection"
        subtitle={`${cars.length} cars · ${helmets.length} helmets & others`}
        action={tab!=='stats' && <Btn onClick={()=>{setShowForm(true);setEditId(null);isCars?setCarForm(EMPTY_CAR):setHelForm(EMPTY_HELMET)}}><Plus size={14}/> Add {isCars?'car':'item'}</Btn>}
      />

      {/* Tabs */}
      <div style={{display:'flex',gap:'6px',marginBottom:'20px'}}>
        {[['cars','🏎️ Cars'],['helmets','⛑️ Helmets & Others'],['stats','📊 Stats']].map(([id,label])=>(
          <Btn key={id} variant={tab===id?'primary':'secondary'} size="sm" onClick={()=>{setTab(id);setShowForm(false);setSearch('');setFilterMake('All');setFilterSize('All');setFilterTeam('All')}}>{label}</Btn>
        ))}
      </div>

      {/* ── CAR / HELMET FORM ── */}
      {showForm && tab!=='stats' && (
        <Card style={{marginBottom:'16px',border:'1px solid var(--accent-border)'}}>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:'12px'}}>
            <h3 style={{fontSize:'14px',fontWeight:600}}>{editId?'Edit':'Add'} {isCars?'car':'item'}</h3>
            <button onClick={()=>{setShowForm(false);setEditId(null)}} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)'}}><X size={16}/></button>
          </div>
          {isCars ? (
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:'10px'}}>
              <div><label style={{fontSize:'11px',color:'var(--text-muted)',display:'block',marginBottom:'3px'}}>Year</label><input type="number" min="1950" max="2030" value={carForm.year} onChange={e=>setCarForm(f=>({...f,year:e.target.value}))} placeholder="2024" autoFocus/></div>
              <div><label style={{fontSize:'11px',color:'var(--text-muted)',display:'block',marginBottom:'3px'}}>Car #</label><input value={carForm.carNum} onChange={e=>setCarForm(f=>({...f,carNum:e.target.value}))} placeholder="#1"/></div>
              <div><label style={{fontSize:'11px',color:'var(--text-muted)',display:'block',marginBottom:'3px'}}>Driver</label><input value={carForm.driver} onChange={e=>setCarForm(f=>({...f,driver:e.target.value}))} placeholder="Max Verstappen"/></div>
              <div><label style={{fontSize:'11px',color:'var(--text-muted)',display:'block',marginBottom:'3px'}}>Team</label><input value={carForm.team} onChange={e=>setCarForm(f=>({...f,team:e.target.value}))} placeholder="Red Bull"/></div>
              <div><label style={{fontSize:'11px',color:'var(--text-muted)',display:'block',marginBottom:'3px'}}>Car name</label><input value={carForm.carName} onChange={e=>setCarForm(f=>({...f,carName:e.target.value}))} placeholder="RB20"/></div>
              <div><label style={{fontSize:'11px',color:'var(--text-muted)',display:'block',marginBottom:'3px'}}>Make</label>
                <select value={carForm.make} onChange={e=>setCarForm(f=>({...f,make:e.target.value}))}>
                  <option value="">Select…</option>{CAR_MAKES.map(m=><option key={m} value={m}>{m}</option>)}
                </select></div>
              <div><label style={{fontSize:'11px',color:'var(--text-muted)',display:'block',marginBottom:'3px'}}>Scale</label>
                <select value={carForm.size} onChange={e=>setCarForm(f=>({...f,size:e.target.value}))}>
                  {CAR_SIZES.map(s=><option key={s} value={s}>{s}</option>)}
                </select></div>
              <label style={{display:'flex',alignItems:'center',gap:'6px',fontSize:'13px',cursor:'pointer',alignSelf:'flex-end',paddingBottom:6}}>
                <input type="checkbox" checked={carForm.packed} onChange={e=>setCarForm(f=>({...f,packed:e.target.checked}))} style={{width:'auto',accentColor:'var(--accent)'}}/> Packed away
              </label>
            </div>
          ) : (
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:'10px'}}>
              <div><label style={{fontSize:'11px',color:'var(--text-muted)',display:'block',marginBottom:'3px'}}>Year</label><input type="number" min="1950" max="2030" value={helForm.year} onChange={e=>setHelForm(f=>({...f,year:e.target.value}))} placeholder="2024" autoFocus/></div>
              <div><label style={{fontSize:'11px',color:'var(--text-muted)',display:'block',marginBottom:'3px'}}>Driver</label><input value={helForm.driver} onChange={e=>setHelForm(f=>({...f,driver:e.target.value}))} placeholder="Max Verstappen"/></div>
              <div><label style={{fontSize:'11px',color:'var(--text-muted)',display:'block',marginBottom:'3px'}}>Team</label><input value={helForm.team} onChange={e=>setHelForm(f=>({...f,team:e.target.value}))} placeholder="Red Bull"/></div>
              <div><label style={{fontSize:'11px',color:'var(--text-muted)',display:'block',marginBottom:'3px'}}>Race / description</label><input value={helForm.raceName} onChange={e=>setHelForm(f=>({...f,raceName:e.target.value}))} placeholder="Japan 2024"/></div>
              <div><label style={{fontSize:'11px',color:'var(--text-muted)',display:'block',marginBottom:'3px'}}>Make</label>
                <select value={helForm.make} onChange={e=>setHelForm(f=>({...f,make:e.target.value}))}>
                  <option value="">Select…</option>{HELMET_MAKES.map(m=><option key={m} value={m}>{m}</option>)}
                </select></div>
              <div><label style={{fontSize:'11px',color:'var(--text-muted)',display:'block',marginBottom:'3px'}}>Scale</label>
                <select value={helForm.size} onChange={e=>setHelForm(f=>({...f,size:e.target.value}))}>
                  {HELMET_SIZES.map(s=><option key={s} value={s}>{s}</option>)}
                </select></div>
              <label style={{display:'flex',alignItems:'center',gap:'6px',fontSize:'13px',cursor:'pointer',alignSelf:'flex-end',paddingBottom:6}}>
                <input type="checkbox" checked={helForm.packed} onChange={e=>setHelForm(f=>({...f,packed:e.target.checked}))} style={{width:'auto',accentColor:'var(--accent)'}}/> Packed away
              </label>
            </div>
          )}
          <div style={{display:'flex',gap:'8px',marginTop:'12px'}}>
            <Btn onClick={isCars?saveCar:saveHelmet}>{editId?'Save changes':'Add to collection'}</Btn>
            <Btn variant="ghost" onClick={()=>{setShowForm(false);setEditId(null)}}>Cancel</Btn>
          </div>
        </Card>
      )}

      {/* ── FILTERS ── */}
      {tab!=='stats' && (
        <div style={{display:'flex',gap:'8px',flexWrap:'wrap',marginBottom:'16px',alignItems:'center'}}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={isCars?"Search driver, team, car…":"Search driver, team…"} style={{width:220}}/>
          <select value={filterMake} onChange={e=>setFilterMake(e.target.value)} style={{width:130}}>
            <option value="All">All makes</option>
            {(isCars?CAR_MAKES:HELMET_MAKES).map(m=><option key={m} value={m}>{m}</option>)}
          </select>
          <select value={filterSize} onChange={e=>setFilterSize(e.target.value)} style={{width:100}}>
            <option value="All">All scales</option>
            {(isCars?CAR_SIZES:HELMET_SIZES).map(s=><option key={s} value={s}>{s}</option>)}
          </select>
          {isCars && (
            <select value={filterTeam} onChange={e=>setFilterTeam(e.target.value)} style={{width:140}}>
              {carTeams.map(t=><option key={t} value={t}>{t}</option>)}
            </select>
          )}
          <div style={{display:'flex',gap:'4px'}}>
            {[['all','All'],['unpacked','🏠 Displayed'],['packed','📦 Packed']].map(([v,l])=>(
              <button key={v} onClick={()=>setFilterPacked(v)} style={{padding:'4px 10px',borderRadius:'20px',border:filterPacked===v?'1px solid var(--accent)':'1px solid var(--border)',background:filterPacked===v?'var(--accent-soft)':'transparent',color:filterPacked===v?'var(--accent)':'var(--text-secondary)',fontSize:'12px',cursor:'pointer'}}>{l}</button>
            ))}
          </div>
          <span style={{fontSize:'12px',color:'var(--text-muted)',marginLeft:'auto'}}>
            {isCars ? filteredCars.length : filteredHelmets.length} items
          </span>
        </div>
      )}

      {/* ── CARS TABLE ── */}
      {tab==='cars' && (
        <Card style={{padding:0,overflow:'hidden'}}>
          <div style={{overflowX:'auto',maxHeight:'65vh',overflowY:'auto'}}>
            <table style={{borderCollapse:'collapse',width:'100%',fontSize:'12px'}}>
              <thead style={{position:'sticky',top:0,zIndex:2}}>
                <tr style={{background:'var(--bg-card)',borderBottom:'2px solid var(--border)'}}>
                  {['Year','#','Driver','Team','Car','Make','Scale','Status',''].map(h=>(
                    <th key={h} style={{padding:'8px 10px',textAlign:'left',color:'var(--text-muted)',fontWeight:600,whiteSpace:'nowrap'}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredCars.map((c,i)=>(
                  <tr key={c.id} style={{borderBottom:'1px solid var(--border)',background:i%2===0?'var(--bg-card)':'var(--bg-input)'}}>
                    <td style={{padding:'7px 10px',color:'var(--text-muted)',fontWeight:600,fontFamily:'var(--font-display)'}}>{c.year}</td>
                    <td style={{padding:'7px 10px',color:'var(--text-secondary)'}}>{c.carNum}</td>
                    <td style={{padding:'7px 10px',fontWeight:500,whiteSpace:'nowrap'}}>{c.driver}</td>
                    <td style={{padding:'7px 10px',color:'var(--text-secondary)',whiteSpace:'nowrap'}}>{c.team}</td>
                    <td style={{padding:'7px 10px',color:'var(--text-secondary)',whiteSpace:'nowrap'}}>{c.carName}</td>
                    <td style={{padding:'7px 10px'}}><span style={{fontSize:'11px',padding:'2px 7px',borderRadius:'4px',background:(MAKE_COLORS[c.make]||'#9ca3af')+'22',color:MAKE_COLORS[c.make]||'#9ca3af',fontWeight:600}}>{c.make}</span></td>
                    <td style={{padding:'7px 10px',color:'var(--text-muted)'}}>{c.size}</td>
                    <td style={{padding:'7px 10px'}}>
                      {c.packed
                        ? <span style={{fontSize:'11px',color:'var(--text-muted)'}}>📦 Packed</span>
                        : <span style={{fontSize:'11px',color:'var(--success)'}}>🏠 Displayed</span>}
                    </td>
                    <td style={{padding:'7px 8px',whiteSpace:'nowrap'}}>
                      <button onClick={()=>editCar(c)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)',padding:'2px'}}><Pencil size={12}/></button>
                      <button onClick={()=>deleteCar(c.id)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)',padding:'2px'}}><Trash2 size={12}/></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── HELMETS TABLE ── */}
      {tab==='helmets' && (
        <Card style={{padding:0,overflow:'hidden'}}>
          <div style={{overflowX:'auto',maxHeight:'65vh',overflowY:'auto'}}>
            <table style={{borderCollapse:'collapse',width:'100%',fontSize:'12px'}}>
              <thead style={{position:'sticky',top:0,zIndex:2}}>
                <tr style={{background:'var(--bg-card)',borderBottom:'2px solid var(--border)'}}>
                  {['Year','Driver','Team','Race / Description','Make','Scale','Status',''].map(h=>(
                    <th key={h} style={{padding:'8px 10px',textAlign:'left',color:'var(--text-muted)',fontWeight:600,whiteSpace:'nowrap'}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredHelmets.map((h,i)=>(
                  <tr key={h.id} style={{borderBottom:'1px solid var(--border)',background:i%2===0?'var(--bg-card)':'var(--bg-input)'}}>
                    <td style={{padding:'7px 10px',color:'var(--text-muted)',fontWeight:600,fontFamily:'var(--font-display)'}}>{h.year}</td>
                    <td style={{padding:'7px 10px',fontWeight:500,whiteSpace:'nowrap'}}>{h.driver}</td>
                    <td style={{padding:'7px 10px',color:'var(--text-secondary)',whiteSpace:'nowrap'}}>{h.team}</td>
                    <td style={{padding:'7px 10px',color:'var(--text-secondary)'}}>{h.raceName}</td>
                    <td style={{padding:'7px 10px'}}><span style={{fontSize:'11px',padding:'2px 7px',borderRadius:'4px',background:(MAKE_COLORS[h.make]||'#9ca3af')+'22',color:MAKE_COLORS[h.make]||'#9ca3af',fontWeight:600}}>{h.make}</span></td>
                    <td style={{padding:'7px 10px',color:'var(--text-muted)'}}>{h.size}</td>
                    <td style={{padding:'7px 10px'}}>
                      {h.packed
                        ? <span style={{fontSize:'11px',color:'var(--text-muted)'}}>📦 Packed</span>
                        : <span style={{fontSize:'11px',color:'var(--success)'}}>🏠 Displayed</span>}
                    </td>
                    <td style={{padding:'7px 8px',whiteSpace:'nowrap'}}>
                      <button onClick={()=>editHelmet(h)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)',padding:'2px'}}><Pencil size={12}/></button>
                      <button onClick={()=>deleteHelmet(h.id)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)',padding:'2px'}}><Trash2 size={12}/></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── STATS ── */}
      {tab==='stats' && (
        <div>
          {/* Headline stats */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:'12px',marginBottom:'20px'}}>
            {[
              ['🏎️','Total cars',       stats.totalCars,    'var(--accent)'],
              ['⛑️','Helmets & others', stats.totalHelmets, 'var(--warning)'],
              ['🏠','Displayed',        stats.unpacked,     'var(--success)'],
              ['📦','Packed away',      stats.packed,       'var(--text-secondary)'],
            ].map(([em,label,val,color])=>(
              <Card key={label} style={{padding:'16px',textAlign:'center'}}>
                <p style={{fontSize:'22px',marginBottom:'4px'}}>{em}</p>
                <p style={{fontFamily:'var(--font-display)',fontSize:'22px',fontWeight:700,color,lineHeight:1}}>{val}</p>
                <p style={{fontSize:'12px',color:'var(--text-muted)',marginTop:'4px'}}>{label}</p>
              </Card>
            ))}
          </div>

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px'}}>
            {/* By make */}
            <Card>
              <h3 style={{fontFamily:'var(--font-display)',fontSize:'14px',fontWeight:600,marginBottom:'12px'}}>Cars by make</h3>
              <div style={{display:'flex',flexDirection:'column',gap:'6px'}}>
                {stats.byMake.map(([make,count])=>(
                  <div key={make} style={{display:'flex',alignItems:'center',gap:'10px'}}>
                    <span style={{fontSize:'12px',minWidth:90,color:'var(--text-secondary)'}}>{make}</span>
                    <div style={{flex:1,height:6,background:'var(--bg-badge)',borderRadius:3,overflow:'hidden'}}>
                      <div style={{height:'100%',width:`${(count/stats.totalCars)*100}%`,background:MAKE_COLORS[make]||'#9ca3af',borderRadius:3}}/>
                    </div>
                    <span style={{fontSize:'12px',fontWeight:700,color:'var(--text-secondary)',minWidth:28,textAlign:'right'}}>{count}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* By team */}
            <Card>
              <h3 style={{fontFamily:'var(--font-display)',fontSize:'14px',fontWeight:600,marginBottom:'12px'}}>Top 10 teams</h3>
              <div style={{display:'flex',flexDirection:'column',gap:'6px'}}>
                {stats.byTeam.map(([team,count])=>(
                  <div key={team} style={{display:'flex',alignItems:'center',gap:'10px'}}>
                    <span style={{fontSize:'12px',minWidth:100,color:'var(--text-secondary)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{team}</span>
                    <div style={{flex:1,height:6,background:'var(--bg-badge)',borderRadius:3,overflow:'hidden'}}>
                      <div style={{height:'100%',width:`${(count/stats.byTeam[0][1])*100}%`,background:'var(--accent)',borderRadius:3}}/>
                    </div>
                    <span style={{fontSize:'12px',fontWeight:700,color:'var(--text-secondary)',minWidth:28,textAlign:'right'}}>{count}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* By decade */}
            <Card>
              <h3 style={{fontFamily:'var(--font-display)',fontSize:'14px',fontWeight:600,marginBottom:'12px'}}>By decade</h3>
              <div style={{display:'flex',flexDirection:'column',gap:'6px'}}>
                {stats.byDecade.map(([dec,count])=>(
                  <div key={dec} style={{display:'flex',alignItems:'center',gap:'10px'}}>
                    <span style={{fontSize:'12px',minWidth:50,color:'var(--text-secondary)',fontFamily:'var(--font-display)'}}>{dec}s</span>
                    <div style={{flex:1,height:6,background:'var(--bg-badge)',borderRadius:3,overflow:'hidden'}}>
                      <div style={{height:'100%',width:`${(count/stats.totalCars)*100}%`,background:'var(--success)',borderRadius:3}}/>
                    </div>
                    <span style={{fontSize:'12px',fontWeight:700,color:'var(--text-secondary)',minWidth:28,textAlign:'right'}}>{count}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* By scale */}
            <Card>
              <h3 style={{fontFamily:'var(--font-display)',fontSize:'14px',fontWeight:600,marginBottom:'12px'}}>By scale</h3>
              <div style={{display:'flex',flexDirection:'column',gap:'6px'}}>
                {stats.bySize.map(([size,count])=>(
                  <div key={size} style={{display:'flex',alignItems:'center',gap:'10px'}}>
                    <span style={{fontSize:'12px',minWidth:60,color:'var(--text-secondary)',fontFamily:'var(--font-display)'}}>{size}</span>
                    <div style={{flex:1,height:6,background:'var(--bg-badge)',borderRadius:3,overflow:'hidden'}}>
                      <div style={{height:'100%',width:`${(count/stats.totalCars)*100}%`,background:'var(--warning)',borderRadius:3}}/>
                    </div>
                    <span style={{fontSize:'12px',fontWeight:700,color:'var(--text-secondary)',minWidth:28,textAlign:'right'}}>{count}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
