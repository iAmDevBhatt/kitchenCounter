import { useState, useCallback, useEffect, useRef } from 'react'
import Layout from '../components/Layout/Layout'
import useLabels from '../hooks/useLabels'
import apiClient from '../api/index.js'

// ── constants ────────────────────────────────────────────────────────────────
const MEALS = ['Breakfast', 'Lunch', 'Dinner']
const MEAL_ICONS = { Breakfast: '🌅', Lunch: '☀️', Dinner: '🌙' }
const STATUS_OPTS = ['Planned', 'Done', 'Skipped']
const STATUS_BADGE = {
  Planned: 'badge-orange',
  Done:    'badge-green',
  Skipped: 'badge-stone',
}
const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December']
const INV_STATUS_BADGE = {
  InUse: 'badge-orange', Stocked: 'badge-green',
  Finished: 'badge-stone', NotInStock: 'badge-red',
}

// ── helpers ───────────────────────────────────────────────────────────────────
function emptyMeal() {
  return { video_url: '', notes: '', status: 'Planned', items: [] }
}
function emptyRow(day) {
  return { id: Date.now().toString(), day, Breakfast: emptyMeal(), Lunch: emptyMeal(), Dinner: emptyMeal() }
}

// ── MealCell (small read-only cell in the table) ──────────────────────────────
function MealCell({ meal, onEdit }) {
  return (
    <div className="min-h-[60px]">
      <div className="flex items-center gap-1 mb-1">
        <span className={`${STATUS_BADGE[meal.status]} text-[10px]`}>{meal.status}</span>
        {meal.video_url && (
          <a href={meal.video_url} target="_blank" rel="noreferrer"
             className="text-orange-500 hover:text-orange-700" title="Video recipe">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </a>
        )}
      </div>
      {meal.notes && <p className="text-xs text-stone-500 mb-1 line-clamp-1">{meal.notes}</p>}
      <div className="flex flex-wrap gap-1">
        {meal.items.map(it => (
          <span key={it.id} className="text-[10px] bg-orange-50 border border-orange-200 rounded px-1.5 py-0.5 text-orange-700">
            {it.name}
          </span>
        ))}
      </div>
    </div>
  )
}

