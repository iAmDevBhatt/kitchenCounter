import React, { useState } from 'react'

const MealPrepGrid = ({ entries, onEntryClick }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1)
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
  
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const getDaysInMonth = (month, year) => {
    return new Date(year, month, 0).getDate()
  }

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentMonth, currentYear)
    const firstDayOfMonth = new Date(currentYear, currentMonth - 1, 1).getDay()
    
    // Create array of days (filling in empty slots at beginning and end)
    const days = []
    
    // Add empty slots for days before the first day
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(null)
    }
    
    // Add actual days
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day)
    }
    
    return (
      <div className="grid grid-cols-7 gap-1">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-center font-medium p-2 text-gray-600">
            {day}
          </div>
        ))}
        {days.map((day, index) => {
          const entry = entries.find(e => e.day === day)
          
          return (
            <div 
              key={index} 
              className={`border rounded p-2 min-h-32 cursor-pointer hover:bg-gray-50 ${
                day ? '' : 'invisible'
              } ${entry ? 'bg-blue-50' : ''}`}
              onClick={() => entry && onEntryClick(entry)}
            >
              {day && (
                <>
                  <div className="text-center font-medium">{day}</div>
                  
                  {/* Meal prep indicators */}
                  {entry && (
                    <div className="mt-1 space-y-1">
                      {entry.breakfast.status !== 'Skipped' && (
                        <span className={`inline-block text-xs px-2 py-1 rounded ${
                          entry.breakfast.status === 'Done' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          B
                        </span>
                      )}
                      {entry.lunch.status !== 'Skipped' && (
                        <span className={`inline-block text-xs px-2 py-1 rounded ${
                          entry.lunch.status === 'Done' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          L
                        </span>
                      )}
                      {entry.dinner.status !== 'Skipped' && (
                        <span className={`inline-block text-xs px-2 py-1 rounded ${
                          entry.dinner.status === 'Done' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          D
                        </span>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex flex-col md:flex-row justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Monthly Meal Prep</h2>
        
        <div className="flex gap-2 mt-2 md:mt-0">
          <select
            value={currentMonth}
            onChange={(e) => setCurrentMonth(parseInt(e.target.value))}
            className="border p-2 rounded text-sm"
          >
            {months.map((month, index) => (
              <option key={index} value={index + 1}>
                {month}
              </option>
            ))}
          </select>
          
          <select
            value={currentYear}
            onChange={(e) => setCurrentYear(parseInt(e.target.value))}
            className="border p-2 rounded text-sm"
          >
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
          
          <button 
            className="bg-blue-500 text-white px-3 py-2 rounded hover:bg-blue-600 text-sm"
          >
            Create Month
          </button>
        </div>
      </div>
      
      {renderCalendar()}
    </div>
  )
}

export default MealPrepGrid