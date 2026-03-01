import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL||process.env.VITE_SUPABASE_URL_PROXY,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const {
      dateFrom,
      dateTo,
      filters,
      eventsPage = 1,
      eventsLimit = 50,
      ordersPage = 1,
      ordersLimit = 50,
    } = req.body

    // ── Fetch referral_tracking events ──
    let query = supabase.from('referral_tracking').select('*').order('created_at', { ascending: false })
    if (dateFrom) query = query.gte('created_at', dateFrom)
    if (dateTo) query = query.lte('created_at', dateTo + 'T23:59:59.999Z')
    if (filters?.utm_sources?.length) query = query.in('utm_source', filters.utm_sources)
    if (filters?.utm_campaigns?.length) query = query.in('utm_campaign', filters.utm_campaigns)

    const { data: events, error } = await query
    if (error) throw error

    // ── Fetch utm_visits ──
    let visitQuery = supabase.from('utm_visits').select('*').order('created_at', { ascending: false })
    if (dateFrom) visitQuery = visitQuery.gte('created_at', dateFrom)
    if (dateTo) visitQuery = visitQuery.lte('created_at', dateTo + 'T23:59:59.999Z')
    if (filters?.utm_sources?.length) visitQuery = visitQuery.in('utm_source', filters.utm_sources)
    if (filters?.utm_campaigns?.length) visitQuery = visitQuery.in('utm_campaign', filters.utm_campaigns)

    const { data: visits, error: visitError } = await visitQuery
    if (visitError) throw visitError

    // ── Aggregate visits ──
    const visitsBySource = {}
    const visitsByCampaign = {}
    const visitsByMedium = {}
    ;(visits || []).forEach((v) => {
      visitsBySource[v.utm_source || '(direct)'] = (visitsBySource[v.utm_source || '(direct)'] || 0) + 1
      visitsByCampaign[v.utm_campaign || '(none)'] = (visitsByCampaign[v.utm_campaign || '(none)'] || 0) + 1
      visitsByMedium[v.utm_medium || '(none)'] = (visitsByMedium[v.utm_medium || '(none)'] || 0) + 1
    })

    // ── Compute event aggregations ──
    const stats = {
      totalEvents: events.length,
      totalVisits: (visits || []).length,
      signups: events.filter((e) => e.event_type === 'signup').length,
      logins: events.filter((e) => e.event_type === 'login').length,
      bySource: {},
      byCampaign: {},
      byMedium: {},
      byProvider: {},
    }

    events.forEach((e) => {
      const source = e.utm_source || '(direct)'
      if (!stats.bySource[source]) stats.bySource[source] = { signups: 0, logins: 0, total: 0, visits: 0 }
      stats.bySource[source].total++
      stats.bySource[source][e.event_type === 'signup' ? 'signups' : 'logins']++

      const campaign = e.utm_campaign || '(none)'
      if (!stats.byCampaign[campaign]) stats.byCampaign[campaign] = { signups: 0, logins: 0, total: 0, visits: 0 }
      stats.byCampaign[campaign].total++
      stats.byCampaign[campaign][e.event_type === 'signup' ? 'signups' : 'logins']++

      const medium = e.utm_medium || '(none)'
      if (!stats.byMedium[medium]) stats.byMedium[medium] = { signups: 0, logins: 0, total: 0, visits: 0 }
      stats.byMedium[medium].total++
      stats.byMedium[medium][e.event_type === 'signup' ? 'signups' : 'logins']++

      const provider = e.auth_provider || 'email'
      if (!stats.byProvider[provider]) stats.byProvider[provider] = { signups: 0, logins: 0, total: 0 }
      stats.byProvider[provider].total++
      stats.byProvider[provider][e.event_type === 'signup' ? 'signups' : 'logins']++
    })

    // Merge visit counts
    for (const [source, count] of Object.entries(visitsBySource)) {
      if (!stats.bySource[source]) stats.bySource[source] = { signups: 0, logins: 0, total: 0, visits: 0 }
      stats.bySource[source].visits = count
    }
    for (const [campaign, count] of Object.entries(visitsByCampaign)) {
      if (!stats.byCampaign[campaign]) stats.byCampaign[campaign] = { signups: 0, logins: 0, total: 0, visits: 0 }
      stats.byCampaign[campaign].visits = count
    }
    for (const [medium, count] of Object.entries(visitsByMedium)) {
      if (!stats.byMedium[medium]) stats.byMedium[medium] = { signups: 0, logins: 0, total: 0, visits: 0 }
      stats.byMedium[medium].visits = count
    }

    // ── Fetch orders ──
    let ordersQuery = supabase.from('orders').select(`
      id, order_number, customer_email, subtotal, discount_amount,
      coupon_code, attributed_utm_source, attributed_utm_campaign,
      attributed_utm_medium, attributed_agency_id, created_at,
      agencies:attributed_agency_id ( id, name )
    `).in('status', ['order_placed', 'acknowledged', 'manufacturing', 'shipping', 'delivered'])

    if (dateFrom) ordersQuery = ordersQuery.gte('created_at', dateFrom)
    if (dateTo) ordersQuery = ordersQuery.lte('created_at', dateTo + 'T23:59:59.999Z')
    if (filters?.coupon_codes?.length) ordersQuery = ordersQuery.in('coupon_code', filters.coupon_codes)
    if (filters?.utm_sources?.length) ordersQuery = ordersQuery.in('attributed_utm_source', filters.utm_sources)
    if (filters?.utm_campaigns?.length) ordersQuery = ordersQuery.in('attributed_utm_campaign', filters.utm_campaigns)
    if (filters?.agencies?.length) ordersQuery = ordersQuery.in('attributed_agency_id', filters.agencies)

    const { data: orders } = await ordersQuery
    const safeOrders = orders || []

    // ── Fetch coupon details ──
    const couponCodes = [...new Set(safeOrders.map((o) => o.coupon_code).filter(Boolean))]
    let couponsMap = {}
    if (couponCodes.length > 0) {
      const { data: couponsData } = await supabase.from('coupons')
        .select('code, utm_campaign, utm_source, utm_medium, channel, discount_type, discount_value, agency_id')
        .in('code', couponCodes)
      if (couponsData) couponsMap = Object.fromEntries(couponsData.map((c) => [c.code, c]))
    }

    // ── Order rollup metrics ──
    stats.totalOrders = safeOrders.length
    stats.totalRevenue = safeOrders.reduce((sum, o) => sum + (parseFloat(o.subtotal) || 0), 0)
    stats.totalDiscount = safeOrders.reduce((sum, o) => sum + (parseFloat(o.discount_amount) || 0), 0)
    stats.netRevenue = stats.totalRevenue - stats.totalDiscount

    // Orders by source/campaign/medium
    const ordersBySource = {}
    const ordersByCampaign = {}
    const ordersByMedium = {}
    safeOrders.forEach((order) => {
      const source = order.attributed_utm_source || '(direct)'
      if (!ordersBySource[source]) ordersBySource[source] = { orders: 0, revenue: 0, discount: 0 }
      ordersBySource[source].orders++
      ordersBySource[source].revenue += parseFloat(order.subtotal) || 0
      ordersBySource[source].discount += parseFloat(order.discount_amount) || 0

      const campaign = order.attributed_utm_campaign || '(none)'
      if (!ordersByCampaign[campaign]) ordersByCampaign[campaign] = { orders: 0, revenue: 0, discount: 0 }
      ordersByCampaign[campaign].orders++
      ordersByCampaign[campaign].revenue += parseFloat(order.subtotal) || 0
      ordersByCampaign[campaign].discount += parseFloat(order.discount_amount) || 0

      const medium = order.attributed_utm_medium || '(none)'
      if (!ordersByMedium[medium]) ordersByMedium[medium] = { orders: 0, revenue: 0, discount: 0 }
      ordersByMedium[medium].orders++
      ordersByMedium[medium].revenue += parseFloat(order.subtotal) || 0
      ordersByMedium[medium].discount += parseFloat(order.discount_amount) || 0
    })

    Object.keys(ordersBySource).forEach((source) => {
      if (!stats.bySource[source]) stats.bySource[source] = { visits: 0, signups: 0, logins: 0, total: 0 }
      stats.bySource[source].orders = ordersBySource[source].orders
      stats.bySource[source].revenue = ordersBySource[source].revenue
      stats.bySource[source].discount = ordersBySource[source].discount
      stats.bySource[source].netRevenue = ordersBySource[source].revenue - ordersBySource[source].discount
      stats.bySource[source].conversionRate = stats.bySource[source].visits > 0 ? ((ordersBySource[source].orders / stats.bySource[source].visits) * 100).toFixed(2) : 0
    })

    Object.keys(ordersByCampaign).forEach((campaign) => {
      if (!stats.byCampaign[campaign]) stats.byCampaign[campaign] = { visits: 0, signups: 0, logins: 0, total: 0 }
      stats.byCampaign[campaign].orders = ordersByCampaign[campaign].orders
      stats.byCampaign[campaign].revenue = ordersByCampaign[campaign].revenue
      stats.byCampaign[campaign].discount = ordersByCampaign[campaign].discount
      stats.byCampaign[campaign].netRevenue = ordersByCampaign[campaign].revenue - ordersByCampaign[campaign].discount
      stats.byCampaign[campaign].conversionRate = stats.byCampaign[campaign].visits > 0 ? ((ordersByCampaign[campaign].orders / stats.byCampaign[campaign].visits) * 100).toFixed(2) : 0
    })

    Object.keys(ordersByMedium).forEach((medium) => {
      if (!stats.byMedium[medium]) stats.byMedium[medium] = { visits: 0, signups: 0, logins: 0, total: 0 }
      stats.byMedium[medium].orders = ordersByMedium[medium].orders
      stats.byMedium[medium].revenue = ordersByMedium[medium].revenue
      stats.byMedium[medium].discount = ordersByMedium[medium].discount
      stats.byMedium[medium].netRevenue = ordersByMedium[medium].revenue - ordersByMedium[medium].discount
    })

    // ── By Coupon/Agency/Channel (simplified) ──
    stats.byCoupon = {}
    stats.byAgency = {}
    stats.byChannel = {}

    // ... (coupon/agency/channel logic - keeping it simple for now to reduce serverless function size)

    // ── Paginated recent events/orders ──
    const eventsOffset = (eventsPage - 1) * eventsLimit
    stats.recentEvents = events.slice(eventsOffset, eventsOffset + eventsLimit)
    stats.totalEventsCount = events.length
    stats.eventsPage = eventsPage
    stats.eventsTotalPages = Math.ceil(events.length / eventsLimit)

    const sortedOrders = safeOrders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    const ordersOffset = (ordersPage - 1) * ordersLimit
    stats.recentOrders = sortedOrders.slice(ordersOffset, ordersOffset + ordersLimit).map((o) => ({
      order_number: o.order_number,
      customer_email: o.customer_email,
      created_at: o.created_at,
      subtotal: o.subtotal,
      discount_amount: o.discount_amount,
      coupon_code: o.coupon_code,
      attributed_utm_source: o.attributed_utm_source,
      attributed_utm_campaign: o.attributed_utm_campaign,
      agency_name: o.agencies?.name || null,
    }))
    stats.totalOrdersCount = sortedOrders.length
    stats.ordersPage = ordersPage
    stats.ordersTotalPages = Math.ceil(sortedOrders.length / ordersLimit)

    res.json({ success: true, stats })
  } catch (err) {
    console.error('Error fetching tracking stats:', err)
    res.status(500).json({ error: 'Failed to fetch tracking data' })
  }
}
