import { supabase } from '../supabase.js'

export function registerCouponsRoutes(app) {
  // GET /api/coupons — list all coupons with usage counts
  app.get('/api/coupons', async (req, res) => {
    try {
      const { data: coupons, error } = await supabase
        .from('coupons')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      // Aggregate usage counts
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

      res.json({ success: true, coupons: result })
    } catch (err) {
      console.error('Failed to fetch coupons:', err)
      res.status(500).json({ error: 'Failed to fetch coupons' })
    }
  })

  // POST /api/coupons — create coupon
  app.post('/api/coupons', async (req, res) => {
    try {
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

      res.json({ success: true, coupon: data })
    } catch (err) {
      console.error('Failed to create coupon:', err)
      res.status(500).json({ error: 'Failed to create coupon' })
    }
  })

  // PUT /api/coupons — update coupon
  app.put('/api/coupons', async (req, res) => {
    try {
      const { id, updates } = req.body

      if (!id) return res.status(400).json({ error: 'Coupon ID is required' })

      const { data, error } = await supabase
        .from('coupons')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      res.json({ success: true, coupon: data })
    } catch (err) {
      console.error('Failed to update coupon:', err)
      res.status(500).json({ error: 'Failed to update coupon' })
    }
  })

  // DELETE /api/coupons — delete coupon
  app.delete('/api/coupons', async (req, res) => {
    try {
      const { id } = req.body

      if (!id) return res.status(400).json({ error: 'Coupon ID is required' })

      const { error } = await supabase.from('coupons').delete().eq('id', id)

      if (error) throw error

      res.json({ success: true })
    } catch (err) {
      console.error('Failed to delete coupon:', err)
      res.status(500).json({ error: 'Failed to delete coupon' })
    }
  })

  // GET /api/coupons/products — slim list for targeting dropdown
  app.get('/api/coupons/products', async (req, res) => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, title')
        .order('title')

      if (error) throw error
      res.json({ products: data || [] })
    } catch (err) {
      console.error('Failed to fetch products:', err)
      res.status(500).json({ error: 'Failed to fetch products' })
    }
  })

  // GET /api/coupons/collections — slim list for targeting dropdown
  app.get('/api/coupons/collections', async (req, res) => {
    try {
      const { data, error } = await supabase
        .from('collections')
        .select('id, title')
        .order('title')

      if (error) throw error
      res.json({ collections: data || [] })
    } catch (err) {
      console.error('Failed to fetch collections:', err)
      res.status(500).json({ error: 'Failed to fetch collections' })
    }
  })
}
