import { useState, useEffect } from 'react'
import api from '../../api/index'

const KEY = 'download_dir'
const DEFAULT_PATH = '/app/backend/static/downloads'

export default function DownloadLocationManager() {
  const [value, setValue] = useState('')
  const [saved, setSaved] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState(null)  // 'saved' | 'error'

  useEffect(() => {
    api.get(`/app-settings/${KEY}`)
      .then(r => {
        const v = r.data.value || DEFAULT_PATH
        setValue(v)
        setSaved(v)
      })
      .catch(() => {
        setValue(DEFAULT_PATH)
        setSaved(DEFAULT_PATH)
      })
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    if (!value.trim()) return
    setSaving(true)
    setStatus(null)
    try {
      await api.put(`/app-settings/${KEY}`, { value: value.trim() })
      setSaved(value.trim())
      setStatus('saved')
      setTimeout(() => setStatus(null), 3000)
    } catch {
      setStatus('error')
    } finally {
      setSaving(false)
    }
  }

  const isDirty = value !== saved

  return (
    <div className="max-w-lg">
      <h3 className="font-semibold text-stone-800 mb-1">Download Location</h3>
      <p className="text-sm text-stone-500 mb-4">
        Server path where recipe downloads will be saved. When using Docker, ensure this path is
        mapped to a persistent volume (e.g. <code className="bg-stone-100 px-1 rounded text-xs">downloads_data:/app/backend/static/downloads</code>).
      </p>

      {loading ? (
        <div className="text-stone-400 text-sm">Loading…</div>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Download path</label>
            <input
              className="input w-full font-mono text-sm"
              placeholder="/app/backend/static/downloads"
              value={value}
              onChange={e => { setValue(e.target.value); setStatus(null) }}
            />
            <p className="text-xs text-stone-400 mt-1">
              Current saved value: <span className="font-mono">{saved}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saving || !isDirty}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Saving…
                </>
              ) : 'Save'}
            </button>

            {isDirty && (
              <button
                onClick={() => { setValue(saved); setStatus(null) }}
                className="btn-ghost text-sm"
              >
                Reset
              </button>
            )}

            {status === 'saved' && (
              <span className="text-green-600 text-sm flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Saved
              </span>
            )}
            {status === 'error' && (
              <span className="text-red-500 text-sm">Failed to save — check server logs</span>
            )}
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
            <p className="font-medium mb-1">Docker tip</p>
            <p>Add this to your <code className="bg-amber-100 px-1 rounded">docker-compose.yml</code> volumes section:</p>
            <pre className="mt-2 text-xs bg-white/60 rounded p-2 overflow-x-auto">{`  - downloads_data:${saved || DEFAULT_PATH}`}</pre>
            <p className="mt-2 text-xs text-amber-700">Without a volume mount, downloads will be lost on container rebuild.</p>
          </div>
        </div>
      )}
    </div>
  )
}
