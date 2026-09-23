import { useState, useEffect, useRef, useCallback } from 'react'
import Layout from '../components/Layout/Layout'
import api from '../api/index'

// ── helpers ──────────────────────────────────────────────────────────────

function embedUrl(url) {
  if (!url) return null
  try {
    const u = new URL(url)
    const host = u.hostname.replace('www.', '').replace('m.', '')

    // YouTube
    const ytMatch =
      url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/live\/|youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/)
    if (ytMatch) return { src: `https://www.youtube.com/embed/${ytMatch[1]}?rel=0`, allow: 'autoplay; encrypted-media; picture-in-picture' }

    // Instagram
    const igMatch = url.match(/instagram\.com\/(?:reel|p|tv)\/([A-Za-z0-9_-]+)/)
    if (igMatch) return { src: `https://www.instagram.com/p/${igMatch[1]}/embed`, allow: 'autoplay; encrypted-media' }

    // Facebook
    const fbVideoMatch = url.match(/facebook\.com\/.+\/videos\/(\d+)/)
    const fbWatchMatch = url.match(/fb\.watch\/([A-Za-z0-9_-]+)/)
    if (fbVideoMatch || fbWatchMatch) {
      return { src: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false`, allow: 'autoplay; encrypted-media' }
    }
  } catch (_) {}
  return null
}

function platformIcon(url) {
  if (!url) return '🔗'
  if (url.includes('youtube.com') || url.includes('youtu.be')) return '▶️'
  if (url.includes('instagram.com')) return '📸'
  if (url.includes('facebook.com') || url.includes('fb.watch')) return '👍'
  if (url.includes('tiktok.com')) return '🎵'
  if (url.includes('vimeo.com')) return '🎬'
  return '🔗'
}

function isVideoUrl(url) {
  if (!url) return false
  return (
    url.includes('youtube.com') || url.includes('youtu.be') ||
    url.includes('instagram.com') || url.includes('facebook.com') ||
    url.includes('fb.watch') || url.includes('tiktok.com') || url.includes('vimeo.com')
  )
}

const EMPTY_FORM = { name: '', url: '', notes: '' }

// ── PlayModal ────────────────────────────────────────────────────────────

function PlayModal({ recipe, onClose }) {
  const embed = embedUrl(recipe.url)
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-stone-100">
          <span className="font-semibold text-stone-800 truncate pr-4">{recipe.name}</span>
          <button onClick={onClose} className="w-11 h-11 shrink-0 flex items-center justify-center rounded-lg hover:bg-stone-100 transition-colors text-stone-500 hover:text-stone-800" aria-label="Close">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {embed ? (
          <div className="relative w-full aspect-video bg-black">
            <iframe
              src={embed.src}
              allow={embed.allow}
              allowFullScreen
              className="absolute inset-0 w-full h-full"
              title={recipe.name}
            />
          </div>
        ) : (
          <div className="p-8 text-center">
            <p className="text-stone-500 mb-4">This URL cannot be embedded directly.</p>
            <a
              href={recipe.url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary inline-flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Open link in new tab
            </a>
          </div>
        )}
        {recipe.notes && (
          <div className="px-5 py-3 text-sm text-stone-600 border-t border-stone-100 bg-stone-50">
            {recipe.notes}
          </div>
        )}
      </div>
    </div>
  )
}

// ── RecipeFormModal ───────────────────────────────────────────────────────

function RecipeFormModal({ initial, onSave, onClose }) {
  const [form, setForm] = useState(initial || EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const nameRef = useRef()

  useEffect(() => { nameRef.current?.focus() }, [])

  // Pre-fill URL from share-target query param (used when PWA share target lands here)
  useEffect(() => {
    if (!initial) {
      const params = new URLSearchParams(window.location.search)
      const sharedUrl = params.get('url') || params.get('text') || ''
      const sharedTitle = params.get('title') || ''
      if (sharedUrl) setForm(f => ({ ...f, url: sharedUrl, name: sharedTitle || f.name }))
    }
  }, [initial])

  const handleSubmit = async e => {
    e.preventDefault()
    if (!form.name.trim()) { setError('Recipe name is required'); return }
    if (!form.url.trim()) { setError('URL is required'); return }
    setSaving(true)
    setError('')
    try {
      await onSave(form)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save recipe')
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel sm:max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-stone-100 shrink-0">
          <h2 className="text-lg font-semibold text-stone-800">{initial ? 'Edit Recipe' : 'Add Recipe'}</h2>
          <button onClick={onClose} className="w-11 h-11 flex items-center justify-center rounded-lg hover:bg-stone-100 text-stone-500 hover:text-stone-800">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Recipe Name <span className="text-red-500">*</span></label>
            <input
              ref={nameRef}
              className="input w-full"
              placeholder="e.g. Grandma's Biryani"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">URL <span className="text-red-500">*</span></label>
            <input
              className="input w-full"
              placeholder="https://youtube.com/watch?v=… or any recipe page"
              value={form.url}
              onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
            />
            {form.url && (
              <p className="text-xs text-stone-400 mt-1">{platformIcon(form.url)} {isVideoUrl(form.url) ? 'Video URL detected — play & download supported' : 'Page URL — content download supported'}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Notes</label>
            <textarea
              className="input w-full min-h-[80px] resize-y"
              placeholder="Serves 4, adjust spice levels…"
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost flex-1 sm:flex-none justify-center">Cancel</button>
            <button type="submit" className="btn-primary flex-1 sm:flex-none justify-center" disabled={saving}>
              {saving ? 'Saving…' : 'Save Recipe'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── ConfirmDeleteModal ────────────────────────────────────────────────────

function ConfirmDeleteModal({ recipe, onConfirm, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel sm:max-w-sm p-6 text-center" onClick={e => e.stopPropagation()}>
        <div className="text-4xl mb-3">🗑️</div>
        <h3 className="font-semibold text-stone-800 mb-2">Delete Recipe?</h3>
        <p className="text-sm text-stone-500 mb-6 break-words">"{recipe.name}" will be permanently deleted.</p>
        <div className="flex gap-3 justify-center">
          <button onClick={onClose} className="btn-ghost">Cancel</button>
          <button onClick={onConfirm} className="btn bg-red-500 hover:bg-red-600 text-white">Delete</button>
        </div>
      </div>
    </div>
  )
}

// ── RecipesPage ───────────────────────────────────────────────────────────

export default function RecipesPage() {
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  const [playRecipe, setPlayRecipe] = useState(null)
  const [editRecipe, setEditRecipe] = useState(null)   // null=closed, {}=new, {...}=edit
  const [deleteRecipe, setDeleteRecipe] = useState(null)

  // download state: { [id]: 'idle'|'loading'|'done'|'error' }
  const [dlState, setDlState] = useState({})

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/recipes/')
      setRecipes(res.data)
    } catch {
      setError('Failed to load recipes')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Auto-open Add modal when arriving from PWA share target
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('url') || params.get('text')) {
      setEditRecipe({})   // empty = new
    }
  }, [])

  const filtered = recipes.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase())
  )

  const handleSave = async form => {
    if (editRecipe?.id) {
      await api.put(`/recipes/${editRecipe.id}`, form)
    } else {
      await api.post('/recipes/', form)
      // Clear share-target query params without a reload
      window.history.replaceState({}, '', window.location.pathname)
    }
    setEditRecipe(null)
    load()
  }

  const handleDelete = async () => {
    await api.delete(`/recipes/${deleteRecipe.id}`)
    setDeleteRecipe(null)
    load()
  }

  const handleDownload = async recipe => {
    setDlState(s => ({ ...s, [recipe.id]: 'loading' }))
    try {
      await api.post(`/recipes/${recipe.id}/download`)
      setDlState(s => ({ ...s, [recipe.id]: 'done' }))
      setTimeout(() => setDlState(s => ({ ...s, [recipe.id]: 'idle' })), 3000)
    } catch {
      setDlState(s => ({ ...s, [recipe.id]: 'error' }))
      setTimeout(() => setDlState(s => ({ ...s, [recipe.id]: 'idle' })), 3000)
    }
  }

  // Play / download / edit / delete buttons — shared by the table and phone cards
  const renderActions = r => {
    const dl = dlState[r.id] || 'idle'
    const canEmbed = !!embedUrl(r.url)
    return (
      <div className="flex items-center justify-end gap-1">
        {/* Play */}
        <button
          onClick={() => setPlayRecipe(r)}
          title={canEmbed ? 'Play embedded video' : 'Open link'}
          className={`p-2 rounded-lg transition-colors min-h-[44px] min-w-[44px] md:min-h-[36px] md:min-w-0 flex items-center justify-center ${canEmbed ? 'text-orange-500 hover:bg-orange-100' : 'text-stone-300 hover:bg-stone-100'}`}
        >
          {canEmbed ? (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          )}
        </button>

        {/* Download */}
        <button
          onClick={() => dl === 'idle' && handleDownload(r)}
          title={dl === 'done' ? 'Download started!' : dl === 'error' ? 'Download failed' : 'Download to server'}
          className={`p-2 rounded-lg transition-colors min-h-[44px] min-w-[44px] md:min-h-[36px] md:min-w-0 flex items-center justify-center ${
            dl === 'done' ? 'text-green-500 hover:bg-green-50' :
            dl === 'error' ? 'text-red-400 hover:bg-red-50' :
            dl === 'loading' ? 'text-stone-400 cursor-wait' :
            'text-stone-400 hover:bg-stone-100 hover:text-stone-600'
          }`}
        >
          {dl === 'loading' ? (
            <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          ) : dl === 'done' ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          )}
        </button>

        {/* Edit */}
        <button
          onClick={() => setEditRecipe(r)}
          title="Edit"
          className="p-2 rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-600 transition-colors min-h-[44px] min-w-[44px] md:min-h-[36px] md:min-w-0 flex items-center justify-center"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>

        {/* Delete */}
        <button
          onClick={() => setDeleteRecipe(r)}
          title="Delete"
          className="p-2 rounded-lg text-stone-400 hover:bg-red-50 hover:text-red-500 transition-colors min-h-[44px] min-w-[44px] md:min-h-[36px] md:min-w-0 flex items-center justify-center"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    )
  }

  return (
    <Layout>
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="page-title">Recipes</h1>
          <p className="page-subtitle">Your saved recipe links — play, download, or look up when planning meals</p>
        </div>
        <button onClick={() => setEditRecipe({})} className="btn-primary shrink-0 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Recipe
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          className="input pl-9 w-full sm:max-w-xs"
          placeholder="Search recipes…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Table */}
      <div className="card md:overflow-x-auto">
        {loading ? (
          <div className="py-16 text-center text-stone-400">Loading recipes…</div>
        ) : error ? (
          <div className="py-16 text-center text-red-500">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-stone-400">
            {search ? `No recipes matching "${search}"` : 'No recipes yet — add your first one!'}
          </div>
        ) : (
          <>
          {/* Phone: card list */}
          <ul className="md:hidden divide-y divide-stone-100 -my-2">
            {filtered.map(r => (
              <li key={r.id} className="py-3">
                <p className="font-medium text-stone-800 break-words">{r.name}</p>
                <a
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-orange-600 mt-0.5 min-w-0"
                  title={r.url}
                >
                  <span className="shrink-0">{platformIcon(r.url)}</span>
                  <span className="truncate">{r.url.replace(/^https?:\/\/(www\.)?/, '')}</span>
                </a>
                {r.notes && <p className="text-xs text-stone-500 mt-1 line-clamp-2">{r.notes}</p>}
                <div className="mt-1 -mr-2">{renderActions(r)}</div>
              </li>
            ))}
          </ul>

          {/* Tablet / laptop: table */}
          <table className="w-full text-sm hidden md:table">
            <thead>
              <tr className="border-b border-stone-100 text-left text-stone-500 text-xs uppercase tracking-wide">
                <th className="pb-3 pr-3 pl-2 font-medium w-[30%]">Recipe Name</th>
                <th className="pb-3 pr-3 font-medium w-[30%]">Link</th>
                <th className="pb-3 pr-3 font-medium">Notes</th>
                <th className="pb-3 font-medium text-right pr-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {filtered.map(r => {
                return (
                  <tr key={r.id} className="hover:bg-orange-50/40 transition-colors group">
                    <td className="py-3 pr-3 pl-2">
                      <span className="font-medium text-stone-800">{r.name}</span>
                    </td>
                    <td className="py-3 pr-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-base shrink-0">{platformIcon(r.url)}</span>
                        <a
                          href={r.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-orange-600 hover:underline truncate max-w-[200px] block"
                          title={r.url}
                        >
                          {r.url.replace(/^https?:\/\/(www\.)?/, '').slice(0, 50)}{r.url.length > 55 ? '…' : ''}
                        </a>
                      </div>
                    </td>
                    <td className="py-3 pr-3 text-stone-500 max-w-[200px]">
                      <span className="line-clamp-2">{r.notes || <span className="italic text-stone-300">—</span>}</span>
                    </td>
                    <td className="py-3 pr-2">
                      {renderActions(r)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          </>
        )}
      </div>

      {/* Modals */}
      {playRecipe && <PlayModal recipe={playRecipe} onClose={() => setPlayRecipe(null)} />}
      {editRecipe !== null && (
        <RecipeFormModal
          initial={editRecipe?.id ? editRecipe : null}
          onSave={handleSave}
          onClose={() => {
            setEditRecipe(null)
            window.history.replaceState({}, '', window.location.pathname)
          }}
        />
      )}
      {deleteRecipe && (
        <ConfirmDeleteModal
          recipe={deleteRecipe}
          onConfirm={handleDelete}
          onClose={() => setDeleteRecipe(null)}
        />
      )}
    </Layout>
  )
}
