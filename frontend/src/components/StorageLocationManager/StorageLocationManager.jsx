import { useState, useEffect, useCallback } from 'react'
import apiClient from '../../api/index.js'

export default function StorageLocationManager() {
  const [locations, setLocations]   = useState([])
  const [loading,   setLoading]     = useState(true)
  const [error,     setError]       = useState('')
  const [newName,   setNewName]     = useState('')
  const [adding,    setAdding]      = useState(false)
  const [addError,  setAddError]    = useState('')
  const [editId,    setEditId]      = useState(null)
  const [editName,  setEditName]    = useState('')
  const [saving,    setSaving]      = useState(false)
  const [deleteId,  setDeleteId]    = useState(null)

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const r = await apiClient.get('/storage-locations/')
      setLocations(r.data)
    } catch {
      setError('Could not load storage locations.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleAdd = async () => {
    if (!newName.trim()) { setAddError('Name is required.'); return }
    setAdding(true); setAddError('')
    try {
      const userId = localStorage.getItem('user_id')
      await apiClient.post('/storage-locations/', { name: newName.trim(), created_by: userId })
      setNewName('')
      await load()
    } catch (e) {
      setAddError(e?.response?.data?.detail || 'Failed to add location.')
    } finally {
      setAdding(false)
    }
  }

  const handleSaveEdit = async () => {
    if (!editName.trim()) return
    setSaving(true)
    try {
      await apiClient.put(`/storage-locations/${editId}`, { name: editName.trim() })
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
      await apiClient.delete(`/storage-locations/${id}`)
      setDeleteId(null)
      await load()
    } catch (e) {
      alert(e?.response?.data?.detail || 'Failed to delete.')
    }
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-stone-800 mb-1">Storage Locations</h2>
      <p className="text-sm text-stone-500 mb-5">
        Define where items are stored — e.g. Fridge, Freezer, Pantry, Spice Rack.
        These appear in the "Stored Location" dropdown when adding or editing inventory items.
      </p>

      {/* Add form */}
      <div className="p-4 bg-orange-50 rounded-xl border border-orange-100 mb-6">
        <h3 className="text-sm font-semibold text-stone-700 mb-3">Add New Location</h3>
        <div className="flex gap-2">
          <input
            className="input flex-1"
            placeholder="e.g. Fridge, Freezer, Pantry…"
            value={newName}
            onChange={e => { setNewName(e.target.value); setAddError('') }}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
          />
          <button onClick={handleAdd} disabled={adding} className="btn-primary whitespace-nowrap disabled:opacity-60">
            {adding ? 'Adding…' : '+ Add'}
          </button>
        </div>
        {addError && <p className="text-red-600 text-xs mt-2">{addError}</p>}
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center py-8 text-stone-400 text-sm">Loading…</div>
      ) : error ? (
        <div className="text-center py-8 text-red-500 text-sm">{error}</div>
      ) : locations.length === 0 ? (
        <div className="text-center py-8 text-stone-400 text-sm">
          No storage locations yet. Add your first one above.
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th className="th">Location Name</th>
                <th className="th">Actions</th>
              </tr>
            </thead>
            <tbody>
              {locations.map(loc => (
                <tr key={loc.id} className="hover:bg-orange-50/40 transition-colors">
                  <td className="td">
                    {editId === loc.id ? (
                      <input
                        className="input py-1 text-sm"
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSaveEdit()}
                        autoFocus
                      />
                    ) : (
                      <span className="font-medium text-stone-800">{loc.name}</span>
                    )}
                  </td>
                  <td className="td">
                    {editId === loc.id ? (
                      <div className="flex gap-1.5">
                        <button onClick={handleSaveEdit} disabled={saving} className="btn-primary text-xs py-1 px-2 disabled:opacity-60">
                          {saving ? '…' : 'Save'}
                        </button>
                        <button onClick={() => setEditId(null)} className="btn-secondary text-xs py-1 px-2">Cancel</button>
                      </div>
                    ) : deleteId === loc.id ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-red-600">Delete "{loc.name}"?</span>
                        <button onClick={() => handleDelete(loc.id)} className="btn-danger text-xs py-1 px-2">Yes</button>
                        <button onClick={() => setDeleteId(null)} className="btn-secondary text-xs py-1 px-2">No</button>
                      </div>
                    ) : (
                      <div className="flex gap-1.5">
                        <button onClick={() => { setEditId(loc.id); setEditName(loc.name) }} className="btn-secondary text-xs py-1 px-2">Edit</button>
                        <button onClick={() => setDeleteId(loc.id)} className="btn-danger text-xs py-1 px-2">Delete</button>
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
