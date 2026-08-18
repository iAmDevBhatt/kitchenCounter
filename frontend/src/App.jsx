import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import InventoryPage from './pages/InventoryPage'
import KitchenSlabPage from './pages/KitchenSlabPage'
import ConfigurationPage from './pages/ConfigurationPage'
import ThemePage from './pages/ThemePage'

function App() {
  // Simple check for authentication (mock)
  const isAuthenticated = localStorage.getItem('access_token') !== null

  return (
    <Router>
      <div className="app">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          
          {/* Protected routes */}
          {isAuthenticated ? (
            <>
              <Route path="/" element={<Navigate to="/inventory" replace />} />
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
  )
}

export default App