// ── MealDropZone (inside modal) ───────────────────────────────────────────────
// Uses a data attribute so pointer-based hit-testing can find it
function MealDropZone({ mealName, meal, onChange, activeOver }) {
  const removeItem = (id) => onChange({ ...meal, items: meal.items.filter(i => i.id !== id) })
  const over = activeOver === mealName

  return (
    <div className="border border-orange-100 rounded-xl p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium text-sm text-stone-700">
          {MEAL_ICONS[mealName]} {mealName}
        </span>
        <select
          value={meal.status}
          onChange={e => onChange({ ...meal, status: e.target.value })}
          className="input w-28 py-1 text-xs"
        >
          {STATUS_OPTS.map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      <input
        className="input text-xs mb-2"
        placeholder="Video URL (YouTube / Instagram…)"
        value={meal.video_url}
        onChange={e => onChange({ ...meal, video_url: e.target.value })}
      />
      <textarea
        className="input text-xs mb-2 resize-none"
        rows={2}
        placeholder="Notes…"
        value={meal.notes}
        onChange={e => onChange({ ...meal, notes: e.target.value })}
      />

      {/* drop target — data-dropzone used for hit-testing */}
      <div
        data-dropzone={mealName}
        className={`min-h-12 rounded-lg border-2 border-dashed transition-all p-2 flex flex-wrap gap-1.5 items-start
          ${over ? 'border-orange-500 bg-orange-50' : 'border-orange-200 bg-orange-50/30'}`}
      >
        {meal.items.length === 0 && (
          <span className="text-xs text-stone-400 w-full text-center py-1">
            {over ? '✅ Drop to add' : 'Drop inventory items here'}
          </span>
        )}
        {meal.items.map(it => (
          <span key={it.id}
            className="inline-flex items-center gap-1 text-xs bg-white border border-orange-200 rounded-full px-2 py-0.5 text-orange-700 shadow-sm pointer-events-auto">
            {it.name}
            <button onClick={() => removeItem(it.id)} className="text-stone-400 hover:text-red-500 leading-none">×</button>
          </span>
        ))}
      </div>
    </div>
  )
}

// ── Modal ─────────────────────────────────────────────────────────────────────
function MealPrepModal({ row, inventory, catMap, onSave, onClose }) {
  const [day, setDay]     = useState(row ? row.day : '')
  const [meals, setMeals] = useState(
    row
      ? { Breakfast: { ...row.Breakfast }, Lunch: { ...row.Lunch }, Dinner: { ...row.Dinner } }
      : { Breakfast: emptyMeal(), Lunch: emptyMeal(), Dinner: emptyMeal() }
  )
  const [invFilter, setInvFilter] = useState('All')

  // ── Pointer-based drag state ──────────────────────────────────────────────
  const [dragging,   setDragging]   = useState(null)  // { item, x, y } — set after threshold
  const [activeOver, setActiveOver] = useState(null)  // meal name under cursor
  const ghostRef    = useRef()
  const pendingRef  = useRef(null)   // { item, startX, startY } before threshold
  const draggingRef = useRef(null)   // mirrors dragging state for use inside listeners
  const activeRef   = useRef(null)   // mirrors activeOver for use inside listeners

  draggingRef.current = dragging
  activeRef.current   = activeOver

  const cats = ['All', ...new Set(inventory.map(i => catMap[i.category_id] || 'Unknown'))]
  const visibleInv = inventory.filter(i =>
    invFilter === 'All' || (catMap[i.category_id] || 'Unknown') === invFilter
  )

  // Document-level listeners — mounted once, read state via refs
  useEffect(() => {
    const onMove = (e) => {
      const cx = e.clientX
      const cy = e.clientY
      if (!pendingRef.current && !draggingRef.current) return

      // Activate drag once cursor moves > 4px from mousedown point
      if (pendingRef.current && !draggingRef.current) {
        const dx = cx - pendingRef.current.startX
        const dy = cy - pendingRef.current.startY
        if (Math.abs(dx) < 4 && Math.abs(dy) < 4) return
        const newDrag = { item: pendingRef.current.item, x: cx, y: cy }
        draggingRef.current = newDrag
        setDragging(newDrag)
        return
      }

      // Update ghost position
      setDragging(d => d ? { ...d, x: cx, y: cy } : d)

      // Hit-test drop zones
      if (ghostRef.current) ghostRef.current.style.display = 'none'
      const el = document.elementFromPoint(cx, cy)
      if (ghostRef.current) ghostRef.current.style.display = ''
      const zone = el?.closest('[data-dropzone]')
      const zoneName = zone ? zone.dataset.dropzone : null
      activeRef.current = zoneName
      setActiveOver(zoneName)
    }

    const onUp = () => {
      const d = draggingRef.current
      const a = activeRef.current
      if (d && a) {
        setMeals(prev => {
          const meal = prev[a]
          if (meal.items.find(i => i.id === d.item.id)) return prev
          return { ...prev, [a]: { ...meal, items: [...meal.items, d.item] } }
        })
      }
      pendingRef.current  = null
      draggingRef.current = null
      activeRef.current   = null
      setDragging(null)
      setActiveOver(null)
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup',   onUp)
    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup',   onUp)
    }
  }, [])  // mount once — reads state via refs, never stale

  const onItemMouseDown = (e, item) => {
    if (e.button !== 0) return  // left button only
    pendingRef.current = { item, startX: e.clientX, startY: e.clientY }
    // No preventDefault — clicks, inputs, selects all work normally
  }

  const handleSave = () => {
    if (!day || isNaN(parseInt(day)) || parseInt(day) < 1 || parseInt(day) > 31) {
      alert('Please enter a valid day (1–31)')
      return
    }
    onSave({ id: row?.id || Date.now().toString(), day: parseInt(day), ...meals })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col">
        {/* header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-orange-100">
          <h2 className="text-lg font-semibold text-stone-800">
            {row ? `Edit Day ${row.day}` : 'Add Meal Plan'}
          </h2>
          <button onClick={onClose} className="btn-ghost p-1.5 rounded-lg">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* body */}
        <div className="flex flex-1 min-h-0">
          {/* LEFT: inventory list */}
          <div className="w-60 shrink-0 border-r border-orange-100 p-4 flex flex-col gap-3 overflow-y-auto">
            <div>
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">Inventory</p>
              <p className="text-xs text-stone-400 mb-2">Drag items into a meal →</p>
              <select className="input text-xs py-1" value={invFilter} onChange={e => setInvFilter(e.target.value)}>
                {cats.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              {visibleInv.map(item => {
                const payload = { id: item.id, name: item.item_name, cat: catMap[item.category_id] || '', status: item.status, qty: item.quantity }
                const isDragging = dragging?.item.id === item.id
                return (
                  <div
                    key={item.id}
                    onMouseDown={e => onItemMouseDown(e, payload)}
                    className={`flex items-center justify-between bg-orange-50 border border-orange-200 rounded-lg px-2.5 py-2 cursor-grab hover:bg-orange-100 transition-colors select-none
                      ${isDragging ? 'opacity-40' : ''}`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-stone-800 truncate">{item.item_name}</p>
                      <p className="text-[10px] text-stone-400 truncate">{catMap[item.category_id] || ''}</p>
                    </div>
                    <span className={`${INV_STATUS_BADGE[item.status]} text-[9px] ml-1 flex-shrink-0`}>{item.status}</span>
                  </div>
                )
              })}
              {visibleInv.length === 0 && (
                <p className="text-xs text-stone-400 text-center py-4">No items.</p>
              )}
            </div>
          </div>

          {/* RIGHT: meal drop zones */}
          <div className="flex-1 p-5 overflow-y-auto flex flex-col gap-3">
            {!row && (
              <div className="flex items-center gap-3">
                <label className="label mb-0 whitespace-nowrap">Day of month</label>
                <input
                  type="number" min="1" max="31"
                  className="input w-24"
                  placeholder="e.g. 15"
                  value={day}
                  onChange={e => setDay(e.target.value)}
                />
              </div>
            )}
            {MEALS.map(m => (
              <MealDropZone
                key={m}
                mealName={m}
                meal={meals[m]}
                onChange={updated => setMeals(prev => ({ ...prev, [m]: updated }))}
                activeOver={activeOver}
              />
            ))}
          </div>
        </div>

        {/* footer */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-orange-100">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleSave} className="btn-primary">
            {row ? 'Save Changes' : 'Add Meal Plan'}
          </button>
        </div>
      </div>

      {/* Floating ghost that follows the cursor */}
      {dragging && (
        <div
          ref={ghostRef}
          className="fixed z-[100] pointer-events-none bg-white border-2 border-orange-400 rounded-lg px-3 py-2 shadow-xl text-xs font-medium text-orange-700 whitespace-nowrap"
          style={{ left: dragging.x + 12, top: dragging.y - 16 }}
        >
          {dragging.item.name}
        </div>
      )}
    </div>
  )
}

// ── Delete confirmation ───────────────────────────────────────────────────────
function ConfirmDelete({ day, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
        <h3 className="text-lg font-semibold text-stone-800 mb-2">Delete Day {day}?</h3>
        <p className="text-sm text-stone-500 mb-5">This will remove all meal plans for day {day}. This cannot be undone.</p>
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="btn-secondary">Cancel</button>
          <button onClick={onConfirm} className="btn-danger">Delete</button>
        </div>
      </div>
    </div>
  )
}

const INV_STATUS_OPTIONS = ['All', 'InUse', 'Stocked', 'Finished', 'NotInStock']

// ── Main page ─────────────────────────────────────────────────────────────────
export default function KitchenSlabPage() {
  const { getLabel } = useLabels()
  const now = new Date()
  const [month, setMonth]   = useState(now.getMonth() + 1)
  const [year, setYear]     = useState(now.getFullYear())
  const [rows, setRows]     = useState([])
  const [modalRow, setModalRow]   = useState(undefined)
  const [deleteRow, setDeleteRow] = useState(null)
  const [monthCreated, setMonthCreated] = useState(false)

  // ── Inventory state ──────────────────────────────────────────────────────
  const [inventory,   setInventory]   = useState([])
  const [catMap,      setCatMap]      = useState({})
  const [invLoading,  setInvLoading]  = useState(true)
  const [nameSearch,  setNameSearch]  = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [catFilter,   setCatFilter]   = useState('All')
  const [qtyMax,      setQtyMax]      = useState('')

  useEffect(() => {
    Promise.all([apiClient.get('/inventory/'), apiClient.get('/categories/')])
      .then(([invRes, catRes]) => {
        setInventory(invRes.data)
        const m = {}
        catRes.data.forEach(c => { m[c.id] = c.name })
        setCatMap(m)
      })
      .catch(() => {})
      .finally(() => setInvLoading(false))
  }, [])

  const invCatNames = ['All', ...new Set(inventory.map(i => catMap[i.category_id] || 'Unknown').filter(Boolean))]

  const visibleInv = inventory.filter(i => {
    if (nameSearch   && !i.item_name.toLowerCase().includes(nameSearch.toLowerCase())) return false
    if (statusFilter !== 'All' && i.status !== statusFilter) return false
    if (catFilter    !== 'All' && (catMap[i.category_id] || 'Unknown') !== catFilter) return false
    if (qtyMax !== '' && (i.quantity ?? 0) > Number(qtyMax)) return false
    return true
  })

  // ── Meal plan handlers ────────────────────────────────────────────────────
  const createMonth = () => setMonthCreated(true)

  const saveRow = useCallback((saved) => {
    setRows(prev => {
      const exists = prev.find(r => r.id === saved.id)
      return exists
        ? prev.map(r => r.id === saved.id ? saved : r).sort((a,b) => a.day - b.day)
        : [...prev, saved].sort((a,b) => a.day - b.day)
    })
    setModalRow(undefined)
  }, [])

  const confirmDelete = useCallback(() => {
    setRows(prev => prev.filter(r => r.id !== deleteRow.id))
    setDeleteRow(null)
  }, [deleteRow])

  return (
    <Layout>
      {/* ── Page header ── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">{getLabel('page.kitchen-slab.title') || 'Kitchen Slab'}</h1>
          <p className="page-subtitle">Filter inventory and plan your meals</p>
        </div>
      </div>

      {/* ══ SECTION 1: Kitchen Counter ══ */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h2 className="text-base font-semibold text-stone-800">📦 Kitchen Counter</h2>
          {!invLoading && (
            <span className="text-xs text-stone-400">{visibleInv.length} item{visibleInv.length !== 1 ? 's' : ''}</span>
          )}
        </div>

        {/* Filter bar */}
        <div className="flex flex-col sm:flex-row gap-2 mb-4 flex-wrap">
          {/* Item name search */}
          <div className="relative flex-1 min-w-[140px]">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"/>
            </svg>
            <input
              className="input pl-8 text-sm"
              placeholder="Search by name…"
              value={nameSearch}
              onChange={e => setNameSearch(e.target.value)}
            />
          </div>

          {/* Category filter */}
          <select
            className="input w-auto text-sm"
            value={catFilter}
            onChange={e => setCatFilter(e.target.value)}
          >
            {invCatNames.map(c => <option key={c}>{c}</option>)}
          </select>

          {/* Status filter */}
          <select
            className="input w-auto text-sm"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            {INV_STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
          </select>

          {/* Max quantity filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-stone-500 whitespace-nowrap">Qty ≤</span>
            <input
              type="number" min="0"
              className="input w-20 text-sm"
              placeholder="Any"
              value={qtyMax}
              onChange={e => setQtyMax(e.target.value)}
            />
          </div>

          {/* Clear filters */}
          {(nameSearch || statusFilter !== 'All' || catFilter !== 'All' || qtyMax !== '') && (
            <button
              className="btn-ghost text-xs"
              onClick={() => { setNameSearch(''); setStatusFilter('All'); setCatFilter('All'); setQtyMax('') }}
            >
              ✕ Clear
            </button>
          )}
        </div>

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th className="th">Item</th>
                <th className="th">Category</th>
                <th className="th">Status</th>
                <th className="th">Qty</th>
                <th className="th">Usage</th>
              </tr>
            </thead>
            <tbody>
              {invLoading && (
                <tr><td colSpan={5} className="td text-center text-stone-400 py-8 text-sm">Loading…</td></tr>
              )}
              {!invLoading && visibleInv.length === 0 && (
                <tr><td colSpan={5} className="td text-center text-stone-400 py-8 text-sm">No items match the current filters.</td></tr>
              )}
              {!invLoading && visibleInv.map(item => (
                <tr key={item.id} className="hover:bg-orange-50/50 transition-colors">
                  <td className="td font-medium text-stone-800">{item.item_name}</td>
                  <td className="td text-stone-500 text-sm">{catMap[item.category_id] || '—'}</td>
                  <td className="td">
                    <span className={INV_STATUS_BADGE[item.status] || 'badge-stone'}>{item.status}</span>
                  </td>
                  <td className="td text-stone-700">{item.quantity ?? '—'}</td>
                  <td className="td">
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-orange-100 rounded-full h-1.5 flex-shrink-0">
                        <div
                          className="bg-orange-500 h-1.5 rounded-full transition-all"
                          style={{ width: `${item.usage_percentage ?? 0}%` }}
                        />
                      </div>
                      <span className="text-xs text-stone-400">{item.usage_percentage ?? 0}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-stone-400 mt-2">💡 Tip: use the meal planner below — drag inventory items from the panel into meal slots</p>
      </div>

      {/* ══ SECTION 2: Monthly Meal Prep Table ══ */}
      <div className="card">
        {/* Header row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <h2 className="text-base font-semibold text-stone-800">📅 Monthly Meal Plan</h2>
          <div className="flex items-center gap-2 flex-wrap">
            <select className="input w-auto text-sm py-1.5" value={month} onChange={e => setMonth(+e.target.value)}>
              {MONTHS.map((m,i) => <option key={m} value={i+1}>{m}</option>)}
            </select>
            <select className="input w-24 text-sm py-1.5" value={year} onChange={e => setYear(+e.target.value)}>
              {Array.from({length:5},(_,i) => now.getFullYear()-2+i).map(y => (
                <option key={y}>{y}</option>
              ))}
            </select>
            {!monthCreated ? (
              <button onClick={createMonth} className="btn-primary text-sm py-1.5">
                Create Month
              </button>
            ) : (
              <button onClick={() => setModalRow(null)} className="btn-primary text-sm py-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
                </svg>
                Add Day
              </button>
            )}
          </div>
        </div>

        {/* Not created yet */}
        {!monthCreated && (
          <div className="flex flex-col items-center justify-center py-16 text-stone-400">
            <span className="text-5xl mb-4">📋</span>
            <p className="text-sm font-medium text-stone-500">No meal plan for {MONTHS[month-1]} {year}</p>
            <p className="text-xs mt-1 mb-4">Click "Create Month" to start planning meals for this month.</p>
            <button onClick={createMonth} className="btn-primary">Create Month</button>
          </div>
        )}

        {/* Table */}
        {monthCreated && (
          <>
            {rows.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-stone-400">
                <span className="text-4xl mb-3">🍽️</span>
                <p className="text-sm text-stone-500">No meal plans yet for {MONTHS[month-1]} {year}</p>
                <button onClick={() => setModalRow(null)} className="btn-primary mt-4">
                  Add First Day
                </button>
              </div>
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th className="th w-16">Day</th>
                      {MEALS.map(m => (
                        <th key={m} className="th">{MEAL_ICONS[m]} {m}</th>
                      ))}
                      <th className="th w-20">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(row => (
                      <tr key={row.id} className="hover:bg-orange-50/30 transition-colors align-top">
                        <td className="td font-bold text-stone-700 text-center">{row.day}</td>
                        {MEALS.map(m => (
                          <td key={m} className="td">
                            <MealCell meal={row[m]} />
                          </td>
                        ))}
                        <td className="td">
                          <div className="flex gap-1.5 flex-col">
                            <button
                              onClick={() => setModalRow(row)}
                              className="btn-secondary text-xs py-1 px-2">Edit</button>
                            <button
                              onClick={() => setDeleteRow(row)}
                              className="btn-danger text-xs py-1 px-2">Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Modals ── */}
      {modalRow !== undefined && (
        <MealPrepModal
          row={modalRow}
          inventory={inventory}
          catMap={catMap}
          onSave={saveRow}
          onClose={() => setModalRow(undefined)}
        />
      )}
      {deleteRow && (
        <ConfirmDelete
          day={deleteRow.day}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteRow(null)}
        />
      )}
    </Layout>
  )
}
