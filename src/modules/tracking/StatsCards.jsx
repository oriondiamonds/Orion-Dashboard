import {
  MousePointerClick,
  UserPlus,
  LogIn,
  Users,
  TrendingUp,
  ShoppingBag,
  IndianRupee,
  Tag,
} from 'lucide-react'

function Card({ icon: Icon, iconBg, value, label }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex items-center gap-3">
      <div className={`p-2.5 rounded-lg ${iconBg}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
    </div>
  )
}

export function SummaryCards({ stats }) {
  const conversionRate =
    stats.totalVisits > 0 ? ((stats.signups / stats.totalVisits) * 100).toFixed(1) : '0'

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
      <Card icon={MousePointerClick} iconBg="bg-orange-50 text-orange-600" value={stats.totalVisits || 0} label="Visits" />
      <Card icon={UserPlus} iconBg="bg-green-50 text-green-600" value={stats.signups} label="Signups" />
      <Card icon={LogIn} iconBg="bg-blue-50 text-blue-600" value={stats.logins} label="Logins" />
      <Card icon={Users} iconBg="bg-purple-50 text-purple-600" value={stats.totalEvents} label="Total Events" />
      <Card icon={TrendingUp} iconBg="bg-teal-50 text-teal-600" value={`${conversionRate}%`} label="Conversion" />
    </div>
  )
}

export function RevenueCards({ stats }) {
  const fmt = (v) => `\u20B9${((v || 0) / 1000).toFixed(1)}K`

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <Card icon={ShoppingBag} iconBg="bg-blue-50 text-blue-600" value={stats.totalOrders || 0} label="Orders" />
      <Card icon={IndianRupee} iconBg="bg-purple-50 text-purple-600" value={fmt(stats.totalRevenue)} label="Revenue" />
      <Card icon={Tag} iconBg="bg-red-50 text-red-600" value={fmt(stats.totalDiscount)} label="Discount" />
      <Card icon={TrendingUp} iconBg="bg-teal-50 text-teal-600" value={fmt(stats.netRevenue)} label="Net Revenue" />
    </div>
  )
}
