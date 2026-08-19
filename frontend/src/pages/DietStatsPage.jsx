import { useState, useEffect, useCallback } from 'react'
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
  LineChart, Line,
} from 'recharts'
import Layout from '../components/Layout/Layout'
import apiClient from '../api/index.js'

// ── Colour palette ────────────────────────────────────────────────────────────
const TAG_COLORS = {
  vitamin:  '#f97316',
  mineral:  '#3b82f6',
  allergen: '#ef4444',
  diet:     '#22c55e',
  general:  '#a855f7',
}
const FALLBACK_COLORS = ['#f97316','#3b82f6','#22c55e','#ef4444','#a855f7','#eab308','#14b8a6','#ec4899','#6366f1','#84cc16']
const STATUS_COLORS   = { Done: '#22c55e', Planned: '#f97316', Skipped: '#94a3b8' }
const MEAL_COLORS     = { Breakfast: '#fbbf24', Lunch: '#3b82f6', Dinner: '#7c3aed' }
const EXPIRY_COLORS   = { expired: '#ef4444', within_3d: '#f97316', within_7d: '#eab308', ok: '#22c55e', none: '#94a3b8' }
const EXPIRY_LABELS   = { expired: 'Expired', within_3d: '≤ 3 days', within_7d: '≤ 7 days', ok: 'OK', none: 'No date' }

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const now = new Date()

function tagColor(tagType, idx) {
  return TAG_COLORS[tagType?.toLowerCase()] ?? FALLBACK_COLORS[idx % FALLBACK_COLORS.length]
}

// ── Shared chart wrapper ───────────────────────────────────────────────────────
function ChartCard({ title, subtitle, children }) {
  return (
    <div className="card p-5">
      <h3 className="text-base font-semibold text-stone-800 mb-0.5">{title}</h3>
      {subtitle && <p className="text-xs text-stone-500 mb-4">{subtitle}</p>}
      {children}
    </div>
  )
}

function StatPill({ label, value, color }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl p-4 bg-orange-50 border border-orange-100 min-w-[100px]">
      <span className="text-2xl font-bold" style={{ color }}>{value}</span>
      <span className="text-xs text-stone-500 mt-1 text-center">{label}</span>
    </div>
  )
}

// ── Tag-type distribution pie ─────────────────────────────────────────────────
function TagTypePie({ tagDistribution }) {
  const byType = {}
  tagDistribution.forEach(t => {
    const key = t.tag_type || 'general'
    byType[key] = (byType[key] || 0) + t.count
  })
  const data = Object.entries(byType).map(([type, count]) => ({ name: type, value: count }))
  if (!data.length) return <p className="text-sm text-stone-400 text-center py-8">No tag data for this month.</p>
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
          {data.map((entry, i) => <Cell key={entry.name} fill={tagColor(entry.name, i)} />)}
        </Pie>
        <Tooltip formatter={(v, n) => [`${v} uses`, n]} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  )
}

// ── Individual tag bar chart ──────────────────────────────────────────────────
function TagBar({ tagDistribution }) {
  const top = [...tagDistribution].slice(0, 12)
  if (!top.length) return null
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={top} layout="vertical" margin={{ left: 10, right: 20 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11 }} />
        <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11 }} />
        <Tooltip formatter={(v) => [`${v} uses`]} />
        <Bar dataKey="count" radius={[0, 4, 4, 0]}>
          {top.map((entry, i) => <Cell key={entry.id || i} fill={tagColor(entry.tag_type, i)} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

// ── Nutrition radar ───────────────────────────────────────────────────────────
function NutritionRadar({ nutrition }) {
  const keys = ['carbohydrate','protein','fat','fiber','sugar']
  const max = Math.max(...keys.map(k => nutrition[k] || 0), 1)
  const data = keys.map(k => ({ subject: k.charAt(0).toUpperCase() + k.slice(1), value: +(nutrition[k] || 0).toFixed(1), pct: +((nutrition[k] || 0) / max * 100).toFixed(1) }))
  return (
    <ResponsiveContainer width="100%" height={260}>
      <RadarChart cx="50%" cy="50%" outerRadius={90} data={data}>
        <PolarGrid />
        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12 }} />
        <Radar name="grams" dataKey="pct" stroke="#f97316" fill="#f97316" fillOpacity={0.35} />
        <Tooltip formatter={(v, n, props) => [`${props.payload.value}g`, props.payload.subject]} />
      </RadarChart>
    </ResponsiveContainer>
  )
}

