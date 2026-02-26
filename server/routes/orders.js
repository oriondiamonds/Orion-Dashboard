import { supabase } from '../supabase.js'

const STATUS_ORDER = [
  'pending',
  'order_placed',
  'acknowledged',
  'manufacturing',
  'shipping',
  'delivered',
]

export function registerOrdersRoutes(app) {
  // POST /api/orders/list — paginated order list with optional filters
  app.post('/api/orders/list', async (req, res) => {
    try {
      const { statusFilter, search, page = 1, limit = 25 } = req.body

      let query = supabase
        .from('orders')
        .select(
          'id, order_number, customer_email, items, subtotal, discount_amount, coupon_code, currency, status, status_history, shipping_address, razorpay_order_id, razorpay_payment_id, created_at',
          { count: 'exact' }
        )
        .order('created_at', { ascending: false })

      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

      if (search) {
        query = query.or(
          `order_number.ilike.%${search}%,customer_email.ilike.%${search}%`
        )
      }

      const offset = (page - 1) * limit
      query = query.range(offset, offset + limit - 1)

      const { data: orders, error, count } = await query

      if (error) throw error

      res.json({ orders: orders || [], total: count || 0 })
    } catch (err) {
      console.error('Failed to fetch orders:', err)
      res.status(500).json({ error: 'Failed to fetch orders' })
    }
  })

  // PUT /api/orders/update — forward-only status update
  app.put('/api/orders/update', async (req, res) => {
    try {
      const { orderId, newStatus, note } = req.body

      if (!orderId || !newStatus) {
        return res.status(400).json({ error: 'orderId and newStatus are required' })
      }

      if (!STATUS_ORDER.includes(newStatus)) {
        return res.status(400).json({ error: `Invalid status: ${newStatus}` })
      }

      // Fetch current order
      const { data: order, error: fetchError } = await supabase
        .from('orders')
        .select('id, status, status_history')
        .eq('id', orderId)
        .single()

      if (fetchError || !order) {
        return res.status(404).json({ error: 'Order not found' })
      }

      // Enforce forward-only
      const currentIdx = STATUS_ORDER.indexOf(order.status)
      const newIdx = STATUS_ORDER.indexOf(newStatus)

      if (newIdx <= currentIdx) {
        return res.status(400).json({ error: 'Status can only move forward' })
      }

      const historyEntry = {
        status: newStatus,
        timestamp: new Date().toISOString(),
        note: note || '',
      }
      const updatedHistory = [...(order.status_history || []), historyEntry]

      const { data: updated, error: updateError } = await supabase
        .from('orders')
        .update({ status: newStatus, status_history: updatedHistory })
        .eq('id', orderId)
        .select('id, order_number, status, status_history')
        .single()

      if (updateError) throw updateError

      res.json({ order: updated })
    } catch (err) {
      console.error('Failed to update order status:', err)
      res.status(500).json({ error: 'Failed to update order status' })
    }
  })
}
