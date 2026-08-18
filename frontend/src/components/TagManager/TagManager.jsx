import React, { useState, useEffect } from 'react'

const TagManager = () => {
  const [tags, setTags] = useState([])
  const [newTagName, setNewTagName] = useState('')
  const [newTagType, setNewTagType] = useState('general')
  const [editingTagId, setEditingTagId] = useState(null)
  const [editTagName, setEditTagName] = useState('')
  const [editTagType, setEditTagType] = useState('')

  // Mock data - in real implementation this would come from API
  const mockTags = [
    { id: '1', name: 'Vitamin C', tag_type: 'vitamin' },
    { id: '2', name: 'Iron', tag_type: 'vitamin' },
    { id: '3', name: 'Organic', tag_type: 'general' },
    { id: '4', name: 'Gluten-Free', tag_type: 'general' }
  ]

  useEffect(() => {
    setTags(mockTags)
  }, [])

  const handleAddTag = () => {
    if (!newTagName.trim()) return
    
    // In a real implementation, this would call an API
    console.log('Adding tag:', newTagName, 'type:', newTagType)
    
    setNewTagName('')
  }

  const handleEditTag = (tag) => {
    setEditingTagId(tag.id)
    setEditTagName(tag.name)
    setEditTagType(tag.tag_type)
  }

  const handleSaveEdit = () => {
    if (!editTagName.trim()) return
    
    // In a real implementation, this would call an API
    console.log('Saving tag edit:', editTagName, 'type:', editTagType)
    
    setEditingTagId(null)
  }

  const handleDeleteTag = (tagId) => {
    // In a real implementation, this would call an API
    console.log('Deleting tag:', tagId)
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Tag Management</h2>
      
      <div className="mb-6 p-4 bg-gray-50 rounded">
        <h3 className="font-medium mb-2">Add New Tag</h3>
        <div className="flex space-x-2">
          <input
            type="text"
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            placeholder="Tag name"
            className="border p-2 rounded flex-grow"
          />
          <select
            value={newTagType}
            onChange={(e) => setNewTagType(e.target.value)}
            className="border p-2 rounded"
          >
            <option value="general">General</option>
            <option value="vitamin">Vitamin</option>
          </select>
          <button
            onClick={handleAddTag}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Add Tag
          </button>
        </div>
      </div>

      <div className="mb-4">
        <h3 className="font-medium mb-2">Existing Tags</h3>
        <div className="border rounded overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {tags.map(tag => (
                <tr key={tag.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingTagId === tag.id ? (
                      <input
                        type="text"
                        value={editTagName}
                        onChange={(e) => setEditTagName(e.target.value)}
                        className="border p-1 rounded"
                      />
                    ) : (
                      tag.name
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingTagId === tag.id ? (
                      <select
                        value={editTagType}
                        onChange={(e) => setEditTagType(e.target.value)}
                        className="border p-1 rounded"
                      >
                        <option value="general">General</option>
                        <option value="vitamin">Vitamin</option>
                      </select>
                    ) : (
                      tag.tag_type
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {editingTagId === tag.id ? (
                      <>
                        <button
                          onClick={handleSaveEdit}
                          className="text-green-600 hover:text-green-900 mr-2"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingTagId(null)}
                          className="text-gray-600 hover:text-gray-900"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleEditTag(tag)}
                          className="text-blue-600 hover:text-blue-900 mr-2"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteTag(tag.id)}
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

export default TagManager