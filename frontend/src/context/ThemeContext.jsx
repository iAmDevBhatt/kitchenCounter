import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import apiClient from '../api/index.js'

const DEFAULT_PALETTE = {
  primary: '#ea580c',
  secondary: '#f59e0b',
  accent: '#84cc16',
  background: '#fff7ed',
}

const ThemeContext = createContext(null)

function applyPaletteToDOM(palette) {
  const root = document.documentElement
  root.style.setProperty('--theme-primary',    palette.primary    || DEFAULT_PALETTE.primary)
  root.style.setProperty('--theme-secondary',  palette.secondary  || DEFAULT_PALETTE.secondary)
  root.style.setProperty('--theme-accent',     palette.accent     || DEFAULT_PALETTE.accent)
  root.style.setProperty('--theme-background', palette.background || DEFAULT_PALETTE.background)
}

function applyWallpaperToDOM(url) {
  const root = document.documentElement
  if (url) {
    root.style.setProperty('--theme-wallpaper', `url("${url}")`)
  } else {
    root.style.removeProperty('--theme-wallpaper')
  }
}

export function ThemeProvider({ children }) {
  const [palette, setPalette] = useState(() => {
    try {
      const saved = localStorage.getItem('theme_palette')
      return saved ? JSON.parse(saved) : { ...DEFAULT_PALETTE }
    } catch { return { ...DEFAULT_PALETTE } }
  })

  const [wallpaperUrl, setWallpaperUrl] = useState(() =>
    localStorage.getItem('theme_wallpaper') || ''
  )

  const [isLoading, setIsLoading] = useState(false)

  // Apply on mount and whenever palette/wallpaper change
  useEffect(() => {
    applyPaletteToDOM(palette)
  }, [palette])

  useEffect(() => {
    applyWallpaperToDOM(wallpaperUrl)
  }, [wallpaperUrl])

  // Load saved theme from backend on mount (if user logged in)
  useEffect(() => {
    const userId = localStorage.getItem('user_id')
    if (!userId) return
    apiClient.get(`/theme/user/${userId}`)
      .then(res => {
        if (!res.data) return
        const data = res.data
        if (data.extracted_palette) {
          setPalette(data.extracted_palette)
          localStorage.setItem('theme_palette', JSON.stringify(data.extracted_palette))
        }
        if (data.wallpaper_path) {
          setWallpaperUrl(data.wallpaper_path)
          localStorage.setItem('theme_wallpaper', data.wallpaper_path)
        }
      })
      .catch(() => {}) // silently ignore if not logged in yet
  }, [])

  const updatePalette = useCallback(async (newPalette) => {
    // Apply immediately so colour changes are visible before the state re-render
    applyPaletteToDOM(newPalette)
    setPalette(newPalette)
    localStorage.setItem('theme_palette', JSON.stringify(newPalette))
    const userId = localStorage.getItem('user_id')
    if (!userId) return
    try {
      const wp = localStorage.getItem('theme_wallpaper') || null
      await apiClient.post(`/theme/user/${userId}`, {
        user_id: userId,
        extracted_palette: newPalette,
        wallpaper_path: wp,
      })
    } catch (e) {
      console.error('Failed to save theme to backend', e)
    }
  }, [])

  const uploadWallpaper = useCallback(async (file) => {
    setIsLoading(true)
    try {
      // 1. Upload file
      const form = new FormData()
      form.append('file', file)
      const upRes = await apiClient.post('/theme/upload-wallpaper', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const url = upRes.data.url

      // 2. Create local preview URL for immediate display
      const previewUrl = URL.createObjectURL(file)
      setWallpaperUrl(previewUrl)
      applyWallpaperToDOM(previewUrl)
      localStorage.setItem('theme_wallpaper', url) // store server path for persistence

      // 3. Save to backend (with server path)
      const userId = localStorage.getItem('user_id')
      if (userId) {
        await apiClient.post(`/theme/user/${userId}`, {
          user_id: userId,
          wallpaper_path: url,
          extracted_palette: palette,
        })
      }
    } catch (e) {
      console.error('Wallpaper upload failed', e)
    } finally {
      setIsLoading(false)
    }
  }, [palette])

  return (
    <ThemeContext.Provider value={{ palette, wallpaperUrl, isLoading, updatePalette, uploadWallpaper }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useThemeContext() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useThemeContext must be used inside ThemeProvider')
  return ctx
}
