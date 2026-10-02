import React, { useState, useMemo } from 'react'
import Card from '../components/Card'
import PageHeader from '../components/PageHeader'
import Btn from '../components/Btn'
import { Plus, Trash2, CheckCircle2, Circle, X, Minus, Package, Share2, Copy, MessageCircle } from 'lucide-react'

export default function ShoppingPage({ shoppingLists, setShoppingLists, pantryItems, setPantryItems }) {
  const [tab,           setTab]          = useState('lists')   // lists | pantry
  const [activeList,    setActiveList]   = useState(null)
  const [newListName,   setNewListName]  = useState('')
  const [newItem,       setNewItem]      = useState('')
  const [newItemQty,    setNewItemQty]   = useState('')
  const [showNewList,   setShowNewList]  = useState(false)
  const [shareModal,    setShareModal]   = useState(false)
  // Pantry
  const [pantryForm,    setPantryForm]   = useState({ name:'', category:'', qty:'', unit:'', minQty:'' })
  const [pantrySearch,  setPantrySearch] = useState('')
  const [pantryFilter,  setPantryFilter] = useState('all')  // all | low | ok

  const pantry = pantryItems || []
  function setPantry(fn) { setPantryItems(typeof fn==='function' ? fn(pantry) : fn) }

  // ── Shopping list functions ─────────────────────────────────────
  function createList() {
    if (!newListName.trim()) return
    const list = { id: Date.now(), name: newListName.trim(), items: [], createdAt: new Date().toISOString() }
    setShoppingLists(prev => [...prev, list])
    setActiveList(list.id)
    setNewListName('')
    setShowNewList(false)
  }

  function deleteList(id) {
    setShoppingLists(prev => prev.filter(l => l.id !== id))
    if (activeList === id) setActiveList(null)
  }

  function addItem(listId) {
    if (!newItem.trim()) return
    const qtyRaw = newItemQty.trim()
    const qtyNum = parseInt(qtyRaw, 10)
    const item = {
      id: Date.now(),
      name: newItem.trim(),
      qty: qtyRaw,
      qtyNum: !isNaN(qtyNum) && qtyNum > 0 ? qtyNum : null,
      qtyGot: 0,
      checked: false,
    }
    setShoppingLists(prev => prev.map(l => l.id === listId ? { ...l, items: [...l.items, item] } : l))
    setNewItem('')
    setNewItemQty('')
  }

  function toggleItem(listId, itemId) {
    setShoppingLists(prev => prev.map(l => l.id === listId
      ? { ...l, items: l.items.map(i => i.id === itemId
          ? { ...i, checked: !i.checked, qtyGot: !i.checked && i.qtyNum ? i.qtyNum : 0 }
          : i) }
      : l))
  }

  function incrementGot(listId, itemId) {
    setShoppingLists(prev => prev.map(l => l.id === listId
      ? { ...l, items: l.items.map(i => {
          if (i.id !== itemId || !i.qtyNum) return i
          const next = Math.min((i.qtyGot||0) + 1, i.qtyNum)
          return { ...i, qtyGot: next, checked: next >= i.qtyNum }
        }) }
      : l))
  }

  function decrementGot(listId, itemId) {
    setShoppingLists(prev => prev.map(l => l.id === listId
      ? { ...l, items: l.items.map(i => {
          if (i.id !== itemId || !i.qtyNum) return i
          const next = Math.max((i.qtyGot||0) - 1, 0)
          return { ...i, qtyGot: next, checked: false }
        }) }
      : l))
  }

  function deleteItem(listId, itemId) {
    setShoppingLists(prev => prev.map(l => l.id === listId
      ? { ...l, items: l.items.filter(i => i.id !== itemId) }
      : l))
  }

  function clearChecked(listId) {
    setShoppingLists(prev => prev.map(l => l.id === listId
      ? { ...l, items: l.items.filter(i => !i.checked) }
      : l))
  }

  // ── Pantry functions ────────────────────────────────────────────
  const CATEGORIES = ['Tins & Jars', 'Pasta & Rice', 'Sauces', 'Baking', 'Drinks', 'Snacks', 'Fridge', 'Freezer', 'Cleaning', 'Other']

  function addPantryItem() {
    if (!pantryForm.name.trim()) return
    setPantry(prev => [...prev, {
      id: Date.now(),
      name: pantryForm.name.trim(),
      category: pantryForm.category || 'Other',
      qty: parseInt(pantryForm.qty) || 0,
      unit: pantryForm.unit.trim() || '',
      minQty: parseInt(pantryForm.minQty) || 1,
    }])
    setPantryForm({ name:'', category:'', qty:'', unit:'', minQty:'' })
  }

  function updatePantryQty(id, delta) {
    setPantry(prev => prev.map(p => p.id===id ? { ...p, qty: Math.max(0, (p.qty||0)+delta) } : p))
  }

  function deletePantryItem(id) {
    setPantry(prev => prev.filter(p => p.id !== id))
  }

  function addLowStockToList() {
    const low = pantry.filter(p => (p.qty||0) < (p.minQty||1))
    if (!low.length) return
    // Add to active list or create one
    const listId = activeList || (() => {
      const id = Date.now()
      const list = { id, name: 'Pantry restock', items: [], createdAt: new Date().toISOString() }
      setShoppingLists(prev => [...prev, list])
      setActiveList(id)
      return id
    })()
    const newItems = low.map(p => ({
      id: Date.now() + Math.random(),
      name: p.name,
      qty: p.unit ? `${(p.minQty||1) - (p.qty||0)} ${p.unit}` : String((p.minQty||1) - (p.qty||0)),
      qtyNum: (p.minQty||1) - (p.qty||0),
      qtyGot: 0,
      checked: false,
    }))
    setShoppingLists(prev => prev.map(l => l.id===listId ? { ...l, items: [...l.items, ...newItems] } : l))
    setTab('lists')
  }

  const filteredPantry = useMemo(() => {
    let items = [...pantry]
    if (pantrySearch) items = items.filter(p => p.name.toLowerCase().includes(pantrySearch.toLowerCase()))
    if (pantryFilter === 'low')  items = items.filter(p => (p.qty||0) < (p.minQty||1))
    if (pantryFilter === 'ok')   items = items.filter(p => (p.qty||0) >= (p.minQty||1))
    return items.sort((a,b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name))
  }, [pantry, pantrySearch, pantryFilter])

  const lowStockCount = pantry.filter(p => (p.qty||0) < (p.minQty||1)).length

  // ── Share functions ─────────────────────────────────────────────
  const currentList = shoppingLists.find(l => l.id === activeList)
  const uncheckedCount = currentList?.items.filter(i => !i.checked).length ?? 0
  const checkedCount   = currentList?.items.filter(i => i.checked).length ?? 0

  function buildShareText(list) {
    if (!list) return ''
    const lines = [`🛒 ${list.name}\n`]
    list.items.filter(i => !i.checked).forEach(i => {
      const qty = i.qtyNum && i.qtyNum > 1 ? ` (×${i.qtyNum})` : i.qty ? ` (${i.qty})` : ''
      lines.push(`• ${i.name}${qty}`)
    })
    if (list.items.some(i => i.checked)) {
      lines.push('\n✓ Already got:')
      list.items.filter(i => i.checked).forEach(i => lines.push(`  ${i.name}`))
    }
    return lines.join('\n')
  }

  function copyToClipboard() {
    navigator.clipboard.writeText(buildShareText(currentList))
      .then(() => { alert('Copied to clipboard!'); setShareModal(false) })
      .catch(() => alert('Could not copy  -  try the WhatsApp option instead'))
  }

  function shareWhatsApp() {
    const text = encodeURIComponent(buildShareText(currentList))
    window.open(`https://wa.me/?text=${text}`, '_blank')
    setShareModal(false)
  }

  return (
    <div>
      <PageHeader
        title="🛒 Shopping & Pantry"
        subtitle="Lists, pantry stock, reminders"
        action={
          <div style={{display:'flex',gap:'8px'}}>
            {tab==='lists' && currentList && (
              <Btn variant="secondary" onClick={()=>setShareModal(true)}>
                <Share2 size={13}/> Share list
              </Btn>
            )}
            {tab==='lists' && <Btn onClick={() => setShowNewList(true)}><Plus size={14}/> New list</Btn>}
            {tab==='pantry' && lowStockCount > 0 && (
              <Btn variant="secondary" onClick={addLowStockToList}>
                <Plus size={13}/> Add {lowStockCount} low-stock to list
              </Btn>
            )}
          </div>
        }
      />

      {/* Tabs */}
      <div style={{display:'flex',gap:'6px',marginBottom:'20px'}}>
        <Btn variant={tab==='lists'?'primary':'secondary'} size="sm" onClick={()=>setTab('lists')}>🛒 Shopping lists</Btn>
        <Btn variant={tab==='pantry'?'primary':'secondary'} size="sm" onClick={()=>setTab('pantry')}>
          📦 Pantry / Stock {lowStockCount>0&&<span style={{background:'var(--danger)',color:'#fff',borderRadius:'10px',padding:'1px 6px',fontSize:'10px',marginLeft:'4px'}}>{lowStockCount}</span>}
        </Btn>
      </div>

      {/* ── SHARE MODAL ── */}
      {shareModal && currentList && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:200}}>
          <div style={{background:'var(--bg-card)',borderRadius:'var(--radius-lg)',padding:'28px',width:480,maxWidth:'92vw'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px'}}>
              <h2 style={{fontFamily:'var(--font-display)',fontSize:'17px',fontWeight:600}}>Share "{currentList.name}"</h2>
              <button onClick={()=>setShareModal(false)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)'}}><X size={18}/></button>
            </div>
            <pre style={{fontSize:'12px',background:'var(--bg-input)',borderRadius:'var(--radius)',padding:'12px',marginBottom:'16px',whiteSpace:'pre-wrap',maxHeight:200,overflowY:'auto',lineHeight:1.6}}>
              {buildShareText(currentList)}
            </pre>
            <div style={{display:'flex',gap:'10px'}}>
              <Btn onClick={copyToClipboard} style={{flex:1,justifyContent:'center'}}>
                <Copy size={14}/> Copy to clipboard
              </Btn>
              <Btn onClick={shareWhatsApp} style={{flex:1,justifyContent:'center',background:'#25D366',borderColor:'#25D366'}}>
                <MessageCircle size={14}/> Send via WhatsApp
              </Btn>
            </div>
            <p style={{fontSize:'11px',color:'var(--text-muted)',marginTop:'10px',textAlign:'center'}}>
              WhatsApp opens a new message  -  paste into any chat, or use "Copy" and paste into any app (Notes, Messages, etc.)
            </p>
          </div>
        </div>
      )}

      {/* ── SHOPPING LISTS TAB ── */}
      {tab==='lists' && (
        <div style={{display:'grid',gridTemplateColumns:'240px 1fr',gap:'16px'}}>
          <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
            {showNewList && (
              <Card style={{padding:'12px'}}>
                <input value={newListName} onChange={e=>setNewListName(e.target.value)} placeholder="List name..." onKeyDown={e=>e.key==='Enter'&&createList()} autoFocus/>
                <div style={{display:'flex',gap:'6px',marginTop:'8px'}}>
                  <Btn onClick={createList} size="sm">Create</Btn>
                  <Btn variant="ghost" size="sm" onClick={()=>setShowNewList(false)}>Cancel</Btn>
                </div>
              </Card>
            )}
            {shoppingLists.length===0 && !showNewList && (
              <p style={{color:'var(--text-muted)',fontSize:'13px',padding:'8px'}}>No lists yet.</p>
            )}
            {shoppingLists.map(list => {
              const remaining = list.items.filter(i=>!i.checked).length
              const isActive = activeList === list.id
              return (
                <div key={list.id} onClick={()=>setActiveList(list.id)} style={{display:'flex',alignItems:'center',gap:'10px',padding:'10px 14px',borderRadius:'var(--radius)',background:isActive?'var(--accent-soft)':'var(--bg-card)',border:isActive?'1px solid var(--accent-border)':'1px solid var(--border)',cursor:'pointer'}}>
                  <div style={{flex:1,minWidth:0}}>
                    <p style={{fontSize:'13px',fontWeight:500,color:isActive?'var(--accent)':'var(--text-primary)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{list.name}</p>
                    <p style={{fontSize:'11px',color:'var(--text-muted)'}}>{remaining} left · {list.items.length} total</p>
                  </div>
                  <button onClick={e=>{e.stopPropagation();deleteList(list.id)}} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)',flexShrink:0}}>
                    <X size={13}/>
                  </button>
                </div>
              )
            })}
          </div>

          <div>
            {!currentList ? (
              <Card>
                <div style={{textAlign:'center',padding:'40px 20px',color:'var(--text-muted)'}}>
                  <p style={{fontSize:'28px',marginBottom:'10px'}}>🛒</p>
                  <p style={{fontSize:'14px'}}>Select or create a list to get started</p>
                </div>
              </Card>
            ) : (
              <Card>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'16px',flexWrap:'wrap',gap:'8px'}}>
                  <div>
                    <h2 style={{fontFamily:'var(--font-display)',fontSize:'17px',fontWeight:600}}>{currentList.name}</h2>
                    <p style={{fontSize:'12px',color:'var(--text-muted)',marginTop:'2px'}}>{uncheckedCount} needed · {checkedCount} done</p>
                  </div>
                  {checkedCount>0 && <Btn variant="secondary" size="sm" onClick={()=>clearChecked(currentList.id)}>Clear done</Btn>}
                </div>

                <div style={{display:'flex',gap:'8px',marginBottom:'16px'}}>
                  <input value={newItem} onChange={e=>setNewItem(e.target.value)} placeholder="Add item..." onKeyDown={e=>e.key==='Enter'&&addItem(currentList.id)} style={{flex:1}}/>
                  <input value={newItemQty} onChange={e=>setNewItemQty(e.target.value)} placeholder="Qty" onKeyDown={e=>e.key==='Enter'&&addItem(currentList.id)} style={{width:70}}/>
                  <Btn onClick={()=>addItem(currentList.id)}><Plus size={14}/></Btn>
                </div>

                {currentList.items.length===0 ? (
                  <p style={{color:'var(--text-muted)',fontSize:'13px',textAlign:'center',padding:'20px'}}>Nothing on the list yet.</p>
                ) : (
                  <div style={{display:'flex',flexDirection:'column',gap:'4px'}}>
                    {currentList.items.filter(i=>!i.checked).map(item=>(
                      <ItemRow key={item.id} item={item} listId={currentList.id} onToggle={toggleItem} onDelete={deleteItem} onIncrement={incrementGot} onDecrement={decrementGot}/>
                    ))}
                    {checkedCount>0 && (
                      <>
                        <div style={{fontSize:'11px',color:'var(--text-muted)',padding:'8px 0 4px',fontWeight:600}}>DONE</div>
                        {currentList.items.filter(i=>i.checked).map(item=>(
                          <ItemRow key={item.id} item={item} listId={currentList.id} onToggle={toggleItem} onDelete={deleteItem} onIncrement={incrementGot} onDecrement={decrementGot}/>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </Card>
            )}
          </div>
        </div>
      )}

      {/* ── PANTRY TAB ── */}
      {tab==='pantry' && (
        <div>
          {/* Add item form */}
          <Card style={{marginBottom:'16px',border:'1px solid var(--border)'}}>
            <p style={{fontSize:'13px',fontWeight:600,marginBottom:'10px'}}>Add pantry item</p>
            <div style={{display:'flex',gap:'8px',flexWrap:'wrap',alignItems:'flex-end'}}>
              <div style={{flex:2,minWidth:140}}>
                <label style={{fontSize:'11px',color:'var(--text-muted)',display:'block',marginBottom:'3px'}}>Item name</label>
                <input value={pantryForm.name} onChange={e=>setPantryForm(f=>({...f,name:e.target.value}))} placeholder="e.g. Chopped tomatoes" onKeyDown={e=>e.key==='Enter'&&addPantryItem()} autoFocus/>
              </div>
              <div>
                <label style={{fontSize:'11px',color:'var(--text-muted)',display:'block',marginBottom:'3px'}}>Category</label>
                <select value={pantryForm.category} onChange={e=>setPantryForm(f=>({...f,category:e.target.value}))} style={{width:140}}>
                  <option value="">Select…</option>
                  {CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div style={{width:60}}>
                <label style={{fontSize:'11px',color:'var(--text-muted)',display:'block',marginBottom:'3px'}}>In stock</label>
                <input type="number" min="0" value={pantryForm.qty} onChange={e=>setPantryForm(f=>({...f,qty:e.target.value}))} placeholder="0" style={{width:'100%'}}/>
              </div>
              <div style={{width:70}}>
                <label style={{fontSize:'11px',color:'var(--text-muted)',display:'block',marginBottom:'3px'}}>Unit</label>
                <input value={pantryForm.unit} onChange={e=>setPantryForm(f=>({...f,unit:e.target.value}))} placeholder="tins"/>
              </div>
              <div style={{width:60}}>
                <label style={{fontSize:'11px',color:'var(--text-muted)',display:'block',marginBottom:'3px'}}>Min qty</label>
                <input type="number" min="1" value={pantryForm.minQty} onChange={e=>setPantryForm(f=>({...f,minQty:e.target.value}))} placeholder="1"/>
              </div>
              <Btn onClick={addPantryItem}><Plus size={14}/> Add</Btn>
            </div>
            <p style={{fontSize:'11px',color:'var(--text-muted)',marginTop:'8px'}}>
              Min qty = the minimum you want to keep in stock. DanOS will flag items below this.
            </p>
          </Card>

          {/* Filters */}
          <div style={{display:'flex',gap:'8px',flexWrap:'wrap',marginBottom:'14px',alignItems:'center'}}>
            <input value={pantrySearch} onChange={e=>setPantrySearch(e.target.value)} placeholder="Search pantry…" style={{width:200}}/>
            <div style={{display:'flex',gap:'4px'}}>
              {[['all','All'],['low','🔴 Low stock'],['ok','✅ OK']].map(([v,l])=>(
                <button key={v} onClick={()=>setPantryFilter(v)} style={{padding:'4px 10px',borderRadius:'20px',border:pantryFilter===v?'1px solid var(--accent)':'1px solid var(--border)',background:pantryFilter===v?'var(--accent-soft)':'transparent',color:pantryFilter===v?'var(--accent)':'var(--text-secondary)',fontSize:'12px',cursor:'pointer'}}>{l}</button>
              ))}
            </div>
            <span style={{fontSize:'12px',color:'var(--text-muted)',marginLeft:'auto'}}>{filteredPantry.length} items</span>
          </div>

          {filteredPantry.length===0 ? (
            <Card style={{textAlign:'center',padding:'40px'}}>
              <p style={{fontSize:'28px',marginBottom:'10px'}}>📦</p>
              <p style={{fontSize:'14px',color:'var(--text-secondary)'}}>No pantry items yet.</p>
              <p style={{fontSize:'13px',color:'var(--text-muted)',marginTop:'6px'}}>Add items above to track your stock levels.</p>
            </Card>
          ) : (
            (() => {
              // Group by category
              const grouped = {}
              filteredPantry.forEach(p => {
                if (!grouped[p.category]) grouped[p.category] = []
                grouped[p.category].push(p)
              })
              return Object.entries(grouped).map(([cat, items]) => (
                <Card key={cat} style={{marginBottom:'12px',padding:'0',overflow:'hidden'}}>
                  <div style={{padding:'10px 14px',background:'var(--bg-input)',borderBottom:'1px solid var(--border)',fontSize:'12px',fontWeight:600,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.06em'}}>
                    {cat} <span style={{fontWeight:400}}>({items.length})</span>
                  </div>
                  {items.map(p => {
                    const isLow = (p.qty||0) < (p.minQty||1)
                    return (
                      <div key={p.id} style={{display:'flex',alignItems:'center',gap:'12px',padding:'9px 14px',borderBottom:'1px solid var(--border)',background:isLow?'rgba(239,68,68,0.04)':'transparent'}}>
                        <div style={{flex:1,minWidth:0}}>
                          <p style={{fontSize:'13px',fontWeight:500}}>{p.name}</p>
                          <p style={{fontSize:'11px',color:'var(--text-muted)'}}>Min: {p.minQty||1}{p.unit?' '+p.unit:''}</p>
                        </div>
                        {isLow && <span style={{fontSize:'11px',background:'var(--danger-soft)',color:'var(--danger)',padding:'2px 7px',borderRadius:'4px',fontWeight:600,flexShrink:0}}>Low stock</span>}
                        {/* Qty stepper */}
                        <div style={{display:'flex',alignItems:'center',gap:'4px',background:'var(--bg-badge)',borderRadius:'var(--radius-sm)',padding:'3px 6px',flexShrink:0}}>
                          <button onClick={()=>updatePantryQty(p.id,-1)} disabled={(p.qty||0)<=0} style={{background:'none',border:'none',cursor:(p.qty||0)>0?'pointer':'not-allowed',color:(p.qty||0)>0?'var(--text-primary)':'var(--text-muted)',padding:'0 4px',opacity:(p.qty||0)>0?1:0.4}}><Minus size={12}/></button>
                          <span style={{fontSize:'13px',fontWeight:700,color:isLow?'var(--danger)':'var(--success)',minWidth:28,textAlign:'center'}}>{p.qty||0}{p.unit?' '+p.unit:''}</span>
                          <button onClick={()=>updatePantryQty(p.id,1)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-primary)',padding:'0 4px'}}><Plus size={12}/></button>
                        </div>
                        <button onClick={()=>deletePantryItem(p.id)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)',flexShrink:0}}><Trash2 size={13}/></button>
                      </div>
                    )
                  })}
                </Card>
              ))
            })()
          )}
        </div>
      )}
    </div>
  )
}

function ItemRow({ item, listId, onToggle, onDelete, onIncrement, onDecrement }) {
  // Show stepper for ANY numeric qty (including qty=1  -  you might want to track getting it)
  const hasNumericQty = item.qtyNum && item.qtyNum >= 1
  const got = item.qtyGot || 0
  const allDone = item.checked

  return (
    <div style={{display:'flex',alignItems:'center',gap:'10px',padding:'9px 10px',borderRadius:'var(--radius-sm)',background:allDone?'transparent':'var(--bg-input)',opacity:allDone?0.5:1}}>
      <button onClick={()=>onToggle(listId,item.id)} style={{background:'none',border:'none',cursor:'pointer',color:allDone?'var(--success)':'var(--text-muted)',flexShrink:0}}>
        {allDone ? <CheckCircle2 size={18}/> : <Circle size={18}/>}
      </button>

      <p style={{flex:1,fontSize:'13px',textDecoration:allDone?'line-through':'none',color:'var(--text-primary)'}}>{item.name}</p>

      {hasNumericQty ? (
        <div style={{display:'flex',alignItems:'center',gap:'4px',background:'var(--bg-badge)',borderRadius:'var(--radius-sm)',padding:'2px 4px',flexShrink:0}}>
          <button onClick={()=>onDecrement(listId,item.id)} disabled={got<=0}
            style={{background:'none',border:'none',cursor:got>0?'pointer':'not-allowed',color:got>0?'var(--text-primary)':'var(--text-muted)',padding:'0 3px',opacity:got>0?1:0.4}}>
            <Minus size={11}/>
          </button>
          <span style={{fontSize:'12px',fontWeight:600,color:got>=item.qtyNum?'var(--success)':'var(--text-primary)',minWidth:32,textAlign:'center'}}>
            {got}/{item.qtyNum}
          </span>
          <button onClick={()=>onIncrement(listId,item.id)} disabled={got>=item.qtyNum}
            style={{background:'none',border:'none',cursor:got<item.qtyNum?'pointer':'not-allowed',color:got<item.qtyNum?'var(--text-primary)':'var(--text-muted)',padding:'0 3px',opacity:got<item.qtyNum?1:0.4}}>
            <Plus size={11}/>
          </button>
        </div>
      ) : item.qty ? (
        <span style={{fontSize:'12px',color:'var(--text-muted)',background:'var(--bg-badge)',padding:'2px 8px',borderRadius:'var(--radius-sm)',flexShrink:0}}>{item.qty}</span>
      ) : null}

      <button onClick={()=>onDelete(listId,item.id)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)',flexShrink:0}}>
        <Trash2 size={13}/>
      </button>
    </div>
  )
}
