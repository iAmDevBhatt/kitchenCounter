import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import LoginPage from './pages/LoginPage'
import DietStatsPage from './pages/DietStatsPage'
import InventoryPage from './pages/InventoryPage'
import KitchenSlabPage from './pages/KitchenSlabPage'
import ConfigurationPage from './pages/ConfigurationPage'
import ThemePage from './pages/ThemePage'

function App() {
  const isAuthenticated = localStorage.getItem('access_token') !== null

  return (
    <ThemeProvider>
    <Router>
      <div className="app">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          
          {/* Protected routes */}
          {isAuthenticated ? (
            <>
              <Route path="/" element={<Navigate to="/diet-stats" replace />} />
              <Route path="/diet-stats" element={<DietStatsPage />} />
              <Route path="/inventory" element={<InventoryPage />} />
              <Route path="/kitchen-slab" element={<KitchenSlabPage />} />
              <Route path="/configuration" element={<ConfigurationPage />} />
              <Route path="/theme" element={<ThemePage />} />
            </>
          ) : (
            <Route path="*" element={<Navigate to="/login" replace />} />
          )}
        </Routes>
      </div>
    </Router>
    </ThemeProvider>
  )
}

export default App