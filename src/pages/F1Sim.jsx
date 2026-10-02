import React, { useState, useMemo, useEffect } from 'react'
import Card from '../components/Card'
import PageHeader from '../components/PageHeader'
import Btn from '../components/Btn'
import { Plus, Pencil, X, Check, Trash2 } from 'lucide-react'
import RAW from '../f1ImportData.json'

// ─── Points tables ──────────────────────────────────────────────
function getPtsTable(year) {
  if (year < 2003) return [10,6,4,3,2,1]
  if (year < 2010) return [10,8,6,5,4,3,2,1]
  return [25,18,15,12,10,8,6,4,2,1]
}
function calcPts(pos, year) {
  if (!pos) return 0
  const t = getPtsTable(year)
  return t[pos-1] ?? 0
}
function posLabel(p) {
  if (!p) return ' - '
  const s=['th','st','nd','rd'],v=p%100
  return p+(s[(v-20)%10]||s[v]||s[0])
}
function medalColor(p) {
  return p===1?'#fbbf24':p===2?'#9ca3af':p===3?'#cd7f32':null
}

// ─── Expand slim import ─────────────────────────────────────────
function expandImport(raw) {
  return raw.map(s=>({
    year:s.y, status:s.s, modern:s.m, flPoint:s.fl, posCount:s.pc,
    circuits: s.circuits.map(c=>({raceNum:c.n,circuit:c.c})),
    driverOrder: s.driverOrder,
    todo: s.todo.map(t=>({driver:t.d, raceCount:t.rc, marker:t.mk, myPts:t.pts??null, pct:t.pct??null})),
    driverTeams: (s.driverTeams||[]),
    drvStandings: s.drvS.map(x=>({driver:x.d,pts:x.p})),
    conStandings: s.conS.map(x=>({team:x.t,pts:x.p})),
    results: s.results.map(r=>({
      raceNum:r.n, circuit:r.c, driver:r.d,
      finishers:r.f||[], fl:r.fl||null,
      myPos:r.p??null, rain:!!r.w, myRetired:!!r.ret,
    })),
  }))
}
const IMPORT = expandImport(RAW)


// ─── Display name map (for abbreviated column display) ────────
const DISPLAY_NAMES = {
  'Michael Schumacher':  'M Schumacher',
  'Mick Schumacher':     'Mk Schumacher',
  'Ralf Schumacher':     'R Schumacher',
  'Jan Magnussen':       'J Magnussen',
  'Kevin Magnussen':     'K Magnussen',
  'Jacques Villeneuve':  'J Villeneuve',
  'Damon Hill':          'D Hill',
  'Jos Verstappen':      'J Verstappen',
  'Max Verstappen':      'M Verstappen',
  'Pedro de la Rosa':    'De La Rosa',
  'Pedro De La Rosa':    'De La Rosa',
  'Cristiano da Matta':  'da Matta',
  'Kazuki Nakajima':     'K Nakajima',
  'Nelson Piquet Jr':    'Piquet Jr',
  'Carlos Sainz Jr':     'Sainz Jr',
  'Lucas di Grassi':     'di Grassi',
  'Bruno Senna':         'B Senna',
  'Nico Rosberg':        'N Rosberg',
  'Jolyon Palmer':       'Jol Palmer',
  'Pietro Fittipaldi':   'P Fittipaldi',
  'Nyck de Vries':       'de Vries',
}
function shortName(fullName) {
  if (!fullName) return ''
  if (DISPLAY_NAMES[fullName]) return DISPLAY_NAMES[fullName]
  return fullName.split(' ').pop()
}

const STATUS = {
  complete:      {bg:'var(--success-soft)',color:'var(--success)',label:'Complete ✓'},
  'in-progress': {bg:'var(--accent-soft)', color:'var(--accent)', label:'In Progress'},
}

