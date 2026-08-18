import { useState, useEffect, useCallback, useRef } from 'react'
import apiClient from '../../api/index.js'

const STATUS_OPTIONS = ['Stocked', 'InUse', 'Finished', 'NotInStock']
const STATUS_BADGE = {
  InUse:      'badge-orange',
  Stocked:    'badge-green',
  Finished:   'badge-stone',
  NotInStock: 'badge-red',
}

function expiryInfo(date) {
  if (!date) return { label: '—', cls: 'text-stone-400' }
  const days = Math.ceil((new Date(date) - new Date()) / 86400000)
  if (days < 0)  return { label: 'Expired',      cls: 'text-red-600 font-medium' }
  if (days <= 3) return { label: `${days}d left`, cls: 'text-amber-600 font-medium' }
  return { label: new Date(date).toLocaleDateString(), cls: 'text-stone-500' }
}

function usageBarColor(pct) {
  if (pct >= 80) return 'bg-red-500'
  if (pct >= 60) return 'bg-amber-500'
  if (pct >= 40) return 'bg-yellow-400'
  return 'bg-emerald-500'
}

// Resolve image URL — paths come back as "/uploads/..." from the backend
function imgUrl(path) {
  if (!path) return null
  if (path.startsWith('http')) return path
  // backend serves under /static, vite proxies /static → 127.0.0.1:8001
  return path.startsWith('/static') ? path : `/static${path}`
}

// ── Image upload zone (used inside modal) ─────────────────────────────────────
function ImageUpload({ current, onChange }) {
  const inputRef = useRef()
  const [preview, setPreview] = useState(current ? imgUrl(current) : null)
  const [dragging, setDragging] = useState(false)

  const pick = (file) => {
    if (!file) return
    const url = URL.createObjectURL(file)
    setPreview(url)
    onChange(file)
  }

  return (
    <div>
      <label className="label">Item Image</label>
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); pick(e.dataTransfer.files[0]) }}
        onClick={() => inputRef.current?.click()}
        className={`relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed cursor-pointer transition-colors
          ${dragging ? 'border-orange-400 bg-orange-50' : 'border-orange-200 hover:border-orange-400 hover:bg-orange-50'}
          ${preview ? 'h-36' : 'h-24'}`}
      >
        {preview ? (
          <>
            <img
              src={preview}
              alt="preview"
              className="h-full w-full object-cover rounded-xl"
            />
            <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/30 opacity-0 hover:opacity-100 transition-opacity">
              <span className="text-white text-xs font-medium">Click or drop to replace</span>
            </div>
          </>
        ) : (
          <>
            <svg className="w-6 h-6 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M3 16.5V19a1 1 0 001 1h16a1 1 0 001-1v-2.5M16 8l-4-4-4 4M12 4v12" />
            </svg>
            <span className="text-xs text-stone-400">Click or drag image here</span>
          </>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden"
        onChange={e => pick(e.target.files[0])} />
      {preview && (
        <button
          type="button"
          onClick={e => { e.stopPropagation(); setPreview(null); onChange(null) }}
          className="mt-1 text-xs text-red-500 hover:text-red-700"
        >
          Remove image
        </button>
      )}
    </div>
  )
}

