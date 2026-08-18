import React, { useState, useEffect } from 'react'

const CategoryTree = () => {
  const [categories, setCategories] = useState([])
  const [expandedNodes, setExpandedNodes] = useState(new Set())
  const [newCategoryName, setNewCategoryName] = useState('')
  const [selectedParentId, setSelectedParentId] = useState(null)

  // Mock data - in real implementation this would come from API
  const mockCategories = [
    {
      id: '1',
      name: 'KitchenCategories',
      parent_id: null,
      children: [
        {
          id: '2',
          name: 'Fruits',
          parent_id: '1',
          children: [
            { id: '3', name: 'Citrus', parent_id: '2', children: [] },
            { id: '4', name: 'Berries', parent_id: '2', children: [] }
          ]
        },
        {
          id: '5',
          name: 'Vegetables',
          parent_id: '1',
          children: [
            { id: '6', name: 'Leafy Greens', parent_id: '5', children: [] },
            { id: '7', name: 'Root Vegetables', parent_id: '5', children: [] }
          ]
        }
      ]
    }
  ]

  useEffect(() => {
    setCategories(mockCategories)
  }, [])

  const toggleNode = (categoryId) => {
    const newExpandedNodes = new Set(expandedNodes)
    if (newExpandedNodes.has(categoryId)) {
      newExpandedNodes.delete(categoryId)
    } else {
      newExpandedNodes.add(categoryId)
    }
    setExpandedNodes(newExpandedNodes)
  }

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return
    
    // In a real implementation, this would call an API
    console.log('Adding category:', newCategoryName, 'under parent:', selectedParentId)
    
    setNewCategoryName('')
  }

  const renderCategoryNode = (category, level = 0) => {
    const isExpanded = expandedNodes.has(category.id)
    const hasChildren = category.children && category.children.length > 0
    
    return (
      <div key={category.id} className="mb-1">
        <div 
          className={`flex items-center p-2 rounded hover:bg-gray-100 ${level > 0 ? 'ml-4' : ''}`}
        >
          {hasChildren && (
            <button 
              onClick={() => toggleNode(category.id)}
              className="mr-2 text-gray-500 hover:text-gray-700"
            >
              {isExpanded ? '▼' : '▶'}
            </button>
          )}
          {!hasChildren && <span className="mr-2">•</span>}
          <span>{category.name}</span>
        </div>
        
        {hasChildren && isExpanded && (
          <div className="ml-4">
            {category.children.map(child => renderCategoryNode(child, level + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Category Management</h2>
      
      <div className="mb-6 p-4 bg-gray-50 rounded">
        <h3 className="font-medium mb-2">Add New Category</h3>
        <div className="flex space-x-2">
          <input
            type="text"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="Category name"
            className="border p-2 rounded flex-grow"
          />
          <select
            value={selectedParentId || ''}
            onChange={(e) => setSelectedParentId(e.target.value || null)}
            className="border p-2 rounded"
          >
            <option value="">Root</option>
            {categories.map(category => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <button
            onClick={handleAddCategory}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Add Category
          </button>
        </div>
      </div>

      <div className="mb-4">
        <h3 className="font-medium mb-2">Categories Hierarchy</h3>
        <div className="border rounded p-2 max-h-96 overflow-y-auto">
          {categories.map(category => renderCategoryNode(category))}
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

export default CategoryTree