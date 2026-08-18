import { useState, useEffect } from 'react'
import Layout from '../components/Layout/Layout'
import { useThemeContext } from '../context/ThemeContext'

const PRESETS = [
  { name: 'Earthy Kitchen', colors: { primary: '#ea580c', secondary: '#f59e0b', accent: '#84cc16', background: '#fff7ed' } },
  { name: 'Ocean Breeze',   colors: { primary: '#0284c7', secondary: '#06b6d4', accent: '#6366f1', background: '#f0f9ff' } },
  { name: 'Forest Garden',  colors: { primary: '#16a34a', secondary: '#65a30d', accent: '#ca8a04', background: '#f0fdf4' } },
]

export default function ThemePage() {
  const { palette, wallpaperUrl, isLoading, updatePalette, uploadWallpaper } = useThemeContext()
  const [colors, setColors] = useState({ ...palette })

  // Keep local colour pickers in sync whenever context palette changes
  useEffect(() => { setColors({ ...palette }) }, [palette])

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) uploadWallpaper(file)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) uploadWallpaper(file)
  }

  const handleColorChange = (key, val) => {
    const next = { ...colors, [key]: val }
    setColors(next)
  }

  const applyColors = () => {
    updatePalette(colors)
  }

  const applyPreset = (preset) => {
    setColors(preset.colors)
    updatePalette(preset.colors)
  }

  const clearWallpaper = async () => {
    localStorage.removeItem('theme_wallpaper')
    window.location.reload()
  }

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="page-title">Theme Settings</h1>
        <p className="page-subtitle">Customise your kitchen's look and feel</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Wallpaper upload ── */}
        <div className="card">
          <h2 className="text-base font-semibold text-stone-800 mb-4">🖼 Wallpaper</h2>
          <label
            className="flex flex-col items-center justify-center w-full h-52 border-2 border-dashed border-orange-200 rounded-2xl cursor-pointer bg-orange-50 hover:bg-orange-100 transition-colors overflow-hidden relative"
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
          >
            {isLoading ? (
              <div className="flex flex-col items-center gap-2 text-stone-400">
                <svg className="animate-spin h-6 w-6 text-orange-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                <span className="text-sm">Uploading wallpaper…</span>
              </div>
            ) : wallpaperUrl ? (
              <img src={wallpaperUrl} alt="Current wallpaper" className="w-full h-full object-cover" />
            ) : (
              <div className="flex flex-col items-center gap-2 text-stone-400">
                <span className="text-4xl">🌄</span>
                <p className="text-sm font-medium text-stone-600">Click or drop to upload</p>
                <p className="text-xs">PNG, JPG, WebP up to 10 MB</p>
              </div>
            )}
            <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
          </label>
          <div className="flex gap-2 mt-3">
            {wallpaperUrl && (
              <button onClick={clearWallpaper} className="btn-danger text-xs">
                Remove Wallpaper
              </button>
            )}
            <p className="text-xs text-stone-400 flex-1 self-center">
              {wallpaperUrl
                ? 'Wallpaper is active on all pages.'
                : 'No wallpaper set — flat background colour is used.'}
            </p>
          </div>
        </div>

        {/* ── Colour pickers ── */}
        <div className="card">
          <h2 className="text-base font-semibold text-stone-800 mb-4">🎨 Colour Palette</h2>

          <div className="grid grid-cols-2 gap-4 mb-4">
            {Object.entries(colors).map(([key, val]) => (
              <div key={key}>
                <label className="label capitalize">{key}</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={val}
                    onChange={e => handleColorChange(key, e.target.value)}
                    className="h-10 w-14 rounded-lg border border-orange-200 cursor-pointer p-0.5"
                  />
                  <span className="text-xs font-mono text-stone-500">{val}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Live swatch preview */}
          <div className="flex gap-3 mb-4 p-3 bg-stone-50 rounded-xl">
            {Object.entries(colors).map(([key, val]) => (
              <div key={key} className="flex flex-col items-center gap-1 flex-1">
                <div className="w-full h-10 rounded-lg shadow-sm border border-white/50" style={{ backgroundColor: val }} />
                <span className="text-[10px] text-stone-400 capitalize">{key}</span>
              </div>
            ))}
          </div>

          <button onClick={applyColors} className="btn-primary w-full justify-center">
            Apply Colours
          </button>
          <p className="text-xs text-stone-400 mt-2 text-center">
            Colours apply to the background and UI accents across all pages.
          </p>
        </div>
      </div>

      {/* ── Presets ── */}
      <div className="card mt-6">
        <h2 className="text-base font-semibold text-stone-800 mb-4">✨ Theme Presets</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {PRESETS.map(p => (
            <div key={p.name} className="border border-orange-100 rounded-2xl overflow-hidden hover:shadow-md transition-shadow">
              <div className="h-20 flex gap-1 p-2" style={{ backgroundColor: p.colors.background }}>
                {Object.values(p.colors).slice(0, 3).map((c, i) => (
                  <div key={i} className="flex-1 rounded-lg" style={{ backgroundColor: c }} />
                ))}
              </div>
              <div className="p-3 flex items-center justify-between">
                <p className="text-sm font-medium text-stone-700">{p.name}</p>
                <button onClick={() => applyPreset(p)} className="btn-secondary text-xs py-1 px-3">
                  Apply
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  )
}
