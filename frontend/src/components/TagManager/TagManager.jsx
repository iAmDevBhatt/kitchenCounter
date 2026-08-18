import { useState, useEffect, useCallback } from 'react'
import apiClient from '../../api/index.js'

const TYPE_OPTIONS = ['general', 'vitamin', 'mineral', 'allergen', 'diet']

const TYPE_COLORS = {
  vitamin:  'bg-emerald-100 text-emerald-700 border-emerald-200',
  mineral:  'bg-blue-100 text-blue-700 border-blue-200',
  allergen: 'bg-red-100 text-red-600 border-red-200',
  diet:     'bg-purple-100 text-purple-700 border-purple-200',
  general:  'bg-stone-100 text-stone-600 border-stone-200',
}

export default function TagManager() {
  const [tags,        setTags]        = useState([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState('')
  const [newName,     setNewName]     = useState('')
  const [newType,     setNewType]     = useState('general')
  const [adding,      setAdding]      = useState(false)
  const [addError,    setAddError]    = useState('')
  const [editId,      setEditId]      = useState(null)
  const [editName,    setEditName]    = useState('')
  const [editType,    setEditType]    = useState('general')
  const [saving,      setSaving]      = useState(false)
  const [deleteId,    setDeleteId]    = useState(null)

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const r = await apiClient.get('/tags/')
      setTags(r.data)
    } catch {
      setError('Could not load tags.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleAdd = async () => {
    if (!newName.trim()) { setAddError('Tag name is required.'); return }
    setAdding(true); setAddError('')
    try {
      const userId = localStorage.getItem('user_id')
      await apiClient.post('/tags/', { name: newName.trim(), tag_type: newType, created_by: userId })
      setNewName(''); setNewType('general')
      await load()
    } catch (e) {
      setAddError(e?.response?.data?.detail || 'Failed to add tag.')
    } finally {
      setAdding(false)
    }
  }

  const startEdit = (tag) => {
    setEditId(tag.id)
    setEditName(tag.name)
    setEditType(tag.tag_type)
  }

  const handleSaveEdit = async () => {
    if (!editName.trim()) return
    setSaving(true)
    try {
      const userId = localStorage.getItem('user_id')
      await apiClient.put(`/tags/${editId}`, { name: editName.trim(), tag_type: editType, created_by: userId })
      setEditId(null)
      await load()
    } catch (e) {
      alert(e?.response?.data?.detail || 'Failed to save.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    try {
      await apiClient.delete(`/tags/${id}`)
      setDeleteId(null)
      await load()
    } catch (e) {
      alert(e?.response?.data?.detail || 'Failed to delete.')
    }
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-stone-800 mb-1">Tag Management</h2>
      <p className="text-sm text-stone-500 mb-5">Create and manage tags. Attach them to inventory items for nutrient tracking.</p>

      {/* Add tag form */}
      <div className="p-4 bg-orange-50 rounded-xl border border-orange-100 mb-6">
        <h3 className="text-sm font-semibold text-stone-700 mb-3">Add New Tag</h3>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            className="input flex-1"
            placeholder="Tag name (e.g. Vitamin C)"
            value={newName}
            onChange={e => { setNewName(e.target.value); setAddError('') }}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
          />
          <select className="input w-auto" value={newType} onChange={e => setNewType(e.target.value)}>
            {TYPE_OPTIONS.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
          </select>
          <button onClick={handleAdd} disabled={adding} className="btn-primary whitespace-nowrap disabled:opacity-60">
            {adding ? 'Adding…' : '+ Add Tag'}
          </button>
        </div>
        {addError && <p className="text-red-600 text-xs mt-2">{addError}</p>}
      </div>

      {/* Tag list */}
      {loading ? (
        <div className="text-center py-8 text-stone-400 text-sm">Loading tags…</div>
      ) : error ? (
        <div className="text-center py-8 text-red-500 text-sm">{error}</div>
      ) : tags.length === 0 ? (
        <div className="text-center py-8 text-stone-400 text-sm">No tags yet. Add your first tag above.</div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th className="th">Name</th>
                <th className="th">Type</th>
                <th className="th">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tags.map(tag => (
                <tr key={tag.id} className="hover:bg-orange-50/40 transition-colors">
                  <td className="td">
                    {editId === tag.id ? (
                      <input
                        className="input py-1 text-sm"
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSaveEdit()}
                        autoFocus
                      />
                    ) : (
                      <span className={`badge border ${TYPE_COLORS[tag.tag_type] || TYPE_COLORS.general}`}>
                        {tag.name}
                      </span>
                    )}
                  </td>
                  <td className="td">
                    {editId === tag.id ? (
                      <select className="input py-1 text-sm w-auto" value={editType} onChange={e => setEditType(e.target.value)}>
                        {TYPE_OPTIONS.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                      </select>
                    ) : (
                      <span className="text-xs text-stone-500 capitalize">{tag.tag_type}</span>
                    )}
                  </td>
                  <td className="td">
                    {editId === tag.id ? (
                      <div className="flex gap-1.5">
                        <button onClick={handleSaveEdit} disabled={saving} className="btn-primary text-xs py-1 px-2 disabled:opacity-60">
                          {saving ? '…' : 'Save'}
                        </button>
                        <button onClick={() => setEditId(null)} className="btn-secondary text-xs py-1 px-2">Cancel</button>
                      </div>
                    ) : deleteId === tag.id ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-red-600">Delete "{tag.name}"?</span>
                        <button onClick={() => handleDelete(tag.id)} className="btn-danger text-xs py-1 px-2">Yes</button>
                        <button onClick={() => setDeleteId(null)} className="btn-secondary text-xs py-1 px-2">No</button>
                      </div>
                    ) : (
                      <div className="flex gap-1.5">
                        <button onClick={() => startEdit(tag)} className="btn-secondary text-xs py-1 px-2">Edit</button>
                        <button onClick={() => setDeleteId(tag.id)} className="btn-danger text-xs py-1 px-2">Delete</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
