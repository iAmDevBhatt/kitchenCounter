import React from 'react'
import { Link } from 'react-router-dom'
import useLabels from '../../hooks/useLabels'

const Layout = ({ children }) => {
  const { getLabel } = useLabels()
  
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navigation */}
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/inventory" className="text-xl font-bold text-gray-900">KitchenCounter</Link>
              <div className="ml-10 flex space-x-4">
                <Link to="/inventory" className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900">
                  {getLabel('nav.inventory')}
                </Link>
                <Link to="/kitchen-slab" className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900">
                  {getLabel('nav.kitchen-slab')}
                </Link>
                <Link to="/configuration" className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900">
                  {getLabel('nav.configuration')}
                </Link>
                <Link to="/theme" className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900">
                  {getLabel('nav.theme')}
                </Link>
              </div>
            </div>
            <div className="flex items-center">
              <button 
                onClick={() => localStorage.removeItem('access_token')}
                className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                {getLabel('nav.logout')}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  )
}

export default Layout