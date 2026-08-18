import React, { useState } from 'react'
import Layout from '../components/Layout/Layout'
import InventoryTable from '../components/InventoryTable/InventoryTable'
import useLabels from '../hooks/useLabels'

const InventoryPage = () => {
  const [activeTab, setActiveTab] = useState('current')
  const { getLabel } = useLabels()
  
  return (
    <Layout>
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-6">{getLabel('page.inventory.title')}</h1>
        
        <div className="mb-6">
          <nav className="flex space-x-4 border-b">
            <button
              className={`py-2 px-4 font-medium ${activeTab === 'current' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('current')}
            >
              {getLabel('tab.current.stock')}
            </button>
            <button
              className={`py-2 px-4 font-medium ${activeTab === 'low' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('low')}
            >
              {getLabel('tab.running.low')}
            </button>
            <button
              className={`py-2 px-4 font-medium ${activeTab === 'out' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('out')}
            >
              {getLabel('tab.out.of.stock')}
            </button>
          </nav>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">
              {activeTab === 'current' && getLabel('tab.current.stock')} 
              {activeTab === 'low' && getLabel('tab.running.low')}
              {activeTab === 'out' && getLabel('tab.out.of.stock')}
            </h2>
            <button className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
              {getLabel('btn.add.item')}
            </button>
          </div>
          
          <InventoryTable 
            title={
              activeTab === 'current' ? getLabel('tab.current.stock') : 
              activeTab === 'low' ? getLabel('tab.running.low') : 
              getLabel('tab.out.of.stock')
            }
            statusFilter={
              activeTab === 'current' ? null : 
              activeTab === 'low' ? 'InUse' : 
              'NotInStock'
            }
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-xl font-semibold mb-2">Inventory Summary</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="border rounded p-3 text-center">
                <p className="text-2xl font-bold text-blue-600">24</p>
                <p className="text-gray-600">Total Items</p>
              </div>
              <div className="border rounded p-3 text-center">
                <p className="text-2xl font-bold text-green-600">18</p>
                <p className="text-gray-600">In Use</p>
              </div>
              <div className="border rounded p-3 text-center">
                <p className="text-2xl font-bold text-yellow-600">4</p>
                <p className="text-gray-600">Running Low</p>
              </div>
              <div className="border rounded p-3 text-center">
                <p className="text-2xl font-bold text-red-600">2</p>
                <p className="text-gray-600">Out of Stock</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-xl font-semibold mb-2">Recent Activity</h2>
            <ul className="space-y-2">
              <li className="flex justify-between border-b pb-2">
                <span>Added: Apples</span>
                <span className="text-sm text-gray-500">2 hours ago</span>
              </li>
              <li className="flex justify-between border-b pb-2">
                <span>Updated: Chicken Breast</span>
                <span className="text-sm text-gray-500">1 day ago</span>
              </li>
              <li className="flex justify-between border-b pb-2">
                <span>Deleted: Milk</span>
                <span className="text-sm text-gray-500">3 days ago</span>
              </li>
            </ul>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-xl font-semibold mb-2">Quick Actions</h2>
            <div className="space-y-2">
              <button className="w-full text-left p-2 hover:bg-gray-100 rounded">
                {getLabel('btn.generate.shopping.list')}
              </button>
              <button className="w-full text-left p-2 hover:bg-gray-100 rounded">
                {getLabel('btn.view.expiring.soon')}
              </button>
              <button className="w-full text-left p-2 hover:bg-gray-100 rounded">
                {getLabel('tab.running.low')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default InventoryPage