import { useState, useCallback } from 'react'
import {
  RefreshCw,
  Search,
  ChevronDown,
  ChevronUp,
  MapPin,
  Clock,
  Package,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { useAuth } from '../../auth/AuthContext.jsx'
import { hasPermission } from '../../auth/permissions.js'
import { useToast } from '../../components/Toast.jsx'

const STATUS_ORDER = [
  'pending',
  'order_placed',
  'acknowledged',
  'manufacturing',
  'shipping',
  'delivered',
]

const STATUS_LABELS = {
  pending: 'Payment Pending',
  order_placed: 'Order Placed',
  paid: 'Order Placed',
  acknowledged: 'Acknowledged',
  manufacturing: 'Manufacturing',
  shipping: 'Shipping',
  delivered: 'Delivered',
}

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  order_placed: 'bg-blue-100 text-blue-800',
  paid: 'bg-blue-100 text-blue-800',
  acknowledged: 'bg-purple-100 text-purple-800',
  manufacturing: 'bg-orange-100 text-orange-800',
  shipping: 'bg-indigo-100 text-indigo-800',
  delivered: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatDateTime(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const LIMIT = 25

export default function OrdersPage() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const canWrite = hasPermission(user?.role, 'orders', 'write')

  const [orders, setOrders] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('all')
  const [page, setPage] = useState(1)
  const [expandedOrderId, setExpandedOrderId] = useState(null)
  const [updateNote, setUpdateNote] = useState('')
  const [updatingId, setUpdatingId] = useState(null)
  const [hasLoaded, setHasLoaded] = useState(false)

  const fetchOrders = useCallback(async (targetPage = 1, overrideFilter, overrideSearch) => {
    setLoading(true)
    const sf = overrideFilter !== undefined ? overrideFilter : statusFilter
    const s = overrideSearch !== undefined ? overrideSearch : search

    try {
      const res = await fetch('/api/orders/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          statusFilter: sf,
          search: s.trim() && s !== 'all' ? s.trim() : undefined,
          page: targetPage,
          limit: LIMIT,
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        showToast(data.error || 'Failed to load orders', 'error')
        return
      }

      setOrders(data.orders)
      setTotal(data.total)
      setPage(targetPage)
      setHasLoaded(true)
    } catch {
      showToast('Failed to load orders', 'error')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, search, showToast])

  const handleStatusUpdate = async (orderId, newStatus) => {
    setUpdatingId(orderId)
    try {
      const res = await fetch('/api/orders/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, newStatus, note: updateNote.trim() || undefined }),
      })
      const data = await res.json()

      if (!res.ok) {
        showToast(data.error || 'Failed to update status', 'error')
      } else {
        showToast(`Status updated to ${STATUS_LABELS[newStatus] || newStatus}`, 'success')
        setUpdateNote('')
        fetchOrders(page)
      }
    } catch {
      showToast('Failed to update status', 'error')
    } finally {
      setUpdatingId(null)
    }
  }

  const getForwardStatuses = (currentStatus) => {
    const currentIdx = STATUS_ORDER.indexOf(currentStatus)
    if (currentIdx < 0) return []
    return STATUS_ORDER.slice(currentIdx + 1)
  }

  const totalPages = Math.ceil(total / LIMIT)

  const handleFilterChange = (value) => {
    setStatusFilter(value)
    if (hasLoaded) fetchOrders(1, value, search)
  }

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') fetchOrders(1)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Package className="w-7 h-7 text-indigo-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Order Management</h1>
          <p className="text-gray-500 text-sm">View and update order statuses</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-[160px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => handleFilterChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="all">All Statuses</option>
              {STATUS_ORDER.map((s) => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>
          </div>

          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search === 'all' ? '' : search}
                onChange={(e) => setSearch(e.target.value || 'all')}
                onKeyDown={handleSearchKeyDown}
                placeholder="Order # or email"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>

          <button
            onClick={() => fetchOrders(1)}
            disabled={loading}
            className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2 rounded-lg font-medium hover:bg-indigo-700 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Loading...' : hasLoaded ? 'Refresh' : 'Load Orders'}
          </button>
        </div>
      </div>

      {/* Orders List */}
      {orders.length > 0 && (
        <>
          <div className="space-y-3">
            {orders.map((order) => {
              const isExpanded = expandedOrderId === order.id
              const forwardStatuses = getForwardStatuses(order.status)
              const statusColor = STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-800'
              const statusLabel = STATUS_LABELS[order.status] || order.status

              return (
                <div
                  key={order.id}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
                >
                  {/* Row header */}
                  <button
                    onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                    className="w-full text-left p-4 hover:bg-gray-50 transition"
                  >
                    <div className="flex flex-wrap items-center gap-4">
                      <div className="min-w-[100px]">
                        <p className="font-semibold text-gray-900">#{order.order_number}</p>
                        <p className="text-xs text-gray-500">{formatDate(order.created_at)}</p>
                      </div>
                      <div className="flex-1 min-w-[150px]">
                        <p className="text-sm text-gray-700 truncate">{order.customer_email}</p>
                        <p className="text-xs text-gray-500">{order.items?.length || 0} items</p>
                      </div>
                      <div className="text-right min-w-[80px]">
                        <p className="font-semibold text-gray-900">
                          ₹{Number(order.subtotal).toLocaleString('en-IN')}
                        </p>
                      </div>
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColor}`}>
                        {statusLabel}
                      </span>
                      {isExpanded
                        ? <ChevronUp className="w-5 h-5 text-gray-400" />
                        : <ChevronDown className="w-5 h-5 text-gray-400" />
                      }
                    </div>
                  </button>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 p-5 bg-gray-50 space-y-5">
                      {/* Items */}
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">Items</h4>
                        <div className="space-y-2">
                          {(order.items || []).map((item, idx) => (
                            <div
                              key={idx}
                              className="flex items-center gap-3 bg-white rounded-lg p-3 text-sm"
                            >
                              {item.image && (
                                <img
                                  src={item.image}
                                  alt={item.title}
                                  className="w-10 h-10 rounded object-cover"
                                />
                              )}
                              <div className="flex-1">
                                <p className="font-medium">{item.title}</p>
                                {item.variantTitle && item.variantTitle !== 'Default Title' && (
                                  <p className="text-xs text-gray-500">{item.variantTitle}</p>
                                )}
                              </div>
                              <div className="text-right">
                                <p className="font-medium">
                                  ₹{parseFloat(item.calculatedPrice || item.price || 0).toLocaleString('en-IN')}
                                </p>
                                <p className="text-xs text-gray-500">Qty: {item.quantity || 1}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Coupon */}
                      {order.coupon_code && (
                        <div className="text-sm bg-green-50 border border-green-200 rounded-lg p-3 text-green-700">
                          Coupon <strong>{order.coupon_code}</strong> applied
                          {order.discount_amount > 0 && (
                            <> &mdash; ₹{Number(order.discount_amount).toLocaleString('en-IN')} off</>
                          )}
                        </div>
                      )}

                      {/* Payment IDs */}
                      {(order.razorpay_order_id || order.razorpay_payment_id) && (
                        <div className="text-xs text-gray-500 space-y-0.5">
                          {order.razorpay_order_id && <p>Razorpay Order: {order.razorpay_order_id}</p>}
                          {order.razorpay_payment_id && <p>Payment ID: {order.razorpay_payment_id}</p>}
                        </div>
                      )}

                      {/* Shipping Address */}
                      {order.shipping_address && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
                            <MapPin className="w-4 h-4" /> Shipping Address
                          </h4>
                          <div className="bg-white rounded-lg p-3 text-sm text-gray-700 leading-relaxed">
                            <p>{order.shipping_address.firstName} {order.shipping_address.lastName}</p>
                            <p>{order.shipping_address.address1}</p>
                            {order.shipping_address.address2 && <p>{order.shipping_address.address2}</p>}
                            <p>
                              {order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.zip}
                            </p>
                            {order.shipping_address.phone && <p>Phone: {order.shipping_address.phone}</p>}
                          </div>
                        </div>
                      )}

                      {/* Status History */}
                      {order.status_history && order.status_history.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
                            <Clock className="w-4 h-4" /> Status History
                          </h4>
                          <div className="space-y-2">
                            {order.status_history.map((entry, idx) => (
                              <div key={idx} className="flex items-start gap-3 text-sm">
                                <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />
                                <div>
                                  <p className="font-medium">{STATUS_LABELS[entry.status] || entry.status}</p>
                                  <p className="text-xs text-gray-500">
                                    {formatDateTime(entry.timestamp)}
                                    {entry.note && ` — ${entry.note}`}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Status Update Controls — write role only */}
                      {canWrite && forwardStatuses.length > 0 && (
                        <div className="border-t border-gray-200 pt-4">
                          <h4 className="text-sm font-semibold text-gray-700 mb-3">Update Status</h4>
                          <div className="flex flex-wrap gap-3 items-end">
                            <div className="flex-1 min-w-[200px]">
                              <label className="block text-xs text-gray-500 mb-1">Note (optional)</label>
                              <input
                                type="text"
                                value={expandedOrderId === order.id ? updateNote : ''}
                                onChange={(e) => setUpdateNote(e.target.value)}
                                placeholder="Add a note..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                              />
                            </div>
                            {forwardStatuses.map((s) => (
                              <button
                                key={s}
                                onClick={() => handleStatusUpdate(order.id, s)}
                                disabled={updatingId === order.id}
                                className={`px-4 py-2 rounded-lg text-xs font-medium transition disabled:opacity-50 ${STATUS_COLORS[s]} hover:opacity-80 border border-transparent`}
                              >
                                {updatingId === order.id ? '...' : `→ ${STATUS_LABELS[s]}`}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between bg-white rounded-xl shadow-sm border border-gray-200 px-6 py-3">
              <p className="text-sm text-gray-600">
                Showing {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total} orders
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fetchOrders(page - 1)}
                  disabled={page <= 1 || loading}
                  className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm font-medium text-gray-800">{page} / {totalPages}</span>
                <button
                  onClick={() => fetchOrders(page + 1)}
                  disabled={page >= totalPages || loading}
                  className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Empty state after load */}
      {hasLoaded && orders.length === 0 && !loading && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">No orders found</p>
          <p className="text-gray-400 text-sm mt-1">Try adjusting your filters or search term.</p>
        </div>
      )}

      {/* Initial state */}
      {!hasLoaded && !loading && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">Click "Load Orders" to fetch orders</p>
        </div>
      )}
    </div>
  )
}
