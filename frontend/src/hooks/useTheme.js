import { useState, useEffect } from 'react'

// Mock theme hook - in a real implementation this would connect to API
const useTheme = () => {
  const [theme, setTheme] = useState({
    primary: '#3b82f6',
    secondary: '#10b981',
    accent: '#f59e0b',
    background: '#f9fafb'
  })
  
  const [wallpaper, setWallpaper] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  
  // Apply theme to CSS variables
  useEffect(() => {
    const root = document.documentElement
    Object.entries(theme).forEach(([key, value]) => {
      root.style.setProperty(`--theme-${key}`, value)
    })
  }, [theme])
  
  const updateTheme = (newTheme) => {
    setTheme(newTheme)
  }
  
  const uploadWallpaper = async (file) => {
    setIsLoading(true)
    
    // Simulate API call
    try {
      // In a real implementation, this would:
      // 1. Upload file to backend
      // 2. Get color palette from backend
      // 3. Update theme state
      
      setTimeout(() => {
        const mockPalette = {
          primary: '#4f46e5',
          secondary: '#ec4899',
          accent: '#f97316',
          background: '#f8fafc'
        }
        
        setTheme(mockPalette)
        setWallpaper(URL.createObjectURL(file))
        setIsLoading(false)
      }, 1000)
      
    } catch (error) {
      console.error('Error uploading wallpaper:', error)
      setIsLoading(false)
    }
  }
  
  // Get theme styles for components
  const getThemeStyles = () => ({
    '--primary-color': theme.primary,
    '--secondary-color': theme.secondary, 
    '--accent-color': theme.accent,
    '--background-color': theme.background
  })
  
  return {
    theme,
    wallpaper,
    isLoading,
    updateTheme,
    uploadWallpaper,
    getThemeStyles
  }
}

export default useTheme