import React, { useState, useEffect } from 'react'

const UserManagement = () => {
  const [users, setUsers] = useState([])
  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    password: '',
    isAdmin: false
  })
  const [editingUserId, setEditingUserId] = useState(null)
  const [editUser, setEditUser] = useState({
    username: '',
    email: '',
    isAdmin: false
  })

  // Mock data - in real implementation this would come from API
  const mockUsers = [
    { id: '1', username: 'admin', email: 'admin@kitchen.com', is_active: true, is_admin: true },
    { id: '2', username: 'user1', email: 'user1@kitchen.com', is_active: true, is_admin: false },
    { id: '3', username: 'user2', email: 'user2@kitchen.com', is_active: false, is_admin: false }
  ]

  useEffect(() => {
    setUsers(mockUsers)
  }, [])

  const handleAddUser = () => {
    if (!newUser.username.trim() || !newUser.email.trim() || !newUser.password) return
    
    // In a real implementation, this would call an API
    console.log('Adding user:', newUser)
    
    setNewUser({
      username: '',
      email: '',
      password: '',
      isAdmin: false
    })
  }

  const handleEditUser = (user) => {
    setEditingUserId(user.id)
    setEditUser({
      username: user.username,
      email: user.email,
      isAdmin: user.is_admin
    })
  }

  const handleSaveEdit = () => {
    // In a real implementation, this would call an API
    console.log('Saving user edit:', editUser)
    
    setEditingUserId(null)
  }

  const handleToggleActive = (userId) => {
    // In a real implementation, this would call an API
    console.log('Toggling user active state:', userId)
  }

  const handleDeleteUser = (userId) => {
    // In a real implementation, this would call an API
    console.log('Deleting user:', userId)
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">User Management</h2>
      
      <div className="mb-6 p-4 bg-gray-50 rounded">
        <h3 className="font-medium mb-2">Add New User</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <input
              type="text"
              value={newUser.username}
              onChange={(e) => setNewUser({...newUser, username: e.target.value})}
              placeholder="Username"
              className="border p-2 rounded w-full mb-2"
            />
            <input
              type="email"
              value={newUser.email}
              onChange={(e) => setNewUser({...newUser, email: e.target.value})}
              placeholder="Email"
              className="border p-2 rounded w-full mb-2"
            />
            <input
              type="password"
              value={newUser.password}
              onChange={(e) => setNewUser({...newUser, password: e.target.value})}
              placeholder="Password"
              className="border p-2 rounded w-full mb-2"
            />
          </div>
          <div>
            <label className="flex items-center mb-2">
              <input
                type="checkbox"
                checked={newUser.isAdmin}
                onChange={(e) => setNewUser({...newUser, isAdmin: e.target.checked})}
                className="mr-2"
              />
              Admin User
            </label>
            <button
              onClick={handleAddUser}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Add User
            </button>
          </div>
        </div>
      </div>

      <div className="mb-4">
        <h3 className="font-medium mb-2">Existing Users</h3>
        <div className="border rounded overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map(user => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingUserId === user.id ? (
                      <input
                        type="text"
                        value={editUser.username}
                        onChange={(e) => setEditUser({...editUser, username: e.target.value})}
                        className="border p-1 rounded"
                      />
                    ) : (
                      user.username
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingUserId === user.id ? (
                      <input
                        type="email"
                        value={editUser.email}
                        onChange={(e) => setEditUser({...editUser, email: e.target.value})}
                        className="border p-1 rounded"
                      />
                    ) : (
                      user.email
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {user.is_active ? (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        Active
                      </span>
                    ) : (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {editingUserId === user.id ? (
                      <>
                        <button
                          onClick={handleSaveEdit}
                          className="text-green-600 hover:text-green-900 mr-2"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingUserId(null)}
                          className="text-gray-600 hover:text-gray-900"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleEditUser(user)}
                          className="text-blue-600 hover:text-blue-900 mr-2"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleToggleActive(user.id)}
                          className="text-yellow-600 hover:text-yellow-900 mr-2"
                        >
                          {user.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6">
        <button className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 mr-2">
          Save Changes
        </button>
        <button className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600">
          Reset
        </button>
      </div>
    </div>
  )
}

export default UserManagement