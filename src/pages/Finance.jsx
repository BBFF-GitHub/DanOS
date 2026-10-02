import React, { useState, useMemo, useRef, useCallback } from 'react'
import Card from '../components/Card'
import PageHeader from '../components/PageHeader'
import Btn from '../components/Btn'
import { Plus, Trash2, Pencil, Upload, X, RefreshCw, AlertCircle } from 'lucide-react'

// ─── Category config ──────────────────────────────────────────────
const DEFAULT_CATEGORIES = [
  { name:'Groceries',     icon:'🛒', color:'#22c55e' },
  { name:'Eating out',    icon:'🍔', color:'#f97316' },
  { name:'Transport',     icon:'🚗', color:'#0ea5e9' },
  { name:'Entertainment', icon:'🎮', color:'#a78bfa' },
  { name:'Subscriptions', icon:'📱', color:'#6b84f8' },
  { name:'Clothing',      icon:'👕', color:'#ec4899' },
  { name:'Health',        icon:'💊', color:'#34d974' },
  { name:'Travel',        icon:'✈️', color:'#fbbf24' },
  { name:'Bills',         icon:'💡', color:'#ef4444' },
  { name:'Shopping',      icon:'🛍️', color:'#f59e0b' },
  { name:'Salary',        icon:'💰', color:'#22c55e' },
  { name:'Transfer',      icon:'💸', color:'#9ca3af' },
  { name:'Savings',       icon:'🐷', color:'#34d974' },
  { name:'Other',         icon:'📦', color:'#6b7280' },
]

// Keywords → auto-category
const AUTO_RULES = [
  { keywords:['tesco','sainsbury','asda','morrisons','waitrose','aldi','lidl','co-op','marks & spencer food','m&s food'], cat:'Groceries' },
  { keywords:['mcdonald','burger king','kfc','pizza','nando','subway','domino','deliveroo','uber eats','just eat','greggs','costa','starbucks','cafe','restaurant','pub','bar'], cat:'Eating out' },
  { keywords:['netflix','spotify','amazon prime','disney','youtube','sky','now tv','apple tv','hulu','crunchyroll','nintendo','xbox','playstation','ps plus'], cat:'Subscriptions' },
  { keywords:['tfl','transport for london','national rail','trainline','uber','bolt','bus','tube','petrol','bp','shell','esso','fuel','parking','toll'], cat:'Transport' },
  { keywords:['flight','ryanair','easyjet','british airways','ba.com','airbnb','hotel','booking.com','expedia','holiday'], cat:'Travel' },
  { keywords:['primark','h&m','zara','asos','next','topshop','river island','marks & spencer','m&s'], cat:'Clothing' },
  { keywords:['nhs','pharmacy','chemist','boots','specsavers','dentist','doctor','gym','fitness'], cat:'Health' },
  { keywords:['amazon','ebay','argos','currys','john lewis','ikea','b&q','screwfix','homebase'], cat:'Shopping' },
  { keywords:['salary','wages','payroll','hmrc','tax credit','universal credit','bacs'], cat:'Salary' },
  { keywords:['transfer','savings','isa','investment'], cat:'Transfer' },
  { keywords:['electric','gas','water','broadband','bt','virgin media','sky broadband','council tax','insurance','mortgage','rent'], cat:'Bills' },
]

function autoCategory(description) {
  const desc = description.toLowerCase()
  for (const rule of AUTO_RULES) {
    if (rule.keywords.some(k => desc.includes(k))) return rule.cat
  }
  return 'Other'
}

function catInfo(cats, name) {
  return cats.find(c => c.name === name) || { name, icon: '📦', color: '#6b7280' }
}