// ── Add / Edit modal ──────────────────────────────────────────────────────────
function ItemModal({ item, categories, locations, onSave, onClose }) {
  const isEdit = !!item?.id
  const blank = {
    item_name: '', category_id: '', quantity: '', status: 'Stocked',
    usage_percentage: 0, expiration_date: '', bought_date: '',
    net_weight: '', amount: '', description: '', notes: '',
    carbohydrate: '', fiber: '', sugar: '', fat: '', protein: '',
    item_image_path: '', stored_location_id: '',
  }
  const [form, setForm] = useState(isEdit ? {
    ...blank,
    ...item,
    expiration_date:    item.expiration_date?.split('T')[0] || '',
    bought_date:        item.bought_date?.split('T')[0]     || '',
    category_id:        item.category_id        || '',
    stored_location_id: item.stored_location_id || '',
  } : blank)
  const [imageFile,    setImageFile]    = useState(null)
  const [saving,       setSaving]       = useState(false)
  const [error,        setError]        = useState('')
  const [tab,          setTab]          = useState('basic')
  const [allTags,      setAllTags]      = useState([])
  const [selectedTags, setSelectedTags] = useState([])
  const [tagSearch,    setTagSearch]    = useState('')

  useEffect(() => {
    apiClient.get('/tags/').then(r => setAllTags(r.data)).catch(() => {})
    if (isEdit) {
      apiClient.get(`/inventory/${item.id}/tags`)
        .then(r => setSelectedTags(r.data.map(t => t.id)))
        .catch(() => {})
    }
  }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const toggleTag = (id) =>
    setSelectedTags(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const handleSave = async () => {
    if (!form.item_name.trim()) { setError('Item name is required.'); return }
    if (!form.category_id)      { setError('Category is required.'); return }
    setSaving(true); setError('')
    try {
      const userId = localStorage.getItem('user_id')
      const payload = {
        item_name:        form.item_name.trim(),
        category_id:      form.category_id,
        created_by:       userId,
        status:           form.status || 'Stocked',
        quantity:         form.quantity !== '' ? parseInt(form.quantity) : null,
        usage_percentage: form.usage_percentage !== '' ? parseInt(form.usage_percentage) : 0,
        expiration_date:  form.expiration_date || null,
        bought_date:      form.bought_date     || null,
        net_weight:       form.net_weight  !== '' ? parseFloat(form.net_weight)  : null,
        amount:           form.amount      !== '' ? parseFloat(form.amount)      : null,
        description:      form.description || null,
        notes:            form.notes       || null,
        carbohydrate:     form.carbohydrate !== '' ? parseFloat(form.carbohydrate) : null,
        fiber:            form.fiber        !== '' ? parseFloat(form.fiber)        : null,
        sugar:            form.sugar        !== '' ? parseFloat(form.sugar)        : null,
        fat:              form.fat          !== '' ? parseFloat(form.fat)          : null,
        protein:          form.protein      !== '' ? parseFloat(form.protein)      : null,
        item_image_path:    form.item_image_path    || null,
        stored_location_id: form.stored_location_id || null,
      }
      await onSave(payload, isEdit ? item.id : null, selectedTags, imageFile)
    } catch (e) {
      setError(e?.response?.data?.detail || 'Failed to save.')
    } finally {
      setSaving(false)
    }
  }

  const filteredTags = allTags.filter(t =>
    t.name.toLowerCase().includes(tagSearch.toLowerCase())
  )

  const TAG_TYPE_COLORS = {
    vitamin:  'bg-emerald-50 text-emerald-700 border-emerald-200',
    mineral:  'bg-blue-50 text-blue-700 border-blue-200',
    allergen: 'bg-red-50 text-red-600 border-red-200',
    diet:     'bg-purple-50 text-purple-700 border-purple-200',
    general:  'bg-stone-50 text-stone-600 border-stone-200',
  }

  const TABS = [
    { key: 'basic',      label: 'Basic Info' },
    { key: 'nutrition',  label: 'Nutrition' },
    { key: 'tags',       label: `Tags${selectedTags.length ? ` (${selectedTags.length})` : ''}` },
    { key: 'notes',      label: 'Notes' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-stone-100">
          <h3 className="text-lg font-semibold text-stone-800">
            {isEdit ? `Edit — ${item.item_name}` : 'Add Inventory Item'}
          </h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 text-xl leading-none">✕</button>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 px-6 pt-3">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors
                ${tab === t.key ? 'bg-orange-100 text-orange-700' : 'text-stone-500 hover:bg-stone-100'}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="mx-6 mt-3 px-3 py-2 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">
            {error}
          </div>
        )}

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
          {tab === 'basic' && (
            <div className="grid grid-cols-2 gap-3">
              {/* Image upload spans full width */}
              <div className="col-span-2">
                <ImageUpload
                  current={form.item_image_path}
                  onChange={file => setImageFile(file)}
                />
              </div>
              <div className="col-span-2">
                <label className="label">Item Name *</label>
                <input className="input" value={form.item_name}
                  onChange={e => set('item_name', e.target.value)} placeholder="e.g. Organic Apples" />
              </div>
              <div className="col-span-2">
                <label className="label">Category *</label>
                <select className="input" value={form.category_id} onChange={e => set('category_id', e.target.value)}>
                  <option value="">— Select category —</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{'— '.repeat(c.depth)}{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label className="label">Stored Location</label>
                <select className="input" value={form.stored_location_id} onChange={e => set('stored_location_id', e.target.value)}>
                  <option value="">— Select location —</option>
                  {locations.map(l => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
                {locations.length === 0 && (
                  <p className="text-xs text-stone-400 mt-1">
                    No locations yet — add them in Configuration → Storage Locations.
                  </p>
                )}
              </div>
              <div>
                <label className="label">Quantity</label>
                <input className="input" type="number" min="0" value={form.quantity}
                  onChange={e => set('quantity', e.target.value)} placeholder="0" />
              </div>
              <div>
                <label className="label">Status</label>
                <select className="input" value={form.status} onChange={e => set('status', e.target.value)}>
                  {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Bought Date</label>
                <input className="input" type="date" value={form.bought_date}
                  onChange={e => set('bought_date', e.target.value)} />
              </div>
              <div>
                <label className="label">Expiry Date</label>
                <input className="input" type="date" value={form.expiration_date}
                  onChange={e => set('expiration_date', e.target.value)} />
              </div>
              <div>
                <label className="label">Net Weight (g)</label>
                <input className="input" type="number" step="0.01" min="0" value={form.net_weight}
                  onChange={e => set('net_weight', e.target.value)} placeholder="0.00" />
              </div>
              <div>
                <label className="label">Amount / Cost</label>
                <input className="input" type="number" step="0.01" min="0" value={form.amount}
                  onChange={e => set('amount', e.target.value)} placeholder="0.00" />
              </div>
              <div className="col-span-2">
                <label className="label">Usage — {form.usage_percentage}%</label>
                <input type="range" min="0" max="100" value={form.usage_percentage}
                  onChange={e => set('usage_percentage', parseInt(e.target.value))}
                  className="w-full accent-orange-500" />
                <div className="mt-1 bg-stone-100 rounded-full h-2">
                  <div className={`h-2 rounded-full transition-all ${usageBarColor(form.usage_percentage)}`}
                    style={{ width: `${form.usage_percentage}%` }} />
                </div>
              </div>
            </div>
          )}

          {tab === 'nutrition' && (
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Carbohydrate (g)', 'carbohydrate'],
                ['Fiber (g)',        'fiber'],
                ['Sugar (g)',        'sugar'],
                ['Fat (g)',          'fat'],
                ['Protein (g)',      'protein'],
              ].map(([lbl, key]) => (
                <div key={key}>
                  <label className="label">{lbl}</label>
                  <input className="input" type="number" step="0.1" min="0"
                    value={form[key]} onChange={e => set(key, e.target.value)} placeholder="0.0" />
                </div>
              ))}
            </div>
          )}

          {tab === 'tags' && (
            <div>
              <p className="text-xs text-stone-400 mb-3">
                Select tags to attach to this item. Use tags to group items for nutrient analysis.
              </p>
              <input
                className="input mb-3"
                placeholder="Search tags…"
                value={tagSearch}
                onChange={e => setTagSearch(e.target.value)}
              />
              {filteredTags.length === 0 ? (
                <p className="text-sm text-stone-400 text-center py-6">
                  No tags found.{' '}
                  <span className="text-orange-500">Add tags from the Configuration page.</span>
                </p>
              ) : (
                <div className="flex flex-wrap gap-2 max-h-64 overflow-y-auto p-1">
                  {filteredTags.map(t => {
                    const selected = selectedTags.includes(t.id)
                    const colorCls = TAG_TYPE_COLORS[t.tag_type] || TAG_TYPE_COLORS.general
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => toggleTag(t.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-medium transition-all
                          ${selected
                            ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
                            : `${colorCls} hover:border-orange-300`
                          }`}
                      >
                        {selected && <span className="text-xs">✓</span>}
                        {t.name}
                        <span className={`text-[10px] ${selected ? 'text-orange-100' : 'text-stone-400'}`}>
                          {t.tag_type}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
              {selectedTags.length > 0 && (
                <p className="text-xs text-stone-400 mt-3">
                  {selectedTags.length} tag{selectedTags.length > 1 ? 's' : ''} selected
                </p>
              )}
            </div>
          )}

          {tab === 'notes' && (
            <>
              <div>
                <label className="label">Description</label>
                <textarea className="input resize-none" rows={3}
                  value={form.description} onChange={e => set('description', e.target.value)}
                  placeholder="Short description…" />
              </div>
              <div>
                <label className="label">Notes</label>
                <textarea className="input resize-none" rows={3}
                  value={form.notes} onChange={e => set('notes', e.target.value)}
                  placeholder="Internal notes…" />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 justify-end px-6 py-4 border-t border-stone-100">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary disabled:opacity-60">
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Item'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Delete confirm ────────────────────────────────────────────────────────────
function DeleteConfirm({ item, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <h3 className="text-lg font-semibold text-stone-800 mb-2">Delete "{item.item_name}"?</h3>
        <p className="text-sm text-stone-500 mb-4">This action cannot be undone.</p>
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="btn-secondary">Cancel</button>
          <button onClick={onConfirm} className="btn-danger">Delete</button>
        </div>
      </div>
    </div>
  )
}

// ── Flatten category tree ─────────────────────────────────────────────────────
function flattenCats(nodes, depth = 0, result = []) {
  nodes.forEach(n => {
    result.push({ id: n.id, name: n.name, depth })
    if (n.children?.length) flattenCats(n.children, depth + 1, result)
  })
  return result
}

function buildCatTree(flat) {
  const map = {}
  flat.forEach(n => { map[n.id] = { ...n, children: [] } })
  const roots = []
  flat.forEach(n => {
    if (n.parent_id && map[n.parent_id]) map[n.parent_id].children.push(map[n.id])
    else if (!n.parent_id) roots.push(map[n.id])
  })
  return roots
}

// ── Item thumbnail ────────────────────────────────────────────────────────────
function ItemThumb({ path, name }) {
  const url = imgUrl(path)
  if (!url) {
    return (
      <div className="w-9 h-9 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0 text-orange-400 text-sm font-bold select-none">
        {name?.[0]?.toUpperCase() || '?'}
      </div>
    )
  }
  return (
    <img
      src={url}
      alt={name}
      className="w-9 h-9 rounded-lg object-cover flex-shrink-0 border border-orange-100"
    />
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function InventoryTable({ statusFilter, showAllFilters, onStatsChange, showAddModal, onAddModalClose }) {
  const [items,      setItems]      = useState([])
  const [categories, setCategories] = useState([])
  const [catMap,     setCatMap]     = useState({})
  const [locations,  setLocations]  = useState([])
  const [locMap,     setLocMap]     = useState({})
  const [search,     setSearch]     = useState('')
  const [catFilter,  setCatFilter]  = useState('all')
  const [statusEx,   setStatusEx]   = useState('all')
  const [expiryFrom, setExpiryFrom] = useState('')
  const [expiryTo,   setExpiryTo]   = useState('')
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(null)
  const [editItem,   setEditItem]   = useState(null)
  const [deleteItem, setDeleteItem] = useState(null)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const [invRes, catRes, locRes] = await Promise.all([
        apiClient.get('/inventory/'),
        apiClient.get('/categories/'),
        apiClient.get('/storage-locations/'),
      ])
      const inv = invRes.data
      let itemTagMap = {}
      if (inv.length > 0) {
        const tagResults = await Promise.all(
          inv.map(i =>
            apiClient.get(`/inventory/${i.id}/tags`)
              .then(r => ({ id: i.id, tags: r.data }))
              .catch(() => ({ id: i.id, tags: [] }))
          )
        )
        tagResults.forEach(r => { itemTagMap[r.id] = r.tags })
      }
      setItems(inv.map(i => ({ ...i, _tags: itemTagMap[i.id] || [] })))

      const tree = buildCatTree(catRes.data)
      const flat = flattenCats(tree)
      const selectable = flat.filter(c => c.depth > 0)
      setCategories(selectable)
      const map = {}
      catRes.data.forEach(c => { map[c.id] = c.name })
      setCatMap(map)

      setLocations(locRes.data)
      const lmap = {}
      locRes.data.forEach(l => { lmap[l.id] = l.name })
      setLocMap(lmap)

      if (onStatsChange) {
        onStatsChange({
          total:      inv.length,
          inUse:      inv.filter(i => i.status === 'InUse').length,
          runningLow: inv.filter(i => (i.usage_percentage || 0) >= 60 && i.status === 'InUse').length,
          outOfStock: inv.filter(i => i.status === 'NotInStock' || i.status === 'Finished').length,
        })
      }
    } catch {
      setError('Could not load inventory.')
    } finally {
      setLoading(false)
    }
  }, [onStatsChange])

  useEffect(() => { load() }, [load])

  // ── save (add or edit) ──────────────────────────────────────────────────────
  const handleSave = async (payload, id, tagIds = [], imageFile = null) => {
    let savedId = id
    if (id) {
      await apiClient.put(`/inventory/${id}`, payload)
    } else {
      const res = await apiClient.post('/inventory/', payload)
      savedId = res.data.id
    }
    // Upload image if a new file was selected
    if (imageFile) {
      const fd = new FormData()
      fd.append('file', imageFile)
      await apiClient.post(`/inventory/upload-image/${savedId}`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    }
    await apiClient.put(`/inventory/${savedId}/tags`, { tag_ids: tagIds })
    await load()
    setEditItem(null)
    if (onAddModalClose) onAddModalClose()
  }

  const handleDelete = async () => {
    await apiClient.delete(`/inventory/${deleteItem.id}`)
    await load()
    setDeleteItem(null)
  }

  const updateUsage = async (item, pct) => {
    const userId = localStorage.getItem('user_id')
    try {
      const res = await apiClient.put(`/inventory/${item.id}`, {
        item_name:        item.item_name,
        category_id:      item.category_id,
        created_by:       userId,
        usage_percentage: pct,
      })
      setItems(prev => prev.map(i => i.id === item.id ? { ...res.data, _tags: i._tags } : i))
    } catch {
      alert('Failed to update usage.')
    }
  }

  // ── filter ──────────────────────────────────────────────────────────────────
  const visible = items.filter(i => {
    if (statusFilter) {
      const allowed = Array.isArray(statusFilter) ? statusFilter : [statusFilter]
      if (!allowed.includes(i.status)) return false
    }
    if (catFilter !== 'all' && i.category_id !== catFilter) return false
    if (search && !i.item_name.toLowerCase().includes(search.toLowerCase())) return false
    if (showAllFilters) {
      if (statusEx !== 'all' && i.status !== statusEx) return false
      if (expiryFrom && i.expiration_date && i.expiration_date < expiryFrom) return false
      if (expiryTo   && i.expiration_date && i.expiration_date > expiryTo)   return false
      if (expiryFrom && !i.expiration_date) return false
    }
    return true
  })

  if (loading) return (
    <div className="flex items-center justify-center py-12 text-stone-400">
      <svg className="animate-spin h-5 w-5 mr-2 text-orange-500" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
      </svg>
      Loading…
    </div>
  )

  if (error) return (
    <div className="py-8 text-center text-red-500 text-sm">{error}</div>
  )

  return (
    <div>
      {/* Filter bar */}
      <div className="flex flex-col gap-3 mb-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            <input className="input pl-9" placeholder="Search items…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="input w-auto" value={catFilter} onChange={e => setCatFilter(e.target.value)}>
            <option value="all">All Categories</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{'— '.repeat(c.depth - 1)}{c.name}</option>
            ))}
          </select>
        </div>

        {showAllFilters && (
          <div className="flex flex-col sm:flex-row gap-3 p-3 bg-stone-50 rounded-xl border border-stone-100">
            <div className="flex items-center gap-2 flex-1">
              <label className="text-xs text-stone-500 whitespace-nowrap font-medium">Status</label>
              <select className="input flex-1" value={statusEx} onChange={e => setStatusEx(e.target.value)}>
                <option value="all">All Statuses</option>
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2 flex-1">
              <label className="text-xs text-stone-500 whitespace-nowrap font-medium">Expiry from</label>
              <input type="date" className="input flex-1" value={expiryFrom} onChange={e => setExpiryFrom(e.target.value)} />
            </div>
            <div className="flex items-center gap-2 flex-1">
              <label className="text-xs text-stone-500 whitespace-nowrap font-medium">to</label>
              <input type="date" className="input flex-1" value={expiryTo} onChange={e => setExpiryTo(e.target.value)} />
            </div>
            {(statusEx !== 'all' || expiryFrom || expiryTo) && (
              <button
                onClick={() => { setStatusEx('all'); setExpiryFrom(''); setExpiryTo('') }}
                className="btn-ghost text-xs self-center whitespace-nowrap"
              >
                ✕ Clear
              </button>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th className="th">Item</th>
              <th className="th">Category</th>
              <th className="th">Location</th>
              <th className="th">Qty</th>
              <th className="th">Status</th>
              <th className="th">Usage</th>
              <th className="th">Expires</th>
              <th className="th">Actions</th>
            </tr>
          </thead>
          <tbody>
            {visible.map(item => {
              const exp = expiryInfo(item.expiration_date)
              const pct = item.usage_percentage || 0
              return (
                <tr key={item.id} className="hover:bg-orange-50/40 transition-colors">
                  <td className="td">
                    <div className="flex items-center gap-2.5">
                      <ItemThumb path={item.item_image_path} name={item.item_name} />
                      <div className="min-w-0">
                        <p className="font-medium text-stone-800 truncate">{item.item_name}</p>
                        {item._tags?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            {item._tags.map(t => (
                              <span key={t.id} className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700 border border-orange-200">
                                {t.name}
                              </span>
                            ))}
                          </div>
                        )}
                        {item.notes && <p className="text-xs text-stone-400 mt-0.5 truncate max-w-xs">{item.notes}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="td text-stone-500 text-sm">{catMap[item.category_id] || '—'}</td>
                  <td className="td text-sm">
                    {item.stored_location_id
                      ? <span className="inline-flex items-center gap-1 text-stone-600">
                          <span className="text-xs">📍</span>{locMap[item.stored_location_id] || '—'}
                        </span>
                      : <span className="text-stone-300">—</span>
                    }
                  </td>
                  <td className="td font-medium">{item.quantity ?? '—'}</td>
                  <td className="td">
                    <span className={STATUS_BADGE[item.status] ?? 'badge-stone'}>{item.status}</span>
                  </td>
                  <td className="td">
                    <div className="flex items-center gap-2 min-w-[130px]">
                      <div className="flex-1 bg-stone-100 rounded-full h-2">
                        <div className={`h-2 rounded-full transition-all ${usageBarColor(pct)}`} style={{ width: `${pct}%` }} />
                      </div>
                      <input type="range" min="0" max="100" value={pct}
                        onChange={e => updateUsage(item, parseInt(e.target.value))}
                        className="w-16 accent-orange-500" />
                      <span className="text-xs text-stone-500 w-8">{pct}%</span>
                    </div>
                  </td>
                  <td className={`td text-sm ${exp.cls}`}>{exp.label}</td>
                  <td className="td">
                    <div className="flex gap-1.5">
                      <button onClick={() => setEditItem(item)} className="btn-secondary text-xs py-1 px-2">Edit</button>
                      <button onClick={() => setDeleteItem(item)} className="btn-danger text-xs py-1 px-2">Delete</button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {visible.length === 0 && !loading && (
        <div className="py-12 text-center text-stone-400 text-sm">
          {items.length === 0 ? 'No items yet — click "Add Item" to get started.' : 'No items match the current filter.'}
        </div>
      )}

      {showAddModal && (
        <ItemModal item={null} categories={categories} locations={locations} onSave={handleSave} onClose={onAddModalClose} />
      )}

      {editItem && (
        <ItemModal item={editItem} categories={categories} locations={locations} onSave={handleSave} onClose={() => setEditItem(null)} />
      )}

      {deleteItem && (
        <DeleteConfirm item={deleteItem} onConfirm={handleDelete} onCancel={() => setDeleteItem(null)} />
      )}
    </div>
  )
}
