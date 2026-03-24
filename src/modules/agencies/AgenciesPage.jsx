import { useState, useEffect } from 'react'
import { Building2, Plus, Edit2, Trash2, Save, X, ToggleLeft, ToggleRight } from 'lucide-react'
import { useAuth } from '../../auth/AuthContext.jsx'
import { hasPermission } from '../../auth/permissions.js'
import { useToast } from '../../components/Toast.jsx'

const EMPTY_FORM = { name: '', contact_email: '' }

export default function AgenciesPage() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const canWrite = hasPermission(user?.role, 'agencies', 'write')

  const [agencies, setAgencies] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [formData, setFormData] = useState({ ...EMPTY_FORM })
  const [editingId, setEditingId] = useState(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState(null)

  useEffect(() => { loadAgencies() }, [])

  const loadAgencies = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/agencies')
      const data = await res.json()
      if (data.success) setAgencies(data.agencies)
      else showToast(data.error || 'Failed to load agencies', 'error')
    } catch {
      showToast('Failed to load agencies', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = async () => {
    if (!formData.name.trim()) {
      showToast('Agency name is required', 'error')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/agencies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formData.name.trim(), contact_email: formData.contact_email.trim() || null }),
      })
      const data = await res.json()
      if (data.success) {
        showToast('Agency added', 'success')
        setFormData({ ...EMPTY_FORM })
        setShowAddForm(false)
        loadAgencies()
      } else {
        showToast(data.error || 'Failed to add agency', 'error')
      }
    } catch {
      showToast('Failed to add agency', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdate = async (agency) => {
    setSaving(true)
    try {
      const res = await fetch('/api/agencies', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: agency.id, name: agency.name, contact_email: agency.contact_email }),
      })
      const data = await res.json()
      if (data.success) {
        showToast('Agency updated', 'success')
        setEditingId(null)
        loadAgencies()
      } else {
        showToast(data.error || 'Failed to update agency', 'error')
      }
    } catch {
      showToast('Failed to update agency', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (agency) => {
    try {
      const res = await fetch('/api/agencies', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: agency.id, is_active: !agency.is_active }),
      })
      const data = await res.json()
      if (data.success) {
        showToast(agency.is_active ? 'Agency deactivated' : 'Agency activated', 'success')
        loadAgencies()
      } else {
        showToast(data.error || 'Failed to update', 'error')
      }
    } catch {
      showToast('Failed to update agency', 'error')
    }
  }

  const handleDelete = async (id) => {
    try {
      const res = await fetch('/api/agencies', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      const data = await res.json()
      if (data.success) {
        showToast('Agency deactivated', 'success')
        setDeleteConfirmId(null)
        loadAgencies()
      } else {
        showToast(data.error || 'Failed to deactivate', 'error')
      }
    } catch {
      showToast('Failed to deactivate agency', 'error')
    }
  }

  const updateLocal = (id, field, value) => {
    setAgencies((prev) => prev.map((a) => (a.id === id ? { ...a, [field]: value } : a)))
  }

  const INPUT = 'w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Building2 className="w-7 h-7 text-indigo-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Agency Management</h1>
            <p className="text-gray-500 text-sm">Manage marketing agencies for attribution tracking</p>
          </div>
        </div>
        {canWrite && (
          <button
            onClick={() => { setShowAddForm(!showAddForm); setFormData({ ...EMPTY_FORM }) }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition"
          >
            <Plus className="w-4 h-4" />
            Add Agency
          </button>
        )}
      </div>

      {/* Add Form */}
      {showAddForm && canWrite && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-900">Add New Agency</h3>
            <button onClick={() => setShowAddForm(false)} className="p-1 text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Agency Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                placeholder="e.g. Agency C"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email</label>
              <input
                type="email"
                value={formData.contact_email}
                onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                placeholder="contact@agency.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleAdd}
              disabled={saving}
              className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition"
            >
              {saving ? 'Adding...' : 'Add Agency'}
            </button>
            <button
              onClick={() => { setShowAddForm(false); setFormData({ ...EMPTY_FORM }) }}
              className="px-5 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Agencies Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">
            All Agencies <span className="text-gray-400 font-normal">({agencies.length})</span>
          </h3>
        </div>

        {loading ? (
          <div className="py-12 text-center text-gray-500 text-sm">Loading...</div>
        ) : agencies.length === 0 ? (
          <div className="py-12 text-center">
            <Building2 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No agencies yet. Add your first one above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
                  <th className="text-left px-6 py-3 font-medium">Agency Name</th>
                  <th className="text-left px-6 py-3 font-medium">Contact Email</th>
                  <th className="text-center px-6 py-3 font-medium">Status</th>
                  {canWrite && <th className="text-center px-6 py-3 font-medium">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {agencies.map((agency) => (
                  <tr key={agency.id} className="border-t border-gray-100 hover:bg-gray-50 transition">
                    <td className="px-6 py-3">
                      {editingId === agency.id ? (
                        <input
                          type="text"
                          value={agency.name}
                          onChange={(e) => updateLocal(agency.id, 'name', e.target.value)}
                          className={INPUT}
                          autoFocus
                        />
                      ) : (
                        <span className={`font-medium ${agency.is_active ? 'text-gray-900' : 'text-gray-400 line-through'}`}>
                          {agency.name}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3">
                      {editingId === agency.id ? (
                        <input
                          type="email"
                          value={agency.contact_email || ''}
                          onChange={(e) => updateLocal(agency.id, 'contact_email', e.target.value)}
                          placeholder="contact@agency.com"
                          className={INPUT}
                        />
                      ) : (
                        <span className="text-sm text-gray-600">{agency.contact_email || '—'}</span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        agency.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {agency.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    {canWrite && (
                      <td className="px-6 py-3">
                        <div className="flex items-center justify-center gap-1">
                          {editingId === agency.id ? (
                            <>
                              <button
                                onClick={() => handleUpdate(agency)}
                                disabled={saving}
                                className="p-1.5 text-green-600 hover:bg-green-50 rounded transition disabled:opacity-50"
                                title="Save"
                              >
                                <Save className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => { setEditingId(null); loadAgencies() }}
                                className="p-1.5 text-gray-500 hover:bg-gray-100 rounded transition"
                                title="Cancel"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => setEditingId(agency.id)}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition"
                                title="Edit"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleToggleActive(agency)}
                                className={`p-1.5 rounded transition ${agency.is_active ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-100'}`}
                                title={agency.is_active ? 'Deactivate' : 'Reactivate'}
                              >
                                {agency.is_active
                                  ? <ToggleRight className="w-4 h-4" />
                                  : <ToggleLeft className="w-4 h-4" />}
                              </button>
                              {deleteConfirmId === agency.id ? (
                                <div className="flex items-center gap-1 ml-1">
                                  <span className="text-xs text-red-600 font-medium whitespace-nowrap">Deactivate?</span>
                                  <button
                                    onClick={() => handleDelete(agency.id)}
                                    className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition"
                                  >
                                    Yes
                                  </button>
                                  <button
                                    onClick={() => setDeleteConfirmId(null)}
                                    className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 transition"
                                  >
                                    No
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setDeleteConfirmId(agency.id)}
                                  className="p-1.5 text-red-500 hover:bg-red-50 rounded transition"
                                  title="Deactivate"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
