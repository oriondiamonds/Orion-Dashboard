import { useState, useEffect } from 'react'
import {
  BarChart3,
  RefreshCw,
  Calendar,
  Globe,
  Megaphone,
  Radio,
  Shield,
  Tag,
  Building2,
} from 'lucide-react'
import { useToast } from '../../components/Toast.jsx'
import MultiSelectDropdown from '../../components/MultiSelectDropdown.jsx'
import Pagination from '../../components/Pagination.jsx'
import { SummaryCards, RevenueCards } from './StatsCards.jsx'
import StatsTable from './StatsTable.jsx'

function formatDate(dateStr) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function TrackingPage() {
  const toast = useToast()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(false)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const [filters, setFilters] = useState({
    utmSources: [],
    utmCampaigns: [],
    agencies: [],
    channels: [],
  })

  const [availableOptions, setAvailableOptions] = useState({
    sources: [],
    campaigns: [],
    agencies: [],
    channels: ['google-ads', 'facebook', 'instagram', 'email', 'self-marketing', 'other'],
  })

  const [eventsPage, setEventsPage] = useState(1)
  const [ordersPage, setOrdersPage] = useState(1)

  // Load agencies on mount
  useEffect(() => {
    fetch('/api/tracking/agencies')
      .then((r) => r.json())
      .then((data) => setAvailableOptions((prev) => ({ ...prev, agencies: data.agencies || [] })))
      .catch(() => {})
  }, [])

  // Extract sources/campaigns from stats
  useEffect(() => {
    if (!stats) return
    setAvailableOptions((prev) => ({
      ...prev,
      sources: Object.keys(stats.bySource || {}).filter((s) => s !== '(direct)'),
      campaigns: Object.keys(stats.byCampaign || {}).filter((c) => c !== '(none)'),
    }))
  }, [stats])

  // Auto-fetch on pagination change
  useEffect(() => {
    if (stats && eventsPage !== (stats.eventsPage || 1)) fetchStats()
  }, [eventsPage])

  useEffect(() => {
    if (stats && ordersPage !== (stats.ordersPage || 1)) fetchStats()
  }, [ordersPage])

  // Re-fetch on filter/date change
  useEffect(() => {
    if (stats) {
      const wasOnFirstPage = eventsPage === 1 && ordersPage === 1
      setEventsPage(1)
      setOrdersPage(1)
      if (wasOnFirstPage) fetchStats()
    }
  }, [filters, dateFrom, dateTo])

  const fetchStats = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/tracking/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          filters: {
            utm_sources: filters.utmSources.length ? filters.utmSources : undefined,
            utm_campaigns: filters.utmCampaigns.length ? filters.utmCampaigns : undefined,
            agencies: filters.agencies.length ? filters.agencies : undefined,
            channels: filters.channels.length ? filters.channels : undefined,
          },
          eventsPage,
          eventsLimit: 50,
          ordersPage,
          ordersLimit: 50,
        }),
      })
      const data = await res.json()
      if (data.error) {
        toast.error(data.error)
        setStats(null)
      } else {
        setStats(data.stats)
        toast.success('Stats loaded')
      }
    } catch {
      toast.error('Failed to load stats')
      setStats(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <BarChart3 className="w-7 h-7 text-gray-900" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">UTM & Referral Tracking</h1>
          <p className="text-gray-500 text-sm">Track signups, logins, and conversions from referral links</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="space-y-4">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>
            <button
              onClick={fetchStats}
              disabled={loading}
              className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2 rounded-lg font-medium hover:bg-indigo-700 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Loading...' : 'Load Stats'}
            </button>
          </div>

          {stats && (
            <div className="flex flex-wrap gap-3 pt-2 border-t border-gray-100">
              <MultiSelectDropdown label="Sources" options={availableOptions.sources} selected={filters.utmSources} onChange={(val) => setFilters({ ...filters, utmSources: val })} />
              <MultiSelectDropdown label="Campaigns" options={availableOptions.campaigns} selected={filters.utmCampaigns} onChange={(val) => setFilters({ ...filters, utmCampaigns: val })} />
              <MultiSelectDropdown label="Agencies" options={availableOptions.agencies} selected={filters.agencies} onChange={(val) => setFilters({ ...filters, agencies: val })} />
              <MultiSelectDropdown label="Channels" options={availableOptions.channels} selected={filters.channels} onChange={(val) => setFilters({ ...filters, channels: val })} />
            </div>
          )}
        </div>
      </div>

      {/* Stats content */}
      {stats && (
        <>
          <SummaryCards stats={stats} />
          <RevenueCards stats={stats} />

          {/* Breakdown tables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <StatsTable title="By Source" icon={Globe} data={stats.bySource} showVisits />
            <StatsTable title="By Campaign" icon={Megaphone} data={stats.byCampaign} showVisits />
            <StatsTable title="By Medium" icon={Radio} data={stats.byMedium} showVisits />
            <StatsTable title="By Auth Provider" icon={Shield} data={stats.byProvider} />
          </div>

          {/* Coupon / Agency / Channel breakdowns */}
          {(Object.keys(stats.byCoupon || {}).length > 0 ||
            Object.keys(stats.byAgency || {}).length > 0 ||
            Object.keys(stats.byChannel || {}).length > 0) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {Object.keys(stats.byCoupon || {}).length > 0 && (
                <StatsTable title="By Coupon" icon={Tag} data={stats.byCoupon} showVisits />
              )}
              {Object.keys(stats.byAgency || {}).length > 0 && (
                <StatsTable title="By Agency" icon={Building2} data={stats.byAgency} showVisits />
              )}
              {Object.keys(stats.byChannel || {}).length > 0 && (
                <StatsTable title="By Channel" icon={Radio} data={stats.byChannel} />
              )}
            </div>
          )}

          {/* Recent Events */}
          {stats.recentEvents.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
              <div className="px-6 py-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900">Recent Events</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-gray-600">
                      <th className="text-left px-4 py-3 font-medium">Date</th>
                      <th className="text-left px-4 py-3 font-medium">Email</th>
                      <th className="text-center px-4 py-3 font-medium">Event</th>
                      <th className="text-center px-4 py-3 font-medium">Provider</th>
                      <th className="text-left px-4 py-3 font-medium">Source</th>
                      <th className="text-left px-4 py-3 font-medium">Campaign</th>
                      <th className="text-left px-4 py-3 font-medium">Coupon</th>
                      <th className="text-left px-4 py-3 font-medium">Landing URL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recentEvents.map((event) => (
                      <tr key={event.id} className="border-t border-gray-50 hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatDate(event.created_at)}</td>
                        <td className="px-4 py-3 font-medium text-gray-900 max-w-[180px] truncate">{event.customer_email}</td>
                        <td className="text-center px-4 py-3">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${event.event_type === 'signup' ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'}`}>
                            {event.event_type}
                          </span>
                        </td>
                        <td className="text-center px-4 py-3 text-gray-600">{event.auth_provider}</td>
                        <td className="px-4 py-3 text-gray-600">{event.utm_source || '-'}</td>
                        <td className="px-4 py-3 text-gray-600">{event.utm_campaign || '-'}</td>
                        <td className="px-4 py-3">
                          {event.coupon_code ? (
                            <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700">
                              {event.coupon_code}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-500 max-w-[200px] truncate text-xs">{event.landing_url || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination
                currentPage={stats.eventsPage || eventsPage}
                totalPages={stats.eventsTotalPages || 1}
                totalCount={stats.totalEventsCount}
                onPageChange={setEventsPage}
              />
            </div>
          )}

          {/* Recent Orders */}
          {stats.recentOrders?.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
              <div className="px-6 py-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900">Recent Orders</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-gray-600">
                      <th className="text-left px-4 py-3 font-medium">Order #</th>
                      <th className="text-left px-4 py-3 font-medium">Date</th>
                      <th className="text-left px-4 py-3 font-medium">Email</th>
                      <th className="text-right px-4 py-3 font-medium">Subtotal</th>
                      <th className="text-right px-4 py-3 font-medium">Discount</th>
                      <th className="text-left px-4 py-3 font-medium">Coupon</th>
                      <th className="text-left px-4 py-3 font-medium">Source</th>
                      <th className="text-left px-4 py-3 font-medium">Campaign</th>
                      <th className="text-left px-4 py-3 font-medium">Agency</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recentOrders.map((order) => (
                      <tr key={order.order_number} className="border-t border-gray-50 hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">{order.order_number}</td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatDate(order.created_at)}</td>
                        <td className="px-4 py-3 text-gray-600 max-w-[180px] truncate">{order.customer_email}</td>
                        <td className="text-right px-4 py-3 text-gray-700">{'\u20B9'}{(order.subtotal || 0).toLocaleString('en-IN')}</td>
                        <td className="text-right px-4 py-3 text-red-600">-{'\u20B9'}{(order.discount_amount || 0).toLocaleString('en-IN')}</td>
                        <td className="px-4 py-3 text-gray-600">{order.coupon_code || '-'}</td>
                        <td className="px-4 py-3 text-gray-600">{order.attributed_utm_source || '-'}</td>
                        <td className="px-4 py-3 text-gray-600">{order.attributed_utm_campaign || '-'}</td>
                        <td className="px-4 py-3 text-gray-600">{order.agency_name || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination
                currentPage={stats.ordersPage || ordersPage}
                totalPages={stats.ordersTotalPages || 1}
                totalCount={stats.totalOrdersCount}
                onPageChange={setOrdersPage}
              />
            </div>
          )}

          {stats.totalEvents === 0 && stats.totalVisits === 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No tracking events yet</p>
              <p className="text-gray-400 text-sm mt-1">Events will appear here when users visit via UTM links.</p>
            </div>
          )}
        </>
      )}

      {/* Placeholder before first load */}
      {!stats && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">Click "Load Stats" to view tracking data</p>
        </div>
      )}
    </div>
  )
}
