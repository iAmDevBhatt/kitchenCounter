import { useState, useCallback } from 'react'
import Layout from '../components/Layout/Layout'
import useLabels from '../hooks/useLabels'

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

// ── mock inventory items (replace with API later) ────────────────────────────
const MOCK_INVENTORY = [
  { id:'i1', name:'Apples',        cat:'Fruits',      status:'InUse',   qty:5 },
  { id:'i2', name:'Milk',          cat:'Dairy',       status:'Stocked', qty:1 },
  { id:'i3', name:'Chicken Breast',cat:'Meat',        status:'InUse',   qty:2 },
  { id:'i4', name:'Rice',          cat:'Grains',      status:'Stocked', qty:3 },
  { id:'i5', name:'Broccoli',      cat:'Vegetables',  status:'InUse',   qty:4 },
  { id:'i6', name:'Salmon',        cat:'Meat',        status:'Stocked', qty:2 },
  { id:'i7', name:'Yogurt',        cat:'Dairy',       status:'InUse',   qty:2 },
  { id:'i8', name:'Bread',         cat:'Grains',      status:'InUse',   qty:1 },
]

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
function MealDropZone({ mealName, meal, onChange, draggingItem }) {
  const [over, setOver] = useState(false)

  const onDragOver = (e) => { e.preventDefault(); setOver(true) }
  const onDragLeave = () => setOver(false)
  const onDrop = (e) => {
    e.preventDefault()
    setOver(false)
    try {
      const item = JSON.parse(e.dataTransfer.getData('inv-item'))
      if (meal.items.find(i => i.id === item.id)) return // already added
      onChange({ ...meal, items: [...meal.items, item] })
    } catch {}
  }
  const removeItem = (id) => onChange({ ...meal, items: meal.items.filter(i => i.id !== id) })

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

      {/* drop target */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`min-h-12 rounded-lg border-2 border-dashed transition-all p-2 flex flex-wrap gap-1.5 items-start
          ${over ? 'border-orange-500 bg-orange-50' : 'border-orange-200 bg-orange-50/30'}`}
      >
        {meal.items.length === 0 && (
          <span className="text-xs text-stone-400 w-full text-center py-1">
            {over ? '✅ Drop to add' : '⬅ Drag inventory items here'}
          </span>
        )}
        {meal.items.map(it => (
          <span key={it.id}
            className="inline-flex items-center gap-1 text-xs bg-white border border-orange-200 rounded-full px-2 py-0.5 text-orange-700 shadow-sm">
            {it.name}
            <button onClick={() => removeItem(it.id)} className="text-stone-400 hover:text-red-500 leading-none">×</button>
          </span>
        ))}
      </div>
    </div>
  )
}

