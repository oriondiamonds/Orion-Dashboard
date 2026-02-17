import { supabase } from '../supabase.js'

export function registerTrackingRoutes(app) {
  // Fetch agencies list (for filter dropdown)
  app.get('/api/tracking/agencies', async (req, res) => {
    try {
      const { data, error } = await supabase
        .from('agencies')
        .select('id, name')
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      res.json({ agencies: data || [] })
    } catch (err) {
      console.error('Failed to fetch agencies:', err)
      res.status(500).json({ error: 'Failed to fetch agencies' })
    }
  })

  // Fetch tracking stats
  app.post('/api/tracking/stats', async (req, res) => {
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
      let query = supabase
        .from('referral_tracking')
        .select('*')
        .order('created_at', { ascending: false })

      if (dateFrom) query = query.gte('created_at', dateFrom)
      if (dateTo) query = query.lte('created_at', dateTo + 'T23:59:59.999Z')
      if (filters?.utm_sources?.length) query = query.in('utm_source', filters.utm_sources)
      if (filters?.utm_campaigns?.length) query = query.in('utm_campaign', filters.utm_campaigns)

      const { data: events, error } = await query
      if (error) throw error

      // ── Fetch utm_visits ──
      let visitQuery = supabase
        .from('utm_visits')
        .select('*')
        .order('created_at', { ascending: false })

      if (dateFrom) visitQuery = visitQuery.gte('created_at', dateFrom)
      if (dateTo) visitQuery = visitQuery.lte('created_at', dateTo + 'T23:59:59.999Z')
      if (filters?.utm_sources?.length) visitQuery = visitQuery.in('utm_source', filters.utm_sources)
      if (filters?.utm_campaigns?.length) visitQuery = visitQuery.in('utm_campaign', filters.utm_campaigns)

      const { data: visits, error: visitError } = await visitQuery
      if (visitError) throw visitError

      // ── Aggregate visits by source/campaign/medium ──
      const visitsBySource = {}
      const visitsByCampaign = {}
      const visitsByMedium = {}

      ;(visits || []).forEach((v) => {
        const source = v.utm_source || '(direct)'
        visitsBySource[source] = (visitsBySource[source] || 0) + 1

        const campaign = v.utm_campaign || '(none)'
        visitsByCampaign[campaign] = (visitsByCampaign[campaign] || 0) + 1

        const medium = v.utm_medium || '(none)'
        visitsByMedium[medium] = (visitsByMedium[medium] || 0) + 1
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
      let ordersQuery = supabase
        .from('orders')
        .select(`
          id, order_number, customer_email, subtotal, discount_amount,
          coupon_code, attributed_utm_source, attributed_utm_campaign,
          attributed_utm_medium, attributed_agency_id, created_at,
          agencies:attributed_agency_id ( id, name )
        `)
        .in('status', ['order_placed', 'acknowledged', 'manufacturing', 'shipping', 'delivered'])

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
        const { data: couponsData } = await supabase
          .from('coupons')
          .select('code, utm_campaign, utm_source, utm_medium, channel, discount_type, discount_value, agency_id')
          .in('code', couponCodes)

        if (couponsData) {
          couponsMap = Object.fromEntries(couponsData.map((c) => [c.code, c]))
        }
      }

      // ── Order rollup metrics ──
      stats.totalOrders = safeOrders.length
      stats.totalRevenue = safeOrders.reduce((sum, o) => sum + (parseFloat(o.subtotal) || 0), 0)
      stats.totalDiscount = safeOrders.reduce((sum, o) => sum + (parseFloat(o.discount_amount) || 0), 0)
      stats.netRevenue = stats.totalRevenue - stats.totalDiscount

      // Orders by source
      const ordersBySource = {}
      safeOrders.forEach((order) => {
        const source = order.attributed_utm_source || '(direct)'
        if (!ordersBySource[source]) ordersBySource[source] = { orders: 0, revenue: 0, discount: 0 }
        ordersBySource[source].orders++
        ordersBySource[source].revenue += parseFloat(order.subtotal) || 0
        ordersBySource[source].discount += parseFloat(order.discount_amount) || 0
      })

      Object.keys(ordersBySource).forEach((source) => {
        if (!stats.bySource[source]) stats.bySource[source] = { visits: 0, signups: 0, logins: 0, total: 0 }
        stats.bySource[source].orders = ordersBySource[source].orders
        stats.bySource[source].revenue = ordersBySource[source].revenue
        stats.bySource[source].discount = ordersBySource[source].discount
        stats.bySource[source].netRevenue = ordersBySource[source].revenue - ordersBySource[source].discount
        stats.bySource[source].conversionRate =
          stats.bySource[source].visits > 0
            ? ((ordersBySource[source].orders / stats.bySource[source].visits) * 100).toFixed(2)
            : 0
      })

      // Orders by campaign
      const ordersByCampaign = {}
      safeOrders.forEach((order) => {
        const campaign = order.attributed_utm_campaign || '(none)'
        if (!ordersByCampaign[campaign]) ordersByCampaign[campaign] = { orders: 0, revenue: 0, discount: 0 }
        ordersByCampaign[campaign].orders++
        ordersByCampaign[campaign].revenue += parseFloat(order.subtotal) || 0
        ordersByCampaign[campaign].discount += parseFloat(order.discount_amount) || 0
      })

      Object.keys(ordersByCampaign).forEach((campaign) => {
        if (!stats.byCampaign[campaign]) stats.byCampaign[campaign] = { visits: 0, signups: 0, logins: 0, total: 0 }
        stats.byCampaign[campaign].orders = ordersByCampaign[campaign].orders
        stats.byCampaign[campaign].revenue = ordersByCampaign[campaign].revenue
        stats.byCampaign[campaign].discount = ordersByCampaign[campaign].discount
        stats.byCampaign[campaign].netRevenue = ordersByCampaign[campaign].revenue - ordersByCampaign[campaign].discount
        stats.byCampaign[campaign].conversionRate =
          stats.byCampaign[campaign].visits > 0
            ? ((ordersByCampaign[campaign].orders / stats.byCampaign[campaign].visits) * 100).toFixed(2)
            : 0
      })

      // Orders by medium
      const ordersByMedium = {}
      safeOrders.forEach((order) => {
        const medium = order.attributed_utm_medium || '(none)'
        if (!ordersByMedium[medium]) ordersByMedium[medium] = { orders: 0, revenue: 0, discount: 0 }
        ordersByMedium[medium].orders++
        ordersByMedium[medium].revenue += parseFloat(order.subtotal) || 0
        ordersByMedium[medium].discount += parseFloat(order.discount_amount) || 0
      })

      Object.keys(ordersByMedium).forEach((medium) => {
        if (!stats.byMedium[medium]) stats.byMedium[medium] = { visits: 0, signups: 0, logins: 0, total: 0 }
        stats.byMedium[medium].orders = ordersByMedium[medium].orders
        stats.byMedium[medium].revenue = ordersByMedium[medium].revenue
        stats.byMedium[medium].discount = ordersByMedium[medium].discount
        stats.byMedium[medium].netRevenue = ordersByMedium[medium].revenue - ordersByMedium[medium].discount
      })

      // ── By Coupon ──
      stats.byCoupon = {}

      ;(visits || []).forEach((visit) => {
        if (!visit.coupon_code) return
        const code = visit.coupon_code
        if (!stats.byCoupon[code]) {
          stats.byCoupon[code] = {
            couponDetails: { code, utm_campaign: null, utm_source: null, agency_name: null, discount_type: null, discount_value: null },
            visits: 0, signups: 0, logins: 0, usageCount: 0, totalDiscount: 0, ordersRevenue: 0, netRevenue: 0, avgDiscount: 0, conversionRate: 0,
          }
        }
        stats.byCoupon[code].visits++
      })

      events.forEach((event) => {
        if (!event.coupon_code) return
        const code = event.coupon_code
        if (!stats.byCoupon[code]) {
          stats.byCoupon[code] = {
            couponDetails: { code, utm_campaign: event.utm_campaign || null, utm_source: event.utm_source || null, agency_name: null, discount_type: null, discount_value: null },
            visits: 0, signups: 0, logins: 0, usageCount: 0, totalDiscount: 0, ordersRevenue: 0, netRevenue: 0, avgDiscount: 0, conversionRate: 0,
          }
        }
        if (event.event_type === 'signup') stats.byCoupon[code].signups++
        else if (event.event_type === 'login') stats.byCoupon[code].logins++
        if (!stats.byCoupon[code].couponDetails.utm_campaign && event.utm_campaign) stats.byCoupon[code].couponDetails.utm_campaign = event.utm_campaign
        if (!stats.byCoupon[code].couponDetails.utm_source && event.utm_source) stats.byCoupon[code].couponDetails.utm_source = event.utm_source
      })

      safeOrders.forEach((order) => {
        if (!order.coupon_code) return
        const code = order.coupon_code
        const couponDetails = couponsMap[code]
        if (!stats.byCoupon[code]) {
          stats.byCoupon[code] = {
            couponDetails: { code, utm_campaign: couponDetails?.utm_campaign || null, utm_source: couponDetails?.utm_source || null, agency_name: order.agencies?.name || null, discount_type: couponDetails?.discount_type || null, discount_value: couponDetails?.discount_value || null },
            visits: 0, signups: 0, logins: 0, usageCount: 0, totalDiscount: 0, ordersRevenue: 0, netRevenue: 0, avgDiscount: 0, conversionRate: 0,
          }
        }
        if (couponDetails) {
          stats.byCoupon[code].couponDetails.utm_campaign = couponDetails.utm_campaign || stats.byCoupon[code].couponDetails.utm_campaign
          stats.byCoupon[code].couponDetails.utm_source = couponDetails.utm_source || stats.byCoupon[code].couponDetails.utm_source
          stats.byCoupon[code].couponDetails.discount_type = couponDetails.discount_type
          stats.byCoupon[code].couponDetails.discount_value = couponDetails.discount_value
        }
        if (order.agencies?.name) stats.byCoupon[code].couponDetails.agency_name = order.agencies.name
        stats.byCoupon[code].usageCount++
        stats.byCoupon[code].totalDiscount += parseFloat(order.discount_amount) || 0
        stats.byCoupon[code].ordersRevenue += parseFloat(order.subtotal) || 0
      })

      Object.keys(stats.byCoupon).forEach((code) => {
        const d = stats.byCoupon[code]
        d.netRevenue = d.ordersRevenue - d.totalDiscount
        d.avgDiscount = d.usageCount > 0 ? d.totalDiscount / d.usageCount : 0
        d.conversionRate = d.visits > 0 ? ((d.usageCount / d.visits) * 100).toFixed(2) : 0
      })

      // ── By Agency ──
      stats.byAgency = {}
      const couponToAgency = {}
      Object.values(couponsMap).forEach((coupon) => {
        if (coupon.agency_id && coupon.code) couponToAgency[coupon.code] = coupon.agency_id
      })

      const agencyIds = [...new Set(Object.values(couponToAgency))]
      const agencyIdToName = {}
      if (agencyIds.length > 0) {
        const { data: agenciesData } = await supabase.from('agencies').select('id, name').in('id', agencyIds)
        if (agenciesData) agenciesData.forEach((a) => (agencyIdToName[a.id] = a.name))
      }

      const initAgency = (name, id) => ({
        agencyId: id, coupons: new Set(), visits: 0, signups: 0, logins: 0, orders: 0, revenue: 0, discount: 0, netRevenue: 0,
      })

      ;(visits || []).forEach((visit) => {
        if (!visit.coupon_code) return
        const agencyId = couponToAgency[visit.coupon_code]
        if (!agencyId) return
        const name = agencyIdToName[agencyId]
        if (!name) return
        if (!stats.byAgency[name]) stats.byAgency[name] = initAgency(name, agencyId)
        stats.byAgency[name].visits++
        stats.byAgency[name].coupons.add(visit.coupon_code)
      })

      events.forEach((event) => {
        if (!event.coupon_code) return
        const agencyId = couponToAgency[event.coupon_code]
        if (!agencyId) return
        const name = agencyIdToName[agencyId]
        if (!name) return
        if (!stats.byAgency[name]) stats.byAgency[name] = initAgency(name, agencyId)
        if (event.event_type === 'signup') stats.byAgency[name].signups++
        else if (event.event_type === 'login') stats.byAgency[name].logins++
        stats.byAgency[name].coupons.add(event.coupon_code)
      })

      safeOrders.forEach((order) => {
        if (!order.agencies?.name) return
        const name = order.agencies.name
        if (!stats.byAgency[name]) stats.byAgency[name] = initAgency(name, order.agencies.id)
        if (order.coupon_code) stats.byAgency[name].coupons.add(order.coupon_code)
        stats.byAgency[name].orders++
        stats.byAgency[name].revenue += parseFloat(order.subtotal) || 0
        stats.byAgency[name].discount += parseFloat(order.discount_amount) || 0
      })

      Object.keys(stats.byAgency).forEach((name) => {
        stats.byAgency[name].coupons = Array.from(stats.byAgency[name].coupons)
        stats.byAgency[name].netRevenue = stats.byAgency[name].revenue - stats.byAgency[name].discount
      })

      // ── By Channel ──
      stats.byChannel = {}
      safeOrders.forEach((order) => {
        const couponDetails = order.coupon_code ? couponsMap[order.coupon_code] : null
        if (!couponDetails?.channel) return
        const channel = couponDetails.channel
        if (!stats.byChannel[channel]) stats.byChannel[channel] = { orders: 0, revenue: 0, discount: 0, netRevenue: 0, avgOrderValue: 0 }
        stats.byChannel[channel].orders++
        stats.byChannel[channel].revenue += parseFloat(order.subtotal) || 0
        stats.byChannel[channel].discount += parseFloat(order.discount_amount) || 0
      })

      Object.keys(stats.byChannel).forEach((ch) => {
        stats.byChannel[ch].netRevenue = stats.byChannel[ch].revenue - stats.byChannel[ch].discount
        stats.byChannel[ch].avgOrderValue = stats.byChannel[ch].orders > 0 ? stats.byChannel[ch].revenue / stats.byChannel[ch].orders : 0
      })

      // ── Paginated recent events ──
      const eventsOffset = (eventsPage - 1) * eventsLimit
      stats.recentEvents = events.slice(eventsOffset, eventsOffset + eventsLimit)
      stats.totalEventsCount = events.length
      stats.eventsPage = eventsPage
      stats.eventsTotalPages = Math.ceil(events.length / eventsLimit)

      // ── Paginated recent orders ──
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
  })
}