// ─── Parsers ──────────────────────────────────────────────────────
function parseCSVRaw(text) {
  const lines = text.trim().split('\n').filter(l => l.trim())
  if (lines.length < 2) return { headers: [], rows: [] }
  const headers = lines[0].split(',').map(h => h.replace(/"/g,'').trim())
  const rows = lines.slice(1).map(line => {
    const cols = line.match(/("(?:[^"]|"")*"|[^,]*)(,|$)/g)
      ?.filter(Boolean)
      .map(c => c.replace(/,$/,'').replace(/^"|"$/g,'').replace(/""/g,'"').trim())
      ?? line.split(',').map(c => c.trim())
    return cols
  })
  return { headers, rows }
}

function autoDetectColumns(headers) {
  const low = headers.map(h => h.toLowerCase())
  const find = (...keys) => {
    for (const k of keys) {
      const idx = low.findIndex(h => h === k)
      if (idx >= 0) return idx
    }
    for (const k of keys) {
      const idx = low.findIndex(h => h.includes(k))
      if (idx >= 0) return idx
    }
    return -1
  }
  return {
    dateIdx:   find('date', 'transaction date', 'posted date'),
    descIdx:   find('description', 'narrative', 'details', 'merchant', 'payee', 'memo', 'reference', 'type'),
    amountIdx: find('amount', 'value', 'transaction amount'),
    creditIdx: find('credit amount', 'credit', 'paid in', 'money in', 'deposit'),
    debitIdx:  find('debit amount', 'debit', 'paid out', 'money out', 'withdrawal'),
  }
}

function rowsToTransactions(headers, rawRows, mapping) {
  const { dateIdx, descIdx, amountIdx, creditIdx, debitIdx } = mapping
  const rows = []
  for (const cols of rawRows) {
    if (!cols.length || cols.every(c => !c)) continue
    let date = dateIdx >= 0 ? cols[dateIdx] : ''
    let desc = descIdx >= 0 ? cols[descIdx] : ''
    let amount = 0

    const clean = v => parseFloat((v || '0').replace(/[£$,]/g,'').trim()) || 0

    if (amountIdx >= 0 && cols[amountIdx]) {
      amount = clean(cols[amountIdx])
    } else if (creditIdx >= 0 || debitIdx >= 0) {
      const credit = creditIdx >= 0 ? clean(cols[creditIdx]) : 0
      const debit  = debitIdx  >= 0 ? clean(cols[debitIdx])  : 0
      amount = credit - debit
    }

    if (!date || (amount === 0 && !desc)) continue

    // Normalise date  -  handles DD/MM/YYYY, MM/DD/YYYY (4-digit year first), YYYY-MM-DD, "12 Jan 2024" etc.
    // Always zero-pad month/day so the result is a strictly comparable YYYY-MM-DD string.
    let parsedDate = date
    if (date.includes('/')) {
      const parts = date.split('/')
      if (parts[0].length === 4) {
        // YYYY/M/D or YYYY/MM/DD
        parsedDate = `${parts[0]}-${parts[1].padStart(2,'0')}-${parts[2].padStart(2,'0')}`
      } else if (parts.length === 3) {
        // D/M/YYYY (UK format)
        parsedDate = `${parts[2].length===2?'20'+parts[2]:parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`
      }
    } else if (date.includes('-') && date.split('-')[0].length !== 4) {
      const parts = date.split('-')
      if (parts.length === 3) parsedDate = `${parts[2].length===2?'20'+parts[2]:parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`
    } else if (date.includes('-') && date.split('-')[0].length === 4) {
      // Already YYYY-M-D or YYYY-MM-DD  -  ensure zero-padding
      const parts = date.split('-')
      if (parts.length === 3) parsedDate = `${parts[0]}-${parts[1].padStart(2,'0')}-${parts[2].padStart(2,'0')}`
    } else if (/[a-zA-Z]/.test(date)) {
      const d = new Date(date)
      if (!isNaN(d)) parsedDate = d.toISOString().slice(0,10)
    }

    // Final safety check: validate the result is a real, parseable date.
    // If not, fall back to JS Date parsing as a last resort.
    if (!/^\d{4}-\d{2}-\d{2}$/.test(parsedDate)) {
      const fallback = new Date(date)
      if (!isNaN(fallback)) parsedDate = fallback.toISOString().slice(0,10)
    }

    rows.push({ date: parsedDate, description: desc || '(no description)', amount })
  }
  return rows
}

// Legacy wrapper kept for compatibility
function parseCSV(text) {
  const { headers, rows } = parseCSVRaw(text)
  const mapping = autoDetectColumns(headers)
  return rowsToTransactions(headers, rows, mapping)
}

// ─── Normalise a stored date string to strict YYYY-MM-DD (fixes legacy un-padded dates) ──
function normaliseStoredDate(date) {
  if (!date) return date
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return date  // already correct
  const m = date.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (m) return `${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`
  const d = new Date(date)
  if (!isNaN(d)) return d.toISOString().slice(0,10)
  return date
}

// ─── Number formatting ────────────────────────────────────────────
function gbp(n) {
  return new Intl.NumberFormat('en-GB', { style:'currency', currency:'GBP' }).format(n ?? 0)
}

// ─── Mini line chart ──────────────────────────────────────────────
function TrendChart({ data }) {
  if (!data || data.length < 2) return <p style={{ color:'var(--text-muted)', fontSize:'13px' }}>Import transactions to see trends.</p>
  const W=500, H=160, P={t:12,r:60,b:28,l:52}
  const iW=W-P.l-P.r, iH=H-P.t-P.b
  const maxVal = Math.max(...data.flatMap(d=>[d.income,d.spending]),1)
  const xStep = iW/(data.length-1)
  const xAt = i => P.l+i*xStep
  const yAt = v => P.t+iH-(v/maxVal)*iH
  const incPts  = data.map((d,i)=>`${xAt(i)},${yAt(d.income)}`).join(' ')
  const spndPts = data.map((d,i)=>`${xAt(i)},${yAt(d.spending)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%',height:'auto'}}>
      {[0,0.5,1].map(p=>(
        <g key={p}>
          <line x1={P.l} x2={W-P.r} y1={P.t+iH*(1-p)} y2={P.t+iH*(1-p)} stroke="var(--border)" strokeWidth="0.5" strokeDasharray="3,3"/>
          <text x={P.l-4} y={P.t+iH*(1-p)+3} textAnchor="end" fontSize="9" fill="var(--text-muted)">{gbp(maxVal*p).slice(0,7)}</text>
        </g>
      ))}
      {data.map((d,i)=>(
        <text key={i} x={xAt(i)} y={H-4} textAnchor="middle" fontSize="9" fill="var(--text-muted)">{d.month}</text>
      ))}
      <polyline points={incPts}  fill="none" stroke="var(--success)" strokeWidth="2" strokeLinejoin="round"/>
      <polyline points={spndPts} fill="none" stroke="var(--danger)"  strokeWidth="2" strokeLinejoin="round"/>
      <circle cx={xAt(data.length-1)} cy={yAt(data[data.length-1].income)}   r="3" fill="var(--success)"/>
      <circle cx={xAt(data.length-1)} cy={yAt(data[data.length-1].spending)} r="3" fill="var(--danger)"/>
      <text x={xAt(data.length-1)+5} y={yAt(data[data.length-1].income)+3}   fontSize="9" fill="var(--success)" fontWeight="600">In</text>
      <text x={xAt(data.length-1)+5} y={yAt(data[data.length-1].spending)+3} fontSize="9" fill="var(--danger)"  fontWeight="600">Out</text>
    </svg>
  )
}

// ─── Transaction row ──────────────────────────────────────────────
function TxRow({ tx, cats, accounts, onCategoryChange, onDelete }) {
  const isIn = tx.amount > 0
  const ci   = catInfo(cats, tx.category)
  return (
    <div style={{display:'flex',alignItems:'center',gap:'12px',padding:'9px 14px',borderBottom:'1px solid var(--border)'}}>
      <div style={{width:34,height:34,borderRadius:'10px',background:ci.color+'22',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'15px',flexShrink:0}}>{ci.icon}</div>
      <div style={{flex:1,minWidth:0}}>
        <p style={{fontSize:'13px',fontWeight:500,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{tx.description}</p>
        <p style={{fontSize:'11px',color:'var(--text-muted)'}}>
          {new Date(tx.date).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}
          {tx.account && ` · ${tx.account}`}
        </p>
      </div>
      <select
        value={tx.category||'Other'}
        onChange={e=>onCategoryChange(tx.id, e.target.value)}
        onClick={e=>e.stopPropagation()}
        style={{fontSize:'11px',padding:'2px 6px',borderRadius:'var(--radius-sm)',border:'1px solid var(--border)',background:'var(--bg-input)',color:'var(--text-secondary)',width:120,cursor:'pointer'}}
      >
        {cats.map(c=><option key={c.name} value={c.name}>{c.icon} {c.name}</option>)}
      </select>
      <span style={{fontSize:'14px',fontWeight:700,color:isIn?'var(--success)':'var(--danger)',minWidth:80,textAlign:'right',flexShrink:0}}>
        {isIn?'+':''}{gbp(tx.amount)}
      </span>
      <button onClick={()=>onDelete(tx.id)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)',flexShrink:0,padding:'2px'}}><Trash2 size={13}/></button>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────
export default function FinancePage({ financeData, setFinanceData }) {
  const accounts    = financeData.accounts    || []
  const transactions= useMemo(()=>(financeData.transactions||[]).map(t=>({...t,date:normaliseStoredDate(t.date)})),[financeData.transactions])
  const budgets     = financeData.budgets     || []
  const categories  = financeData.categories  || DEFAULT_CATEGORIES

  function update(key, val) { setFinanceData(prev=>({...prev,[key]:val})) }
  function setAccounts(fn)     { update('accounts',    typeof fn==='function'?fn(accounts):fn) }
  function setTransactions(fn) { update('transactions',typeof fn==='function'?fn(transactions):fn) }
  function setBudgets(fn)      { update('budgets',     typeof fn==='function'?fn(budgets):fn) }
  function setCategories(fn)   { update('categories',  typeof fn==='function'?fn(categories):fn) }

  const [tab,          setTab]         = useState('dashboard')
  const [importModal,  setImportModal] = useState(false)
  const [importAcc,    setImportAcc]   = useState('')
  const [importPreview,setImportPreview]=useState([])
  const [importError,  setImportError] = useState('')
  const [importing,    setImporting]   = useState(false)
  const [txSearch,     setTxSearch]    = useState('')
  const [txCatFilter,  setTxCatFilter] = useState('All')
  const [txAccFilter,  setTxAccFilter] = useState('All')
  const [txDateFrom,   setTxDateFrom]  = useState('')
  const [txDateTo,     setTxDateTo]    = useState('')
  const [txPage,       setTxPage]      = useState(1)
  const [showAccForm,  setShowAccForm] = useState(false)
  const [editAccBalId, setEditAccBalId]= useState(null)
  const [accForm,      setAccForm]     = useState({name:'',type:'current',institution:'',startingBalance:''})
  const [editBudget,   setEditBudget]  = useState(null)
  const [budgetForm,   setBudgetForm]  = useState({category:'',monthlyTarget:'',icon:'📦',color:'#22c55e'})
  const [showRules,    setShowRules]   = useState(false)
  const [rawHeaders,   setRawHeaders]   = useState([])
  const [rawRows,      setRawRows]      = useState([])
  const [colMapping,   setColMapping]   = useState({ dateIdx:-1, descIdx:-1, amountIdx:-1, creditIdx:-1, debitIdx:-1 })
  const [showMapping,  setShowMapping]  = useState(false)
  const fileRef = useRef()
  const PAGE_SIZE = 50

  // ── Import flow ───────────────────────────────────────────────
  function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    if (file.name.toLowerCase().endsWith('.pdf')) {
      setImportError('PDF files can\'t be read directly. Use a PDF-to-CSV converter first, then check the column headers match the format below before importing.')
      return
    }
    setImportError('')
    setImportPreview([])
    const reader = new FileReader()
    reader.onload = ev => {
      try {
        const { headers, rows } = parseCSVRaw(ev.target.result)
        if (!headers.length || !rows.length) {
          setImportError('No data found in this file. Make sure it\'s a plain CSV (comma-separated) file.')
          return
        }
        const mapping = autoDetectColumns(headers)
        setRawHeaders(headers)
        setRawRows(rows)
        setColMapping(mapping)

        const detected = (mapping.dateIdx >= 0) && (mapping.amountIdx >= 0 || mapping.creditIdx >= 0 || mapping.debitIdx >= 0)
        if (!detected) {
          // Couldn't auto-detect  -  show manual mapping straight away
          setShowMapping(true)
          return
        }
        const txs = rowsToTransactions(headers, rows, mapping)
        if (txs.length === 0) {
          setShowMapping(true)
          return
        }
        const preview = txs.map((r,i) => ({ ...r, id:`imp_${Date.now()}_${i}`, category: autoCategory(r.description), account: importAcc }))
        setImportPreview(preview)
      } catch (err) {
        setImportError(`Could not read this file: ${err.message}`)
      }
    }
    reader.readAsText(file)
  }

  function applyManualMapping() {
    const txs = rowsToTransactions(rawHeaders, rawRows, colMapping)
    if (txs.length === 0) {
      setImportError('No valid transactions found with this column mapping. Double check the Date and Amount (or Money In / Money Out) columns are set correctly.')
      return
    }
    const preview = txs.map((r,i) => ({ ...r, id:`imp_${Date.now()}_${i}`, category: autoCategory(r.description), account: importAcc }))
    setImportPreview(preview)
    setShowMapping(false)
    setImportError('')
  }

  function confirmImport() {
    setImporting(true)
    // Deduplicate against existing transactions
    const existingKeys = new Set(transactions.map(t => `${t.date}|${t.amount}|${t.description}`))
    const newTxs = importPreview.filter(t => !existingKeys.has(`${t.date}|${t.amount}|${t.description}`))
    setTransactions(prev => [...prev, ...newTxs].sort((a,b) => b.date.localeCompare(a.date)))
    setImportModal(false)
    setImportPreview([])
    setImporting(false)
    setTab('transactions')
  }

  function updatePreviewCategory(id, cat) {
    setImportPreview(prev => prev.map(t => t.id===id?{...t,category:cat}:t))
  }

  function updateTxCategory(id, cat) {
    setTransactions(prev => prev.map(t => t.id===id?{...t,category:cat}:t))
  }

  function deleteTx(id) { setTransactions(prev=>prev.filter(t=>t.id!==id)) }

  // ── Derived data ─────────────────────────────────────────────
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0,10)
  const prevStart  = new Date(now.getFullYear(), now.getMonth()-1, 1).toISOString().slice(0,10)
  const prevEnd    = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0,10)

  const thisMo = useMemo(()=> transactions.filter(t=>t.date>=monthStart), [transactions,monthStart])
  const prevMo = useMemo(()=> transactions.filter(t=>t.date>=prevStart&&t.date<=prevEnd), [transactions,prevStart,prevEnd])

  const summary = useMemo(()=>{
    const spending = thisMo.filter(t=>t.amount<0).reduce((a,t)=>a+Math.abs(t.amount),0)
    const income   = thisMo.filter(t=>t.amount>0).reduce((a,t)=>a+t.amount,0)
    const pSpending= prevMo.filter(t=>t.amount<0).reduce((a,t)=>a+Math.abs(t.amount),0)
    const pIncome  = prevMo.filter(t=>t.amount>0).reduce((a,t)=>a+t.amount,0)
    const byCategory = categories.map(c=>({
      ...c,
      spent: thisMo.filter(t=>t.category===c.name&&t.amount<0).reduce((a,t)=>a+Math.abs(t.amount),0),
    })).filter(c=>c.spent>0).sort((a,b)=>b.spent-a.spent)
    return { spending, income, pSpending, pIncome, byCategory }
  },[thisMo,prevMo,categories])

  const trends = useMemo(()=>{
    const months = {}
    transactions.forEach(t=>{
      const m = t.date.slice(0,7)
      if (!months[m]) months[m]={month:t.date.slice(5,7),spending:0,income:0}
      if (t.amount<0) months[m].spending+=Math.abs(t.amount)
      else months[m].income+=t.amount
    })
    return Object.entries(months).sort((a,b)=>a[0].localeCompare(b[0])).slice(-6).map(([,v])=>v)
  },[transactions])

  // Account balances (starting balance + sum of all transactions per account)
  const accBalances = useMemo(()=>{
    const bal = {}
    accounts.forEach(a=>{ bal[a.name]=a.startingBalance||0 })
    transactions.forEach(t=>{ if(t.account) bal[t.account]=(bal[t.account]||0)+t.amount })
    return bal
  },[accounts,transactions])

  // Filtered transactions
  const filteredTx = useMemo(()=>{
    return transactions.filter(t=>{
      if (txCatFilter!=='All'&&t.category!==txCatFilter) return false
      if (txAccFilter!=='All'&&t.account!==txAccFilter) return false
      if (txDateFrom&&t.date<txDateFrom) return false
      if (txDateTo  &&t.date>txDateTo)   return false
      if (txSearch&&!t.description.toLowerCase().includes(txSearch.toLowerCase())) return false
      return true
    }).sort((a,b)=> b.date.localeCompare(a.date) || (b.id||'').toString().localeCompare((a.id||'').toString()))
  },[transactions,txCatFilter,txAccFilter,txDateFrom,txDateTo,txSearch])

  const pagedTx  = filteredTx.slice((txPage-1)*PAGE_SIZE, txPage*PAGE_SIZE)
  const totalPages = Math.ceil(filteredTx.length/PAGE_SIZE)

  // Budget with actual spending
  const budgetWithSpend = useMemo(()=>
    budgets.map(b=>({
      ...b,
      spent: thisMo.filter(t=>t.category===b.category&&t.amount<0).reduce((a,t)=>a+Math.abs(t.amount),0),
    }))
  ,[budgets,thisMo])

  return (
    <div>
      <PageHeader
        title="💷 Finance"
        subtitle="Import bank statements · track spending · set budgets"
        action={
          <div style={{display:'flex',gap:'8px'}}>
            <Btn onClick={()=>setImportModal(true)}><Upload size={14}/> Import statement</Btn>
          </div>
        }
      />

      {/* Tabs */}
      <div style={{display:'flex',gap:'6px',marginBottom:'20px'}}>
        {[['dashboard','📊 Dashboard'],['transactions','💳 Transactions'],['budgets','🎯 Budgets'],['accounts','🏦 Accounts']].map(([id,label])=>(
          <Btn key={id} variant={tab===id?'primary':'secondary'} size="sm" onClick={()=>setTab(id)}>{label}</Btn>
        ))}
      </div>

      {/* ══ IMPORT MODAL ══ */}
      {importModal&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:200}}>
          <div style={{background:'var(--bg-card)',borderRadius:'var(--radius-lg)',padding:'28px',width:700,maxWidth:'92vw',maxHeight:'85vh',overflowY:'auto'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px'}}>
              <h2 style={{fontFamily:'var(--font-display)',fontSize:'18px',fontWeight:600}}>Import bank statement</h2>
              <button onClick={()=>{setImportModal(false);setImportPreview([]);setImportError('');setShowMapping(false);setRawHeaders([]);setRawRows([])}} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)'}}><X size={18}/></button>
            </div>

            {showMapping ? (
              <div>
                <div style={{padding:'12px 14px',background:'var(--warning-soft)',borderRadius:'var(--radius)',border:'1px solid var(--warning)',fontSize:'13px',color:'var(--text-secondary)',marginBottom:'16px',display:'flex',gap:'8px',alignItems:'flex-start'}}>
                  <AlertCircle size={15} color="var(--warning)" style={{flexShrink:0,marginTop:1}}/>
                  <span>Couldn't automatically detect the columns in this file. Match each field below to the right column from your file, then click Apply.</span>
                </div>

                <div style={{marginBottom:'16px'}}>
                  <p style={{fontSize:'12px',color:'var(--text-muted)',marginBottom:'6px'}}>Detected columns in your file:</p>
                  <div style={{display:'flex',flexWrap:'wrap',gap:'6px',marginBottom:'12px'}}>
                    {rawHeaders.map((h,i)=>(
                      <span key={i} style={{fontSize:'11px',padding:'3px 8px',borderRadius:'4px',background:'var(--bg-input)',color:'var(--text-secondary)'}}>{i}: {h||'(blank)'}</span>
                    ))}
                  </div>
                </div>

                <div style={{display:'flex',flexDirection:'column',gap:'10px',marginBottom:'16px'}}>
                  {[
                    ['dateIdx','Date column','Required'],
                    ['descIdx','Description column','Optional but recommended'],
                    ['amountIdx','Amount column (single column, + for in / − for out)','Use this OR the two below'],
                    ['creditIdx','Money In / Credit column','Use with Money Out below'],
                    ['debitIdx','Money Out / Debit column','Use with Money In above'],
                  ].map(([key,label,hint])=>(
                    <div key={key} style={{display:'flex',alignItems:'center',gap:'10px'}}>
                      <label style={{fontSize:'13px',width:280,flexShrink:0}}>{label}<br/><span style={{fontSize:'11px',color:'var(--text-muted)'}}>{hint}</span></label>
                      <select value={colMapping[key]} onChange={e=>setColMapping(m=>({...m,[key]:parseInt(e.target.value)}))} style={{flex:1}}>
                        <option value={-1}> -  Not used  - </option>
                        {rawHeaders.map((h,i)=>(
                          <option key={i} value={i}>{i}: {h||'(blank)'}  -  e.g. "{rawRows[0]?.[i]||''}"</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>

                {importError&&<div style={{padding:'12px',background:'var(--danger-soft)',borderRadius:'var(--radius-sm)',color:'var(--danger)',fontSize:'13px',marginBottom:'12px'}}>{importError}</div>}

                <div style={{display:'flex',gap:'8px'}}>
                  <Btn onClick={applyManualMapping}>Apply mapping &amp; preview</Btn>
                  <Btn variant="ghost" onClick={()=>{setShowMapping(false);setRawHeaders([]);setRawRows([]);fileRef.current.value=''}}>Cancel</Btn>
                </div>
              </div>
            ) : importPreview.length===0?(
              <div style={{display:'flex',flexDirection:'column',gap:'14px'}}>
                <div style={{padding:'14px',background:'var(--accent-soft)',borderRadius:'var(--radius)',border:'1px solid var(--accent-border)',fontSize:'13px',color:'var(--text-secondary)',lineHeight:1.6}}>
                  <strong style={{color:'var(--text-primary)'}}>File type:</strong> Plain CSV only  -  not PDF. Most UK banks let you export CSV directly from online banking: <strong>Statements → Export → CSV</strong>.
                </div>

                <div style={{padding:'14px',background:'var(--bg-input)',borderRadius:'var(--radius)',border:'1px solid var(--border)'}}>
                  <p style={{fontSize:'13px',fontWeight:600,marginBottom:'8px',color:'var(--text-primary)'}}>Expected CSV format</p>
                  <p style={{fontSize:'12px',color:'var(--text-secondary)',marginBottom:'10px',lineHeight:1.6}}>
                    Your file needs a header row, plus a <strong>Date</strong> column and either an <strong>Amount</strong> column, or separate <strong>Money In</strong> / <strong>Money Out</strong> columns. Column names don't need to match exactly  -  DanOS looks for common variations (Date, Transaction Date, Description, Narrative, Amount, Debit, Credit, Paid In, Paid Out, etc).
                  </p>
                  <div style={{overflowX:'auto'}}>
                    <table style={{borderCollapse:'collapse',width:'100%',fontSize:'11px'}}>
                      <thead>
                        <tr style={{borderBottom:'1px solid var(--border)'}}>
                          {['Date','Description','Amount'].map(h=>(
                            <th key={h} style={{padding:'5px 8px',textAlign:'left',color:'var(--text-muted)',fontWeight:600}}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          ['01/03/2025','TESCO STORES 2034','-34.52'],
                          ['03/03/2025','SALARY PAYMENT','2150.00'],
                          ['05/03/2025','NETFLIX.COM','-8.99'],
                        ].map((row,i)=>(
                          <tr key={i} style={{borderBottom:'1px solid var(--border)'}}>
                            {row.map((c,j)=><td key={j} style={{padding:'5px 8px',color:'var(--text-secondary)',fontFamily:'monospace'}}>{c}</td>)}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p style={{fontSize:'11px',color:'var(--text-muted)',marginTop:'10px'}}>
                    Negative amounts (or a separate "Money Out"/"Debit" column) = money leaving the account. Positive amounts (or "Money In"/"Credit") = money coming in.
                  </p>
                </div>

                <div style={{padding:'12px 14px',background:'var(--warning-soft)',borderRadius:'var(--radius)',fontSize:'12px',color:'var(--text-secondary)',lineHeight:1.6}}>
                  <strong style={{color:'var(--warning)'}}>HSBC users:</strong> HSBC's app and online banking only offer PDF statements in some regions. If CSV export isn't available to you:
                  <br/>1. Try <strong>Online Banking → Statements → "Download as CSV"</strong> if present (sometimes hidden under "Other formats")
                  <br/>2. If only PDF is offered, use a PDF-to-CSV converter, then on the next screen DanOS will let you manually match whichever columns the converter produced
                  <br/>3. If auto-detection fails, you'll automatically be shown a column-matching screen  -  just tell DanOS which column is which
                </div>

                <div>
                  <label style={{fontSize:'12px',color:'var(--text-muted)',display:'block',marginBottom:'4px'}}>Account (optional  -  helps track which account)</label>
                  <select value={importAcc} onChange={e=>setImportAcc(e.target.value)} style={{width:'100%',marginBottom:'10px'}}>
                    <option value="">No account label</option>
                    {accounts.map(a=><option key={a.name} value={a.name}>{a.name}</option>)}
                  </select>
                </div>
                <div
                  onClick={()=>fileRef.current?.click()}
                  style={{border:'2px dashed var(--border)',borderRadius:'var(--radius)',padding:'40px',textAlign:'center',cursor:'pointer',transition:'border-color 0.15s'}}
                  onMouseEnter={e=>e.currentTarget.style.borderColor='var(--accent)'}
                  onMouseLeave={e=>e.currentTarget.style.borderColor='var(--border)'}
                >
                  <p style={{fontSize:'28px',marginBottom:'10px'}}>📁</p>
                  <p style={{fontSize:'15px',fontWeight:500,color:'var(--text-primary)',marginBottom:'4px'}}>Click to choose a CSV file</p>
                  <p style={{fontSize:'13px',color:'var(--text-muted)'}}>or drag and drop your bank export here</p>
                  <input ref={fileRef} type="file" accept=".csv,.txt" onChange={handleFile} style={{display:'none'}}/>
                </div>
                {importError&&<div style={{padding:'12px',background:'var(--danger-soft)',borderRadius:'var(--radius-sm)',color:'var(--danger)',fontSize:'13px',display:'flex',gap:'8px',alignItems:'flex-start'}}><AlertCircle size={15} style={{flexShrink:0,marginTop:1}}/>{importError}</div>}
              </div>
            ):(
              <div>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'12px'}}>
                  <p style={{fontSize:'14px',color:'var(--text-secondary)'}}><strong style={{color:'var(--success)'}}>{importPreview.length} transactions</strong> found  -  check categories before importing:</p>
                  <div style={{display:'flex',gap:'6px'}}>
                    <Btn size="sm" variant="secondary" onClick={()=>{setImportPreview([]);fileRef.current.value=''}}>← Back</Btn>
                    {rawHeaders.length>0&&<Btn size="sm" variant="ghost" onClick={()=>{setImportPreview([]);setShowMapping(true)}}>Remap columns</Btn>}
                  </div>
                </div>
                <div style={{maxHeight:340,overflowY:'auto',border:'1px solid var(--border)',borderRadius:'var(--radius)',marginBottom:'14px'}}>
                  {importPreview.map(t=>(
                    <div key={t.id} style={{display:'flex',alignItems:'center',gap:'10px',padding:'8px 12px',borderBottom:'1px solid var(--border)'}}>
                      <span style={{fontSize:'12px',color:'var(--text-muted)',minWidth:88,flexShrink:0}}>{new Date(t.date).toLocaleDateString('en-GB',{day:'numeric',month:'short'})}</span>
                      <span style={{fontSize:'12px',flex:1,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{t.description}</span>
                      <select value={t.category} onChange={e=>updatePreviewCategory(t.id,e.target.value)} style={{fontSize:'11px',padding:'2px 5px',width:120,flexShrink:0}}>
                        {categories.map(c=><option key={c.name} value={c.name}>{c.icon} {c.name}</option>)}
                      </select>
                      <span style={{fontSize:'13px',fontWeight:700,color:t.amount>0?'var(--success)':'var(--danger)',minWidth:72,textAlign:'right',flexShrink:0}}>
                        {t.amount>0?'+':''}{gbp(t.amount)}
                      </span>
                    </div>
                  ))}
                </div>
                <div style={{display:'flex',gap:'8px'}}>
                  <Btn onClick={confirmImport} disabled={importing}>
                    {importing?'Importing…':`Import ${importPreview.length} transactions`}
                  </Btn>
                  <Btn variant="ghost" onClick={()=>{setImportModal(false);setImportPreview([]);setImportError('');setShowMapping(false);setRawHeaders([]);setRawRows([])}}>Cancel</Btn>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ DASHBOARD ══ */}
      {tab==='dashboard'&&(
        transactions.length===0?(
          <Card style={{textAlign:'center',padding:'60px'}}>
            <p style={{fontSize:'36px',marginBottom:'12px'}}>💷</p>
            <p style={{fontSize:'16px',color:'var(--text-secondary)',marginBottom:'8px',fontWeight:500}}>No transactions imported yet.</p>
            <p style={{fontSize:'13px',color:'var(--text-muted)',marginBottom:'20px'}}>Export a CSV from your bank's online portal and import it here.</p>
            <Btn onClick={()=>setImportModal(true)}><Upload size={14}/> Import your first statement</Btn>
          </Card>
        ):(
          <div>
            {/* Stat cards */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(175px,1fr))',gap:'12px',marginBottom:'20px'}}>
              {[
                {label:'Total balance',     val:Object.values(accBalances).reduce((a,b)=>a+b,0), color:'var(--accent)', sub:`across ${accounts.length} account${accounts.length!==1?'s':''}`},
                {label:'Spent this month', val:summary.spending, color:'var(--danger)',  sub:`vs ${gbp(summary.pSpending)} last month`},
                {label:'Income this month',val:summary.income,   color:'var(--success)', sub:`vs ${gbp(summary.pIncome)} last month`},
                {label:'Net this month',   val:summary.income-summary.spending, color:summary.income>=summary.spending?'var(--success)':'var(--danger)', sub:'income minus spending'},
                {label:'Total transactions',val:transactions.length, color:'var(--accent)', sub:`${thisMo.length} this month`},
              ].map(s=>(
                <Card key={s.label} style={{padding:'16px'}}>
                  <p style={{fontSize:'11px',color:'var(--text-muted)',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:'8px'}}>{s.label}</p>
                  <p style={{fontFamily:'var(--font-display)',fontSize:'22px',fontWeight:700,color:s.color,lineHeight:1}}>{typeof s.val==='number'?gbp(s.val):s.val}</p>
                  <p style={{fontSize:'12px',color:'var(--text-muted)',marginTop:'5px'}}>{s.sub}</p>
                </Card>
              ))}
            </div>

            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px',marginBottom:'16px'}}>
              <Card>
                <h3 style={{fontFamily:'var(--font-display)',fontSize:'15px',fontWeight:600,marginBottom:'14px'}}>Monthly income vs spending</h3>
                <TrendChart data={trends}/>
              </Card>
              <Card>
                <h3 style={{fontFamily:'var(--font-display)',fontSize:'15px',fontWeight:600,marginBottom:'14px'}}>This month by category</h3>
                {summary.byCategory.length===0?<p style={{color:'var(--text-muted)',fontSize:'13px'}}>No spending data this month.</p>:(
                  <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
                    {summary.byCategory.slice(0,8).map(c=>(
                      <div key={c.name} style={{display:'flex',alignItems:'center',gap:'10px'}}>
                        <span style={{fontSize:'15px',minWidth:22}}>{c.icon}</span>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{display:'flex',justifyContent:'space-between',marginBottom:'3px'}}>
                            <span style={{fontSize:'12px',fontWeight:500}}>{c.name}</span>
                            <span style={{fontSize:'12px',fontWeight:700}}>{gbp(c.spent)}</span>
                          </div>
                          <div style={{height:4,background:'var(--bg-badge)',borderRadius:2,overflow:'hidden'}}>
                            <div style={{height:'100%',width:`${(c.spent/summary.spending)*100}%`,background:c.color,borderRadius:2}}/>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>

            {/* Account balances */}
            {accounts.length>0&&(
              <Card style={{marginBottom:'16px'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:'14px',flexWrap:'wrap',gap:'8px'}}>
                  <h3 style={{fontFamily:'var(--font-display)',fontSize:'15px',fontWeight:600}}>Account balances</h3>
                  <p style={{fontSize:'13px',color:'var(--text-secondary)'}}>
                    Total: <strong style={{fontFamily:'var(--font-display)',fontSize:'16px',color:'var(--accent)'}}>{gbp(Object.values(accBalances).reduce((a,b)=>a+b,0))}</strong>
                  </p>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:'10px'}}>
                  {accounts.map(a=>{
                    const bal=accBalances[a.name]||0
                    return (
                      <div key={a.name} style={{padding:'14px 16px',background:'var(--bg-input)',borderRadius:'var(--radius)',borderLeft:`3px solid ${a.type==='credit'?'var(--danger)':a.type==='savings'?'var(--success)':'var(--accent)'}`}}>
                        <p style={{fontSize:'12px',color:'var(--text-muted)',marginBottom:'4px'}}>{a.institution||a.type}</p>
                        <p style={{fontSize:'14px',fontWeight:600,marginBottom:'4px'}}>{a.name}</p>
                        <p style={{fontFamily:'var(--font-display)',fontSize:'20px',fontWeight:700,color:bal<0?'var(--danger)':'var(--success)'}}>{gbp(bal)}</p>
                        <p style={{fontSize:'11px',color:'var(--text-muted)',marginTop:'2px'}}>calculated from transactions</p>
                      </div>
                    )
                  })}
                </div>
              </Card>
            )}

            {/* Recent transactions */}
            <Card>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px'}}>
                <h3 style={{fontFamily:'var(--font-display)',fontSize:'15px',fontWeight:600}}>Recent transactions</h3>
                <button onClick={()=>setTab('transactions')} style={{fontSize:'12px',color:'var(--accent)',background:'none',border:'none',cursor:'pointer'}}>View all →</button>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0'}}>
                {[...transactions].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,10).map(t=>(
                  <TxRow key={t.id} tx={t} cats={categories} accounts={accounts} onCategoryChange={updateTxCategory} onDelete={deleteTx}/>
                ))}
              </div>
            </Card>
          </div>
        )
      )}

      {/* ══ TRANSACTIONS ══ */}
      {tab==='transactions'&&(
        <div>
          <div style={{display:'flex',gap:'8px',flexWrap:'wrap',marginBottom:'14px',alignItems:'center'}}>
            <input value={txSearch} onChange={e=>{setTxSearch(e.target.value);setTxPage(1)}} placeholder="Search transactions…" style={{width:200}}/>
            <select value={txCatFilter} onChange={e=>{setTxCatFilter(e.target.value);setTxPage(1)}} style={{width:140}}>
              <option value="All">All categories</option>
              {categories.map(c=><option key={c.name} value={c.name}>{c.icon} {c.name}</option>)}
            </select>
            {accounts.length>0&&(
              <select value={txAccFilter} onChange={e=>{setTxAccFilter(e.target.value);setTxPage(1)}} style={{width:150}}>
                <option value="All">All accounts</option>
                {accounts.map(a=><option key={a.name} value={a.name}>{a.name}</option>)}
              </select>
            )}
            <input type="date" value={txDateFrom} onChange={e=>{setTxDateFrom(e.target.value);setTxPage(1)}} style={{width:140}}/>
            <span style={{color:'var(--text-muted)',fontSize:'12px'}}>to</span>
            <input type="date" value={txDateTo} onChange={e=>{setTxDateTo(e.target.value);setTxPage(1)}} style={{width:140}}/>
            {(txSearch||txCatFilter!=='All'||txAccFilter!=='All'||txDateFrom||txDateTo)&&(
              <Btn size="sm" variant="secondary" onClick={()=>{setTxSearch('');setTxCatFilter('All');setTxAccFilter('All');setTxDateFrom('');setTxDateTo('');setTxPage(1)}}>Clear</Btn>
            )}
            <span style={{fontSize:'12px',color:'var(--text-muted)',marginLeft:'auto'}}>{filteredTx.length} transactions</span>
          </div>
          <Card style={{padding:0,overflow:'hidden'}}>
            {pagedTx.length===0?(
              <p style={{padding:'40px',textAlign:'center',color:'var(--text-muted)'}}>No transactions match your filters.</p>
            ):pagedTx.map(t=>(
              <TxRow key={t.id} tx={t} cats={categories} accounts={accounts} onCategoryChange={updateTxCategory} onDelete={deleteTx} showAccount/>
            ))}
          </Card>
          {totalPages>1&&(
            <div style={{display:'flex',gap:'8px',justifyContent:'center',marginTop:'12px',alignItems:'center'}}>
              <Btn variant="secondary" size="sm" disabled={txPage<=1} onClick={()=>setTxPage(p=>p-1)}>← Prev</Btn>
              <span style={{fontSize:'13px',color:'var(--text-muted)'}}>Page {txPage} of {totalPages}</span>
              <Btn variant="secondary" size="sm" disabled={txPage>=totalPages} onClick={()=>setTxPage(p=>p+1)}>Next →</Btn>
            </div>
          )}
        </div>
      )}

      {/* ══ BUDGETS ══ */}
      {tab==='budgets'&&(
        <div>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:'16px',alignItems:'center'}}>
            <p style={{fontSize:'13px',color:'var(--text-secondary)'}}>Monthly spending targets vs actual spend this month.</p>
            <Btn onClick={()=>{setEditBudget('new');setBudgetForm({category:'',monthlyTarget:'',icon:'📦',color:'#22c55e'})}}><Plus size={14}/> Add budget</Btn>
          </div>
          {(editBudget)&&(
            <Card style={{marginBottom:'16px',border:'1px solid var(--accent-border)'}}>
              <div style={{display:'flex',gap:'10px',flexWrap:'wrap',alignItems:'flex-end'}}>
                <div style={{flex:1,minWidth:140}}>
                  <label style={{fontSize:'12px',color:'var(--text-muted)',display:'block',marginBottom:'3px'}}>Category</label>
                  <select value={budgetForm.category} onChange={e=>{const c=catInfo(categories,e.target.value);setBudgetForm(f=>({...f,category:e.target.value,icon:c.icon,color:c.color}))}}>
                    <option value="">Select…</option>
                    {categories.map(c=><option key={c.name} value={c.name}>{c.icon} {c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{fontSize:'12px',color:'var(--text-muted)',display:'block',marginBottom:'3px'}}>Monthly target (£)</label>
                  <input type="number" value={budgetForm.monthlyTarget} onChange={e=>setBudgetForm(f=>({...f,monthlyTarget:e.target.value}))} style={{width:120}}/>
                </div>
                <Btn onClick={()=>{
                  if (!budgetForm.category||!budgetForm.monthlyTarget) return
                  setBudgets(prev=>{
                    const exists=prev.findIndex(b=>b.category===budgetForm.category)
                    const entry={category:budgetForm.category,monthlyTarget:parseFloat(budgetForm.monthlyTarget),icon:budgetForm.icon,color:budgetForm.color}
                    if (exists>=0) return prev.map((b,i)=>i===exists?entry:b)
                    return [...prev,entry]
                  })
                  setEditBudget(null)
                }}>Save</Btn>
                <Btn variant="ghost" onClick={()=>setEditBudget(null)}>Cancel</Btn>
              </div>
            </Card>
          )}
          {budgets.length===0?(
            <Card style={{textAlign:'center',padding:'40px'}}>
              <p style={{fontSize:'28px',marginBottom:'10px'}}>🎯</p>
              <p style={{fontSize:'14px',color:'var(--text-secondary)'}}>No budgets set yet. Add one to start tracking!</p>
            </Card>
          ):(
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))',gap:'12px'}}>
              {budgetWithSpend.map(b=>{
                const pct=Math.round((b.spent/b.monthlyTarget)*100)
                const over=b.spent>b.monthlyTarget
                return (
                  <Card key={b.category} style={{padding:'16px',borderTop:`3px solid ${b.color}`}}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:'10px'}}>
                      <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                        <span style={{fontSize:'20px'}}>{b.icon}</span>
                        <div>
                          <p style={{fontSize:'14px',fontWeight:600}}>{b.category}</p>
                          <p style={{fontSize:'12px',color:'var(--text-muted)'}}>Target: {gbp(b.monthlyTarget)}</p>
                        </div>
                      </div>
                      <button onClick={()=>setBudgets(prev=>prev.filter(x=>x.category!==b.category))} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)'}}><Trash2 size={14}/></button>
                    </div>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:'6px'}}>
                      <span style={{fontSize:'13px',color:'var(--text-secondary)'}}>Spent: <strong style={{color:over?'var(--danger)':'var(--text-primary)'}}>{gbp(b.spent)}</strong></span>
                      <span style={{fontSize:'13px',fontWeight:700,color:pct>100?'var(--danger)':pct>80?'var(--warning)':'var(--success)'}}>{pct}%</span>
                    </div>
                    <div style={{height:6,background:'var(--bg-badge)',borderRadius:3,overflow:'hidden'}}>
                      <div style={{height:'100%',width:`${Math.min(pct,100)}%`,background:over?'var(--danger)':'var(--success)',borderRadius:3,transition:'width 0.3s'}}/>
                    </div>
                    {over&&<p style={{fontSize:'11px',color:'var(--danger)',marginTop:'6px'}}>Over by {gbp(b.spent-b.monthlyTarget)}</p>}
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ══ ACCOUNTS ══ */}
      {tab==='accounts'&&(
        <div>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:'16px',alignItems:'center'}}>
            <p style={{fontSize:'13px',color:'var(--text-secondary)'}}>Add account labels to organise your imported statements.</p>
            <Btn onClick={()=>{setShowAccForm(true);setAccForm({name:'',type:'current',institution:'',startingBalance:''})}}><Plus size={14}/> Add account</Btn>
          </div>
          {showAccForm&&(
            <Card style={{marginBottom:'16px',border:'1px solid var(--accent-border)'}}>
              <div style={{display:'flex',gap:'10px',flexWrap:'wrap',alignItems:'flex-end'}}>
                <div><label style={{fontSize:'12px',color:'var(--text-muted)',display:'block',marginBottom:'3px'}}>Account name</label>
                  <input value={accForm.name} onChange={e=>setAccForm(f=>({...f,name:e.target.value}))} placeholder="e.g. Barclays Current" autoFocus/></div>
                <div><label style={{fontSize:'12px',color:'var(--text-muted)',display:'block',marginBottom:'3px'}}>Type</label>
                  <select value={accForm.type} onChange={e=>setAccForm(f=>({...f,type:e.target.value}))}>
                    <option value="current">Current account</option>
                    <option value="savings">Savings account</option>
                    <option value="credit">Credit card</option>
                    <option value="cash">Cash</option>
                  </select></div>
                <div><label style={{fontSize:'12px',color:'var(--text-muted)',display:'block',marginBottom:'3px'}}>Bank / institution</label>
                  <input value={accForm.institution} onChange={e=>setAccForm(f=>({...f,institution:e.target.value}))} placeholder="e.g. Barclays"/></div>
                <div><label style={{fontSize:'12px',color:'var(--text-muted)',display:'block',marginBottom:'3px'}}>Starting balance (£)</label>
                  <input type="number" step="0.01" value={accForm.startingBalance} onChange={e=>setAccForm(f=>({...f,startingBalance:e.target.value}))} placeholder="0.00" style={{width:120}}/></div>
                <Btn onClick={()=>{
                  if (!accForm.name.trim()) return
                  setAccounts(prev=>[...prev,{...accForm,startingBalance:parseFloat(accForm.startingBalance)||0,id:Date.now()}])
                  setShowAccForm(false)
                }}>Add account</Btn>
                <Btn variant="ghost" onClick={()=>setShowAccForm(false)}>Cancel</Btn>
              </div>
              <p style={{fontSize:'11px',color:'var(--text-muted)',marginTop:'8px'}}>
                Starting balance is the balance on the account before any imported transactions  -  e.g. what your balance was on the first day of your statement history. DanOS adds all imported transactions on top of this.
              </p>
            </Card>
          )}
          {accounts.length===0?(
            <Card style={{textAlign:'center',padding:'40px'}}>
              <p style={{fontSize:'28px',marginBottom:'10px'}}>🏦</p>
              <p style={{fontSize:'14px',color:'var(--text-secondary)'}}>No accounts added yet.</p>
              <p style={{fontSize:'13px',color:'var(--text-muted)',marginTop:'6px'}}>Add account labels so you can tag which account each import belongs to.</p>
            </Card>
          ):(
            <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
              {accounts.map(a=>{
                const bal=accBalances[a.name]||0
                const txCount=transactions.filter(t=>t.account===a.name).length
                const isEditingBal=editAccBalId===(a.id||a.name)
                return (
                  <Card key={a.id||a.name} style={{padding:'16px'}}>
                    <div style={{display:'flex',alignItems:'center',gap:'14px'}}>
                      <div style={{width:44,height:44,borderRadius:'12px',background:a.type==='credit'?'var(--danger-soft)':a.type==='savings'?'var(--success-soft)':'var(--accent-soft)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'20px',flexShrink:0}}>
                        {a.type==='credit'?'💳':a.type==='savings'?'🐷':'🏦'}
                      </div>
                      <div style={{flex:1}}>
                        <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'3px'}}>
                          <p style={{fontSize:'14px',fontWeight:600}}>{a.name}</p>
                          <span style={{fontSize:'11px',background:'var(--bg-badge)',padding:'1px 6px',borderRadius:'4px',color:'var(--text-muted)',textTransform:'capitalize'}}>{a.type}</span>
                        </div>
                        <p style={{fontSize:'12px',color:'var(--text-muted)'}}>{a.institution} · {txCount} transactions imported</p>
                        {isEditingBal ? (
                          <div style={{display:'flex',gap:'6px',alignItems:'center',marginTop:'6px'}}>
                            <input type="number" step="0.01" defaultValue={a.startingBalance||0} autoFocus
                              onKeyDown={e=>{
                                if (e.key==='Enter') {
                                  const val=parseFloat(e.target.value)||0
                                  setAccounts(prev=>prev.map(x=>(x.id||x.name)===(a.id||a.name)?{...x,startingBalance:val}:x))
                                  setEditAccBalId(null)
                                } else if (e.key==='Escape') setEditAccBalId(null)
                              }}
                              style={{width:110,fontSize:'12px',padding:'3px 6px'}}/>
                            <button onClick={e=>{
                              const val=parseFloat(e.target.previousSibling.value)||0
                              setAccounts(prev=>prev.map(x=>(x.id||x.name)===(a.id||a.name)?{...x,startingBalance:val}:x))
                              setEditAccBalId(null)
                            }} style={{fontSize:'11px',padding:'3px 8px',background:'var(--accent)',color:'#fff',border:'none',borderRadius:'var(--radius-sm)',cursor:'pointer'}}>Save</button>
                            <button onClick={()=>setEditAccBalId(null)} style={{fontSize:'11px',padding:'3px 8px',background:'none',border:'1px solid var(--border)',borderRadius:'var(--radius-sm)',cursor:'pointer',color:'var(--text-muted)'}}>Cancel</button>
                          </div>
                        ) : (
                          <button onClick={()=>setEditAccBalId(a.id||a.name)} style={{fontSize:'11px',color:'var(--accent)',background:'none',border:'none',cursor:'pointer',padding:'4px 0 0',display:'flex',alignItems:'center',gap:'4px'}}>
                            <Pencil size={10}/> Starting balance: {gbp(a.startingBalance||0)}
                          </button>
                        )}
                      </div>
                      <div style={{textAlign:'right'}}>
                        <p style={{fontFamily:'var(--font-display)',fontSize:'20px',fontWeight:700,color:bal<0?'var(--danger)':'var(--success)'}}>{gbp(bal)}</p>
                        <p style={{fontSize:'11px',color:'var(--text-muted)'}}>current balance</p>
                      </div>
                      <button onClick={()=>setAccounts(prev=>prev.filter(x=>(x.id||x.name)!==(a.id||a.name)))} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)',flexShrink:0}}><Trash2 size={16}/></button>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