// ── Modal ─────────────────────────────────────────────────────────────────────
function MealPrepModal({ row, onSave, onClose }) {
  const [day, setDay]           = useState(row ? row.day : '')
  const [meals, setMeals]       = useState(
    row
      ? { Breakfast: { ...row.Breakfast }, Lunch: { ...row.Lunch }, Dinner: { ...row.Dinner } }
      : { Breakfast: emptyMeal(), Lunch: emptyMeal(), Dinner: emptyMeal() }
  )
  const [invFilter, setInvFilter] = useState('All')
  const [draggingItem, setDraggingItem] = useState(null)

  const cats = ['All', ...new Set(MOCK_INVENTORY.map(i => i.cat))]
  const visibleInv = MOCK_INVENTORY.filter(i => invFilter === 'All' || i.cat === invFilter)

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
        <div className="flex flex-1 overflow-hidden">
          {/* left: inventory panel */}
          <div className="w-56 shrink-0 border-r border-orange-100 p-4 flex flex-col gap-3 overflow-y-auto">
            <div>
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">Inventory</p>
              <p className="text-xs text-stone-400 mb-3">Drag items into a meal slot →</p>
              <select
                className="input text-xs py-1 mb-2"
                value={invFilter}
                onChange={e => setInvFilter(e.target.value)}
              >
                {cats.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              {visibleInv.map(item => (
                <div
                  key={item.id}
                  draggable
                  onDragStart={e => {
                    e.dataTransfer.setData('inv-item', JSON.stringify(item))
                    setDraggingItem(item.id)
                  }}
                  onDragEnd={() => setDraggingItem(null)}
                  className={`flex items-center justify-between bg-orange-50 border border-orange-200 rounded-lg px-2.5 py-2 cursor-grab active:cursor-grabbing hover:bg-orange-100 transition-colors
                    ${draggingItem === item.id ? 'opacity-50 scale-95' : ''}`}
                >
                  <div>
                    <p className="text-xs font-medium text-stone-800">{item.name}</p>
                    <p className="text-[10px] text-stone-400">{item.cat}</p>
                  </div>
                  <span className={`${INV_STATUS_BADGE[item.status]} text-[9px]`}>{item.status}</span>
                </div>
              ))}
            </div>
          </div>

          {/* right: meal slots */}
          <div className="flex-1 p-5 overflow-y-auto">
            {!row && (
              <div className="mb-4 flex items-center gap-3">
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
            <div className="space-y-3">
              {MEALS.map(m => (
                <MealDropZone
                  key={m}
                  mealName={m}
                  meal={meals[m]}
                  onChange={updated => setMeals(prev => ({ ...prev, [m]: updated }))}
                  draggingItem={draggingItem}
                />
              ))}
            </div>
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

// ── Main page ─────────────────────────────────────────────────────────────────
export default function KitchenSlabPage() {
  const { getLabel } = useLabels()
  const now = new Date()
  const [month, setMonth]   = useState(now.getMonth() + 1)
  const [year, setYear]     = useState(now.getFullYear())
  const [rows, setRows]     = useState([])
  const [catFilter, setCatFilter] = useState('All')
  const [modalRow, setModalRow]   = useState(undefined) // undefined=closed, null=add, obj=edit
  const [deleteRow, setDeleteRow] = useState(null)
  const [monthCreated, setMonthCreated] = useState(false)

  // ── Handlers ────────────────────────────────────────────────────────────────
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

  // ── Inventory section (mock data, filterable) ─────────────────────────────
  const invCats = ['All', ...new Set(MOCK_INVENTORY.map(i => i.cat))]
  const visibleInv = MOCK_INVENTORY.filter(i => catFilter === 'All' || i.cat === catFilter)

  return (
    <Layout>
      {/* ── Page header ── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">{getLabel('page.kitchen-slab.title') || 'Kitchen Slab'}</h1>
          <p className="page-subtitle">Filter inventory and plan your meals</p>
        </div>
      </div>

      {/* ══ SECTION 1: Filtered Inventory ══ */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-stone-800">📦 Kitchen Counter</h2>
          <div className="flex gap-1.5 flex-wrap">
            {invCats.map(c => (
              <button key={c}
                onClick={() => setCatFilter(c)}
                className={catFilter === c ? 'tab-active text-xs py-1 px-3' : 'tab-inactive text-xs py-1 px-3'}>
                {c}
              </button>
            ))}
          </div>
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
              {visibleInv.map(row => (
                <tr key={row.id}
                  draggable
                  onDragStart={e => e.dataTransfer.setData('inv-item', JSON.stringify(row))}
                  className="hover:bg-orange-50/50 transition-colors cursor-grab active:cursor-grabbing"
                  title="Drag this item into a meal slot below"
                >
                  <td className="td font-medium text-stone-800">
                    <span className="mr-1 text-stone-300">⠿</span>{row.name}
                  </td>
                  <td className="td text-stone-500">{row.cat}</td>
                  <td className="td"><span className={INV_STATUS_BADGE[row.status]}>{row.status}</span></td>
                  <td className="td">{row.qty}</td>
                  <td className="td">
                    <div className="w-24 bg-orange-100 rounded-full h-1.5">
                      <div className="bg-orange-500 h-1.5 rounded-full" style={{ width: '50%' }} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-stone-400 mt-2">💡 Tip: drag any row into a meal slot in the planner below</p>
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
