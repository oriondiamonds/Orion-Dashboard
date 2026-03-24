import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const { data: coupons, error } = await supabase
        .from('coupons')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      const { data: usages } = await supabase
        .from('coupon_usages')
        .select('coupon_id')

      const counts = {}
      if (usages) {
        usages.forEach((u) => {
          counts[u.coupon_id] = (counts[u.coupon_id] || 0) + 1
        })
      }

      const result = (coupons || []).map((c) => ({
        ...c,
        total_uses: counts[c.id] || 0,
      }))

      return res.json({ success: true, coupons: result })
    }

    if (req.method === 'POST') {
      const { coupon } = req.body

      if (!coupon?.code || !coupon?.discount_type || !coupon?.discount_value) {
        return res.status(400).json({ error: 'Code, discount type, and value are required' })
      }

      const { data, error } = await supabase
        .from('coupons')
        .insert({
          code: coupon.code,
          description: coupon.description || null,
          discount_type: coupon.discount_type,
          discount_value: coupon.discount_value,
          min_order_amount: coupon.min_order_amount || 0,
          max_discount_amount: coupon.max_discount_amount || null,
          usage_limit: coupon.usage_limit || null,
          per_customer_limit: coupon.per_customer_limit ?? 1,
          starts_at: coupon.starts_at || new Date().toISOString(),
          expires_at: coupon.expires_at || null,
          is_active: coupon.is_active ?? true,
          applies_to: coupon.applies_to || 'all',
          applicable_product_ids: coupon.applicable_product_ids || null,
          applicable_collections: coupon.applicable_collections || null,
          utm_campaign: coupon.utm_campaign || null,
          utm_source: coupon.utm_source || null,
          utm_medium: coupon.utm_medium || null,
          agency_id: coupon.agency_id || null,
          channel: coupon.channel || null,
        })
        .select()
        .single()

      if (error) {
        if (error.code === '23505') {
          return res.status(409).json({ error: 'A coupon with this code already exists' })
        }
        throw error
      }

      return res.json({ success: true, coupon: data })
    }

    if (req.method === 'PUT') {
      const { id, updates } = req.body

      if (!id) return res.status(400).json({ error: 'Coupon ID is required' })

      const { data, error } = await supabase
        .from('coupons')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      return res.json({ success: true, coupon: data })
    }

    if (req.method === 'DELETE') {
      const { id } = req.body

      if (!id) return res.status(400).json({ error: 'Coupon ID is required' })

      const { error } = await supabase.from('coupons').delete().eq('id', id)

      if (error) throw error

      return res.json({ success: true })
    }

    res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    console.error('Coupons API error:', err)
    res.status(500).json({ error: err.message || 'Internal server error' })
  }
}
