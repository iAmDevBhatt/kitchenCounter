import React, { useState } from 'react'

const DragDropItems = ({ onDrop }) => {
  const [isDragging, setIsDragging] = useState(false)
  
  const handleDragStart = (e, item) => {
    e.dataTransfer.setData('item', JSON.stringify(item))
    setIsDragging(true)
  }
  
  const handleDragEnd = () => {
    setIsDragging(false)
  }
  
  const handleDrop = (e) => {
    e.preventDefault()
    const itemData = e.dataTransfer.getData('item')
    if (itemData) {
      const item = JSON.parse(itemData)
      onDrop(item)
    }
    setIsDragging(false)
  }
  
  const handleDragOver = (e) => {
    e.preventDefault()
  }
  
  // Mock inventory items for demonstration
  const mockItems = [
    { id: '1', name: 'Apples', category: 'Fruits', status: 'InUse' },
    { id: '2', name: 'Milk', category: 'Dairy', status: 'Stocked' },
    { id: '3', name: 'Chicken Breast', category: 'Meat', status: 'Finished' },
    { id: '4', name: 'Bread', category: 'Grains', status: 'InUse' },
  ]

  return (
    <div className="border rounded-lg p-4">
      <h3 className="text-lg font-medium mb-3">Drag Items Here</h3>
      
      <div 
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className={`min-h-32 border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
          isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
        }`}
      >
        <p className="text-gray-500">
          {isDragging 
            ? 'Drop items here to add to meal prep' 
            : 'Drag items from inventory here'}
        </p>
        
        <div className="mt-4 grid grid-cols-2 gap-2">
          {mockItems.map(item => (
            <div
              key={item.id}
              draggable
              onDragStart={(e) => handleDragStart(e, item)}
              onDragEnd={handleDragEnd}
              className="bg-white border rounded p-2 cursor-move hover:shadow-md"
            >
              <div className="font-medium">{item.name}</div>
              <div className="text-sm text-gray-600">{item.category}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default DragDropItems