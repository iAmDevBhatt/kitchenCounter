import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import LoginPage from './pages/LoginPage'
import DietStatsPage from './pages/DietStatsPage'
import InventoryPage from './pages/InventoryPage'
import KitchenSlabPage from './pages/KitchenSlabPage'
import ConfigurationPage from './pages/ConfigurationPage'
import ThemePage from './pages/ThemePage'

// Checked fresh on every render (i.e. every navigation) instead of once at
// App's initial mount — `navigate('/inventory')` right after login doesn't
// remount App, so a one-time `const isAuthenticated = ...` at the top of App
// would still see the pre-login value and never register the protected
// routes at all, bouncing straight back to /login.
function RequireAuth({ children }) {
  const isAuthenticated = localStorage.getItem('access_token') !== null
  return isAuthenticated ? children : <Navigate to="/login" replace />
}

function App() {
  return (
    <ThemeProvider>
    <Router>
      <div className="app">
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          {/* Protected routes */}
          <Route path="/" element={<RequireAuth><Navigate to="/diet-stats" replace /></RequireAuth>} />
          <Route path="/diet-stats" element={<RequireAuth><DietStatsPage /></RequireAuth>} />
          <Route path="/inventory" element={<RequireAuth><InventoryPage /></RequireAuth>} />
          <Route path="/kitchen-slab" element={<RequireAuth><KitchenSlabPage /></RequireAuth>} />
          <Route path="/configuration" element={<RequireAuth><ConfigurationPage /></RequireAuth>} />
          <Route path="/theme" element={<RequireAuth><ThemePage /></RequireAuth>} />

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </div>
    </Router>
    </ThemeProvider>
  )
}

export default App