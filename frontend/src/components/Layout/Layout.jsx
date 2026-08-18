import { Link, useLocation, useNavigate } from 'react-router-dom'
import useLabels from '../../hooks/useLabels'
import { useThemeContext } from '../../context/ThemeContext'

const NAV = [
  { to: '/diet-stats',    icon: '📊', label: 'nav.diet-stats' },
  { to: '/inventory',     icon: '📦', label: 'nav.inventory' },
  { to: '/kitchen-slab',  icon: '🍽️', label: 'nav.kitchen-slab' },
  { to: '/configuration', icon: '⚙️', label: 'nav.configuration' },
  { to: '/theme',         icon: '🎨', label: 'nav.theme' },
]

export default function Layout({ children }) {
  const { getLabel } = useLabels()
  const location = useLocation()
  const navigate = useNavigate()
  const { wallpaperUrl, palette } = useThemeContext()

  const logout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('user_id')
    navigate('/login')
  }

  // Background style — wallpaper takes priority over flat colour
  const bgStyle = wallpaperUrl
    ? {
        backgroundImage: `url("${wallpaperUrl}")`,
        backgroundSize: 'cover',
        backgroundAttachment: 'fixed',
        backgroundPosition: 'center',
      }
    : { backgroundColor: palette.background || '#fff7ed' }

  return (
    <div className="min-h-screen flex flex-col" style={bgStyle}>
      {/* Overlay so text stays readable over photos */}
      {wallpaperUrl && (
        <div className="fixed inset-0 bg-black/25 pointer-events-none z-0" />
      )}

      {/* Top nav */}
      <header className="bg-white/90 backdrop-blur border-b border-orange-100 shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to="/inventory" className="flex items-center gap-2 font-bold text-xl text-orange-700 hover:text-orange-800 transition-colors">
              <span className="text-2xl">🍳</span>
              <span>KitchenCounter</span>
            </Link>
            <nav className="hidden md:flex items-center gap-1">
              {NAV.map(({ to, icon, label }) => {
                const active = location.pathname === to
                return (
                  <Link
                    key={to}
                    to={to}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150
                      ${active
                        ? 'bg-orange-100 text-orange-700'
                        : 'text-stone-600 hover:bg-orange-50 hover:text-orange-700'
                      }`}
                  >
                    <span>{icon}</span>
                    {getLabel(label)}
                  </Link>
                )
              })}
            </nav>
          </div>

          <button
            onClick={logout}
            className="btn-ghost text-sm flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            {getLabel('nav.logout')}
          </button>
        </div>
      </header>

      {/* Mobile nav */}
      <nav className="md:hidden bg-white/90 backdrop-blur border-b border-orange-100 px-4 py-2 flex gap-1 overflow-x-auto relative z-40">
        {NAV.map(({ to, icon, label }) => {
          const active = location.pathname === to
          return (
            <Link
              key={to}
              to={to}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all
                ${active ? 'bg-orange-100 text-orange-700' : 'text-stone-600 hover:bg-orange-50'}`}
            >
              <span>{icon}</span>
              {getLabel(label)}
            </Link>
          )
        })}
      </nav>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 relative z-10">
        {children}
      </main>
    </div>
  )
}
