import { useState, useEffect, useCallback } from 'react'
import apiClient from '../../api/index.js'

// ── JWT decode (no library needed — just base64) ──────────────────────────────
function getUserId() {
  try {
    const token = localStorage.getItem('access_token')
    if (!token) return null
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.user_id || payload.sub  // backend puts username in 'sub'
  } catch { return null }
}

// ── Build tree from flat list ─────────────────────────────────────────────────
function buildTree(flat) {
  const map = {}
  flat.forEach(n => { map[n.id] = { ...n, children: [] } })
  const roots = []
  flat.forEach(n => {
    if (n.parent_id && map[n.parent_id]) {
      map[n.parent_id].children.push(map[n.id])
    } else if (!n.parent_id) {
      roots.push(map[n.id])
    }
  })
  // sort children alphabetically, root always first
  const sort = node => {
    node.children.sort((a,b) => a.name.localeCompare(b.name))
    node.children.forEach(sort)
    return node
  }
  return roots.map(sort)
}

// ── Flatten tree for parent selector ─────────────────────────────────────────
function flattenTree(nodes, depth = 0, result = []) {
  nodes.forEach(n => {
    result.push({ id: n.id, name: n.name, depth })
    if (n.children?.length) flattenTree(n.children, depth + 1, result)
  })
  return result
}

const DEPTH_LABELS = ['Category', 'SubCategory', 'ChildCategory', 'GrandChildCategory']
const DEPTH_COLORS = [
  'text-orange-700 bg-orange-50 border-orange-200',
  'text-amber-700 bg-amber-50 border-amber-200',
  'text-lime-700 bg-lime-50 border-lime-200',
  'text-teal-700 bg-teal-50 border-teal-200',
]

