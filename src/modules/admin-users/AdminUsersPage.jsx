import React, { useState, useEffect } from 'react'
import { Users, Plus, Save, X, ToggleLeft, ToggleRight, KeyRound, ShieldCheck, ChevronDown, ChevronUp } from 'lucide-react'
import { useAuth } from '../../auth/AuthContext.jsx'
import { ROLES, ROLE_LABELS, MODULE_LABELS, ALL_MODULES, PERMISSIONS } from '../../auth/permissions.js'
import { useToast } from '../../components/Toast.jsx'

const EMPTY_FORM = { email: '', display_name: '', role: 'viewer', password: '' }

const ROLE_COLORS = {
  super_admin: 'bg-purple-100 text-purple-800',
  manager: 'bg-blue-100 text-blue-800',
  marketing: 'bg-orange-100 text-orange-800',
  viewer: 'bg-gray-100 text-gray-700',
}

function formatDate(str) {
  if (!str) return '—'
  return new Date(str).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

/** Build a default permissions object from role defaults */
function buildRoleDefaults(role) {
  const rolePerms = PERMISSIONS[role] || {}
  const result = {}
  ALL_MODULES.forEach((mod) => {
    result[mod] = rolePerms[mod] ? [...rolePerms[mod]] : []
  })
  return result
}

/** Permissions editor shown in the expanded edit row */
function PermissionsEditor({ editingUser, onChange }) {
  const useDefaults = !editingUser.custom_permissions || Object.keys(editingUser.custom_permissions).length === 0
  const perms = useDefaults ? buildRoleDefaults(editingUser.role) : { ...editingUser.custom_permissions }

  const handleToggleDefaults = (checked) => {
    if (checked) {
      onChange({ ...editingUser, custom_permissions: null })
    } else {
      onChange({ ...editingUser, custom_permissions: buildRoleDefaults(editingUser.role) })
    }
  }

  const toggleAction = (mod, action) => {
    const current = perms[mod] || []
    let updated
    if (current.includes(action)) {
      updated = current.filter((a) => a !== action)
      // If removing write, that's fine. If removing read, also remove write.
      if (action === 'read') updated = updated.filter((a) => a !== 'write')
    } else {
      updated = [...current, action]
      // If adding write, also ensure read is present
      if (action === 'write' && !updated.includes('read')) updated.push('read')
    }
    const newPerms = { ...perms, [mod]: updated }
    onChange({ ...editingUser, custom_permissions: newPerms })
  }

  return (
    <div className="mt-4 border-t border-gray-200 pt-4">
      <div className="flex items-center gap-3 mb-3">
        <ShieldCheck className="w-4 h-4 text-indigo-500" />
        <span className="text-sm font-semibold text-gray-700">Module Permissions</span>
        <label className="flex items-center gap-2 ml-auto text-sm text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={useDefaults}
            onChange={(e) => handleToggleDefaults(e.target.checked)}
            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          Use role defaults
        </label>
      </div>

      <div className="rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
              <th className="text-left px-4 py-2 font-medium">Module</th>
              <th className="text-center px-4 py-2 font-medium w-20">Read</th>
              <th className="text-center px-4 py-2 font-medium w-20">Write</th>
            </tr>
          </thead>
          <tbody>
            {ALL_MODULES.map((mod) => {
              const modPerms = perms[mod] || []
              const canRead = modPerms.includes('read')
              const canWrite = modPerms.includes('write')
              return (
                <tr key={mod} className="border-t border-gray-100">
                  <td className="px-4 py-2.5 text-gray-700">{MODULE_LABELS[mod] || mod}</td>
                  <td className="px-4 py-2.5 text-center">
                    <input
                      type="checkbox"
                      checked={canRead}
                      disabled={useDefaults}
                      onChange={() => toggleAction(mod, 'read')}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                    />
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <input
                      type="checkbox"
                      checked={canWrite}
                      disabled={useDefaults}
                      onChange={() => toggleAction(mod, 'write')}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {useDefaults && (
        <p className="text-xs text-gray-400 mt-1.5">Uncheck "Use role defaults" to set custom module access for this user.</p>
      )}
    </div>
  )
}

export default function AdminUsersPage() {
  const { user: me } = useAuth()
  const toast = useToast()

  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [formData, setFormData] = useState({ ...EMPTY_FORM })
  const [editingId, setEditingId] = useState(null)
  const [editingUser, setEditingUser] = useState(null)
  const [resetPasswordId, setResetPasswordId] = useState(null)
  const [newPassword, setNewPassword] = useState('')

  useEffect(() => { loadUsers() }, [])

  const loadUsers = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin-users')
      const data = await res.json()
      if (data.success) setUsers(data.users)
      else toast.error(data.error || 'Failed to load users')
    } catch {
      toast.error('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = async () => {
    if (!formData.email.trim()) return toast.error('Email is required')
    if (!formData.display_name.trim()) return toast.error('Display name is required')
    if (formData.password.length < 8) return toast.error('Password must be at least 8 characters')

    setSaving(true)
    try {
      const res = await fetch('/api/admin-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('User created')
        setFormData({ ...EMPTY_FORM })
        setShowAddForm(false)
        loadUsers()
      } else {
        toast.error(data.error || 'Failed to create user')
      }
    } catch {
      toast.error('Failed to create user')
    } finally {
      setSaving(false)
    }
  }

  const startEdit = (u) => {
    setEditingId(u.id)
    setEditingUser({ ...u })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditingUser(null)
  }

  const handleUpdate = async () => {
    if (!editingUser) return
    setSaving(true)
    try {
      const payload = {
        id: editingUser.id,
        display_name: editingUser.display_name,
        role: editingUser.role,
        custom_permissions: editingUser.custom_permissions,
        requesterId: me?.id,
      }
      const res = await fetch('/api/admin-users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('User updated')
        setEditingId(null)
        setEditingUser(null)
        loadUsers()
      } else {
        toast.error(data.error || 'Failed to update')
      }
    } catch {
      toast.error('Failed to update user')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (u) => {
    if (u.id === me?.id) return toast.error('Cannot deactivate your own account')
    try {
      const res = await fetch('/api/admin-users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: u.id, is_active: !u.is_active, requesterId: me?.id }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(u.is_active ? 'User deactivated' : 'User activated')
        loadUsers()
      } else {
        toast.error(data.error || 'Failed to update')
      }
    } catch {
      toast.error('Failed to update user')
    }
  }

  const handleResetPassword = async (userId) => {
    if (newPassword.length < 8) return toast.error('Password must be at least 8 characters')
    setSaving(true)
    try {
      const res = await fetch('/api/admin-users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, new_password: newPassword, requesterId: me?.id }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Password reset successfully')
        setResetPasswordId(null)
        setNewPassword('')
      } else {
        toast.error(data.error || 'Failed to reset password')
      }
    } catch {
      toast.error('Failed to reset password')
    } finally {
      setSaving(false)
    }
  }

  const isSelf = (id) => id === me?.id
  const INPUT = 'w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="w-7 h-7 text-indigo-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Admin Users</h1>
            <p className="text-gray-500 text-sm">Manage dashboard access, roles, and module permissions</p>
          </div>
        </div>
        <button
          onClick={() => { setShowAddForm(!showAddForm); setFormData({ ...EMPTY_FORM }) }}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition"
        >
          <Plus className="w-4 h-4" />
          Add User
        </button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-900">New Admin User</h3>
            <button onClick={() => setShowAddForm(false)} className="p-1 text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="user@example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Display Name *</label>
              <input
                type="text"
                value={formData.display_name}
                onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                placeholder="Jane Smith"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password * (min 8 chars)</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="••••••••"
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
              {saving ? 'Creating...' : 'Create User'}
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

      {/* Role Permissions Reference */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck className="w-4 h-4 text-indigo-500" />
          <h3 className="text-sm font-semibold text-gray-700">Default Role Permissions</h3>
          <span className="text-xs text-gray-400 ml-1">— can be overridden per user below</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { role: 'super_admin', label: 'Super Admin', color: 'bg-purple-100 text-purple-800', modules: 'All modules + Admin Users' },
            { role: 'manager',     label: 'Manager',     color: 'bg-blue-100 text-blue-800',   modules: 'Tracking, Orders, Products, Coupons, Agencies' },
            { role: 'marketing',   label: 'Marketing',   color: 'bg-orange-100 text-orange-800', modules: 'Tracking (read), Coupons (read/write)' },
            { role: 'viewer',      label: 'Viewer',      color: 'bg-gray-100 text-gray-700',   modules: 'Tracking (read), Orders (read)' },
          ].map(({ role, label, color, modules }) => (
            <div key={role} className="bg-gray-50 rounded-lg p-3 text-xs">
              <span className={`inline-block px-2 py-0.5 rounded-full font-medium mb-2 ${color}`}>{label}</span>
              <p className="text-gray-500 leading-relaxed">{modules}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">
            All Users <span className="text-gray-400 font-normal">({users.length})</span>
          </h3>
        </div>

        {loading ? (
          <div className="py-12 text-center text-gray-500 text-sm">Loading...</div>
        ) : users.length === 0 ? (
          <div className="py-12 text-center">
            <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No users yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
                  <th className="text-left px-6 py-3 font-medium">User</th>
                  <th className="text-left px-6 py-3 font-medium">Role</th>
                  <th className="text-center px-6 py-3 font-medium">Permissions</th>
                  <th className="text-center px-6 py-3 font-medium">Status</th>
                  <th className="text-left px-6 py-3 font-medium">Last Login</th>
                  <th className="text-center px-6 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <React.Fragment key={u.id ?? u.email}>
                    {/* Main row */}
                    <tr className={`border-t border-gray-100 transition ${editingId === u.id ? 'bg-indigo-50' : 'hover:bg-gray-50'}`}>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-1.5">
                          <div>
                            <p className={`font-medium text-sm ${u.is_active ? 'text-gray-900' : 'text-gray-400'}`}>
                              {u.display_name}
                            </p>
                            <p className="text-xs text-gray-500">{u.email}</p>
                          </div>
                          {isSelf(u.id) && (
                            <span className="text-xs bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-medium ml-1">You</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[u.role] || 'bg-gray-100 text-gray-700'}`}>
                          {ROLE_LABELS[u.role] || u.role}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-center">
                        {u.custom_permissions && Object.keys(u.custom_permissions).length > 0 ? (
                          <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">Custom</span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">Role default</span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {u.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-500">{formatDate(u.last_login)}</td>
                      <td className="px-6 py-3">
                        <div className="flex items-center justify-center gap-1">
                          {/* Edit / expand */}
                          <button
                            onClick={() => editingId === u.id ? cancelEdit() : startEdit(u)}
                            className={`p-1.5 rounded transition ${editingId === u.id ? 'text-indigo-600 bg-indigo-100' : 'text-blue-600 hover:bg-blue-50'}`}
                            title={editingId === u.id ? 'Collapse' : 'Edit'}
                          >
                            {editingId === u.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>

                          {/* Reset password */}
                          {resetPasswordId === u.id ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="New password"
                                className="w-28 px-2 py-1 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-indigo-500"
                                autoFocus
                              />
                              <button
                                onClick={() => handleResetPassword(u.id)}
                                disabled={saving}
                                className="px-2 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 transition"
                              >
                                Set
                              </button>
                              <button
                                onClick={() => { setResetPasswordId(null); setNewPassword('') }}
                                className="p-1 text-gray-400 hover:text-gray-600"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => { setResetPasswordId(u.id); setNewPassword('') }}
                              className="p-1.5 text-amber-600 hover:bg-amber-50 rounded transition"
                              title="Reset password"
                            >
                              <KeyRound className="w-4 h-4" />
                            </button>
                          )}

                          {/* Toggle active */}
                          {!isSelf(u.id) && (
                            <button
                              onClick={() => handleToggleActive(u)}
                              className={`p-1.5 rounded transition ${u.is_active ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-100'}`}
                              title={u.is_active ? 'Deactivate' : 'Reactivate'}
                            >
                              {u.is_active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Expanded edit row */}
                    {editingId === u.id && editingUser && (
                      <tr key={`${u.id}-edit`}>
                        <td colSpan={6} className="px-6 py-5 bg-indigo-50 border-t border-indigo-100">
                          <div className="max-w-2xl">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-2">
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Display Name</label>
                                <input
                                  type="text"
                                  value={editingUser.display_name}
                                  onChange={(e) => setEditingUser({ ...editingUser, display_name: e.target.value })}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                  autoFocus
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                  Role {isSelf(u.id) && <span className="text-gray-400">(cannot change own role)</span>}
                                </label>
                                <select
                                  value={editingUser.role}
                                  onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value, custom_permissions: null })}
                                  disabled={isSelf(u.id)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                                </select>
                              </div>
                            </div>

                            <PermissionsEditor editingUser={editingUser} onChange={setEditingUser} />

                            <div className="flex gap-3 mt-4">
                              <button
                                onClick={handleUpdate}
                                disabled={saving}
                                className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition"
                              >
                                <Save className="w-3.5 h-3.5" />
                                {saving ? 'Saving...' : 'Save Changes'}
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="px-5 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-white transition"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
