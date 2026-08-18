import React, { useState } from 'react'
import Layout from '../components/Layout/Layout'
import MealPrepGrid from '../components/MealPrepGrid/MealPrepGrid'
import useLabels from '../hooks/useLabels'

const KitchenSlabPage = () => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const { getLabel } = useLabels()
  
  // Mock data for demonstration
  const mockEntries = [
    {
      id: '1',
      day: 1,
      breakfast: {
        status: 'Planned',
        video_url: '',
        notes: 'Breakfast meal prep',
        items: ['Apples', 'Milk']
      },
      lunch: {
        status: 'Done',
        video_url: 'https://example.com/lunch-video',
        notes: 'Lunch recipe',
        items: ['Chicken Breast', 'Rice']
      },
      dinner: {
        status: 'Planned',
        video_url: '',
        notes: 'Dinner plan',
        items: ['Salmon', 'Vegetables']
      }
    },
    {
      id: '2',
      day: 2,
      breakfast: {
        status: 'Done',
        video_url: 'https://example.com/breakfast-video',
        notes: 'Smoothie bowl',
        items: ['Berries', 'Yogurt']
      },
      lunch: {
        status: 'Planned',
        video_url: '',
        notes: 'Box lunch',
        items: ['Turkey', 'Cheese', 'Lettuce']
      },
      dinner: {
        status: 'Skipped',
        video_url: '',
        notes: 'Dinner skipped',
        items: []
      }
    }
  ]

  return (
    <Layout>
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-6">{getLabel('page.kitchen-slab.title')}</h1>
        
        {/* Kitchen Counter View */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <h2 className="text-xl font-semibold mb-4">KitchenCounter (Filtered Inventory)</h2>
          
          {/* Category Filter Bar */}
          <div className="flex flex-wrap gap-2 mb-4">
            <button className="bg-gray-200 hover:bg-gray-300 px-3 py-1 rounded text-sm">
              {getLabel('field.category')}
            </button>
            <button className="bg-gray-200 hover:bg-gray-300 px-3 py-1 rounded text-sm">
              Fruits
            </button>
            <button className="bg-gray-200 hover:bg-gray-300 px-3 py-1 rounded text-sm">
              Vegetables
            </button>
            <button className="bg-gray-200 hover:bg-gray-300 px-3 py-1 rounded text-sm">
              Dairy
            </button>
          </div>
          
          {/* Inventory Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{getLabel('field.item.name')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{getLabel('field.category')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{getLabel('field.status')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{getLabel('field.quantity')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{getLabel('field.usage.percentage')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap">Apples</td>
                  <td className="px-6 py-4 whitespace-nowrap">Fruits</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                      {getLabel('status.in.use')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">5</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <input type="range" min="0" max="100" value="60" className="w-20" />
                      <span>60%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button className="text-blue-600 hover:text-blue-900 mr-2">{getLabel('btn.add.item')}</button>
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap">Milk</td>
                  <td className="px-6 py-4 whitespace-nowrap">Dairy</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      {getLabel('status.stocked')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">1</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <input type="range" min="0" max="100" value="0" className="w-20" />
                      <span>0%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button className="text-blue-600 hover:text-blue-900 mr-2">{getLabel('btn.add.item')}</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Meal Prep Grid */}
        <MealPrepGrid 
          entries={mockEntries} 
          onEntryClick={(entry) => console.log('Selected entry:', entry)}
        />

        {/* Drag Drop Items Section */}
        <div className="bg-white rounded-lg shadow p-4 mt-6">
          <h2 className="text-xl font-semibold mb-4">Drag Items to Meals</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-medium mb-2">{getLabel('field.item.name')}s</h3>
              <div className="border rounded-lg p-4">
                <p className="text-gray-600 text-center">{getLabel('theme.wallpaper.upload')}</p>
                <div className="grid grid-cols-2 gap-2 mt-4">
                  <div className="bg-blue-50 border rounded p-2 cursor-move">
                    Apples
                  </div>
                  <div className="bg-green-50 border rounded p-2 cursor-move">
                    Milk
                  </div>
                  <div className="bg-red-50 border rounded p-2 cursor-move">
                    Chicken Breast
                  </div>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="font-medium mb-2">{getLabel('mealprep.breakfast')}</h3>
              <div className="border rounded-lg p-4 min-h-32">
                <p className="text-gray-600 text-center">Drop items here to add to meal prep</p>
                <div className="mt-4 space-y-2">
                  <div className="bg-blue-100 border rounded p-2">
                    Breakfast: Apples, Milk
                  </div>
                  <div className="bg-green-100 border rounded p-2">
                    Lunch: Chicken Breast, Rice
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default KitchenSlabPage