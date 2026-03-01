import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL||process.env.VITE_SUPABASE_URL_PROXY,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
)

const STATUS_ORDER = [
  'pending',
  'order_placed',
  'acknowledged',
  'manufacturing',
  'shipping',
  'delivered',
]

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

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
}
