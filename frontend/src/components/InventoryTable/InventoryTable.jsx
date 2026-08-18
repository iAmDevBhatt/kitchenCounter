import React, { useState, useEffect } from 'react'
import apiClient from '../../api/index.js'

const InventoryTable = ({ title, statusFilter }) => {
  const [items, setItems] = useState([])
  const [filteredItems, setFilteredItems] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Fetch inventory items with API
  useEffect(() => {
    const fetchInventoryItems = async () => {
      try {
        setLoading(true)
        const response = await apiClient.get('/inventory/')
        setItems(response.data)
        setError(null)
      } catch (err) {
        setError('Failed to fetch inventory items')
        console.error('Error fetching inventory:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchInventoryItems()
  }, [])

  // Apply filters when data or filters change
  useEffect(() => {
    if (!items.length) {
      setFilteredItems([])
      return
    }

    let filtered = [...items]
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.notes && item.notes.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }
    
    // Apply category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(item => {
        // For this simplified version, we'll just show the status
        return true
      })
    }
    
    // Apply status filter (if provided)
    if (statusFilter) {
      filtered = filtered.filter(item => item.status === statusFilter)
    }
    
    setFilteredItems(filtered)
  }, [items, searchTerm, selectedCategory, statusFilter])

  const handleUsagePercentageChange = async (itemId, percentage) => {
    try {
      // Update the usage_percentage in the API
      await apiClient.put(`/inventory/${itemId}`, { 
        usage_percentage: percentage 
      })
      
      // Update local state
      setItems(items.map(item => 
        item.id === itemId ? { ...item, usage_percentage: percentage } : item
      ))
    } catch (err) {
      console.error('Error updating usage percentage:', err)
      alert('Failed to update usage percentage')
    }
  }

  const getProgressBarColor = (percentage) => {
    if (percentage >= 80) return 'bg-red-500'
    if (percentage >= 60) return 'bg-orange-500'
    if (percentage >= 40) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'InUse':
        return 'bg-blue-100 text-blue-800'
      case 'Stocked':
        return 'bg-green-100 text-green-800'
      case 'Finished':
        return 'bg-gray-100 text-gray-800'
      case 'NotInStock':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getExpirationStatus = (date) => {
    if (!date) {
      return { status: 'unknown', color: 'text-gray-500' }
    }
    
    const today = new Date()
    const expirationDate = new Date(date)
    const diffTime = expirationDate - today
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays < 0) return { status: 'expired', color: 'text-red-600' }
    if (diffDays <= 3) return { status: 'expiring-soon', color: 'text-orange-600' }
    return { status: 'good', color: 'text-green-600' }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center">
        Loading inventory items...
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center text-red-600">
        {error}
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b">
        <h2 className="text-xl font-semibold">{title}</h2>
      </div>
      
      <div className="p-4 border-b bg-gray-50">
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="flex-grow">
            <input
              type="text"
              placeholder="Search items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="p-2 border rounded"
            >
              <option value="all">All Categories</option>
              <option value="Fruits">Fruits</option>
              <option value="Vegetables">Vegetables</option>
              <option value="Dairy">Dairy</option>
              <option value="Meat">Meat</option>
              <option value="Grains">Grains</option>
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usage</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expiration</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredItems.map(item => {
              const expirationStatus = getExpirationStatus(item.expiration_date)
              return (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium">{item.item_name}</div>
                    {item.notes && <div className="text-sm text-gray-500">{item.notes}</div>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {item.category_name || 'Uncategorized'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {item.quantity}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(item.status)}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={item.usage_percentage || 0}
                        onChange={(e) => handleUsagePercentageChange(item.id, parseInt(e.target.value))}
                        className="w-24"
                      />
                      <span>{item.usage_percentage || 0}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`font-medium ${expirationStatus.color}`}>
                      {item.expiration_date ? new Date(item.expiration_date).toLocaleDateString() : 'N/A'}
                      {expirationStatus.status !== 'good' && expirationStatus.status !== 'unknown' && (
                        <span className="ml-1">({expirationStatus.status})</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button className="text-blue-600 hover:text-blue-900 mr-2">Edit</button>
                    <button className="text-red-600 hover:text-red-900">Delete</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      
      {filteredItems.length === 0 && (
        <div className="p-6 text-center text-gray-500">
          No items found
        </div>
      )}
    </div>
  )
}

export default InventoryTable