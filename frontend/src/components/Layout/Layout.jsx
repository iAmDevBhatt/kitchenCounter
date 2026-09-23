import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import useLabels from '../../hooks/useLabels'
import { useThemeContext } from '../../context/ThemeContext'

const NAV = [
  { to: '/diet-stats',    icon: '📊', label: 'nav.diet-stats' },
  { to: '/inventory',     icon: '📦', label: 'nav.inventory' },
  { to: '/kitchen-slab',  icon: '🍽️', label: 'nav.kitchen-slab' },
  { to: '/recipes',       icon: '📖', label: 'nav.recipes' },
  { to: '/configuration', icon: '⚙️', label: 'nav.configuration', secondary: true },
  { to: '/theme',         icon: '🎨', label: 'nav.theme',         secondary: true },
]
// Phone bottom bar shows the primary pages; the rest live behind "More"
const PRIMARY_NAV   = NAV.filter(n => !n.secondary)
const SECONDARY_NAV = NAV.filter(n => n.secondary)

export default function Layout({ children }) {
  const { getLabel } = useLabels()
  const location = useLocation()
  const navigate = useNavigate()
  const { wallpaperUrl, palette } = useThemeContext()
  const [moreOpen, setMoreOpen] = useState(false)

  // Close the "More" sheet whenever the route changes
  useEffect(() => { setMoreOpen(false) }, [location.pathname])
  const moreActive = SECONDARY_NAV.some(n => n.to === location.pathname)

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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 md:h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 lg:gap-8 min-w-0">
            <Link to="/inventory" className="flex items-center gap-2 font-bold text-xl text-orange-700 hover:text-orange-800 transition-colors shrink-0">
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
            className="btn-ghost text-sm hidden md:flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            {getLabel('nav.logout')}
          </button>
        </div>
      </header>

      {/* Extra bottom padding on phones so content clears the fixed tab bar.
          No z-index here: it would create a stacking context and trap modals
          (z-50) underneath the header and bottom nav (z-40). DOM order already
          paints main above the wallpaper overlay. */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-4 md:pt-6 pb-28 md:pb-6 relative">
        {children}
      </main>

      {/* Phone bottom tab bar — thumb-reachable, like a native app */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur border-t border-orange-100 pb-safe">
        <div className="grid grid-cols-5">
          {PRIMARY_NAV.map(({ to, icon, label }) => {
            const active = location.pathname === to
            return (
              <Link
                key={to}
                to={to}
                className={`flex flex-col items-center justify-center gap-0.5 min-h-[56px] px-1 text-[11px] font-medium transition-colors
                  ${active ? 'text-orange-700' : 'text-stone-500'}`}
              >
                <span className={`text-xl leading-none rounded-full px-3 py-0.5 ${active ? 'bg-orange-100' : ''}`}>{icon}</span>
                <span className="truncate max-w-full">{getLabel(label)}</span>
              </Link>
            )
          })}
          <button
            onClick={() => setMoreOpen(o => !o)}
            className={`flex flex-col items-center justify-center gap-0.5 min-h-[56px] px-1 text-[11px] font-medium transition-colors
              ${moreActive || moreOpen ? 'text-orange-700' : 'text-stone-500'}`}
          >
            <span className={`text-xl leading-none rounded-full px-3 py-0.5 ${moreActive ? 'bg-orange-100' : ''}`}>☰</span>
            <span>More</span>
          </button>
        </div>
      </nav>

      {/* "More" sheet — secondary pages + logout */}
      {moreOpen && (
        <div className="md:hidden fixed inset-0 z-30 bg-black/30" onClick={() => setMoreOpen(false)}>
          <div
            className="absolute inset-x-0 bottom-0 bg-white rounded-t-2xl shadow-2xl p-2 pb-[calc(env(safe-area-inset-bottom)+64px)]"
            onClick={e => e.stopPropagation()}
          >
            {SECONDARY_NAV.map(({ to, icon, label }) => {
              const active = location.pathname === to
              return (
                <Link
                  key={to}
                  to={to}
                  className={`flex items-center gap-3 px-4 min-h-[52px] rounded-xl text-sm font-medium
                    ${active ? 'bg-orange-100 text-orange-700' : 'text-stone-700 active:bg-orange-50'}`}
                >
                  <span className="text-lg">{icon}</span>
                  {getLabel(label)}
                </Link>
              )
            })}
            <button
              onClick={logout}
              className="w-full flex items-center gap-3 px-4 min-h-[52px] rounded-xl text-sm font-medium text-red-600 active:bg-red-50"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              {getLabel('nav.logout')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
