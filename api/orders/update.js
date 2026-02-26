import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
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
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

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
}
