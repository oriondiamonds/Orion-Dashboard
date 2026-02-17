export default function StatsTable({ title, icon: Icon, data, showVisits }) {
  const entries = Object.entries(data).sort((a, b) => {
    const aVal = b[1].orders !== undefined ? b[1].orders : b[1].total
    const bVal = a[1].orders !== undefined ? a[1].orders : a[1].total
    return aVal - bVal
  })

  if (entries.length === 0) return null

  const hasOrders = entries.some(([, counts]) => counts.orders !== undefined)

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
        <Icon className="w-5 h-5 text-gray-700" />
        <h3 className="font-semibold text-gray-900">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-gray-600">
              <th className="text-left px-6 py-3 font-medium">Name</th>
              {showVisits && <th className="text-center px-4 py-3 font-medium">Visits</th>}
              <th className="text-center px-4 py-3 font-medium">Signups</th>
              <th className="text-center px-4 py-3 font-medium">Logins</th>
              <th className="text-center px-4 py-3 font-medium">Total</th>
              {hasOrders && (
                <>
                  <th className="text-center px-4 py-3 font-medium">Orders</th>
                  <th className="text-right px-4 py-3 font-medium">Revenue</th>
                  <th className="text-right px-4 py-3 font-medium">Discount</th>
                  <th className="text-right px-4 py-3 font-medium">Net Rev</th>
                </>
              )}
              {showVisits && <th className="text-center px-4 py-3 font-medium">Conv %</th>}
            </tr>
          </thead>
          <tbody>
            {entries.map(([name, counts]) => {
              const convRate =
                showVisits && counts.visits > 0
                  ? counts.conversionRate !== undefined
                    ? counts.conversionRate
                    : ((counts.signups / counts.visits) * 100).toFixed(1)
                  : null

              return (
                <tr key={name} className="border-t border-gray-50 hover:bg-gray-50">
                  <td className="px-6 py-3 font-medium text-gray-900">{name}</td>
                  {showVisits && (
                    <td className="text-center px-4 py-3">
                      <span className="inline-flex items-center text-orange-700 bg-orange-50 px-2 py-0.5 rounded-full text-xs font-medium">
                        {counts.visits || 0}
                      </span>
                    </td>
                  )}
                  <td className="text-center px-4 py-3">
                    <span className="inline-flex items-center text-green-700 bg-green-50 px-2 py-0.5 rounded-full text-xs font-medium">
                      {counts.signups || 0}
                    </span>
                  </td>
                  <td className="text-center px-4 py-3">
                    <span className="inline-flex items-center text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full text-xs font-medium">
                      {counts.logins || 0}
                    </span>
                  </td>
                  <td className="text-center px-4 py-3 font-semibold">{counts.total || 0}</td>
                  {hasOrders && (
                    <>
                      <td className="text-center px-4 py-3">
                        <span className="inline-flex items-center text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full text-xs font-medium">
                          {counts.orders || 0}
                        </span>
                      </td>
                      <td className="text-right px-4 py-3 text-gray-700">
                        {'\u20B9'}{(counts.revenue || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="text-right px-4 py-3 text-red-600">
                        -{'\u20B9'}{(counts.discount || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="text-right px-4 py-3 font-semibold text-teal-700">
                        {'\u20B9'}{(counts.netRevenue || 0).toLocaleString('en-IN')}
                      </td>
                    </>
                  )}
                  {showVisits && (
                    <td className="text-center px-4 py-3">
                      {convRate !== null ? (
                        <span className="inline-flex items-center text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full text-xs font-medium">
                          {convRate}%
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">-</span>
                      )}
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