// ── Meal time & status ────────────────────────────────────────────────────────
function MealStatusCharts({ mealTime, statusBreakdown }) {
  const mtData = mealTime.map(m => ({ name: m.meal_time, value: m.count }))
  const stData = statusBreakdown.map(s => ({ name: s.status, value: s.count }))
  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <p className="text-xs font-medium text-stone-600 mb-2">By Meal Time</p>
        <ResponsiveContainer width="100%" height={180}>
          <PieChart>
            <Pie data={mtData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`}>
              {mtData.map((e) => <Cell key={e.name} fill={MEAL_COLORS[e.name] ?? '#f97316'} />)}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div>
        <p className="text-xs font-medium text-stone-600 mb-2">Entry Status</p>
        <ResponsiveContainer width="100%" height={180}>
          <PieChart>
            <Pie data={stData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`}>
              {stData.map((e) => <Cell key={e.name} fill={STATUS_COLORS[e.name] ?? '#94a3b8'} />)}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// ── Inventory overview charts ─────────────────────────────────────────────────
function InventoryOverview({ overview }) {
  const statusData = (overview.status_breakdown || []).map(s => ({ name: s.status, value: s.count }))
  const expiryData = (overview.expiry_breakdown || []).map(e => ({ name: EXPIRY_LABELS[e.bucket] ?? e.bucket, value: e.count, bucket: e.bucket }))
  const catData    = (overview.top_categories || [])

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <ChartCard title="Stock Status" subtitle="Current inventory breakdown">
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${(percent*100).toFixed(0)}%`}>
              {statusData.map((e, i) => <Cell key={e.name} fill={FALLBACK_COLORS[i % FALLBACK_COLORS.length]} />)}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Expiry Overview" subtitle="Items by days to expiry">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={expiryData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="value" radius={[4,4,0,0]}>
              {expiryData.map((e) => <Cell key={e.name} fill={EXPIRY_COLORS[e.bucket] ?? '#94a3b8'} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Top Categories" subtitle="Items per category">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={catData} layout="vertical" margin={{ left: 5, right: 10 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="count" fill="#f97316" radius={[0,4,4,0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  )
}

// ── 6-month item usage trend (grouped bar per item) ───────────────────────────
function UsageTrendChart({ trend }) {
  if (!trend?.top_items?.length) {
    return <p className="text-sm text-stone-400 text-center py-8">No meal-prep data in the last 6 months.</p>
  }

  // Build one row per month; each row has a key per item name
  const rows = trend.months.map((m, idx) => {
    const row = { month: m.label }
    trend.top_items.forEach(item => { row[item.name] = item.monthly_counts[idx] })
    return row
  })

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={rows} margin={{ left: 0, right: 16, top: 8 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        {trend.top_items.map((item, i) => (
          <Bar key={item.id} dataKey={item.name} stackId="a"
            fill={FALLBACK_COLORS[i % FALLBACK_COLORS.length]} radius={i === trend.top_items.length - 1 ? [4,4,0,0] : [0,0,0,0]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}

// ── 6-month category intensity pie ────────────────────────────────────────────
function CategoryUsagePie({ trend }) {
  const data = (trend?.category_totals || []).slice(0, 10)
  if (!data.length) return <p className="text-sm text-stone-400 text-center py-8">No data.</p>

  const LABEL_THRESHOLD = 0.04  // hide labels for slices < 4%
  const total = data.reduce((s, d) => s + d.count, 0)

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data} dataKey="count" nameKey="name"
          cx="50%" cy="50%" outerRadius={110} innerRadius={50}
          label={({ name, percent }) => percent > LABEL_THRESHOLD ? `${name} ${(percent * 100).toFixed(0)}%` : ''}
          labelLine={false}
        >
          {data.map((entry, i) => <Cell key={entry.category_id || i} fill={FALLBACK_COLORS[i % FALLBACK_COLORS.length]} />)}
        </Pie>
        <Tooltip formatter={(v, n) => [`${v} appearances`, n]} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
  )
}

// ── Monthly volume line ───────────────────────────────────────────────────────
function MonthlyVolumeLine({ trend }) {
  const data = trend?.monthly_totals || []
  if (!data.length) return null
  return (
    <ResponsiveContainer width="100%" height={160}>
      <LineChart data={data} margin={{ left: 0, right: 16, top: 4, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
        <Tooltip formatter={v => [`${v} item appearances`]} />
        <Line type="monotone" dataKey="total_items" stroke="#f97316" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function DietStatsPage() {
  const [year,    setYear]    = useState(now.getFullYear())
  const [month,   setMonth]   = useState(now.getMonth() + 1)
  const [diet,    setDiet]    = useState(null)
  const [inv,     setInv]     = useState(null)
  const [trend,   setTrend]   = useState(null)
  const [loading, setLoading] = useState(false)
  const [err,     setErr]     = useState('')

  // Past 10 years → present
  const YEARS = Array.from({ length: 11 }, (_, i) => now.getFullYear() - 10 + i)

  const load = useCallback(async () => {
    setLoading(true); setErr('')
    try {
      const [dietRes, invRes, trendRes] = await Promise.all([
        apiClient.get(`/stats/dietary/${year}/${month}`),
        apiClient.get('/stats/inventory-overview'),
        apiClient.get('/stats/usage-trend'),
      ])
      setDiet(dietRes.data)
      setInv(invRes.data)
      setTrend(trendRes.data)
    } catch (e) {
      setErr('Failed to load stats: ' + (e?.response?.data?.detail || e.message || 'unknown error'))
    } finally {
      setLoading(false)
    }
  }, [year, month])

  useEffect(() => { load() }, [load])

  const totalNutrition = diet ? Object.values(diet.nutrition_totals).reduce((a, b) => a + b, 0) : 0

  return (
    <Layout>
      {/* ── Page header ── */}
      <div className="flex flex-wrap items-end gap-4 mb-6">
        <div>
          <h1 className="page-title">Diet &amp; Stats</h1>
          <p className="page-subtitle">Dietary intake from meal prep · Inventory health</p>
        </div>

        {/* Month / Year picker */}
        <div className="flex items-center gap-2 ml-auto flex-wrap">
          <label className="text-sm font-medium text-stone-600">Month</label>
          <select
            className="input py-1.5 pr-8 text-sm"
            value={month}
            onChange={e => setMonth(+e.target.value)}
          >
            {MONTHS.map((m, i) => <option key={m} value={i+1}>{m}</option>)}
          </select>
          <select
            className="input py-1.5 pr-8 text-sm"
            value={year}
            onChange={e => setYear(+e.target.value)}
          >
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button onClick={load} className="btn-primary text-sm py-1.5 px-4">Refresh</button>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20 text-stone-400 text-sm">
          Loading stats…
        </div>
      )}

      {err && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600 text-sm mb-6">{err}</div>
      )}

      {!loading && diet && (
        <>
          {/* ── Summary pills ── */}
          <div className="flex flex-wrap gap-3 mb-6">
            <StatPill label="Items used" value={diet.items_used?.length ?? 0} color="#f97316" />
            <StatPill label="Unique tags" value={diet.tag_distribution?.length ?? 0} color="#3b82f6" />
            <StatPill label="Total nutrition (g)" value={totalNutrition.toFixed(0)} color="#22c55e" />
            <StatPill label="Meal entries" value={(diet.meal_time_breakdown || []).reduce((a, b) => a + b.count, 0)} color="#a855f7" />
          </div>

          {!diet.has_data ? (
            <div className="card p-10 text-center text-stone-400 text-sm">
              No meal prep data for {MONTHS[month - 1]} {year}.<br />
              Add meal prep entries for this month to see dietary stats.
            </div>
          ) : (
            <>
              {/* ── Row 1: tag type pie + tag bar ── */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <ChartCard
                  title={`Dietary Tag Distribution — ${MONTHS[month - 1]} ${year}`}
                  subtitle="Proportion of tag types from all meal prep items this month"
                >
                  <TagTypePie tagDistribution={diet.tag_distribution} />
                </ChartCard>

                <ChartCard
                  title="Top Tags by Frequency"
                  subtitle="How often each tag appeared across meal prep items"
                >
                  <TagBar tagDistribution={diet.tag_distribution} />
                </ChartCard>
              </div>

              {/* ── Row 2: nutrition radar + meal/status pie ── */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <ChartCard
                  title="Nutritional Profile"
                  subtitle="Cumulative macronutrients from all meal prep items (grams)"
                >
                  <NutritionRadar nutrition={diet.nutrition_totals} />
                  <div className="flex flex-wrap gap-3 mt-3 justify-center">
                    {Object.entries(diet.nutrition_totals).map(([k, v]) => (
                      <span key={k} className="text-xs bg-orange-50 border border-orange-100 rounded-full px-3 py-1 text-stone-700">
                        {k.charAt(0).toUpperCase() + k.slice(1)}: <strong>{v}g</strong>
                      </span>
                    ))}
                  </div>
                </ChartCard>

                <ChartCard
                  title="Meal Activity"
                  subtitle="Entries by meal time and completion status"
                >
                  <MealStatusCharts
                    mealTime={diet.meal_time_breakdown}
                    statusBreakdown={diet.status_breakdown}
                  />
                </ChartCard>
              </div>

              {/* ── Row 3: most-used items ── */}
              {diet.items_used?.length > 0 && (
                <ChartCard
                  title="Most Used Ingredients"
                  subtitle="Top 10 inventory items appearing in meal prep this month"
                >
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={diet.items_used} margin={{ left: 5, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#f97316" radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>
              )}
            </>
          )}
        </>
      )}

      {/* ── Usage trend — 6-month rolling ── */}
      {!loading && trend && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-stone-800 mb-1">Usage Trends — Last 6 Months</h2>
          <p className="text-sm text-stone-500 mb-4">
            Which items and categories are appearing most in your meal prep
          </p>

          {/* summary pills */}
          <div className="flex flex-wrap gap-3 mb-6">
            <StatPill
              label="Unique items used"
              value={trend.top_items?.length ?? 0}
              color="#f97316"
            />
            <StatPill
              label="Categories active"
              value={trend.category_totals?.length ?? 0}
              color="#3b82f6"
            />
            <StatPill
              label="Total appearances"
              value={(trend.monthly_totals || []).reduce((a, b) => a + b.total_items, 0)}
              color="#22c55e"
            />
          </div>

          {/* monthly volume sparkline */}
          <ChartCard
            title="Monthly Meal-Prep Volume"
            subtitle="Total inventory item appearances per month"
          >
            <MonthlyVolumeLine trend={trend} />
          </ChartCard>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            {/* stacked bar — top items per month */}
            <ChartCard
              title="Top Items — Monthly Breakdown"
              subtitle="How often each of the top 10 items appeared in meal prep each month (stacked)"
            >
              <UsageTrendChart trend={trend} />
            </ChartCard>

            {/* donut — category intensity */}
            <ChartCard
              title="Category Usage Intensity"
              subtitle="Which categories dominate your meal prep over the last 6 months"
            >
              <CategoryUsagePie trend={trend} />
            </ChartCard>
          </div>
        </div>
      )}

      {/* ── Inventory overview (always shown, independent of month) ── */}
      {!loading && inv && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-stone-800 mb-1">Inventory Health</h2>
          <p className="text-sm text-stone-500 mb-4">Current snapshot — independent of selected month</p>
          <div className="flex flex-wrap gap-3 mb-6">
            <StatPill label="Total items" value={inv.total} color="#f97316" />
            <StatPill
              label="Expiring ≤7d"
              value={(inv.expiry_breakdown || []).filter(e => ['expired','within_3d','within_7d'].includes(e.bucket)).reduce((a,b) => a + b.count, 0)}
              color="#ef4444"
            />
          </div>
          <InventoryOverview overview={inv} />
        </div>
      )}
    </Layout>
  )
}