// ── Single node row ───────────────────────────────────────────────────────────
function CategoryNode({ node, depth, allFlat, onAdd, onEdit, onDelete, isRoot }) {
  const [expanded, setExpanded] = useState(true)
  const hasChildren = node.children?.length > 0
  const indent = depth * 20

  return (
    <div>
      <div
        className="flex items-center gap-1.5 py-1.5 px-2 rounded-lg hover:bg-orange-50/60 group transition-colors"
        style={{ paddingLeft: `${8 + indent}px` }}
      >
        {/* expand toggle */}
        <button
          onClick={() => setExpanded(v => !v)}
          className="w-5 h-5 flex items-center justify-center text-stone-400 hover:text-stone-600 shrink-0"
        >
          {hasChildren
            ? (expanded ? '▾' : '▸')
            : <span className="text-stone-200">–</span>}
        </button>

        {/* icon by depth */}
        <span className="text-base shrink-0">
          {depth === 0 ? '🏠' : depth === 1 ? '📁' : depth === 2 ? '📂' : '📄'}
        </span>

        {/* name + depth label */}
        <span className="font-medium text-stone-800 text-sm flex-1 truncate">{node.name}</span>
        {depth > 0 && (
          <span className={`text-[10px] border rounded-full px-1.5 py-0.5 shrink-0 ${DEPTH_COLORS[Math.min(depth-1, 3)]}`}>
            {DEPTH_LABELS[Math.min(depth-1, 3)]}
          </span>
        )}
        {depth === 0 && (
          <span className="text-[10px] border rounded-full px-1.5 py-0.5 shrink-0 bg-stone-50 text-stone-500 border-stone-200">
            Root
          </span>
        )}

        {/* action buttons — appear on hover */}
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-1">
          <button
            onClick={() => onAdd(node)}
            className="text-xs px-2 py-0.5 rounded-md bg-orange-100 text-orange-700 hover:bg-orange-200 transition-colors"
            title={`Add child under "${node.name}"`}
          >
            + Add
          </button>
          {!isRoot && (
            <>
              <button
                onClick={() => onEdit(node)}
                className="text-xs px-2 py-0.5 rounded-md bg-stone-100 text-stone-600 hover:bg-stone-200 transition-colors"
                title="Rename"
              >
                ✏️
              </button>
              <button
                onClick={() => onDelete(node)}
                className="text-xs px-2 py-0.5 rounded-md bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                title="Delete"
              >
                🗑
              </button>
            </>
          )}
        </div>
      </div>

      {hasChildren && expanded && (
        <div>
          {node.children.map(child => (
            <CategoryNode
              key={child.id}
              node={child}
              depth={depth + 1}
              allFlat={allFlat}
              onAdd={onAdd}
              onEdit={onEdit}
              onDelete={onDelete}
              isRoot={false}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Add / Edit modal ──────────────────────────────────────────────────────────
function CategoryModal({ mode, node, parentNode, allFlat, onSave, onClose }) {
  const [name, setName]     = useState(mode === 'edit' ? node.name : '')
  const [parentId, setParentId] = useState(
    mode === 'edit'
      ? (node.parent_id || '')
      : (parentNode?.id || '')
  )
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  const handleSave = async () => {
    if (!name.trim()) { setError('Name is required.'); return }
    setSaving(true)
    setError('')
    try {
      await onSave({ name: name.trim(), parent_id: parentId || null })
    } catch (e) {
      setError(e?.response?.data?.detail || 'Failed to save.')
    } finally {
      setSaving(false)
    }
  }

  const selectableParents = allFlat.filter(n =>
    mode === 'edit' ? n.id !== node.id : true
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <h3 className="text-lg font-semibold text-stone-800 mb-4">
          {mode === 'add'
            ? `Add under "${parentNode?.name || 'Root'}"`
            : `Rename "${node.name}"`}
        </h3>

        {error && (
          <div className="mb-3 px-3 py-2 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="label">Name</label>
            <input
              className="input"
              placeholder="e.g. Citrus Fruits"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              autoFocus
            />
          </div>

          {mode === 'add' && (
            <div>
              <label className="label">Parent category</label>
              <select
                className="input"
                value={parentId}
                onChange={e => setParentId(e.target.value)}
              >
                {selectableParents.map(n => (
                  <option key={n.id} value={n.id}>
                    {'— '.repeat(n.depth)}{n.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex gap-2 justify-end mt-5">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary disabled:opacity-60">
            {saving ? 'Saving…' : mode === 'add' ? 'Add Category' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Delete confirm ────────────────────────────────────────────────────────────
function DeleteConfirm({ node, onConfirm, onCancel, error }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <h3 className="text-lg font-semibold text-stone-800 mb-2">Delete "{node.name}"?</h3>
        <p className="text-sm text-stone-500 mb-1">
          This will also delete all subcategories under it.
        </p>
        <p className="text-sm text-amber-600 mb-4">
          ⚠️ Categories linked to inventory items cannot be deleted.
        </p>
        {error && (
          <div className="mb-3 px-3 py-2 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">
            {error}
          </div>
        )}
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="btn-secondary">Cancel</button>
          <button onClick={onConfirm} className="btn-danger">Delete</button>
        </div>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function CategoryTree() {
  const [flat, setFlat]       = useState([])   // raw flat list from API
  const [tree, setTree]       = useState([])   // built tree
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')

  // modal state
  const [addParent, setAddParent]   = useState(null)   // node to add child under
  const [editNode, setEditNode]     = useState(null)
  const [deleteNode, setDeleteNode] = useState(null)
  const [deleteError, setDeleteError] = useState('')

  // ── load ──────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await apiClient.get('/categories/')
      setFlat(res.data)
      setTree(buildTree(res.data))
    } catch {
      setError('Could not load categories.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const allFlat = flattenTree(tree)

  // ── get user ID from token ────────────────────────────────────────────────
  // The backend needs created_by (UUID). We get the user object from /categories/
  // then look up the current user via their username from the JWT.
  // Simplest: store user_id in localStorage on login.
  const getCurrentUserId = async () => {
    // Try from localStorage first
    const stored = localStorage.getItem('user_id')
    if (stored) return stored
    // Fallback: fetch the first admin user id from the flat list
    // (the root category's created_by is always the admin)
    const root = flat.find(n => n.parent_id === null)
    if (root?.created_by) return root.created_by
    return null
  }

  // ── add ───────────────────────────────────────────────────────────────────
  const handleAdd = async ({ name, parent_id }) => {
    const created_by = await getCurrentUserId()
    if (!created_by) throw new Error('Cannot determine user. Please log in again.')
    await apiClient.post('/categories/', { name, parent_id: parent_id || null, created_by })
    await load()
    setAddParent(null)
  }

  // ── edit ──────────────────────────────────────────────────────────────────
  const handleEdit = async ({ name }) => {
    const created_by = await getCurrentUserId()
    await apiClient.put(`/categories/${editNode.id}`, {
      name,
      parent_id: editNode.parent_id || null,
      created_by,
    })
    await load()
    setEditNode(null)
  }

  // ── delete ────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    setDeleteError('')
    try {
      await apiClient.delete(`/categories/${deleteNode.id}`)
      await load()
      setDeleteNode(null)
    } catch (e) {
      setDeleteError(e?.response?.data?.detail || 'Failed to delete.')
    }
  }

  // ── render ────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center py-12 text-stone-400">
      <svg className="animate-spin h-5 w-5 mr-2 text-orange-400" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
      </svg>
      Loading categories…
    </div>
  )

  if (error) return (
    <div className="py-8 text-center text-red-500 text-sm">{error}</div>
  )

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-base font-semibold text-stone-800">🗂️ Category Tree</h2>
          <p className="text-xs text-stone-400 mt-0.5">
            Hover over any category to add / rename / delete it
          </p>
        </div>
        <button onClick={load} className="btn-ghost text-xs gap-1">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
          Refresh
        </button>
      </div>

      {/* Depth legend */}
      <div className="flex flex-wrap gap-2 mb-4">
        {['Root', ...DEPTH_LABELS].map((l, i) => (
          <span key={l} className={`text-[11px] border rounded-full px-2 py-0.5
            ${i === 0 ? 'bg-stone-50 text-stone-500 border-stone-200' : DEPTH_COLORS[i-1]}`}>
            {l}
          </span>
        ))}
      </div>

      {/* Tree */}
      <div className="border border-orange-100 rounded-xl bg-white overflow-y-auto max-h-[500px] p-2">
        {tree.length === 0 ? (
          <p className="text-center text-stone-400 py-8 text-sm">No categories found.</p>
        ) : (
          tree.map(root => (
            <CategoryNode
              key={root.id}
              node={root}
              depth={0}
              allFlat={allFlat}
              onAdd={node => setAddParent(node)}
              onEdit={node => setEditNode(node)}
              onDelete={node => { setDeleteError(''); setDeleteNode(node) }}
              isRoot={root.parent_id === null}
            />
          ))
        )}
      </div>

      <p className="text-xs text-stone-400 mt-2">
        {flat.length} categories total
      </p>

      {/* Modals */}
      {addParent !== null && (
        <CategoryModal
          mode="add"
          parentNode={addParent}
          allFlat={allFlat}
          onSave={handleAdd}
          onClose={() => setAddParent(null)}
        />
      )}
      {editNode && (
        <CategoryModal
          mode="edit"
          node={editNode}
          allFlat={allFlat}
          onSave={handleEdit}
          onClose={() => setEditNode(null)}
        />
      )}
      {deleteNode && (
        <DeleteConfirm
          node={deleteNode}
          onConfirm={handleDelete}
          onCancel={() => setDeleteNode(null)}
          error={deleteError}
        />
      )}
    </div>
  )
}
