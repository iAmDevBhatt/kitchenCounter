import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import Papa from 'papaparse'
import apiClient from '../../api/index.js'

const COLUMNS = [
  'Item Name', 'Category', 'Stored Location', 'Quantity', 'Status',
  'Bought Date', 'Expiry Date', 'Net Weight', 'Amount',
  'Sugar', 'Fiber', 'Carbohydrate', 'Fat', 'Protein', 'Tags', 'Notes',
]

const VALID_STATUSES = ['InUse', 'Stocked', 'Finished', 'NotInStock']

// ── helpers ───────────────────────────────────────────────────────────────────

function itemsToRows(items, catMap, locMap) {
  return items.map(item => ({
    'Item Name':      item.item_name          || '',
    'Category':       catMap[item.category_id] || '',
    'Stored Location': locMap[item.stored_location_id] || '',
    'Quantity':       item.quantity            ?? '',
    'Status':         item.status              || '',
    'Bought Date':    item.bought_date         || '',
    'Expiry Date':    item.expiration_date     || '',
    'Net Weight':     item.net_weight          ?? '',
    'Amount':         item.amount              ?? '',
    'Sugar':          item.sugar               ?? '',
    'Fiber':          item.fiber               ?? '',
    'Carbohydrate':   item.carbohydrate        ?? '',
    'Fat':            item.fat                 ?? '',
    'Protein':        item.protein             ?? '',
    'Tags':           (item._tags || []).map(t => t.name).join(', '),
    'Notes':          item.notes               || '',
  }))
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function parseDate(val) {
  if (!val) return undefined
  // Excel serial date number
  if (typeof val === 'number') {
    const d = XLSX.SSF.parse_date_code(val)
    if (d) return `${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`
  }
  const s = String(val).trim()
  if (!s) return undefined
  // Accept YYYY-MM-DD or DD/MM/YYYY or MM/DD/YYYY
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  const parts = s.split(/[\/\-]/)
  if (parts.length === 3) {
    // assume DD/MM/YYYY if first part <= 31
    const [a, b, c] = parts
    if (c.length === 4) return `${c}-${b.padStart(2,'0')}-${a.padStart(2,'0')}`
  }
  return s
}

function num(val) {
  if (val === '' || val === null || val === undefined) return undefined
  const n = parseFloat(val)
  return isNaN(n) ? undefined : n
}

function int(val) {
  if (val === '' || val === null || val === undefined) return undefined
  const n = parseInt(val, 10)
  return isNaN(n) ? undefined : n
}

// ── main component ────────────────────────────────────────────────────────────

export default function BulkImportExport({ items, catMap, locMap, onDone }) {
  const [exportOpen,    setExportOpen]    = useState(false)
  const [importing,     setImporting]     = useState(false)
  const [progress,      setProgress]      = useState(null)   // { current, total, succeeded, failed, errors }
  const [done,          setDone]          = useState(false)
  const fileRef = useRef()

  // ── Export ──────────────────────────────────────────────────────────────────

  function handleExport(format) {
    setExportOpen(false)
    const rows = itemsToRows(items, catMap, locMap)

    if (format === 'csv') {
      const csv = Papa.unparse(rows, { columns: COLUMNS })
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      downloadBlob(blob, 'inventory_export.csv')
      return
    }

    // xlsx
    const ws = XLSX.utils.json_to_sheet(rows, { header: COLUMNS })
    // Auto column widths
    ws['!cols'] = COLUMNS.map(col => ({ wch: Math.max(col.length, 14) }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Inventory')
    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    downloadBlob(blob, 'inventory_export.xlsx')
  }

  // ── Import ──────────────────────────────────────────────────────────────────

  async function handleFileSelect(e) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    let rows = []
    try {
      if (file.name.endsWith('.csv')) {
        const text = await file.text()
        const result = Papa.parse(text, { header: true, skipEmptyLines: true })
        rows = result.data
      } else {
        const buf = await file.arrayBuffer()
        const wb = XLSX.read(buf, { type: 'array', cellDates: false })
        const ws = wb.Sheets[wb.SheetNames[0]]
        rows = XLSX.utils.sheet_to_json(ws, { defval: '' })
      }
    } catch {
      alert('Could not parse file. Make sure it is a valid .xlsx or .csv.')
      return
    }

    if (rows.length === 0) { alert('The file contains no data rows.'); return }

    setImporting(true)
    setDone(false)
    setProgress({ current: 0, total: rows.length, succeeded: 0, failed: 0, errors: [] })

    // Pre-flight: load lookup tables once
    const userId = localStorage.getItem('user_id') || ''
    let catList = [], tagList = [], locList = []
    try {
      const [catRes, tagRes, locRes] = await Promise.all([
        apiClient.get('/categories/'),
        apiClient.get('/tags/'),
        apiClient.get('/storage-locations/'),
      ])
      catList = catRes.data
      tagList = tagRes.data
      locList = locRes.data
    } catch {
      alert('Failed to load reference data from server. Import aborted.')
      setImporting(false)
      return
    }

    // Find root category id for auto-creating under root
    const rootCat = catList.find(c => !c.parent_id)
    const catNameToId = {}
    catList.forEach(c => { catNameToId[c.name.trim().toLowerCase()] = c.id })

    const tagNameToId = {}
    tagList.forEach(t => { tagNameToId[t.name.trim().toLowerCase()] = t.id })

    const locNameToId = {}
    locList.forEach(l => { locNameToId[l.name.trim().toLowerCase()] = l.id })

    let succeeded = 0, failed = 0
    const errors = []

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const rowNum = i + 1

      setProgress(p => ({ ...p, current: rowNum }))

      const itemName = String(row['Item Name'] || '').trim()
      const catName  = String(row['Category']  || '').trim()

      if (!itemName) {
        failed++
        errors.push(`Row ${rowNum}: "Item Name" is required.`)
        setProgress(p => ({ ...p, succeeded, failed, errors: [...errors] }))
        continue
      }
      if (!catName) {
        failed++
        errors.push(`Row ${rowNum} (${itemName}): "Category" is required.`)
        setProgress(p => ({ ...p, succeeded, failed, errors: [...errors] }))
        continue
      }

      try {
        // Resolve / auto-create category
        let catId = catNameToId[catName.toLowerCase()]
        if (!catId) {
          const res = await apiClient.post('/categories/', {
            name: catName,
            parent_id: rootCat?.id || null,
            created_by: userId,
          })
          catId = res.data.id
          catNameToId[catName.toLowerCase()] = catId
        }

        // Resolve / auto-create stored location
        let locId = undefined
        const locName = String(row['Stored Location'] || '').trim()
        if (locName) {
          locId = locNameToId[locName.toLowerCase()]
          if (!locId) {
            const res = await apiClient.post('/storage-locations/', { name: locName, created_by: userId })
            locId = res.data.id
            locNameToId[locName.toLowerCase()] = locId
          }
        }

        // Resolve / auto-create tags
        const tagNames = String(row['Tags'] || '').split(',').map(t => t.trim()).filter(Boolean)
        const tagIds = []
        for (const tn of tagNames) {
          let tid = tagNameToId[tn.toLowerCase()]
          if (!tid) {
            const res = await apiClient.post('/tags/', { name: tn, tag_type: 'general', created_by: userId })
            tid = res.data.id
            tagNameToId[tn.toLowerCase()] = tid
          }
          tagIds.push(tid)
        }

        // Validate status
        let status = String(row['Status'] || '').trim()
        if (!VALID_STATUSES.includes(status)) status = 'Stocked'

        // Build payload
        const payload = {
          item_name:        itemName,
          category_id:      catId,
          created_by:       userId,
          status,
          ...(locId               && { stored_location_id: locId }),
          ...(int(row['Quantity']) !== undefined  && { quantity:       int(row['Quantity']) }),
          ...(num(row['Net Weight']) !== undefined && { net_weight:    num(row['Net Weight']) }),
          ...(num(row['Amount']) !== undefined     && { amount:        num(row['Amount']) }),
          ...(num(row['Sugar']) !== undefined      && { sugar:         num(row['Sugar']) }),
          ...(num(row['Fiber']) !== undefined      && { fiber:         num(row['Fiber']) }),
          ...(num(row['Carbohydrate']) !== undefined && { carbohydrate: num(row['Carbohydrate']) }),
          ...(num(row['Fat']) !== undefined        && { fat:           num(row['Fat']) }),
          ...(num(row['Protein']) !== undefined    && { protein:       num(row['Protein']) }),
          ...(parseDate(row['Bought Date'])  && { bought_date:      parseDate(row['Bought Date']) }),
          ...(parseDate(row['Expiry Date'])  && { expiration_date:  parseDate(row['Expiry Date']) }),
          ...(String(row['Notes'] || '').trim() && { notes: String(row['Notes']).trim() }),
        }

        const res = await apiClient.post('/inventory/', payload)
        const savedId = res.data.id
        await apiClient.put(`/inventory/${savedId}/tags`, { tag_ids: tagIds })

        succeeded++
      } catch (err) {
        failed++
        const msg = err?.response?.data?.detail || err?.message || 'Unknown error'
        errors.push(`Row ${rowNum} (${itemName}): ${msg}`)
      }

      setProgress(p => ({ ...p, succeeded, failed, errors: [...errors] }))
    }

    setDone(true)
    if (succeeded > 0) onDone()
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Export dropdown */}
        <div className="relative">
          <button
            className="btn-ghost flex items-center gap-1.5 text-sm"
            onClick={() => setExportOpen(o => !o)}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 3v12" />
            </svg>
            Export
            <svg className={`w-3 h-3 transition-transform ${exportOpen ? 'rotate-180' : ''}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {exportOpen && (
            <div className="absolute right-0 mt-1 w-36 bg-white border border-stone-200 rounded-xl shadow-lg z-20 overflow-hidden">
              <button className="w-full text-left px-4 py-2.5 text-sm hover:bg-orange-50 text-stone-700 flex items-center gap-2"
                onClick={() => handleExport('xlsx')}>
                <span className="text-green-600 font-bold text-xs">XLS</span> Excel (.xlsx)
              </button>
              <button className="w-full text-left px-4 py-2.5 text-sm hover:bg-orange-50 text-stone-700 flex items-center gap-2"
                onClick={() => handleExport('csv')}>
                <span className="text-blue-500 font-bold text-xs">CSV</span> CSV (.csv)
              </button>
            </div>
          )}
        </div>

        {/* Import button */}
        <button
          className="btn-ghost flex items-center gap-1.5 text-sm"
          onClick={() => fileRef.current?.click()}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 8l5-5 5 5M12 3v12" />
          </svg>
          Import
        </button>
        <input ref={fileRef} type="file" accept=".xlsx,.csv" className="hidden" onChange={handleFileSelect} />
      </div>

      {/* Progress modal */}
      {importing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
            <h3 className="text-base font-semibold text-stone-800 mb-4">
              {done ? 'Import Complete' : 'Importing…'}
            </h3>

            {!done && progress && (
              <>
                <div className="text-sm text-stone-500 mb-2">
                  Row {progress.current} of {progress.total}
                </div>
                <div className="w-full bg-stone-100 rounded-full h-2 mb-4">
                  <div
                    className="bg-orange-500 h-2 rounded-full transition-all"
                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                  />
                </div>
              </>
            )}

            {progress && (
              <div className="flex gap-6 mb-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-emerald-600">{progress.succeeded}</p>
                  <p className="text-xs text-stone-400">Succeeded</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-500">{progress.failed}</p>
                  <p className="text-xs text-stone-400">Failed</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-stone-400">{progress.total}</p>
                  <p className="text-xs text-stone-400">Total rows</p>
                </div>
              </div>
            )}

            {progress?.errors?.length > 0 && (
              <div className="max-h-36 overflow-y-auto rounded-lg bg-red-50 border border-red-100 p-3 mb-4">
                {progress.errors.map((e, i) => (
                  <p key={i} className="text-xs text-red-600 mb-1 last:mb-0">{e}</p>
                ))}
              </div>
            )}

            {done && (
              <button
                className="btn-primary w-full"
                onClick={() => { setImporting(false); setProgress(null); setDone(false) }}
              >
                Done
              </button>
            )}
          </div>
        </div>
      )}

      {/* Close export dropdown on outside click */}
      {exportOpen && (
        <div className="fixed inset-0 z-10" onClick={() => setExportOpen(false)} />
      )}
    </>
  )
}
