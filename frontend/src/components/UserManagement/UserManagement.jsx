import { useState, useEffect, useCallback } from 'react'
import apiClient from '../../api/index.js'

export default function UserManagement() {
  const [users,      setUsers]      = useState([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState('')
  const [deleteId,   setDeleteId]   = useState(null)
  const [toggling,   setToggling]   = useState(null)

  // Add-user form
  const [form,       setForm]       = useState({ username: '', email: '', password: '' })
  const [adding,     setAdding]     = useState(false)
  const [addError,   setAddError]   = useState('')

  const currentUserId = localStorage.getItem('user_id')

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const r = await apiClient.get('/auth/users')
      setUsers(r.data)
    } catch {
      setError('Could not load users.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleAdd = async () => {
    if (!form.username.trim()) { setAddError('Username is required.'); return }
    if (!form.email.trim())    { setAddError('Email is required.'); return }
    if (!form.password)        { setAddError('Password is required.'); return }
    setAdding(true); setAddError('')
    try {
      await apiClient.post('/auth/register', form)
      setForm({ username: '', email: '', password: '' })
      await load()
    } catch (e) {
      setAddError(e?.response?.data?.detail || 'Failed to add user.')
    } finally {
      setAdding(false)
    }
  }

  const handleToggle = async (user) => {
    setToggling(user.id)
    try {
      await apiClient.patch(`/auth/users/${user.id}/toggle-active`)
      await load()
    } catch {
      alert('Failed to update user.')
    } finally {
      setToggling(null)
    }
  }

  const handleDelete = async (id) => {
    try {
      await apiClient.delete(`/auth/users/${id}`)
      setDeleteId(null)
      await load()
    } catch (e) {
      alert(e?.response?.data?.detail || 'Failed to delete user.')
    }
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-stone-800 mb-1">User Management</h2>
      <p className="text-sm text-stone-500 mb-5">Add and manage users who can access KitchenCounter.</p>

      {/* Add user form */}
      <div className="p-4 bg-orange-50 rounded-xl border border-orange-100 mb-6">
        <h3 className="text-sm font-semibold text-stone-700 mb-3">Add New User</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
          <input
            className="input"
            placeholder="Username"
            value={form.username}
            onChange={e => { setF('username', e.target.value); setAddError('') }}
          />
          <input
            className="input"
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={e => { setF('email', e.target.value); setAddError('') }}
          />
          <input
            className="input"
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={e => { setF('password', e.target.value); setAddError('') }}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
          />
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleAdd} disabled={adding} className="btn-primary disabled:opacity-60">
            {adding ? 'Adding…' : '+ Add User'}
          </button>
          {addError && <p className="text-red-600 text-xs">{addError}</p>}
        </div>
      </div>

      {/* User table */}
      {loading ? (
        <div className="text-center py-8 text-stone-400 text-sm">Loading users…</div>
      ) : error ? (
        <div className="text-center py-8 text-red-500 text-sm">{error}</div>
      ) : users.length === 0 ? (
        <div className="text-center py-8 text-stone-400 text-sm">No users found.</div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th className="th">Username</th>
                <th className="th">Email</th>
                <th className="th">Status</th>
                <th className="th">Joined</th>
                <th className="th">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => {
                const isSelf = user.id === currentUserId
                const isDeleting = deleteId === user.id
                return (
                  <tr key={user.id} className="hover:bg-orange-50/40 transition-colors">
                    <td className="td">
                      <span className="font-medium text-stone-800">{user.username}</span>
                      {isSelf && (
                        <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-600 border border-orange-200">you</span>
                      )}
                    </td>
                    <td className="td text-stone-500 text-sm">{user.email}</td>
                    <td className="td">
                      {user.is_active
                        ? <span className="badge-green">Active</span>
                        : <span className="badge-red">Inactive</span>
                      }
                    </td>
                    <td className="td text-stone-400 text-sm">
                      {user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="td">
                      {isDeleting ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-red-600">Delete "{user.username}"?</span>
                          <button onClick={() => handleDelete(user.id)} className="btn-danger text-xs py-1 px-2">Yes</button>
                          <button onClick={() => setDeleteId(null)} className="btn-secondary text-xs py-1 px-2">No</button>
                        </div>
                      ) : (
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => handleToggle(user)}
                            disabled={toggling === user.id || isSelf}
                            title={isSelf ? "Can't deactivate yourself" : ''}
                            className="btn-secondary text-xs py-1 px-2 disabled:opacity-40"
                          >
                            {toggling === user.id ? '…' : user.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            onClick={() => setDeleteId(user.id)}
                            disabled={isSelf}
                            title={isSelf ? "Can't delete yourself" : ''}
                            className="btn-danger text-xs py-1 px-2 disabled:opacity-40"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
