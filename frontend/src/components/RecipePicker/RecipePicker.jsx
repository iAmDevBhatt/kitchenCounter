import { useState, useEffect, useRef } from 'react'
import api from '../../api/index'

function platformIcon(url) {
  if (!url) return '🔗'
  if (url.includes('youtube.com') || url.includes('youtu.be')) return '▶️'
  if (url.includes('instagram.com')) return '📸'
  if (url.includes('facebook.com') || url.includes('fb.watch')) return '👍'
  if (url.includes('tiktok.com')) return '🎵'
  if (url.includes('vimeo.com')) return '🎬'
  return '🔗'
}

/**
 * Modal picker for selecting a recipe URL to fill into a Meal Prep entry.
 * Props:
 *   onPick(url)  — called with the selected recipe's URL
 *   onClose()    — called to dismiss
 */
export default function RecipePicker({ onPick, onClose }) {
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const searchRef = useRef()

  useEffect(() => {
    api.get('/recipes/')
      .then(r => setRecipes(r.data))
      .finally(() => setLoading(false))
    setTimeout(() => searchRef.current?.focus(), 50)
  }, [])

  const filtered = recipes.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.url.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[80vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100 shrink-0">
          <h3 className="font-semibold text-stone-800">Browse Recipes</h3>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-stone-100 text-stone-400 hover:text-stone-600">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="px-4 pt-3 pb-2 shrink-0">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={searchRef}
              className="input pl-9 w-full text-sm"
              placeholder="Search by name…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1 px-2 pb-3">
          {loading ? (
            <p className="text-center text-stone-400 py-10 text-sm">Loading recipes…</p>
          ) : filtered.length === 0 ? (
            <p className="text-center text-stone-400 py-10 text-sm">
              {search ? `No matches for "${search}"` : 'No recipes saved yet.'}
            </p>
          ) : (
            <ul className="divide-y divide-stone-50">
              {filtered.map(r => (
                <li key={r.id}>
                  <button
                    onClick={() => { onPick(r.url); onClose() }}
                    className="w-full text-left px-3 py-3 rounded-xl hover:bg-orange-50 transition-colors flex items-start gap-3 group"
                  >
                    <span className="text-xl shrink-0 mt-0.5">{platformIcon(r.url)}</span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-stone-800 text-sm group-hover:text-orange-700 transition-colors">{r.name}</p>
                      <p className="text-xs text-stone-400 truncate mt-0.5">{r.url}</p>
                      {r.notes && <p className="text-xs text-stone-400 mt-0.5 line-clamp-1 italic">{r.notes}</p>}
                    </div>
                    <svg className="w-4 h-4 text-stone-300 group-hover:text-orange-400 shrink-0 mt-1 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
