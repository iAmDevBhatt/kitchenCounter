import { useState } from 'react'
import Layout from '../components/Layout/Layout'
import InventoryTable from '../components/InventoryTable/InventoryTable'
import useLabels from '../hooks/useLabels'

const TABS = [
  { key: 'all',     label: 'All Items',           filter: null, showAllFilters: true,  icon: '🗂️', color: 'text-stone-600' },
  { key: 'current', label: 'tab.current.stock',  filter: ['Stocked', 'InUse'],        icon: '📦', color: 'text-emerald-600' },
  { key: 'low',     label: 'tab.running.low',     filter: 'InUse',                    icon: '⚠️', color: 'text-amber-600' },
  { key: 'out',     label: 'tab.out.of.stock',    filter: ['NotInStock', 'Finished'], icon: '🚫', color: 'text-red-500' },
]

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState('all')
  const [showAdd,   setShowAdd]   = useState(false)
  const [stats,     setStats]     = useState({ total: '—', inUse: '—', runningLow: '—', outOfStock: '—' })
  const { getLabel } = useLabels()
  const tab = TABS.find(t => t.key === activeTab)

  const STAT_CARDS = [
    { label: 'Total Items',  value: stats.total,      color: 'bg-orange-50 border-orange-200',   text: 'text-orange-700' },
    { label: 'In Use',       value: stats.inUse,      color: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700' },
    { label: 'Running Low',  value: stats.runningLow, color: 'bg-amber-50 border-amber-200',     text: 'text-amber-700' },
    { label: 'Out of Stock', value: stats.outOfStock, color: 'bg-red-50 border-red-200',         text: 'text-red-600' },
  ]

  return (
    <Layout>
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">{getLabel('page.inventory.title')}</h1>
          <p className="page-subtitle">Manage your kitchen stock and usage</p>
        </div>
        <button className="btn-primary" onClick={() => setShowAdd(true)}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {getLabel('btn.add.item')}
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {STAT_CARDS.map(s => (
          <div key={s.label} className={`rounded-2xl border p-4 ${s.color}`}>
            <p className={`text-2xl font-bold ${s.text}`}>{s.value}</p>
            <p className="text-sm text-stone-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tab bar */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={activeTab === t.key ? 'tab-active' : 'tab-inactive'}
          >
            <span>{t.icon}</span>
            {t.key === 'all' ? 'All Items' : getLabel(t.label)}
          </button>
        ))}
      </div>

      {/* Table card */}
      <div className="card p-0 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-orange-50">
          <h2 className="text-base font-semibold text-stone-800 flex items-center gap-2">
            <span className={tab.color}>{tab.icon}</span>
            {tab.key === 'all' ? 'All Items' : getLabel(tab.label)}
          </h2>
        </div>
        <div className="p-4">
          <InventoryTable
            statusFilter={tab.filter}
            showAllFilters={!!tab.showAllFilters}
            onStatsChange={setStats}
            showAddModal={showAdd}
            onAddModalClose={() => setShowAdd(false)}
          />
        </div>
      </div>
    </Layout>
  )
}