// ─── Main component ─────────────────────────────────────────────
export default function F1SimPage({ f1Data, setF1Data }) {
  const seasons = useMemo(()=>{
    if (f1Data?.seasons?.length>0) return f1Data.seasons
    return IMPORT
  },[f1Data?.seasons])

  function setSeasons(fn) {
    setF1Data(prev=>({...prev,
      seasons: typeof fn==='function'
        ? fn(prev?.seasons?.length>0 ? prev.seasons : JSON.parse(JSON.stringify(IMPORT)))
        : fn,
    }))
  }

  // Migration: restore correct conStandings from import for FL seasons where auto-update corrupted them
  useEffect(()=>{
    if (!f1Data?.seasons?.length) return
    const RENAMES = [{ year:1996, from:'Roberto Moreno', to:'Andrea Montermini' }]
    function applyRename(str, from, to) { return str===from ? to : str }

    // Build a lookup of correct conStandings from the raw IMPORT data
    const importConStandings = {}
    IMPORT.forEach(s=>{ importConStandings[s.year] = s.conStandings })

    let changed = false
    const patched = f1Data.seasons.map(s=>{
      const season = JSON.parse(JSON.stringify(s))

      // Name renames
      const rename = RENAMES.find(r=>r.year===season.year)
      if (rename) {
        const {from,to} = rename
        season.driverOrder = (season.driverOrder||[]).map(d=>applyRename(d,from,to))
        season.results = (season.results||[]).map(r=>({...r,driver:applyRename(r.driver,from,to),finishers:(r.finishers||[]).map(f=>applyRename(f,from,to)),fl:r.fl?applyRename(r.fl,from,to):r.fl}))
        season.todo = (season.todo||[]).map(t=>({...t,driver:applyRename(t.driver,from,to)}))
        season.drvStandings = (season.drvStandings||[]).map(d=>({...d,driver:applyRename(d.driver,from,to)}))
        changed = true
      }

      // Strip cross-season driverTeams contamination
      const validDrivers = new Set(season.driverOrder||[])
      const cleanedTeams = (season.driverTeams||[]).filter(m=>validDrivers.has(m.driver))
      if (cleanedTeams.length !== (season.driverTeams||[]).length) {
        season.driverTeams = cleanedTeams
        changed = true
      }

      // Restore correct conStandings from import if the stored values look wrong
      // (detect corruption: stored total < import total for FL seasons)
      const importCon = importConStandings[season.year]
      if (importCon && season.flPoint) {
        const storedTotal = (season.conStandings||[]).reduce((a,c)=>a+c.pts,0)
        const importTotal = importCon.reduce((a,c)=>a+c.pts,0)
        if (storedTotal < importTotal) {
          // Restore from import, preserving any user-added teams not in import
          const importTeams = new Set(importCon.map(c=>c.team))
          const userExtra = (season.conStandings||[]).filter(c=>!importTeams.has(c.team))
          season.conStandings = [...importCon, ...userExtra].sort((a,b)=>b.pts-a.pts)
          changed = true
        }
      }

      return season
    })
    if (changed) setF1Data(prev=>({...prev,seasons:patched}))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[f1Data?.seasons?.length])

  const [selYear, setSelYear]     = useState(() => {
    const y = sessionStorage.getItem('f1Year')
    if (y) { sessionStorage.removeItem('f1Year'); return parseInt(y) }
    return 2024
  })
  const [tab, setTab]             = useState('results')
  const [showAddSeason, setShowAddSeason] = useState(false)
  const [newYear, setNewYear]     = useState('')
  const [finalView, setFinalView] = useState('pts') // pts | positions
  // Editing
  const [editKey, setEditKey]     = useState(null)
  const [editState, setEditState] = useState({})
  // Edit standings
  const [editDrv, setEditDrv]     = useState(false)
  const [editCon, setEditCon]     = useState(false)
  const [editTodo, setEditTodo]   = useState(false)
  const [showTeams,  setShowTeams]  = useState(false)
  const [overrideForm, setOverrideForm] = useState({})

  const season = useMemo(()=>{
    const s = seasons.find(s=>s.year===selYear)
    if (!s) return s
    // Always filter driverTeams to only include drivers in this season's driverOrder
    const validDrivers = new Set(s.driverOrder||[])
    return {
      ...s,
      driverTeams: (s.driverTeams||[]).filter(m=>validDrivers.has(m.driver))
    }
  },[seasons,selYear])
  const year   = season?.year??2024
  const posCount = season?.posCount??10

  // ── Live-computed standings from finisher data ──────────────
  // Championship = count appearances in each finisher position × points
  // Points per race max (win + FL if applicable)
  const maxPtsPerRace = useMemo(()=>{
    if (!season) return 0
    return calcPts(1, year) + (season.flPoint ? 1 : 0)
  },[season,year])

  const liveDriverStandings = useMemo(()=>{
    if (!season) return []
    const pts = {}
    // Seed every driver from driverOrder with 0 so zero-scorers appear
    ;(season.driverOrder||[]).forEach(d=>{ pts[d]=0 })
    season.results.forEach(r=>{
      r.finishers.forEach((driver, i)=>{
        if (!driver) return
        if (!(driver in pts)) pts[driver]=0
        pts[driver] += calcPts(i+1, year)
      })
      // FL point: awarded only if the FL driver finished in the top 10
      if (season.flPoint && r.fl && r.fl!=='N/A' && r.fl!=='') {
        // Find the FL driver's finishing position (index in finishers = position-1)
        const flFinishPos = r.finishers.findIndex(f=>f===r.fl)
        // flFinishPos is 0-based; top 10 = index 0-9
        if (flFinishPos >= 0 && flFinishPos < 10) {
          if (!(r.fl in pts)) pts[r.fl]=0
          pts[r.fl]+=1
        }
      }
    })
    return Object.entries(pts)
      .filter(([d])=> d && d!=='N/A' && d!=='')
      .map(([d,p])=>({driver:d,pts:p}))
      .sort((a,b)=>b.pts-a.pts||a.driver.localeCompare(b.driver))
  },[season,year])

  const liveConStandings = useMemo(()=>{
    if (!season) return []
    // Use stored con standings (from spreadsheet) as they require team-driver mapping per era
    // Live-override with stored values; allow user edits
    return season.conStandings||[]
  },[season])

  // ── Dynamic Races To Do list ────────────────────────────────
  // Order: fewest races to drive first.
  // racesToDo preserves the user's custom drag order (used in edit mode)
  const racesToDo = useMemo(()=>{
    if (!season) return []
    const td = season.todo||[]
    const doneCounts = {}
    const ptsByDriver = {}
    season.driverOrder?.forEach(d=>{ doneCounts[d]=0; ptsByDriver[d]=0 })
    season.results?.forEach(r=>{
      if (r.myPos!=null || r.myRetired) doneCounts[r.driver]=(doneCounts[r.driver]||0)+1
      r.finishers.forEach((f,i)=>{
        if (f) ptsByDriver[f]=(ptsByDriver[f]||0)+calcPts(i+1,year)
      })
    })
    return td.map((t,origIdx)=>({
      ...t,
      totalRaces: t.raceCount??0,
      doneCount: doneCounts[t.driver]??0,
      livePts: ptsByDriver[t.driver]??0,
      origIdx,
    }))
  },[season,year])

  // Season is complete when all drivers have doneCount === totalRaces
  const seasonComplete = useMemo(()=>{
    if (!season) return false
    return racesToDo.length > 0 && racesToDo.every(t=>t.doneCount>=t.totalRaces)
  },[racesToDo,season])

  // Total races still to be played across all series
  const totalRacesRemaining = useMemo(()=>{
    return racesToDo.reduce((a,t)=>a + Math.max(0, t.totalRaces - t.doneCount), 0)
  },[racesToDo])

  // Max points any championship driver could still gain = totalRacesRemaining × maxPtsPerRace
  const seasonPtsLeft = useMemo(()=> totalRacesRemaining * maxPtsPerRace, [totalRacesRemaining, maxPtsPerRace])

  // Season progress %
  const seasonProgress = useMemo(()=>{
    if (!season) return 0
    // Use racesToDo for accurate count (not result rows which are per-driver)
    const total = racesToDo.reduce((a,t)=>a+t.totalRaces,0)
    const done  = racesToDo.reduce((a,t)=>a+t.doneCount,0)
    return total>0 ? Math.round((done/total)*100) : 0
  },[season,racesToDo])

  // ── Mutations ─────────────────────────────────────────────────
  function addSeason() {
    const yr=parseInt(newYear)
    if (!yr||seasons.find(s=>s.year===yr)) return
    const pc = yr>=2010?10:yr>=2003?8:6
    setSeasons(prev=>[...prev,{
      year:yr,status:'in-progress',modern:yr>=2003,flPoint:yr>=2019,
      posCount:pc,circuits:[],driverOrder:[],todo:[],
      drvStandings:[],conStandings:[],results:[],driverTeams:[],
    }].sort((a,b)=>a.year-b.year))
    setSelYear(yr);setNewYear('');setShowAddSeason(false)
  }

  function saveResult(origDriver, origRaceNum) {
    const es=editState
    const newDriver  = (es.driver||origDriver).trim()
    const newRaceNum = es.raceNum ? parseInt(es.raceNum) : origRaceNum
    setSeasons(prev=>prev.map(s=>{
      if (s.year!==selYear) return s
      const updated = {
        raceNum: newRaceNum,
        circuit: es.circuit||raceMeta(s,newRaceNum),
        driver: newDriver,
        finishers: (es.finishers||[]).filter(Boolean),
        fl: es.fl||null, myPos: es.myPos?parseInt(es.myPos):null, rain:es.rain||false, myRetired:!!es.myRetired,
      }
      // Remove original entry, plus any collision at new key
      let results = s.results.filter(r=>!(r.driver===origDriver&&r.raceNum===origRaceNum))
      if (newDriver!==origDriver || newRaceNum!==origRaceNum)
        results = results.filter(r=>!(r.driver===newDriver&&r.raceNum===newRaceNum))
      results = [...results, updated].sort((a,b)=>{
        const ai=s.driverOrder.indexOf(a.driver); const bi=s.driverOrder.indexOf(b.driver)
        return ai!==bi ? ai-bi : a.raceNum-b.raceNum
      })
      // Add new driver to driverOrder if renamed
      let driverOrder = s.driverOrder
      if (newDriver!==origDriver && !driverOrder.includes(newDriver))
        driverOrder = [...driverOrder, newDriver]
      // Update circuits list if raceNum changed
      let circuits = s.circuits
      if (newRaceNum!==origRaceNum && !circuits.find(c=>c.raceNum===newRaceNum))
        circuits = [...circuits, {raceNum:newRaceNum, circuit:es.circuit||`Round ${newRaceNum}`}].sort((a,b)=>a.raceNum-b.raceNum)
      // Recompute standings
      const pts={}
      results.forEach(r=>{
        r.finishers.forEach((d,i)=>{if(d){if(!pts[d])pts[d]=0;pts[d]+=calcPts(i+1,s.year)}})
        if(s.flPoint&&r.fl&&r.fl!=='N/A'&&r.myPos&&r.myPos<=10){if(!pts[r.fl])pts[r.fl]=0;pts[r.fl]+=1}
      })
      const drvStandings=Object.entries(pts).map(([d,p])=>({driver:d,pts:p})).sort((a,b)=>b.pts-a.pts)
      return {...s, results, circuits, driverOrder, drvStandings}
    }))
    setEditKey(null)
  }

  function raceMeta(s, raceNum) {
    return s.circuits?.find(c=>c.raceNum===raceNum)?.circuit||`Round ${raceNum}`
  }

  function startEdit(r) {
    setEditKey(`${r.driver}|||${r.raceNum}`)
    setEditState({
      driver:  r.driver,
      raceNum: r.raceNum,
      myPos:   r.myPos??'',
      rain:    r.rain,
      myRetired: r.myRetired||false,
      fl:      r.fl??'',
      circuit: r.circuit,
      finishers:[...r.finishers,...Array(posCount)].slice(0,posCount),
    })
  }

  function deleteResult(driver, raceNum) {
    if (!window.confirm(`Delete result: R${raceNum} ${driver}?`)) return
    setSeasons(prev=>prev.map(s=>{
      if (s.year!==selYear) return s
      const results = s.results.filter(r=>!(r.driver===driver&&r.raceNum===raceNum))
      // Recompute standings
      const pts={}
      results.forEach(r=>{
        r.finishers.forEach((d,i)=>{if(d){if(!pts[d])pts[d]=0;pts[d]+=calcPts(i+1,s.year)}})
        if(s.flPoint&&r.fl&&r.fl!=='N/A'&&r.myPos&&r.myPos<=10){if(!pts[r.fl])pts[r.fl]=0;pts[r.fl]+=1}
      })
      const drvStandings=Object.entries(pts).map(([d,p])=>({driver:d,pts:p})).sort((a,b)=>b.pts-a.pts)
      return {...s, results, drvStandings}
    }))
    setEditKey(null)
  }

  const [generateRace, setGenerateRace] = useState(false)
  const [genDrivers,   setGenDrivers]   = useState([])   // [{driver, constructor}]
  const [genRaces,     setGenRaces]     = useState([])   // [{raceNum, circuit}]
  const [genDriverInput, setGenDriverInput] = useState({driver:'', constructor:''})
  const [genRaceInput,   setGenRaceInput]   = useState({raceNum:'', circuit:''})

  function openGenerate() {
    // Pre-populate with existing season drivers that have no results yet, and existing circuits
    setGenDrivers([])
    setGenRaces([])
    setGenDriverInput({driver:'', constructor:''})
    setGenRaceInput({raceNum:'', circuit:''})
    setGenerateRace(true)
  }

  function addGenDriver() {
    const d = genDriverInput.driver.trim()
    if (!d || genDrivers.find(x=>x.driver===d)) return
    setGenDrivers(prev=>[...prev, {driver:d, constructor:genDriverInput.constructor.trim()}])
    setGenDriverInput({driver:'', constructor:''})
  }

  function addGenRace() {
    const n = parseInt(genRaceInput.raceNum)
    const c = genRaceInput.circuit.trim()
    if (!n || !c || genRaces.find(x=>x.raceNum===n)) return
    setGenRaces(prev=>[...prev, {raceNum:n, circuit:c}].sort((a,b)=>a.raceNum-b.raceNum))
    setGenRaceInput({raceNum:'', circuit:''})
  }

  function bulkGenerateRace() {
    if (!genDrivers.length || !genRaces.length) return
    setSeasons(prev=>prev.map(s=>{
      if (s.year!==selYear) return s
      const newRows = []
      const circuits = [...s.circuits]
      const todo = [...s.todo]
      const driverOrder = [...s.driverOrder]
      const driverTeams = [...(s.driverTeams||[])]

      genRaces.forEach(({raceNum, circuit})=>{
        // Ensure circuit in list
        if (!circuits.find(c=>c.raceNum===raceNum))
          circuits.push({raceNum, circuit})

        genDrivers.forEach(({driver, constructor})=>{
          // Skip if already exists
          if (s.results.find(r=>r.driver===driver&&r.raceNum===raceNum)) return
          newRows.push({
            raceNum, circuit, driver,
            finishers: Array(s.posCount||posCount).fill(''),
            fl:null, myPos:null, rain:false, myRetired:false,
          })
          // Add driver to driverOrder if missing
          if (!driverOrder.includes(driver)) driverOrder.push(driver)
          // Add to todo if missing
          if (!todo.find(t=>t.driver===driver))
            todo.push({driver, raceCount:1, marker:null, myPts:null, pct:null})
          // Add to driverTeams if constructor provided and not already mapped
          if (constructor && !driverTeams.find(m=>m.driver===driver))
            driverTeams.push({driver, team:constructor})
        })
      })

      circuits.sort((a,b)=>a.raceNum-b.raceNum)
      const results = [...s.results, ...newRows].sort((a,b)=>{
        const ai=driverOrder.indexOf(a.driver); const bi=driverOrder.indexOf(b.driver)
        return ai!==bi ? ai-bi : a.raceNum-b.raceNum
      })
      return {...s, results, circuits, todo, driverOrder, driverTeams}
    }))
    setGenerateRace(false)
    setGenDrivers([]); setGenRaces([])
  }

  function addNewResult() {
    setEditKey('NEW|||0')
    setEditState({
      driver:'', circuit:'', raceNum:'', myPos:'', rain:false, myRetired:false, fl:'',
      finishers:Array(posCount).fill(''),
    })
  }

  function saveNewResult() {
    const es=editState
    if (!es.driver||!es.circuit||!es.raceNum) return
    const raceNum=parseInt(es.raceNum)
    const driver=es.driver.trim()
    setSeasons(prev=>prev.map(s=>{
      if (s.year!==selYear) return s
      // Add driver to driverOrder if not present
      const driverOrder=s.driverOrder.includes(driver)?s.driverOrder:[...s.driverOrder,driver]
      // Add circuit to circuits if not present
      const circuitExists=s.circuits.find(c=>c.raceNum===raceNum)
      const circuits=circuitExists?s.circuits:[...s.circuits,{raceNum,circuit:es.circuit}].sort((a,b)=>a.raceNum-b.raceNum)
      // Add to todo if not present
      const todoExists=s.todo.find(t=>t.driver===driver)
      const todo=todoExists?s.todo:[...s.todo,{driver,raceCount:1,marker:null,myPts:null,pct:null}]
      const newR={raceNum,circuit:es.circuit,driver,finishers:es.finishers.filter(Boolean),fl:es.fl||null,myPos:es.myPos?parseInt(es.myPos):null,rain:es.rain}
      const exists=s.results.find(r=>r.driver===driver&&r.raceNum===raceNum)
      const results=exists?s.results.map(r=>r.driver===driver&&r.raceNum===raceNum?newR:r):[...s.results,newR].sort((a,b)=>{const ai=driverOrder.indexOf(a.driver),bi=driverOrder.indexOf(b.driver);if(ai!==bi)return ai-bi;return a.raceNum-b.raceNum})
      // Recompute standings
      const pts={}
      results.forEach(r=>{r.finishers.forEach((d,i)=>{if(d){if(!pts[d])pts[d]=0;pts[d]+=calcPts(i+1,s.year)}})})
      const drvStandings=Object.entries(pts).map(([d,p])=>({driver:d,pts:p})).sort((a,b)=>b.pts-a.pts)
      return {...s,driverOrder,circuits,todo,results,drvStandings}
    }))
    setEditKey(null)
  }

  function updateConStandings(idx, field, val) {
    setSeasons(prev=>prev.map(s=>{
      if (s.year!==selYear) return s
      const conStandings=[...(s.conStandings||[])]
      conStandings[idx]={...conStandings[idx],[field]:field==='pts'?(parseInt(val)||0):val}
      return {...s,conStandings:conStandings.sort((a,b)=>b.pts-a.pts)}
    }))
  }
  function addConRow() {
    setSeasons(prev=>prev.map(s=>s.year!==selYear?s:{...s,conStandings:[...(s.conStandings||[]),{team:'',pts:0}]}))
  }
  function removeConRow(idx) {
    setSeasons(prev=>prev.map(s=>s.year!==selYear?s:{...s,conStandings:(s.conStandings||[]).filter((_,i)=>i!==idx)}))
  }

  // editTodoOrder: local copy used during edit mode so moves show instantly
  const [editTodoOrder, setEditTodoOrder] = useState(null)

  function startEditTodo() {
    setEditTodoOrder(racesToDo.map(t => t.driver))
    setEditTodo(true)
  }

  function finishEditTodo() {
    if (editTodoOrder) {
      setSeasons(prev => prev.map(s => {
        if (s.year !== selYear) return s
        const todo = s.todo || []
        // Reorder todo by matching driver names in the new order
        const reordered = editTodoOrder
          .map(driver => todo.find(t => t.driver === driver))
          .filter(Boolean)
        // Append any todo items not in editTodoOrder (shouldn't happen but safe)
        const remaining = todo.filter(t => !editTodoOrder.includes(t.driver))
        return { ...s, todo: [...reordered, ...remaining] }
      }))
    }
    setEditTodoOrder(null)
    setEditTodo(false)
  }

  // The list shown in edit mode
  const editTodoList = editTodoOrder
    ? editTodoOrder.map(driver => racesToDo.find(t => t.driver === driver)).filter(Boolean)
    : racesToDo

  function reorderTodo(fromIdx, toIdx) {
    if (fromIdx === toIdx) return
    setEditTodoOrder(prev => {
      const next = [...(prev || racesToDo.map(t => t.driver))]
      const [item] = next.splice(fromIdx, 1)
      next.splice(toIdx, 0, item)
      return next
    })
  }


  // Auto-compute constructor standings from results + driverTeams (including FL points)
  function autoUpdateConstructors() {
    setSeasons(prev=>prev.map(s=>{
      if (s.year!==selYear) return s
      const teamPts = {}
      s.results.forEach(r=>{
        r.finishers.forEach((driver,i)=>{
          if (!driver) return
          const mapping = (s.driverTeams||[]).find(m=>m.driver===driver && (s.driverOrder||[]).includes(m.driver))
          if (!mapping) return
          const override = (mapping.overrides||[]).find(o=>r.raceNum>=o.from&&r.raceNum<=(o.to||9999))
          const team = override ? override.team : mapping.team
          if (!team) return
          if (!teamPts[team]) teamPts[team]=0
          teamPts[team]+=calcPts(i+1,s.year)
        })
        // FL point for constructors
        if (s.flPoint && r.fl && r.fl!=='N/A' && r.fl!=='') {
          const flFinishPos = r.finishers.findIndex(f=>f===r.fl)
          if (flFinishPos >= 0 && flFinishPos < 10) {
            const mapping = (s.driverTeams||[]).find(m=>m.driver===r.fl && (s.driverOrder||[]).includes(m.driver))
            if (mapping) {
              const override = (mapping.overrides||[]).find(o=>r.raceNum>=o.from&&r.raceNum<=(o.to||9999))
              const team = override ? override.team : mapping.team
              if (team) {
                if (!teamPts[team]) teamPts[team]=0
                teamPts[team]+=1
              }
            }
          }
        }
      })
      const conStandings = Object.entries(teamPts)
        .map(([team,pts])=>({team,pts}))
        .sort((a,b)=>b.pts-a.pts)
      const existing = s.conStandings||[]
      existing.forEach(e=>{
        if (!conStandings.find(c=>c.team===e.team)) conStandings.push({team:e.team,pts:0})
      })
      return {...s, conStandings: conStandings.sort((a,b)=>b.pts-a.pts)}
    }))
  }

  // Add/update a driver-team mapping
  function setDriverTeam(driver, team) {
    setSeasons(prev=>prev.map(s=>{
      if (s.year!==selYear) return s
      // Deep-copy to avoid mutating shared IMPORT reference
      const dt = JSON.parse(JSON.stringify(s.driverTeams||[]))
      const exists = dt.find(m=>m.driver===driver)
      const updated = exists
        ? dt.map(m=>m.driver===driver?{...m,team}:m)
        : [...dt,{driver,team,overrides:[]}]
      return {...s,driverTeams:updated}
    }))
  }

  function addTeamOverride(driver, from, to, team) {
    setSeasons(prev=>prev.map(s=>{
      if (s.year!==selYear) return s
      // Deep-copy to avoid mutating shared IMPORT reference
      const dt = JSON.parse(JSON.stringify(s.driverTeams||[]))
      const exists = dt.find(m=>m.driver===driver)
      const withDriver = exists ? dt : [...dt,{driver,team:'',overrides:[]}]
      const updated = withDriver.map(m=>{
        if (m.driver!==driver) return m
        const overrides = [...(m.overrides||[]),{from:parseInt(from),to:to?parseInt(to):null,team}]
        return {...m,overrides}
      })
      return {...s,driverTeams:updated}
    }))
  }

  function removeTeamOverride(driver, idx) {
    setSeasons(prev=>prev.map(s=>{
      if (s.year!==selYear) return s
      // Deep-copy to avoid mutating shared IMPORT reference
      const dt = JSON.parse(JSON.stringify(s.driverTeams||[]))
      const updated = dt.map(m=>{
        if (m.driver!==driver) return m
        return {...m,overrides:(m.overrides||[]).filter((_,i)=>i!==idx)}
      })
      return {...s,driverTeams:updated}
    }))
  }

  function updateTodo(idx, field, val) {
    setSeasons(prev=>prev.map(s=>{
      if (s.year!==selYear) return s
      const todo=[...s.todo]
      todo[idx]={...todo[idx],[field]:field==='raceCount'||field==='myPts'?(parseInt(val)||0):field==='pct'?(parseFloat(val)||null):val}
      return {...s,todo}
    }))
  }

  const sortedSeasons=[...seasons].sort((a,b)=>b.year-a.year)
  const sc=season?(STATUS[season.status]||STATUS['in-progress']):null

  // ── Final stats ─────────────────────────────────────────────
  const finalStats = useMemo(()=>{
    if (!season||!racesToDo.length) return null
    const snapshots = racesToDo.map(col=>{
      const colIdx=racesToDo.findIndex(t=>t.driver===col.driver)
      const seriesDone=racesToDo.slice(0,colIdx+1).map(t=>t.driver)
      const dPts={}
      season.results.forEach(r=>{
        if (!seriesDone.includes(r.driver)) return
        r.finishers.forEach((d,i)=>{if(d){if(!dPts[d])dPts[d]=0;dPts[d]+=calcPts(i+1,year)}})
      })
      return {afterDriver:col.driver,dPts}
    })
    return {todoOrder:racesToDo,snapshots}
  },[season,racesToDo,year])

  const allDrivers = liveDriverStandings.map(d=>d.driver)

  // ── All-seasons cross-comparison ─────────────────────────────
  const allSeasonsStats = useMemo(()=>{
    return seasons.map(s=>{
      const results = s.results||[]
      const yr = s.year
      // Total = sum of each driver's series race count; done = sum of their doneCount
      const todo = s.todo||[]
      const driverOrder = s.driverOrder||[]
      const doneCounts = {}
      driverOrder.forEach(d=>{doneCounts[d]=0})
      results.forEach(r=>{
        if (r.myPos!=null||r.myRetired) doneCounts[r.driver]=(doneCounts[r.driver]||0)+1
      })
      const total = todo.reduce((a,t)=>a+(t.raceCount??0),0)
      const doneCount = todo.reduce((a,t)=>a+(doneCounts[t.driver]??0),0)
      const retirements = results.filter(r=>r.myRetired).length
      const classified = doneCount - retirements

      const myPts = results.filter(r=>r.myPos!=null).reduce((a,r)=>a+calcPts(r.myPos,yr),0)
      const wins  = results.filter(r=>r.myPos===1).length
      const pods  = results.filter(r=>r.myPos&&r.myPos<=3).length

      // Build live standings for this season to find champ pos
      const pts = {}
      ;(s.driverOrder||[]).forEach(d=>{ pts[d]=0 })
      results.forEach(r=>{
        r.finishers.forEach((driver,i)=>{
          if (!driver) return
          if (!(driver in pts)) pts[driver]=0
          pts[driver]+=calcPts(i+1,yr)
        })
      })
      const sorted = Object.entries(pts).sort((a,b)=>b[1]-a[1])
      const champPos = sorted.filter(([,p])=>p>myPts).length+1
      // Only show champ/bestCpu once the season is fully complete
      const sDone = s.status==='complete' || ((s.todo||[]).length>0 && (s.todo||[]).every(t=>{
        const dc=(s.results||[]).filter(r=>(r.myPos!=null||r.myRetired)&&r.driver===t.driver).length
        return dc>=(t.raceCount||0)
      }))
      const champWinner = sDone ? (sorted[0]?.[0]||' - ') : ' - '

      // Best CPU driver  -  only when season complete
      // Use identical formula as Details tab: pct = myPts / liveChampPts * 100
      const todoWithPct = sDone ? (s.todo||[]).map(t=>{
        const lp = sorted.find(([d])=>d===t.driver)?.[1] ?? 0
        if (lp===0) return null
        const myPtsForDriver = t.pts!=null ? t.pts
          : results.filter(r=>r.driver===t.driver&&r.myPos!=null)
              .reduce((a,r)=>a+calcPts(r.myPos,yr),0)
        if (myPtsForDriver===0) return null
        const pct = parseFloat((myPtsForDriver/lp*100).toFixed(4))
        return { driver:t.driver, pct }
      }).filter(Boolean) : []
      todoWithPct.sort((a,b)=>a.pct-b.pct)
      const bestCpuDriver = sDone ? (todoWithPct[0]?.driver||' - ') : ' - '

      return {
        year:yr,
        total, done:doneCount, pctDone:total>0?Math.round(doneCount/total*100):0,
        myPts, wins, pods,
        pctWins:total>0?parseFloat((wins/total*100).toFixed(1)):0,
        pctPods:total>0?parseFloat((pods/total*100).toFixed(1)):0,
        classified, retirements,
        pctFinished:total>0?parseFloat((classified/total*100).toFixed(1)):0,
        pctRetired:total>0?parseFloat((retirements/total*100).toFixed(1)):0,
        champPos, champWinner, bestCpuDriver,
        status:s.status,
      }
    }).sort((a,b)=>a.year-b.year)
  },[seasons])

  return (
    <div>
      <PageHeader title="🏎️ F1 Sim Tracker" subtitle="Race as every driver · every season" />

      {/* Season pills */}
      <div style={{display:'flex',gap:'4px',flexWrap:'wrap',marginBottom:'14px',alignItems:'center'}}>
        <div style={{display:'flex',gap:'3px',flexWrap:'wrap',flex:1}}>
          <button onClick={()=>setSelYear(null)} style={{padding:'4px 9px',borderRadius:'20px',border:selYear===null?'1px solid var(--accent)':'1px solid var(--border)',background:selYear===null?'var(--accent-soft)':'transparent',color:selYear===null?'var(--accent)':'var(--text-secondary)',fontSize:'12px',fontWeight:selYear===null?700:400,cursor:'pointer'}}>
            📊 All seasons
          </button>
          {sortedSeasons.map(s=>{
            const active=s.year===selYear
            // A season is "done" if explicitly marked complete OR all drivers have finished their races
            const sRacesToDo = (s.todo||[]).map(t=>{
              const dc = (s.results||[]).filter(r=>(r.myPos!=null||r.myRetired)&&r.driver===t.driver).length
              return { totalRaces:t.raceCount||0, doneCount:dc }
            })
            const done = s.status==='complete' || (sRacesToDo.length>0 && sRacesToDo.every(t=>t.doneCount>=t.totalRaces))
            const prog = null // percentage removed from pills
            return (
              <button key={s.year} onClick={()=>setSelYear(s.year)} style={{padding:'4px 9px',borderRadius:'20px',border:active?'1px solid var(--accent)':'1px solid var(--border)',background:active?'var(--accent-soft)':'transparent',color:active?'var(--accent)':done?'var(--success)':'var(--text-secondary)',fontSize:'12px',fontWeight:active?700:400,cursor:'pointer'}}>
                {s.year}{done?' ✓':''}
              </button>
            )
          })}
        </div>
        {showAddSeason?(
          <div style={{display:'flex',gap:'4px'}}>
            <input value={newYear} onChange={e=>setNewYear(e.target.value)} placeholder="Year" style={{width:72}} onKeyDown={e=>e.key==='Enter'&&addSeason()} autoFocus />
            <Btn size="sm" onClick={addSeason}>Add</Btn>
            <Btn size="sm" variant="ghost" onClick={()=>setShowAddSeason(false)}>✕</Btn>
          </div>
        ):<Btn size="sm" variant="secondary" onClick={()=>setShowAddSeason(true)}><Plus size={12}/> Season</Btn>}
      </div>

      {/* ══ ALL SEASONS COMPARISON ══ */}
      {selYear===null&&(
        <div>
          <h2 style={{fontFamily:'var(--font-display)',fontSize:'18px',fontWeight:700,marginBottom:'16px'}}>Season-by-season comparison</h2>

          {/* Summary stat cards */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:'10px',marginBottom:'20px'}}>
            {[
              ['🏎️','Seasons tracked',allSeasonsStats.length,'var(--accent)'],
              ['🏆','Total wins',allSeasonsStats.reduce((a,s)=>a+s.wins,0),'#fbbf24'],
              ['🥉','Total podiums',allSeasonsStats.reduce((a,s)=>a+s.pods,0),'var(--accent)'],
              ['📋','Total races',allSeasonsStats.reduce((a,s)=>a+s.total,0),'var(--text-secondary)'],
            ].map(([em,label,val,color])=>(
              <Card key={label} style={{padding:'14px',textAlign:'center'}}>
                <p style={{fontSize:'20px',marginBottom:'4px'}}>{em}</p>
                <p style={{fontFamily:'var(--font-display)',fontSize:'20px',fontWeight:700,color,lineHeight:1}}>{val.toLocaleString()}</p>
                <p style={{fontSize:'11px',color:'var(--text-muted)',marginTop:'4px'}}>{label}</p>
              </Card>
            ))}
          </div>

          {/* Main comparison table */}
          <Card style={{padding:0,overflow:'hidden',marginBottom:'20px'}}>
            <div style={{overflowX:'auto'}}>
              <table style={{borderCollapse:'collapse',width:'100%',fontSize:'12px'}}>
                <thead>
                  <tr style={{background:'var(--bg-card)',borderBottom:'2px solid var(--border)'}}>
                    {['Year','Races','Done','% Done','Classified','% Cls','DNFs','Wins','% Won','Podiums','% Pods','My Pts','Champ Pos','Champ Winner','Best CPU Driver'].map(h=>(
                      <th key={h} style={{padding:'8px 10px',textAlign:h==='Year'||h==='Champ Winner'?'left':'center',color:'var(--text-muted)',fontWeight:600,whiteSpace:'nowrap'}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {allSeasonsStats.map((s,i)=>{
                    const ordSuffix=n=>n===1?'st':n===2?'nd':n===3?'rd':'th'
                    return (
                      <tr key={s.year} onClick={()=>setSelYear(s.year)} style={{borderBottom:'1px solid var(--border)',background:i%2===0?'var(--bg-card)':'var(--bg-input)',cursor:'pointer'}}
                        onMouseEnter={e=>e.currentTarget.style.background='var(--accent-soft)'}
                        onMouseLeave={e=>e.currentTarget.style.background=i%2===0?'var(--bg-card)':'var(--bg-input)'}
                      >
                        <td style={{padding:'7px 10px',fontFamily:'var(--font-display)',fontWeight:700,color:'var(--accent)'}}>{s.year}</td>
                        <td style={{padding:'7px 10px',textAlign:'center'}}>{s.total}</td>
                        <td style={{padding:'7px 10px',textAlign:'center',color:s.done===s.total&&s.total>0?'var(--success)':'var(--text-secondary)'}}>{s.done}</td>
                        <td style={{padding:'7px 10px',textAlign:'center'}}><span style={{background:s.pctDone>=100?'var(--success-soft)':s.pctDone>=50?'var(--accent-soft)':'transparent',color:s.pctDone>=100?'var(--success)':s.pctDone>=50?'var(--accent)':'var(--text-muted)',padding:'2px 6px',borderRadius:'4px',fontWeight:s.pctDone>=50?600:400}}>{s.pctDone}%</span></td>
                        <td style={{padding:'7px 10px',textAlign:'center',color:'var(--success)'}}>{s.classified}</td>
                        <td style={{padding:'7px 10px',textAlign:'center',color:'var(--text-secondary)'}}>{s.pctFinished}%</td>
                        <td style={{padding:'7px 10px',textAlign:'center',color:'var(--danger)'}}>{s.retirements}</td>
                        <td style={{padding:'7px 10px',textAlign:'center',fontFamily:'var(--font-display)',fontWeight:700,color:'#fbbf24'}}>{s.wins}</td>
                        <td style={{padding:'7px 10px',textAlign:'center',color:'var(--text-secondary)'}}>{s.pctWins}%</td>
                        <td style={{padding:'7px 10px',textAlign:'center',fontFamily:'var(--font-display)',fontWeight:600,color:'var(--accent)'}}>{s.pods}</td>
                        <td style={{padding:'7px 10px',textAlign:'center',color:'var(--text-secondary)'}}>{s.pctPods}%</td>
                        <td style={{padding:'7px 10px',textAlign:'center',fontFamily:'var(--font-display)',fontWeight:700}}>{s.myPts.toLocaleString()}</td>
                        <td style={{padding:'7px 10px',textAlign:'center'}}><span style={{fontFamily:'var(--font-display)',fontWeight:700,color:s.champPos===1?'#fbbf24':s.champPos<=3?'var(--accent)':'var(--text-secondary)'}}>{s.champPos}{ordSuffix(s.champPos)}</span></td>
                        <td style={{padding:'7px 10px',color:'var(--text-secondary)',whiteSpace:'nowrap'}}>{s.champWinner}</td>
                        <td style={{padding:'7px 10px',color:'var(--text-muted)',whiteSpace:'nowrap',fontSize:'11px'}}>{s.bestCpuDriver}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Mini bar charts for % Won and % Podiums */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px'}}>
            <Card>
              <h3 style={{fontFamily:'var(--font-display)',fontSize:'14px',fontWeight:600,marginBottom:'12px'}}>% Races Won per season</h3>
              {allSeasonsStats.map(s=>(
                <div key={s.year} style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'4px'}}>
                  <span style={{fontSize:'11px',fontFamily:'var(--font-display)',fontWeight:600,color:'var(--accent)',minWidth:36}}>{s.year}</span>
                  <div style={{flex:1,height:14,background:'var(--bg-badge)',borderRadius:3,overflow:'hidden'}}>
                    <div style={{height:'100%',width:`${Math.min(s.pctWins,100)}%`,background:'#fbbf24',borderRadius:3}}/>
                  </div>
                  <span style={{fontSize:'11px',color:'var(--text-muted)',minWidth:40,textAlign:'right'}}>{s.pctWins}%</span>
                </div>
              ))}
            </Card>
            <Card>
              <h3 style={{fontFamily:'var(--font-display)',fontSize:'14px',fontWeight:600,marginBottom:'12px'}}>% Podiums per season</h3>
              {allSeasonsStats.map(s=>(
                <div key={s.year} style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'4px'}}>
                  <span style={{fontSize:'11px',fontFamily:'var(--font-display)',fontWeight:600,color:'var(--accent)',minWidth:36}}>{s.year}</span>
                  <div style={{flex:1,height:14,background:'var(--bg-badge)',borderRadius:3,overflow:'hidden'}}>
                    <div style={{height:'100%',width:`${Math.min(s.pctPods,100)}%`,background:'var(--accent)',borderRadius:3}}/>
                  </div>
                  <span style={{fontSize:'11px',color:'var(--text-muted)',minWidth:40,textAlign:'right'}}>{s.pctPods}%</span>
                </div>
              ))}
            </Card>
          </div>
        </div>
      )}

      {/* Season info bar with progress */}
      {season&&(
        <div style={{marginBottom:'16px'}}>
          <div style={{display:'flex',alignItems:'center',gap:'10px',flexWrap:'wrap',marginBottom:!seasonComplete?'6px':'0'}}>
            <span style={{fontFamily:'var(--font-display)',fontSize:'20px',fontWeight:700}}>{year}</span>
            <span style={{fontSize:'12px',padding:'3px 10px',borderRadius:'20px',background:seasonComplete?'var(--success-soft)':sc.bg,color:seasonComplete?'var(--success)':sc.color,fontWeight:600}}>{seasonComplete?'Complete ✓':sc.label}</span>
            <span style={{fontSize:'13px',color:'var(--text-secondary)'}}>{season.driverOrder?.length} drivers · {season.circuits?.length} rounds · {getPtsTable(year).join('-')}</span>
            {!seasonComplete&&<span style={{fontSize:'13px',color:'var(--accent)',fontWeight:600}}>{seasonProgress}% complete</span>}
          </div>
          {!seasonComplete&&(
            <div style={{height:6,background:'var(--bg-badge)',borderRadius:3,overflow:'hidden',maxWidth:400}}>
              <div style={{height:'100%',width:`${seasonProgress}%`,background:'linear-gradient(90deg,var(--accent),#34d974)',borderRadius:3,transition:'width 0.4s'}}/>
            </div>
          )}
        </div>
      )}

      {/* Tabs  -  hidden in All Seasons view */}
      {selYear!==null&&(
      <div style={{display:'flex',gap:'6px',marginBottom:'20px'}}>
        {[['results','📋 Results'],['details','📊 Details'],['finalstats','🏆 Final Stats']].map(([id,label])=>(
          <Btn key={id} variant={tab===id?'primary':'secondary'} size="sm" onClick={()=>setTab(id)}>{label}</Btn>
        ))}
      </div>
      )}

      {/* ══ TAB 1: RESULTS ══ */}
      {tab==='results'&&season&&(
        <div style={{display:'grid',gridTemplateColumns:'1fr 300px',gap:'14px',alignItems:'start'}}>

          {/* Main results table */}
          <Card style={{padding:0,overflow:'hidden'}}>
            <div style={{padding:'10px 14px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'space-between',gap:'8px',flexWrap:'wrap'}}>
              <span style={{fontSize:'13px',fontWeight:600}}>{season.results.length} race entries</span>
              <div style={{display:'flex',gap:'6px'}}>
                <Btn size="sm" variant="secondary" onClick={openGenerate}>⚡ Generate race</Btn>
                <Btn size="sm" onClick={addNewResult}><Plus size={12}/> Add result</Btn>
              </div>
            </div>

            {/* Bulk generate form */}
            {generateRace&&(
              <div style={{padding:'14px',borderBottom:'1px solid var(--border)',background:'var(--bg-input)'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px'}}>
                  <p style={{fontSize:'13px',fontWeight:600}}>⚡ Generate race rows</p>
                  <button onClick={()=>setGenerateRace(false)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)'}}><X size={14}/></button>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px'}}>

                  {/* Drivers */}
                  <div>
                    <p style={{fontSize:'11px',fontWeight:600,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:'6px'}}>Drivers</p>
                    <div style={{display:'flex',gap:'4px',marginBottom:'6px'}}>
                      <div style={{flex:1}}>
                        <input value={genDriverInput.driver} onChange={e=>setGenDriverInput(p=>({...p,driver:e.target.value}))}
                          placeholder="Driver name" style={{width:'100%',fontSize:'12px',marginBottom:'4px'}}
                          onKeyDown={e=>e.key==='Enter'&&addGenDriver()}/>
                        <input value={genDriverInput.constructor} onChange={e=>setGenDriverInput(p=>({...p,constructor:e.target.value}))}
                          placeholder="Constructor (optional)" style={{width:'100%',fontSize:'12px'}}
                          onKeyDown={e=>e.key==='Enter'&&addGenDriver()}/>
                      </div>
                      <button onClick={addGenDriver} disabled={!genDriverInput.driver.trim()}
                        style={{alignSelf:'stretch',padding:'0 10px',background:'var(--accent)',color:'#fff',border:'none',borderRadius:'var(--radius-sm)',cursor:'pointer',fontSize:'16px',flexShrink:0}}>+</button>
                    </div>
                    <div style={{display:'flex',flexDirection:'column',gap:'3px',maxHeight:160,overflowY:'auto'}}>
                      {genDrivers.map((d,i)=>(
                        <div key={i} style={{display:'flex',alignItems:'center',gap:'6px',padding:'4px 8px',background:'var(--bg-card)',borderRadius:'var(--radius-sm)',fontSize:'12px'}}>
                          <span style={{flex:1}}>{d.driver}{d.constructor&&<span style={{color:'var(--text-muted)'}}> · {d.constructor}</span>}</span>
                          <button onClick={()=>setGenDrivers(prev=>prev.filter((_,j)=>j!==i))}
                            style={{background:'none',border:'none',cursor:'pointer',color:'var(--danger)',fontSize:'14px',lineHeight:1,padding:'0 2px'}}>×</button>
                        </div>
                      ))}
                      {!genDrivers.length&&<p style={{fontSize:'11px',color:'var(--text-muted)',fontStyle:'italic'}}>No drivers added yet</p>}
                    </div>
                  </div>

                  {/* Races */}
                  <div>
                    <p style={{fontSize:'11px',fontWeight:600,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:'6px'}}>Races</p>
                    <div style={{display:'flex',gap:'4px',marginBottom:'6px'}}>
                      <div style={{flex:1}}>
                        <input type="number" value={genRaceInput.raceNum} onChange={e=>setGenRaceInput(p=>({...p,raceNum:e.target.value}))}
                          placeholder="Race #" style={{width:'100%',fontSize:'12px',marginBottom:'4px'}}
                          onKeyDown={e=>e.key==='Enter'&&addGenRace()}/>
                        <input value={genRaceInput.circuit} onChange={e=>setGenRaceInput(p=>({...p,circuit:e.target.value}))}
                          placeholder="Circuit name" style={{width:'100%',fontSize:'12px'}}
                          onKeyDown={e=>e.key==='Enter'&&addGenRace()}/>
                      </div>
                      <button onClick={addGenRace} disabled={!genRaceInput.raceNum||!genRaceInput.circuit.trim()}
                        style={{alignSelf:'stretch',padding:'0 10px',background:'var(--accent)',color:'#fff',border:'none',borderRadius:'var(--radius-sm)',cursor:'pointer',fontSize:'16px',flexShrink:0}}>+</button>
                    </div>
                    <div style={{display:'flex',flexDirection:'column',gap:'3px',maxHeight:160,overflowY:'auto'}}>
                      {genRaces.map((r,i)=>(
                        <div key={i} style={{display:'flex',alignItems:'center',gap:'6px',padding:'4px 8px',background:'var(--bg-card)',borderRadius:'var(--radius-sm)',fontSize:'12px'}}>
                          <span style={{flex:1}}>R{r.raceNum} · {r.circuit}</span>
                          <button onClick={()=>setGenRaces(prev=>prev.filter((_,j)=>j!==i))}
                            style={{background:'none',border:'none',cursor:'pointer',color:'var(--danger)',fontSize:'14px',lineHeight:1,padding:'0 2px'}}>×</button>
                        </div>
                      ))}
                      {!genRaces.length&&<p style={{fontSize:'11px',color:'var(--text-muted)',fontStyle:'italic'}}>No races added yet</p>}
                    </div>
                  </div>
                </div>

                <div style={{marginTop:'12px',display:'flex',alignItems:'center',gap:'10px'}}>
                  <Btn onClick={bulkGenerateRace} disabled={!genDrivers.length||!genRaces.length}>
                    Generate {genDrivers.length>0&&genRaces.length>0?`${genDrivers.length * genRaces.length} rows`:''}
                  </Btn>
                  <span style={{fontSize:'12px',color:'var(--text-muted)'}}>
                    {genDrivers.length} driver{genDrivers.length!==1?'s':''} × {genRaces.length} race{genRaces.length!==1?'s':''}
                    {genDrivers.length>0&&genRaces.length>0&&` = ${genDrivers.length*genRaces.length} rows`}
                  </span>
                </div>
              </div>
            )}

            {/* New result form */}
            {editKey==='NEW|||0'&&(
              <div style={{padding:'14px',borderBottom:'1px solid var(--accent-border)',background:'var(--accent-soft)'}}>
                <p style={{fontSize:'13px',fontWeight:600,marginBottom:'10px'}}>Add new race result</p>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))',gap:'8px',marginBottom:'10px'}}>
                  <div><label style={{fontSize:'11px',color:'var(--text-muted)',display:'block',marginBottom:'2px'}}>Driver</label>
                    <input value={editState.driver||''} onChange={e=>setEditState(s=>({...s,driver:e.target.value}))} placeholder="Driver name" />
                  </div>
                  <div><label style={{fontSize:'11px',color:'var(--text-muted)',display:'block',marginBottom:'2px'}}>Race #</label>
                    <input type="number" value={editState.raceNum||''} onChange={e=>setEditState(s=>({...s,raceNum:e.target.value}))} placeholder="1" />
                  </div>
                  <div><label style={{fontSize:'11px',color:'var(--text-muted)',display:'block',marginBottom:'2px'}}>Circuit</label>
                    <input value={editState.circuit||''} onChange={e=>setEditState(s=>({...s,circuit:e.target.value}))} placeholder="e.g. Bahrain" />
                  </div>
                  <div><label style={{fontSize:'11px',color:'var(--text-muted)',display:'block',marginBottom:'2px'}}>My Position</label>
                    <input type="number" min="1" max="26" value={editState.myPos||''} onChange={e=>setEditState(s=>({...s,myPos:e.target.value}))} placeholder="1" />
                  </div>
                  {season.flPoint&&<div><label style={{fontSize:'11px',color:'var(--text-muted)',display:'block',marginBottom:'2px'}}>Fastest Lap</label>
                    <input value={editState.fl||''} onChange={e=>setEditState(s=>({...s,fl:e.target.value}))} placeholder="Driver name" />
                  </div>}
                  <label style={{display:'flex',alignItems:'center',gap:'6px',fontSize:'12px',cursor:'pointer',alignSelf:'flex-end',paddingBottom:6}}>
                    <input type="checkbox" checked={!!editState.rain} onChange={e=>setEditState(s=>({...s,rain:e.target.checked}))} style={{width:'auto',accentColor:'var(--accent)'}}/> 🌧️ Rain
                  </label>
                </div>
                <div style={{marginBottom:'10px'}}>
                  <label style={{fontSize:'11px',color:'var(--text-muted)',display:'block',marginBottom:'6px'}}>Points finishers ({posCount === 6?'top 6 classic':'top '+posCount})</label>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))',gap:'5px'}}>
                    {Array.from({length:posCount}).map((_,i)=>(
                      <div key={i}>
                        <label style={{fontSize:'10px',color:'var(--text-muted)',display:'block',marginBottom:'2px'}}>{posLabel(i+1)}</label>
                        <select value={(editState.finishers||[])[i]||''} onChange={e=>{const f=[...(editState.finishers||Array(posCount).fill(''))];f[i]=e.target.value;setEditState(s=>({...s,finishers:f}))}} style={{fontSize:'11px',padding:'3px 6px',width:'100%'}}>
                          <option value=""> - </option>
                          {(season.driverOrder||[]).map(d=><option key={d} value={d}>{d}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{display:'flex',gap:'6px'}}>
                  <Btn onClick={saveNewResult}><Check size={13}/> Save</Btn>
                  <Btn variant="ghost" onClick={()=>setEditKey(null)}>Cancel</Btn>
                </div>
              </div>
            )}

            <div style={{overflowX:'auto',maxHeight:'70vh',overflowY:'auto'}}>
              <table style={{borderCollapse:'collapse',width:'100%',fontSize:'12px'}}>
                <thead style={{position:'sticky',top:0,zIndex:3}}>
                  <tr style={{background:'var(--bg-card)',borderBottom:'2px solid var(--border)'}}>
                    <th style={{padding:'4px 4px',textAlign:'center',width:24,color:'var(--text-muted)',fontWeight:600,position:'sticky',left:0,background:'var(--bg-card)',zIndex:4,fontSize:'10px'}}>#</th>
                    <th style={{padding:'4px 4px',textAlign:'left',width:55,color:'var(--text-muted)',fontWeight:600,position:'sticky',left:24,background:'var(--bg-card)',zIndex:4,fontSize:'10px'}}>Circuit</th>
                    <th style={{padding:'4px 4px',textAlign:'left',width:80,color:'var(--text-muted)',fontWeight:600,position:'sticky',left:79,background:'var(--bg-card)',zIndex:4,fontSize:'10px'}}>Driver</th>
                    {Array.from({length:posCount}).map((_,i)=>(
                      <th key={i} style={{padding:'7px 3px',textAlign:'center',width:30,color:i<3?medalColor(i+1):'var(--text-muted)',fontWeight:600,fontSize:'10px'}}>{i+1}{i===0?'st':i===1?'nd':i===2?'rd':'th'}</th>
                    ))}
                    {season.flPoint&&<th style={{padding:'7px 3px',textAlign:'center',width:34,color:'var(--accent)',fontWeight:600,fontSize:'10px'}}>FL</th>}
                    <th style={{padding:'7px 6px',textAlign:'center',width:38,color:'var(--success)',fontWeight:600,fontSize:'11px'}}>Pos</th>
                    <th style={{padding:'7px 3px',textAlign:'center',width:26,color:'#60a5fa',fontWeight:600,fontSize:'10px'}}>🌧</th>
                    <th style={{padding:'7px 4px',textAlign:'center',width:32,color:'var(--text-muted)',fontWeight:500,fontSize:'10px'}}>Edit</th>
                  </tr>
                </thead>
                <tbody>
                  {season.results.map((r,ri)=>{
                    const key=`${r.driver}|||${r.raceNum}`
                    const isEditing=editKey===key
                    const mc=medalColor(r.myPos)
                    const rowBg=ri%2===0?'var(--bg-card)':'var(--bg-input)'
                    if (isEditing) return (
                      <tr key={key} style={{background:'var(--accent-soft)',borderBottom:'1px solid var(--accent-border)'}}>
                        <td colSpan={4+posCount+(season.flPoint?1:0)} style={{padding:'12px 14px'}}>
                          <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
                            <div style={{fontWeight:600,fontSize:'13px',display:'flex',alignItems:'center',gap:'12px',flexWrap:'wrap'}}>
                              <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
                                <label style={{fontSize:'11px',color:'var(--text-muted)',fontWeight:400}}>Driver</label>
                                <input value={editState.driver??r.driver} onChange={e=>setEditState(s=>({...s,driver:e.target.value}))}
                                  style={{width:160,fontSize:'12px',padding:'3px 6px'}}/>
                              </div>
                              <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
                                <label style={{fontSize:'11px',color:'var(--text-muted)',fontWeight:400}}>Race #</label>
                                <input type="number" value={editState.raceNum??r.raceNum} onChange={e=>setEditState(s=>({...s,raceNum:e.target.value}))}
                                  style={{width:56,fontSize:'12px',padding:'3px 6px'}}/>
                              </div>
                              <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
                                <label style={{fontSize:'11px',color:'var(--text-muted)',fontWeight:400}}>Circuit</label>
                                <input value={editState.circuit||''} onChange={e=>setEditState(s=>({...s,circuit:e.target.value}))}
                                  style={{width:120,fontSize:'12px',padding:'3px 6px'}}/>
                              </div>
                            </div>
                            <div>
                              <label style={{fontSize:'11px',color:'var(--text-muted)',display:'block',marginBottom:'6px',fontWeight:600}}>POINTS FINISHERS</label>
                              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))',gap:'5px'}}>
                                {Array.from({length:posCount}).map((_,i)=>(
                                  <div key={i}>
                                    <label style={{fontSize:'10px',color:'var(--text-muted)',display:'block',marginBottom:'2px'}}>{posLabel(i+1)}</label>
                                    <select value={(editState.finishers||[])[i]||''} onChange={e=>{const f=[...(editState.finishers||Array(posCount).fill(''))];f[i]=e.target.value;setEditState(s=>({...s,finishers:f}))}} style={{fontSize:'11px',padding:'3px 6px',width:'100%'}}>
                                      <option value=""> - </option>
                                      {(season.driverOrder||[]).map(d=><option key={d} value={d}>{d}</option>)}
                                    </select>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div style={{display:'flex',gap:'8px',flexWrap:'wrap',alignItems:'flex-end'}}>
                              <div><label style={{fontSize:'11px',color:'var(--text-muted)',display:'block',marginBottom:'2px'}}>MY POSITION</label>
                                <input type="number" min="1" max="26" value={editState.myPos} onChange={e=>setEditState(s=>({...s,myPos:e.target.value}))} style={{width:60,fontSize:'12px',padding:'4px 8px'}} autoFocus />
                              </div>
                              {season.flPoint&&<div><label style={{fontSize:'11px',color:'var(--text-muted)',display:'block',marginBottom:'2px'}}>FASTEST LAP</label>
                                <select value={editState.fl||''} onChange={e=>setEditState(s=>({...s,fl:e.target.value}))} style={{width:160,fontSize:'12px',padding:'4px 8px'}}>
                                  <option value=""> - </option>
                                  {(season.driverOrder||[]).map(d=><option key={d} value={d}>{d}</option>)}
                                </select>
                              </div>}
                              <label style={{display:'flex',alignItems:'center',gap:'6px',fontSize:'12px',cursor:'pointer',marginBottom:2}}>
                                <input type="checkbox" checked={editState.rain} onChange={e=>setEditState(s=>({...s,rain:e.target.checked}))} style={{width:'auto',accentColor:'var(--accent)'}}/> 🌧️ Rain
                                <label style={{display:'flex',alignItems:'center',gap:'4px',cursor:'pointer',marginLeft:8}}><input type="checkbox" checked={!!editState.myRetired} onChange={e=>setEditState(s=>({...s,myRetired:e.target.checked}))} style={{width:'auto',accentColor:'var(--danger)'}}/> <span style={{fontSize:'12px'}}>💥 Retired</span></label>
                              </label>
                              <Btn onClick={()=>saveResult(r.driver,r.raceNum)}><Check size={13}/> Save</Btn>
                              <Btn variant="ghost" onClick={()=>setEditKey(null)}>Cancel</Btn>
                              <Btn variant="ghost" onClick={()=>deleteResult(r.driver,r.raceNum)} style={{color:'var(--danger)',marginLeft:'auto'}}>🗑 Delete row</Btn>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )
                    return (
                      <tr key={key} style={{borderBottom:'1px solid var(--border)',background:rowBg}}>
                        <td style={{padding:'4px 4px',textAlign:'center',color:'var(--text-muted)',fontSize:'10px',position:'sticky',left:0,background:rowBg,zIndex:1,width:24}}>{r.raceNum}</td>
                        <td style={{padding:'5px 8px',fontSize:'12px',fontWeight:500,position:'sticky',left:24,background:rowBg,zIndex:1,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',maxWidth:55}}>{r.circuit}</td>
                        <td style={{padding:'5px 8px',fontSize:'12px',fontWeight:500,position:'sticky',left:79,background:rowBg,zIndex:1,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',maxWidth:80}}>{r.driver}</td>
                        {Array.from({length:posCount}).map((_,i)=>{
                          const f=r.finishers[i]||''
                          return <td key={i} style={{padding:'5px 2px',textAlign:'center',fontSize:'10px',color:medalColor(i+1)||'var(--text-secondary)',fontWeight:i<3?600:400,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',maxWidth:30}} title={f}>{f?shortName(f):''}</td>
                        })}
                        {season.flPoint&&<td style={{padding:'5px 2px',textAlign:'center',fontSize:'10px',color:'var(--accent)'}} title={r.fl||''}>{r.fl?shortName(r.fl):''}</td>}
                        <td style={{padding:'5px 6px',textAlign:'center',fontWeight:700,color:mc||'var(--text-secondary)',fontFamily:'var(--font-display)',fontSize:'12px'}}>
                          {r.myRetired?<span style={{color:'var(--danger)',fontSize:'11px'}}>💥</span>:r.myPos?<span style={{color:mc||'var(--text-secondary)'}}>{r.myPos}</span>:<span style={{color:'var(--border)',fontSize:'10px'}}> - </span>}
                        </td>
                        <td style={{padding:'5px 3px',textAlign:'center',fontSize:'11px'}}>{r.rain?'🌧':''}</td>
                        <td style={{padding:'5px 4px',textAlign:'center'}}>
                          <button onClick={()=>startEdit(r)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)',padding:'2px'}}><Pencil size={12}/></button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Right panel: all 3 tables stacked, 30% width */}
          <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>

            {/* Drivers Championship */}
            <Card style={{padding:'12px',height:294,display:'flex',flexDirection:'column'}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'8px',flexShrink:0}}>
                <p style={{fontSize:'11px',fontWeight:600,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.06em'}}>🏆 Drivers Championship</p>
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:'3px',flex:1,overflowY:'auto'}}>
                {liveDriverStandings.map((d,i)=>(()=>{
                    const leader = liveDriverStandings[0]?.pts??0
                    const gap = leader - d.pts
                    const canWin = gap <= seasonPtsLeft
                    return (
                      <div key={d.driver} style={{display:'flex',alignItems:'center',gap:'4px',padding:'3px 6px',borderRadius:'var(--radius-sm)',background:i===0?'var(--warning-soft)':'transparent'}}>
                        <span style={{fontSize:'11px',fontWeight:700,color:i===0?'#fbbf24':i<3?medalColor(i+1):'var(--text-muted)',minWidth:16,fontFamily:'var(--font-display)'}}>{i+1}</span>
                        <span style={{fontSize:'11px',flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{d.driver}</span>
                        {!seasonComplete&&i>0&&<span
                          title={canWin?'Can still win championship':'Cannot win championship'}
                          style={{fontSize:'8px',fontWeight:700,padding:'1px 3px',borderRadius:3,background:canWin?'#16a34a':'#dc2626',color:'#fff',flexShrink:0,cursor:'default',minWidth:14,textAlign:'center',display:'inline-block'}}
                        >{canWin?'✓':'✗'}</span>}
                        <span style={{fontSize:'11px',fontWeight:700,color:i===0?'#fbbf24':'var(--text-secondary)',fontFamily:'var(--font-display)',minWidth:30,textAlign:'right'}}>{d.pts}</span>
                      </div>
                    )
                  })()
                )}
              </div>
            </Card>

            {/* Constructors Championship  -  editable */}
            <Card style={{padding:'12px',height:294,display:'flex',flexDirection:'column'}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'8px',flexShrink:0}}>
                <p style={{fontSize:'11px',fontWeight:600,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.06em'}}>🏗️ Constructors</p>
                <button onClick={()=>setEditCon(e=>!e)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)',padding:'2px'}}><Pencil size={12}/></button>
              </div>
              {editCon?(
                <div style={{display:'flex',flexDirection:'column',gap:'4px',flex:1,overflowY:'auto'}}>
                  {(season.conStandings||[]).map((c,i)=>(
                    <div key={i} style={{display:'flex',gap:'4px',alignItems:'center'}}>
                      <input value={c.team} onChange={e=>updateConStandings(i,'team',e.target.value)} style={{flex:1,fontSize:'11px',padding:'3px 6px'}} placeholder="Team" />
                      <input type="number" value={c.pts} onChange={e=>updateConStandings(i,'pts',e.target.value)} style={{width:52,fontSize:'11px',padding:'3px 6px'}} />
                      <button onClick={()=>removeConRow(i)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--danger)',padding:'2px'}}><Trash2 size={11}/></button>
                    </div>
                  ))}
                  <Btn size="sm" onClick={addConRow} style={{marginTop:'4px'}}><Plus size={11}/> Add team</Btn>
                </div>
              ):(
                <div style={{display:'flex',flexDirection:'column',gap:'3px',flex:1,overflowY:'auto'}}>
                  {(season.conStandings||[]).map((c,i)=>(()=>{
                      const conLeader = (season.conStandings||[])[0]?.pts??0
                      const conGap = conLeader - c.pts
                      const conPtsLeft = seasonPtsLeft * 2
                      const canWinCon = conGap <= conPtsLeft
                      return (
                        <div key={c.team} style={{display:'flex',alignItems:'center',gap:'4px',padding:'3px 6px',borderRadius:'var(--radius-sm)',background:i===0?'rgba(249,115,22,0.1)':'transparent'}}>
                          <span style={{fontSize:'11px',fontWeight:700,color:i===0?'#f97316':'var(--text-muted)',minWidth:16,fontFamily:'var(--font-display)'}}>{i+1}</span>
                          <span style={{fontSize:'11px',flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{c.team}</span>
                          {!seasonComplete&&i>0&&<span
                            title={canWinCon?'Can still win championship':'Cannot win championship'}
                            style={{fontSize:'8px',fontWeight:700,padding:'1px 3px',borderRadius:3,background:canWinCon?'#16a34a':'#dc2626',color:'#fff',flexShrink:0,cursor:'default',minWidth:14,textAlign:'center',display:'inline-block'}}
                          >{canWinCon?'✓':'✗'}</span>}
                          <span style={{fontSize:'11px',fontWeight:700,color:i===0?'#f97316':'var(--text-secondary)',fontFamily:'var(--font-display)',minWidth:30,textAlign:'right'}}>{c.pts}</span>
                        </div>
                      )
                    })()
                  )}
                </div>
              )}
            </Card>

            {/* Driver→Team mapping */}
            <Card style={{padding:'12px',border:'1px solid var(--border)'}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:showTeams?'10px':'0'}}>
                <p style={{fontSize:'11px',fontWeight:600,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.06em'}}>🏗️ Driver Teams</p>
                <div style={{display:'flex',gap:'6px',alignItems:'center'}}>
                  {showTeams&&(
                    <>
                      <button onClick={()=>setSeasons(prev=>prev.map(s=>s.year!==selYear?s:{...s,autoConUpdate:!s.autoConUpdate}))}
                        style={{fontSize:'10px',padding:'2px 8px',background:season.autoConUpdate?'var(--success-soft)':'var(--bg-input)',border:`1px solid ${season.autoConUpdate?'var(--success)':'var(--border)'}`,borderRadius:'var(--radius-sm)',cursor:'pointer',color:season.autoConUpdate?'var(--success)':'var(--text-muted)',fontWeight:600}}>
                        {season.autoConUpdate?'🔄 Auto ON':'🔄 Auto OFF'}
                      </button>
                      <button onClick={autoUpdateConstructors} style={{fontSize:'10px',padding:'2px 8px',background:'var(--accent-soft)',border:'1px solid var(--accent-border)',borderRadius:'var(--radius-sm)',cursor:'pointer',color:'var(--accent)',fontWeight:600}}>⚡ Update now</button>
                    </>
                  )}
                  <button onClick={()=>setShowTeams(s=>!s)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)',padding:'2px',fontSize:'11px'}}>{showTeams?'▲':'▼'}</button>
                </div>
              </div>
              {showTeams&&(
                <div style={{display:'flex',flexDirection:'column',gap:'6px',maxHeight:260,overflowY:'auto'}}>
                  <p style={{fontSize:'11px',color:'var(--text-muted)',marginBottom:'4px'}}>Set each driver's team. Add overrides for race-specific assignments (e.g. Bearman for Ferrari in R3, Haas in R8).</p>
                  {(season.driverOrder||[]).map(driver=>{
                    const validDrivers = new Set(season.driverOrder||[])
                    const mapping = (season.driverTeams||[]).filter(m=>validDrivers.has(m.driver)).find(m=>m.driver===driver)||{driver,team:'',overrides:[]}
                    return (
                      <div key={driver} style={{background:'var(--bg-input)',borderRadius:'var(--radius-sm)',padding:'6px 8px'}}>
                        <div style={{display:'flex',alignItems:'center',gap:'6px',marginBottom:mapping.overrides?.length?'5px':'0'}}>
                          <span style={{fontSize:'11px',flex:1,fontWeight:500}}>{driver}</span>
                          <input value={mapping.team||''} onChange={e=>setDriverTeam(driver,e.target.value)} placeholder="Team name" style={{width:120,fontSize:'11px',padding:'2px 5px'}}/>
                          <button onClick={()=>{
                            const of = overrideForm
                            if (!of[driver+'_from']) return
                            addTeamOverride(driver,of[driver+'_from'],of[driver+'_to'],of[driver+'_team']||mapping.team)
                            setOverrideForm(f=>({...f,[driver+'_from']:'',[driver+'_to']:'',[driver+'_team']:''}))
                          }} title="Add race override" style={{background:'none',border:'1px solid var(--border)',borderRadius:3,cursor:'pointer',color:'var(--accent)',fontSize:'11px',padding:'2px 5px'}}>+</button>
                        </div>
                        {(mapping.overrides||[]).map((o,oi)=>(
                          <div key={oi} style={{display:'flex',alignItems:'center',gap:'4px',fontSize:'10px',color:'var(--text-muted)',marginTop:'3px',paddingLeft:'4px'}}>
                            <span>R{o.from}{o.to&&o.to!==o.from?` - R${o.to}`:''}: <strong style={{color:'var(--accent)'}}>{o.team}</strong></span>
                            <button onClick={()=>removeTeamOverride(driver,oi)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--danger)',padding:'0 2px',fontSize:'11px'}}>✕</button>
                          </div>
                        ))}
                        <div style={{display:'flex',gap:'3px',marginTop:'3px'}}>
                          <input value={overrideForm[driver+'_from']||''} onChange={e=>setOverrideForm(f=>({...f,[driver+'_from']:e.target.value}))} placeholder="R from" style={{width:48,fontSize:'10px',padding:'1px 3px'}} title="Race from"/>
                          <input value={overrideForm[driver+'_to']||''} onChange={e=>setOverrideForm(f=>({...f,[driver+'_to']:e.target.value}))} placeholder="R to" style={{width:40,fontSize:'10px',padding:'1px 3px'}} title="Race to (optional)"/>
                          <input value={overrideForm[driver+'_team']||''} onChange={e=>setOverrideForm(f=>({...f,[driver+'_team']:e.target.value}))} placeholder="Team" style={{width:80,fontSize:'10px',padding:'1px 3px'}} title="Override team"/>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </Card>

            {/* Races To Do  -  editable */}
            <Card style={{padding:'12px',height:294,display:'flex',flexDirection:'column'}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'8px',flexShrink:0}}>
                <p style={{fontSize:'11px',fontWeight:600,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.06em'}}>📋 Races To Do</p>
                {editTodo
                  ? <button onClick={finishEditTodo} style={{background:'var(--accent)',border:'none',cursor:'pointer',color:'#fff',padding:'2px 8px',borderRadius:'var(--radius-sm)',fontSize:'11px',fontWeight:600}}>✓ Done</button>
                  : <button onClick={startEditTodo} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)',padding:'2px'}}><Pencil size={12}/></button>
                }
              </div>
              {editTodo?(
                <div style={{display:'flex',flexDirection:'column',gap:'4px',flex:1,overflowY:'auto'}}>
                  <p style={{fontSize:'11px',color:'var(--text-muted)',marginBottom:'4px'}}>↑↓ to reorder · edit counts &amp; status · ✓ Done to save</p>
                  {editTodoList.map((t,i)=>(
                    <div key={i} style={{display:'flex',gap:'3px',alignItems:'center',background:'var(--bg-input)',borderRadius:'var(--radius-sm)',padding:'2px 4px'}}>
                      <div style={{display:'flex',flexDirection:'column',gap:'1px',flexShrink:0}}>
                        <button
                          onClick={()=>reorderTodo(i,i-1)}
                          disabled={i===0}
                          style={{background:'none',border:'none',cursor:i===0?'not-allowed':'pointer',color:i===0?'var(--border)':'var(--accent)',padding:'0 3px',fontSize:'10px',lineHeight:1}}
                        >▲</button>
                        <button
                          onClick={()=>reorderTodo(i,i+1)}
                          disabled={i===editTodoList.length-1}
                          style={{background:'none',border:'none',cursor:i===editTodoList.length-1?'not-allowed':'pointer',color:i===editTodoList.length-1?'var(--border)':'var(--accent)',padding:'0 3px',fontSize:'10px',lineHeight:1}}
                        >▼</button>
                      </div>
                      <span style={{fontSize:'11px',flex:1,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{t.driver}</span>
                      <input type="number" value={t.raceCount??''} onChange={e=>updateTodo(t.origIdx,'raceCount',e.target.value)} style={{width:40,fontSize:'11px',padding:'2px 4px'}} title="Race count" />
                      <select value={t.marker||''} onChange={e=>updateTodo(t.origIdx,'marker',e.target.value||null)} style={{fontSize:'11px',padding:'2px 4px',width:52}}>
                        <option value=""> - </option>
                        <option value="y">y</option>
                        <option value="ip">ip</option>
                      </select>
                      <button onClick={()=>setSeasons(prev=>prev.map(s=>s.year!==selYear?s:{...s,todo:(s.todo||[]).filter((_,j)=>j!==t.origIdx)}))} style={{background:'none',border:'none',cursor:'pointer',color:'var(--danger)',padding:'2px'}}><Trash2 size={11}/></button>
                    </div>
                  ))}
                </div>
              ):(
                <div style={{display:'flex',flexDirection:'column',gap:'2px',flex:1,overflowY:'auto'}}>
                  {racesToDo.map((t,i)=>{
                    const allDone=t.marker==='y'
                    const inProgress=t.marker==='ip'
                    return (
                      <div key={t.driver} style={{display:'flex',alignItems:'center',gap:'6px',padding:'4px 6px',borderRadius:'var(--radius-sm)',background:allDone?'var(--success-soft)':inProgress?'var(--accent-soft)':'transparent',opacity:allDone?0.65:1}}>
                        <span style={{fontSize:'10px',color:'var(--text-muted)',minWidth:16,fontWeight:600}}>{i+1}</span>
                        <span style={{fontSize:'12px',flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t.driver}</span>
                        <span style={{fontSize:'11px',fontWeight:600,color:allDone?'var(--success)':inProgress?'var(--accent)':t.doneCount>0?'var(--warning)':'var(--text-muted)',whiteSpace:'nowrap'}}>
                          {allDone?`✓ ${t.doneCount}/${t.totalRaces}`:inProgress?`ip ${t.doneCount}/${t.totalRaces}`:`${t.doneCount}/${t.totalRaces}`}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* ══ TAB 2: DETAILS ══ */}
      {tab==='details'&&season&&(
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px'}}>
          <Card style={{display:'flex',flexDirection:'column',maxHeight:600}}>
            <h3 style={{fontFamily:'var(--font-display)',fontSize:'15px',fontWeight:600,marginBottom:'14px',flexShrink:0}}>Driver series stats</h3>
            <div style={{overflowY:'auto',flex:1}}>
            <table style={{borderCollapse:'collapse',width:'100%',fontSize:'12px'}}>
              <thead>
                <tr style={{borderBottom:'2px solid var(--border)'}}>
                  {['#','Driver','Races','Done','My Pts','Total Pts','%'].map(h=>(
                    <th key={h} style={{padding:'6px 8px',textAlign:['#','Driver'].includes(h)?'left':'center',color:'var(--text-muted)',fontWeight:600,whiteSpace:'nowrap'}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(()=>{
                  const rows = racesToDo.map(t=>{
                    const lp = liveDriverStandings.find(d=>d.driver===t.driver)?.pts??0
                    // If myPts null (user-played driver), compute from their actual result rows
                    const computedMy = t.myPts!=null ? t.myPts :
                      season.results
                        .filter(r=>r.driver===t.driver&&r.myPos!=null)
                        .reduce((a,r)=>a+calcPts(r.myPos,year),0)
                    const effectiveMy = computedMy
                    const pct = lp>0 ? parseFloat((effectiveMy/lp*100).toFixed(2)) : (effectiveMy===0?100:null)
                    return {...t, lp, effectiveMy, pctVal: pct}
                  })
                  // Sort: lowest % first, null ( - ) treated as highest (end of list)
                  rows.sort((a,b)=>{
                    if (a.pctVal===null && b.pctVal===null) return 0
                    if (a.pctVal===null) return 1
                    if (b.pctVal===null) return -1
                    return a.pctVal - b.pctVal
                  })
                  return rows.map((t,i)=>{
                  const lp=t.lp
                  return (
                    <tr key={t.driver} style={{borderBottom:'1px solid var(--border)',background:i%2===0?'transparent':'var(--bg-input)'}}>
                      <td style={{padding:'6px 8px',fontFamily:'var(--font-display)',fontWeight:700,color:'var(--text-muted)'}}>{i+1}</td>
                      <td style={{padding:'6px 8px',fontWeight:500}}>{t.driver}</td>
                      <td style={{padding:'6px 8px',textAlign:'center',color:'var(--text-secondary)'}}>{t.totalRaces}</td>
                      <td style={{padding:'6px 8px',textAlign:'center',color:t.doneCount===t.totalRaces&&t.totalRaces>0?'var(--success)':'var(--text-secondary)'}}>{t.doneCount}</td>
                      <td style={{padding:'6px 8px',textAlign:'center',color:'var(--text-secondary)'}}>{t.effectiveMy??' - '}</td>
                      <td style={{padding:'6px 8px',textAlign:'center',fontWeight:700,color:'var(--accent)',fontFamily:'var(--font-display)'}}>{lp!=null?lp:' - '}</td>
                      <td style={{padding:'6px 8px',textAlign:'center'}}>{t.pctVal!=null?<span style={{fontWeight:700,color:t.pctVal>=100?'#fbbf24':t.pctVal>=50?'var(--success)':'var(--text-secondary)'}}>{t.pctVal}%</span>:' - '}</td>
                    </tr>
                  )
                  })})()
                }
              </tbody>
            </table>
            </div>
          </Card>

          <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
            <Card>
              <h3 style={{fontFamily:'var(--font-display)',fontSize:'15px',fontWeight:600,marginBottom:'14px'}}>Season summary</h3>
              {(()=>{
                // totalRaces = sum of all driver series race counts (not calendar circuits)
                const totalRaces = racesToDo.reduce((a,t)=>a+t.totalRaces,0)
                const completedCount = racesToDo.reduce((a,t)=>a+t.doneCount,0)
                const all = season.results
                const retiredCount = all.filter(r=>r.myRetired).length
                const classified = completedCount - retiredCount
                const myPtsTotal = all.filter(r=>r.myPos!=null).reduce((a,r)=>a+calcPts(r.myPos,year),0)
                const wins = all.filter(r=>r.myPos===1).length
                const pods = all.filter(r=>r.myPos&&r.myPos<=3).length
                const drvPtsTotal=liveDriverStandings.reduce((a,d)=>a+d.pts,0)
                const conPtsTotal=(season.conStandings||[]).reduce((a,c)=>a+c.pts,0)
                // Championship position: where would myPtsTotal rank in liveDriverStandings?
                const champPos=(()=>{
                  const sorted=[...liveDriverStandings].sort((a,b)=>b.pts-a.pts)
                  // insert my score
                  const pos=sorted.filter(d=>d.pts>myPtsTotal).length+1
                  return pos
                })()
                const pct=(n,total)=>total>0?` (${(n/total*100).toFixed(1)}%)`:'';
                const ordSuffix=(n)=>n===1?'st':n===2?'nd':n===3?'rd':'th'
                const rows=[
                  ['Total races',totalRaces,'var(--text-primary)',null],
                  ['Races completed',completedCount,'var(--text-primary)',null],
                  ['Races remaining',totalRaces-completedCount,'var(--warning)',null],
                  ['Races classified',classified,'var(--success)',pct(classified,totalRaces)],
                  ['Retirements',retiredCount,'var(--danger)',pct(retiredCount,totalRaces)],
                  ['My Wins',wins,'#fbbf24',pct(wins,totalRaces)],
                  ['My Podiums',pods,'var(--accent)',pct(pods,totalRaces)],
                  ['Drivers Pts Scored (whole champ)',drvPtsTotal,'#fbbf24',null],
                  ['Constructors Pts Scored (whole champ)',conPtsTotal,'#f97316',null],
                  ['Total Pts Scored by me',myPtsTotal,'var(--accent)',` (${champPos}${ordSuffix(champPos)})`],
                ]
                return (
                  <div style={{display:'flex',flexDirection:'column',gap:'6px'}}>
                    {rows.map(([label,val,color,suffix])=>(
                      <div key={label} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'5px 0',borderBottom:'1px solid var(--border)'}}>
                        <span style={{fontSize:'13px',color:'var(--text-secondary)'}}>{label}</span>
                        <span style={{fontFamily:'var(--font-display)',fontSize:'16px',fontWeight:700,color}}>
                          {typeof val==='number'?val.toLocaleString():val}
                          {suffix&&<span style={{fontSize:'13px',fontWeight:400,color:'var(--text-muted)',marginLeft:4}}>{suffix}</span>}
                        </span>
                      </div>
                    ))}
                  </div>
                )
              })()}
            </Card>
          </div>
        </div>
      )}

      {/* ══ TAB 3: FINAL STATS ══ */}
      {tab==='finalstats'&&season&&finalStats&&(
        <div>
          <div style={{display:'flex',gap:'8px',marginBottom:'16px'}}>
            <Btn variant={finalView==='pts'?'primary':'secondary'} size="sm" onClick={()=>setFinalView('pts')}>📊 Points scored</Btn>
            <Btn variant={finalView==='positions'?'primary':'secondary'} size="sm" onClick={()=>setFinalView('positions')}>🏆 Championship positions</Btn>
          </div>

          <Card style={{marginBottom:'16px',padding:0,overflow:'hidden'}}>
            <div style={{overflowX:'auto'}}>
              <table style={{borderCollapse:'collapse',fontSize:'11px',width:'100%'}}>
                <thead>
                  <tr style={{background:'var(--bg-card)',borderBottom:'2px solid var(--border)'}}>
                    <th style={{padding:'8px 10px',textAlign:'left',position:'sticky',left:0,background:'var(--bg-card)',zIndex:2,whiteSpace:'nowrap',color:'var(--text-muted)',fontWeight:600,minWidth:130}}>Driver / Series →</th>
                    {finalStats.todoOrder.map(col=>(
                      <th key={col.driver} style={{padding:'4px 2px',textAlign:'center',minWidth:28,color:'var(--text-muted)',fontWeight:500,writingMode:'vertical-lr',transform:'rotate(180deg)',maxHeight:80,overflow:'hidden'}}>
                        {col.driver.split(' ').pop()}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {allDrivers.map((d,di)=>(
                    <tr key={d} style={{borderBottom:'1px solid var(--border)',background:di%2===0?'var(--bg-card)':'var(--bg-input)'}}>
                      <td style={{padding:'5px 10px',fontWeight:500,position:'sticky',left:0,background:di%2===0?'var(--bg-card)':'var(--bg-input)',zIndex:1,whiteSpace:'nowrap',display:'flex',alignItems:'center',gap:'6px'}}>
                        <span style={{width:8,height:8,borderRadius:'50%',background:LINE_COLORS[di%LINE_COLORS.length],flexShrink:0,display:'inline-block'}}/>
                        {d}
                      </td>
                      {finalStats.snapshots.map((snap,si)=>{
                        const val=finalView==='pts'
                          ?(snap.dPts[d]??null)
                          :(()=>{const sorted=Object.entries(snap.dPts).sort((a,b)=>b[1]-a[1]);const pos=sorted.findIndex(([x])=>x===d);return pos>=0?pos+1:null})()
                        const mc=val!=null&&finalView==='positions'?medalColor(val):null
                        return (
                          <td key={si} style={{padding:'5px 2px',textAlign:'center',background:mc?mc+'22':'transparent'}}>
                            <span style={{fontSize:'10px',color:mc||(val!=null?'var(--text-secondary)':'var(--border)'),fontWeight:mc?700:400}}>
                              {val??'·'}
                            </span>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Single chart  -  switches with the table view */}
          <Card>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px',flexWrap:'wrap',gap:'8px'}}>
              <h3 style={{fontFamily:'var(--font-display)',fontSize:'14px',fontWeight:600}}>
                {finalView==='pts'?'Points Progression':'Championship Progression'}
              </h3>
            </div>
            <ChampChart
              snapshots={finalStats.snapshots}
              drivers={allDrivers}
              mode={finalView}
            />
          </Card>
        </div>
      )}
    </div>
  )
}

const LINE_COLORS=['#fbbf24','#4f6ef7','#22c55e','#ef4444','#a78bfa','#f97316','#0ea5e9','#ff6b9d','#34d974','#e879f9','#38bdf8','#fb923c','#a3e635','#f472b6','#67e8f9','#fde68a']

function ChampChart({snapshots, drivers, mode='pts'}) {
  if (!snapshots.length||!drivers.length) return <p style={{color:'var(--text-muted)',fontSize:'13px'}}>No data yet</p>
  const isPts = mode==='pts'
  const W=700, H=308, P={t:12,r:16,b:80,l:44}
  const iW=W-P.l-P.r, iH=H-P.t-P.b

  // For pts: value = cumulative pts at each snapshot
  // For positions: value = championship position (1=best, invert Y)
  const series = drivers.map((d,di)=>({
    driver:d,
    color:LINE_COLORS[di%LINE_COLORS.length],
    vals: snapshots.map(s=>{
      if (isPts) return s.dPts[d]??0
      const sorted=Object.entries(s.dPts).sort((a,b)=>b[1]-a[1])
      const pos=sorted.findIndex(([x])=>x===d)
      return pos>=0?pos+1:drivers.length+1
    })
  }))

  const allVals = series.flatMap(s=>s.vals).filter(v=>v!=null)
  const maxVal = isPts ? Math.max(...allVals,1) : drivers.length
  const minVal = isPts ? 0 : 1
  const range = maxVal-minVal||1

  const xStep = iW/Math.max(snapshots.length-1,1)
  const xAt = i=>P.l+i*xStep
  const yAt = v=>isPts
    ? P.t+iH-(v/maxVal)*iH
    : P.t+((v-minVal)/range)*iH  // position: 1 at top, max at bottom

  const gridVals = isPts
    ? [0,0.25,0.5,0.75,1].map(p=>Math.round(maxVal*p))
    : Array.from({length:drivers.length},(_,i)=>i+1)

  // X axis labels  -  show every Nth driver name to avoid crowding
  const step = Math.max(1,Math.floor(snapshots.length/12))

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%',height:'auto',overflow:'visible'}}>
      {/* Grid lines */}
      {gridVals.map(v=>(
        <g key={v}>
          <line x1={P.l} x2={W-P.r} y1={yAt(v)} y2={yAt(v)} stroke="var(--border)" strokeWidth="0.5" strokeDasharray="3,3"/>
          <text x={P.l-4} y={yAt(v)+3} textAnchor="end" fontSize="8" fill="var(--text-muted)">{isPts?v.toLocaleString():v}</text>
        </g>
      ))}
      {/* X axis labels  -  rotated 45° */}
      {snapshots.map((s,i)=>i%step===0&&(
        <text key={i}
          x={xAt(i)} y={H-P.b+22}
          textAnchor="end"
          fontSize="7"
          fill="var(--text-muted)"
          transform={`rotate(-45,${xAt(i)},${H-P.b+22})`}
        >{s.afterDriver.split(' ').pop()}</text>
      ))}
      {/* Lines */}
      {series.map(s=>{
        const pts = s.vals.map((v,i)=>`${xAt(i)},${yAt(v)}`).join(' ')
        return (
          <polyline key={s.driver} points={pts} fill="none" stroke={s.color} strokeWidth="1.5" strokeLinejoin="round" opacity="0.9"/>
        )
      })}
    </svg>
  )
}
