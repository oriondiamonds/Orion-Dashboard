import { useState, useEffect } from 'react'
import {
  Plus,
  Pencil,
  Trash2,
  Tag,
  CheckCircle,
  XCircle,
  Link,
  Copy,
  X,
} from 'lucide-react'
import { useAuth } from '../../auth/AuthContext.jsx'
import { hasPermission } from '../../auth/permissions.js'
import { useToast } from '../../components/Toast.jsx'
import SearchableMultiSelect from '../../components/SearchableMultiSelect.jsx'

const STOREFRONT_URL = import.meta.env.VITE_STOREFRONT_URL || ''

const EMPTY_COUPON = {
  code: '',
  description: '',
  discount_type: 'percentage',
  discount_value: '',
  min_order_amount: '',
  max_discount_amount: '',
  usage_limit: '',
  per_customer_limit: '1',
  starts_at: '',
  expires_at: '',
  is_active: true,
  applies_to: 'all',
  applicable_product_ids: [],
  applicable_collections: [],
  utm_campaign: '',
  utm_source: '',
  utm_medium: '',
  agency_id: '',
  channel: '',
}

function formatDate(dateStr) {
  if (!dateStr) return 'No expiry'
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function toLocalDatetime(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const offset = d.getTimezoneOffset()
  const local = new Date(d.getTime() - offset * 60000)
  return local.toISOString().slice(0, 16)
}

function isExpired(coupon) {
  return coupon.expires_at && new Date(coupon.expires_at) < new Date()
}

function Field({ label, children, className = '' }) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  )
}

const INPUT = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent'

