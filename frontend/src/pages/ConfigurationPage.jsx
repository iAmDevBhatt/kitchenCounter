import { useState } from 'react'
import Layout from '../components/Layout/Layout'
import CategoryTree from '../components/CategoryTree/CategoryTree'
import TagManager from '../components/TagManager/TagManager'
import UserManagement from '../components/UserManagement/UserManagement'
import StorageLocationManager from '../components/StorageLocationManager/StorageLocationManager'

const TABS = [
  { key: 'categories', label: 'Category Management',  icon: '🗂️' },
  { key: 'tags',       label: 'Tag Management',        icon: '🏷️' },
  { key: 'locations',  label: 'Storage Locations',     icon: '📍' },
  { key: 'users',      label: 'User Management',       icon: '👥' },
]

export default function ConfigurationPage() {
  const [activeTab, setActiveTab] = useState('categories')

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="page-title">Configuration</h1>
        <p className="page-subtitle">Manage categories, tags, storage locations, and users</p>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={activeTab === t.key ? 'tab-active' : 'tab-inactive'}
          >
            <span>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      <div className="card">
        {activeTab === 'categories' && <CategoryTree />}
        {activeTab === 'tags'       && <TagManager />}
        {activeTab === 'locations'  && <StorageLocationManager />}
        {activeTab === 'users'      && <UserManagement />}
      </div>
    </Layout>
  )
}
