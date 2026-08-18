import React, { useState } from 'react'
import apiClient from '../../api/client'

const AIInsightsPanel = () => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [insights, setInsights] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchInsights = async (toolName) => {
    try {
      setLoading(true)
      setError(null)
      
      // Call our backend API to get AI insights
      // For MCP tools directly, we use the /ai-insights/mcp endpoint
      const response = await apiClient.post('/ai-insights/mcp', {
        tool: toolName,
        params: {}
      })
      
      setInsights(response.data.response)
    } catch (err) {
      setError('Failed to fetch AI insights')
      console.error('Error fetching insights:', err)
    } finally {
      setLoading(false)
    }
  }

  const tools = [
    { name: 'get_inventory_summary', label: 'Inventory Summary' },
    { name: 'get_expiring_soon', label: 'Expiring Soon' },
    { name: 'get_low_stock_items', label: 'Low Stock Items' },
    { name: 'get_meal_prep_history', label: 'Meal Prep History' },
    { name: 'get_nutritional_summary', label: 'Nutritional Summary' },
    { name: 'search_inventory', label: 'Search Inventory' }
  ]

  return (
    <div className="fixed top-16 right-0 h-full w-80 bg-white shadow-lg border-l z-50 transform transition-transform duration-300 ease-in-out">
      <div className="p-4 border-b flex justify-between items-center">
        <h2 className="text-xl font-semibold">AI Insights</h2>
        <button 
          onClick={() => setIsExpanded(false)}
          className="text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>
      
      <div className="p-4">
        <div className="mb-4">
          <h3 className="font-medium mb-2">Available Tools</h3>
          <div className="grid grid-cols-2 gap-2">
            {tools.map(tool => (
              <button
                key={tool.name}
                onClick={() => fetchInsights(tool.name)}
                className="p-2 bg-blue-50 hover:bg-blue-100 rounded text-sm text-center"
              >
                {tool.label}
              </button>
            ))}
          </div>
        </div>
        
        <div>
          <h3 className="font-medium mb-2">Results</h3>
          {loading ? (
            <p>Loading insights...</p>
          ) : error ? (
            <p className="text-red-600">{error}</p>
          ) : insights ? (
            <div className="space-y-3">
              <pre className="text-sm bg-gray-100 p-2 rounded whitespace-pre-wrap overflow-auto max-h-60">
                {JSON.stringify(insights, null, 2)}
              </pre>
            </div>
          ) : (
            <p className="text-gray-500">No insights available. Select a tool to get started.</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default AIInsightsPanel