export default function CouponsPage() {
  const { user } = useAuth()
  const toast = useToast()
  const canWrite = hasPermission(user?.role, 'coupons', 'write')

  const [coupons, setCoupons] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({ ...EMPTY_COUPON })
  const [agencies, setAgencies] = useState([])
  const [products, setProducts] = useState([])
  const [collections, setCollections] = useState([])
  const [productsLoading, setProductsLoading] = useState(false)
  const [collectionsLoading, setCollectionsLoading] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState(null)

  useEffect(() => {
    fetchCoupons()
    fetchAgencies()
    fetchProducts()
    fetchCollections()
  }, [])

  const fetchCoupons = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/coupons')
      const data = await res.json()
      if (data.success) setCoupons(data.coupons)
      else toast.error(data.error || 'Failed to load coupons')
    } catch {
      toast.error('Failed to load coupons')
    } finally {
      setLoading(false)
    }
  }

  const fetchAgencies = async () => {
    try {
      const res = await fetch('/api/tracking/agencies')
      const data = await res.json()
      if (data.agencies) setAgencies(data.agencies)
    } catch {}
  }

  const fetchProducts = async () => {
    setProductsLoading(true)
    try {
      const res = await fetch('/api/coupons/products')
      const data = await res.json()
      if (data.products) setProducts(data.products)
    } catch {}
    finally { setProductsLoading(false) }
  }

  const fetchCollections = async () => {
    setCollectionsLoading(true)
    try {
      const res = await fetch('/api/coupons/collections')
      const data = await res.json()
      if (data.collections) setCollections(data.collections)
    } catch {}
    finally { setCollectionsLoading(false) }
  }

  const set = (key, value) => setFormData((f) => ({ ...f, [key]: value }))

  const handleCreate = () => {
    setEditingId(null)
    setFormData({ ...EMPTY_COUPON })
    setShowForm(true)
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 50)
  }

  const handleEdit = (coupon) => {
    setEditingId(coupon.id)
    setFormData({
      code: coupon.code,
      description: coupon.description || '',
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      min_order_amount: coupon.min_order_amount || '',
      max_discount_amount: coupon.max_discount_amount || '',
      usage_limit: coupon.usage_limit || '',
      per_customer_limit: coupon.per_customer_limit ?? '1',
      starts_at: toLocalDatetime(coupon.starts_at),
      expires_at: toLocalDatetime(coupon.expires_at),
      is_active: coupon.is_active,
      applies_to: coupon.applies_to || 'all',
      applicable_product_ids: Array.isArray(coupon.applicable_product_ids) ? coupon.applicable_product_ids : [],
      applicable_collections: Array.isArray(coupon.applicable_collections) ? coupon.applicable_collections : [],
      utm_campaign: coupon.utm_campaign || '',
      utm_source: coupon.utm_source || '',
      utm_medium: coupon.utm_medium || '',
      agency_id: coupon.agency_id || '',
      channel: coupon.channel || '',
    })
    setShowForm(true)
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 50)
  }

  const handleSave = async () => {
    if (!formData.code || !formData.discount_value) {
      toast.error('Code and discount value are required')
      return
    }

    setSaving(true)
    try {
      const productIds = formData.applies_to === 'specific_products' && formData.applicable_product_ids?.length > 0
        ? formData.applicable_product_ids : null
      const collectionsData = formData.applies_to === 'specific_collections' && formData.applicable_collections?.length > 0
        ? formData.applicable_collections : null

      const couponData = {
        code: formData.code.toUpperCase(),
        description: formData.description || null,
        discount_type: formData.discount_type,
        discount_value: parseFloat(formData.discount_value),
        min_order_amount: formData.min_order_amount ? parseFloat(formData.min_order_amount) : 0,
        max_discount_amount: formData.max_discount_amount ? parseFloat(formData.max_discount_amount) : null,
        usage_limit: formData.usage_limit ? parseInt(formData.usage_limit) : null,
        per_customer_limit: formData.per_customer_limit ? parseInt(formData.per_customer_limit) : 1,
        starts_at: formData.starts_at ? new Date(formData.starts_at).toISOString() : new Date().toISOString(),
        expires_at: formData.expires_at ? new Date(formData.expires_at).toISOString() : null,
        is_active: formData.is_active,
        applies_to: formData.applies_to,
        applicable_product_ids: productIds,
        applicable_collections: collectionsData,
        utm_campaign: formData.utm_campaign || null,
        utm_source: formData.utm_source || null,
        utm_medium: formData.utm_medium || null,
        agency_id: formData.agency_id || null,
        channel: formData.channel || null,
      }

      const res = editingId
        ? await fetch('/api/coupons', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: editingId, updates: couponData }),
          })
        : await fetch('/api/coupons', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ coupon: couponData }),
          })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Failed to save')
      } else {
        toast.success(editingId ? 'Coupon updated' : 'Coupon created')
        setShowForm(false)
        setEditingId(null)
        fetchCoupons()
      }
    } catch {
      toast.error('Failed to save coupon')
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (coupon) => {
    try {
      const res = await fetch('/api/coupons', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: coupon.id, updates: { is_active: !coupon.is_active } }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Failed to toggle')
      } else {
        toast.success(coupon.is_active ? 'Coupon deactivated' : 'Coupon activated')
        fetchCoupons()
      }
    } catch {
      toast.error('Failed to toggle coupon')
    }
  }

  const handleDelete = async (id) => {
    try {
      const res = await fetch('/api/coupons', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Failed to delete')
      } else {
        toast.success('Coupon deleted')
        setDeleteConfirmId(null)
        fetchCoupons()
      }
    } catch {
      toast.error('Failed to delete coupon')
    }
  }

  const copyReferralLink = (code) => {
    const base = STOREFRONT_URL || window.location.origin
    const link = `${base}/?coupon=${code}`
    navigator.clipboard.writeText(link)
    toast.success('Referral link copied!')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Tag className="w-7 h-7 text-indigo-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Coupon Management</h1>
            <p className="text-gray-500 text-sm">Create and manage discount coupons</p>
          </div>
        </div>
        {canWrite && (
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition"
          >
            <Plus className="w-4 h-4" />
            Create Coupon
          </button>
        )}
      </div>

      {/* Create / Edit Form */}
      {showForm && canWrite && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold text-gray-900">
              {editingId ? 'Edit Coupon' : 'Create New Coupon'}
            </h2>
            <button
              onClick={() => { setShowForm(false); setEditingId(null) }}
              className="p-1 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Coupon Code *">
              <input
                type="text"
                value={formData.code}
                onChange={(e) => set('code', e.target.value.toUpperCase())}
                placeholder="e.g. SUMMER20"
                className={INPUT + ' uppercase'}
              />
            </Field>

            <Field label="Description">
              <input
                type="text"
                value={formData.description}
                onChange={(e) => set('description', e.target.value)}
                placeholder="Internal note (optional)"
                className={INPUT}
              />
            </Field>

            <Field label="Discount Type *">
              <select value={formData.discount_type} onChange={(e) => set('discount_type', e.target.value)} className={INPUT}>
                <option value="percentage">Percentage (%)</option>
                <option value="flat">Flat Amount (₹)</option>
              </select>
            </Field>

            <Field label="Discount Value *">
              <input
                type="number"
                value={formData.discount_value}
                onChange={(e) => set('discount_value', e.target.value)}
                placeholder={formData.discount_type === 'percentage' ? 'e.g. 10' : 'e.g. 500'}
                className={INPUT}
              />
            </Field>

            <Field label="Min Order Amount">
              <input type="number" value={formData.min_order_amount} onChange={(e) => set('min_order_amount', e.target.value)} placeholder="0 (no minimum)" className={INPUT} />
            </Field>

            {formData.discount_type === 'percentage' && (
              <Field label="Max Discount Cap (₹)">
                <input type="number" value={formData.max_discount_amount} onChange={(e) => set('max_discount_amount', e.target.value)} placeholder="No cap" className={INPUT} />
              </Field>
            )}

            <Field label="Total Usage Limit">
              <input type="number" value={formData.usage_limit} onChange={(e) => set('usage_limit', e.target.value)} placeholder="Unlimited" className={INPUT} />
            </Field>

            <Field label="Per Customer Limit">
              <input type="number" value={formData.per_customer_limit} onChange={(e) => set('per_customer_limit', e.target.value)} placeholder="1" className={INPUT} />
            </Field>

            <Field label="Start Date">
              <input type="datetime-local" value={formData.starts_at} onChange={(e) => set('starts_at', e.target.value)} className={INPUT} />
            </Field>

            <Field label="Expiry Date">
              <input type="datetime-local" value={formData.expires_at} onChange={(e) => set('expires_at', e.target.value)} className={INPUT} />
            </Field>

            <div className="flex items-center gap-2 mt-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => set('is_active', e.target.checked)}
                className="w-4 h-4 accent-indigo-600"
              />
              <label htmlFor="is_active" className="text-sm font-medium text-gray-700">Active</label>
            </div>

            {/* Targeting */}
            <div className="col-span-full border-t pt-5 mt-1">
              <h3 className="text-base font-semibold text-gray-900 mb-4">Coupon Targeting</h3>
              <div className="space-y-4">
                <Field label="Apply Discount To">
                  <select value={formData.applies_to} onChange={(e) => set('applies_to', e.target.value)} className={INPUT}>
                    <option value="all">Entire Cart (All Products)</option>
                    <option value="specific_products">Specific Products Only</option>
                    <option value="specific_collections">Specific Collections Only</option>
                  </select>
                </Field>

                {formData.applies_to === 'specific_products' && (
                  <SearchableMultiSelect
                    label="Products"
                    options={products}
                    selected={formData.applicable_product_ids}
                    onChange={(v) => set('applicable_product_ids', v)}
                    placeholder="Search products..."
                    loading={productsLoading}
                  />
                )}

                {formData.applies_to === 'specific_collections' && (
                  <SearchableMultiSelect
                    label="Collections"
                    options={collections}
                    selected={formData.applicable_collections}
                    onChange={(v) => set('applicable_collections', v)}
                    placeholder="Search collections..."
                    loading={collectionsLoading}
                  />
                )}
              </div>
            </div>

            {/* Marketing Attribution */}
            <div className="col-span-full border-t pt-5 mt-1">
              <h3 className="text-base font-semibold text-gray-900 mb-4">Marketing Attribution</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="UTM Campaign">
                  <input type="text" value={formData.utm_campaign} onChange={(e) => set('utm_campaign', e.target.value)} placeholder="e.g. summer2025" className={INPUT} />
                </Field>
                <Field label="UTM Source">
                  <input type="text" value={formData.utm_source} onChange={(e) => set('utm_source', e.target.value)} placeholder="e.g. google, instagram" className={INPUT} />
                </Field>
                <Field label="UTM Medium">
                  <input type="text" value={formData.utm_medium} onChange={(e) => set('utm_medium', e.target.value)} placeholder="e.g. cpc, social" className={INPUT} />
                </Field>
                <Field label="Channel">
                  <select value={formData.channel} onChange={(e) => set('channel', e.target.value)} className={INPUT}>
                    <option value="">Select channel...</option>
                    <option value="google-ads">Google Ads</option>
                    <option value="facebook">Facebook</option>
                    <option value="instagram">Instagram</option>
                    <option value="email">Email Marketing</option>
                    <option value="self-marketing">Self Marketing</option>
                    <option value="other">Other</option>
                  </select>
                </Field>
                <Field label="Agency" className="col-span-full">
                  <select value={formData.agency_id} onChange={(e) => set('agency_id', e.target.value)} className={INPUT}>
                    <option value="">Select agency...</option>
                    {agencies.map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </Field>
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition"
            >
              {saving ? 'Saving...' : editingId ? 'Update Coupon' : 'Create Coupon'}
            </button>
            <button
              onClick={() => { setShowForm(false); setEditingId(null) }}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Coupons List */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading coupons...</div>
      ) : coupons.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-200">
          <Tag className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">No coupons created yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {coupons.map((coupon) => {
            const expired = isExpired(coupon)
            const borderColor = !coupon.is_active ? 'border-l-gray-300' : expired ? 'border-l-red-400' : 'border-l-green-500'

            return (
              <div
                key={coupon.id}
                className={`bg-white rounded-xl shadow-sm border border-gray-200 border-l-4 ${borderColor} p-5`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {/* Code + badges */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-lg font-bold text-gray-900 tracking-wider">{coupon.code}</span>
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                        {coupon.discount_type === 'percentage'
                          ? `${parseFloat(coupon.discount_value)}% OFF`
                          : `₹${parseFloat(coupon.discount_value)} OFF`}
                      </span>
                      {!coupon.is_active ? (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">Inactive</span>
                      ) : expired ? (
                        <span className="px-2 py-0.5 bg-red-100 text-red-600 rounded text-xs">Expired</span>
                      ) : (
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">Active</span>
                      )}
                    </div>

                    {coupon.description && (
                      <p className="text-sm text-gray-500 mt-1">{coupon.description}</p>
                    )}

                    {/* Referral link */}
                    <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Link className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                        <span className="text-xs text-blue-700 truncate">
                          {(STOREFRONT_URL || window.location.origin)}/?coupon={coupon.code}
                        </span>
                      </div>
                      <button
                        onClick={() => copyReferralLink(coupon.code)}
                        className="flex items-center gap-1 px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition flex-shrink-0"
                      >
                        <Copy className="w-3 h-3" /> Copy
                      </button>
                    </div>

                    {/* Meta */}
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-500 mt-2">
                      {coupon.min_order_amount > 0 && <span>Min: ₹{parseFloat(coupon.min_order_amount).toLocaleString('en-IN')}</span>}
                      {coupon.max_discount_amount && <span>Cap: ₹{parseFloat(coupon.max_discount_amount).toLocaleString('en-IN')}</span>}
                      <span>Used: {coupon.total_uses}{coupon.usage_limit ? ` / ${coupon.usage_limit}` : ' (unlimited)'}</span>
                      <span>Per customer: {coupon.per_customer_limit ?? 'unlimited'}</span>
                      <span>Expires: {formatDate(coupon.expires_at)}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  {canWrite && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => handleToggle(coupon)}
                        className={`p-2 rounded-lg transition ${coupon.is_active ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-50'}`}
                        title={coupon.is_active ? 'Deactivate' : 'Activate'}
                      >
                        {coupon.is_active ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                      </button>
                      <button
                        onClick={() => handleEdit(coupon)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        title="Edit"
                      >
                        <Pencil className="w-4.5 h-4.5" />
                      </button>
                      {deleteConfirmId === coupon.id ? (
                        <div className="flex items-center gap-1 ml-1">
                          <span className="text-xs text-red-600 font-medium">Delete?</span>
                          <button
                            onClick={() => handleDelete(coupon.id)}
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
                          onClick={() => setDeleteConfirmId(coupon.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="Delete"
                        >
                          <Trash2 className="w-4.5 h-4.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
