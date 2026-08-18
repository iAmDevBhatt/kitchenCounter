import React, { useState, useEffect } from 'react'
import CategoryTree from '../components/CategoryTree/CategoryTree'
import TagManager from '../components/TagManager/TagManager'
import UserManagement from '../components/UserManagement/UserManagement'

const ConfigurationPage = () => {
  const [activeTab, setActiveTab] = useState('categories')
  
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Configuration</h1>
      
      <div className="mb-6">
        <nav className="flex space-x-4 border-b">
          <button
            className={`py-2 px-4 font-medium ${activeTab === 'categories' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('categories')}
          >
            Category Management
          </button>
          <button
            className={`py-2 px-4 font-medium ${activeTab === 'tags' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('tags')}
          >
            Tag Management
          </button>
          <button
            className={`py-2 px-4 font-medium ${activeTab === 'users' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('users')}
          >
            User Management
          </button>
        </nav>
      </div>
      
      <div className="bg-white rounded-lg shadow p-6">
        {activeTab === 'categories' && <CategoryTree />}
        {activeTab === 'tags' && <TagManager />}
        {activeTab === 'users' && <UserManagement />}
      </div>
    </div>
  )
}

export default ConfigurationPage