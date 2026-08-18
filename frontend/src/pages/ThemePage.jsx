import React, { useState } from 'react'
import Layout from '../components/Layout/Layout'
import useTheme from '../hooks/useTheme'

const ThemePage = () => {
  const [wallpaperImage, setWallpaperImage] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [customColors, setCustomColors] = useState({
    primary: '#3b82f6',
    secondary: '#10b981',
    accent: '#f59e0b'
  })
  
  const { theme, wallpaper, isLoading, uploadWallpaper, getThemeStyles } = useTheme()

  const handleImageUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      setUploading(true)
      uploadWallpaper(file)
    }
  }

  const handleColorChange = (colorType, value) => {
    setCustomColors({
      ...customColors,
      [colorType]: value
    })
    
    // Update theme in the hook if needed
    // This would be replaced with actual API calls in real implementation
  }

  return (
    <Layout>
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-6">Theme Settings</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Wallpaper Upload */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Wallpaper Upload</h2>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload New Wallpaper
              </label>
              
              <div className="flex items-center justify-center w-full">
                <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                  {uploading ? (
                    <div className="text-gray-500">Uploading...</div>
                  ) : wallpaperImage ? (
                    <img src={wallpaperImage} alt="Preview" className="w-full h-full object-cover rounded-lg" />
                  ) : (
                    <>
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <svg className="w-8 h-8 mb-4 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                          <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A41.492 41.492 0 0 0 10 9c-3.875 0-7.325-2.16-8.875-5.5A2.438 2.438 0 0 1 0 3.275v-.025C.89 3.875 2.11 4.49 3.875 4.638a43.206 43.206 0 0 0 4.21-2.137c.95-.752 2.183-1.054 3.9-1.054s3.95.302 4.897 1.054C17.114.365 18.346.71 19.107 1.976c.383.628.525 1.404.525 2.119v.025a12.4 12.4 0 0 1-7.57 9.55c-.475-.428-.599-1.384-.599-2.278s.124-1.85.599-2.278c.355-.393.666-.641 1.034-.704z"/>
                        </svg>
                        <p className="mb-2 text-sm text-gray-500">
                          <span className="font-semibold">Click to upload</span> or drag and drop
                        </p>
                        <p className="text-xs text-gray-500">PNG, JPG, GIF (MAX. 10MB)</p>
                      </div>
                      <input 
                        type="file" 
                        className="hidden" 
                        onChange={handleImageUpload}
                        accept="image/*"
                      />
                    </>
                  )}
                </label>
              </div>
            </div>

            <button className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
              Save Wallpaper
            </button>
          </div>

          {/* Theme Preview */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Theme Preview</h2>
            
            <div 
              className="border rounded-lg p-4 h-64 flex items-center justify-center mb-4"
              style={{
                backgroundImage: wallpaper ? `url(${wallpaper})` : 'none',
                backgroundSize: 'cover',
                backgroundColor: theme.background
              }}
            >
              {wallpaper ? (
                <div className="text-white text-center">
                  <p>Current wallaper applied</p>
                  <p className="text-sm opacity-80">Colors extracted from image</p>
                </div>
              ) : (
                <div className="text-gray-500 text-center">
                  <p>Upload wallpaper to see live theme</p>
                  <p className="text-sm mt-2">Current theme will be shown here</p>
                </div>
              )}
            </div>

            <h3 className="font-medium mb-2">Theme Colors</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Primary Color</label>
                <input 
                  type="color" 
                  value={customColors.primary}
                  onChange={(e) => handleColorChange('primary', e.target.value)}
                  className="w-full h-10 cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Secondary Color</label>
                <input 
                  type="color" 
                  value={customColors.secondary}
                  onChange={(e) => handleColorChange('secondary', e.target.value)}
                  className="w-full h-10 cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Accent Color</label>
                <input 
                  type="color" 
                  value={customColors.accent}
                  onChange={(e) => handleColorChange('accent', e.target.value)}
                  className="w-full h-10 cursor-pointer"
                />
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-gray-50 rounded">
              <h4 className="font-medium mb-2">Preview</h4>
              <div className="flex space-x-2">
                <div 
                  className="w-10 h-10 rounded"
                  style={{ backgroundColor: customColors.primary }}
                ></div>
                <div 
                  className="w-10 h-10 rounded"
                  style={{ backgroundColor: customColors.secondary }}
                ></div>
                <div 
                  className="w-10 h-10 rounded"
                  style={{ backgroundColor: customColors.accent }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Saved Themes */}
        <div className="bg-white rounded-lg shadow p-6 mt-6">
          <h2 className="text-xl font-semibold mb-4">Saved Themes</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border rounded-lg p-4">
              <div className="bg-gray-200 h-32 rounded mb-2"></div>
              <p className="font-medium">Default Theme</p>
              <button className="text-sm text-blue-600 hover:text-blue-800 mt-1">Set as Active</button>
            </div>
            
            <div className="border rounded-lg p-4">
              <div className="bg-yellow-200 h-32 rounded mb-2"></div>
              <p className="font-medium">Summer Theme</p>
              <button className="text-sm text-blue-600 hover:text-blue-800 mt-1">Set as Active</button>
            </div>
            
            <div className="border rounded-lg p-4">
              <div className="bg-green-200 h-32 rounded mb-2"></div>
              <p className="font-medium">Garden Theme</p>
              <button className="text-sm text-blue-600 hover:text-blue-800 mt-1">Set as Active</button>
            </div>
          </div>
        </div>

        {/* Color Palette Preview */}
        <div className="bg-white rounded-lg shadow p-6 mt-6">
          <h2 className="text-xl font-semibold mb-4">Current Theme Palette</h2>
          
          <div className="flex flex-wrap gap-4">
            {Object.entries(theme).map(([key, color]) => (
              <div key={key} className="flex items-center">
                <div 
                  className="w-10 h-10 rounded mr-2 border"
                  style={{ backgroundColor: color }}
                ></div>
                <span className="text-sm font-mono">{key}: {color}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default ThemePage