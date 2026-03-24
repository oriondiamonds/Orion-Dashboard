import { supabase } from '../supabase.js'

export function registerAgenciesRoutes(app) {
  // GET /api/agencies — all agencies (active + inactive) for admin
  app.get('/api/agencies', async (req, res) => {
    try {
      const { data, error } = await supabase
        .from('agencies')
        .select('*')
        .order('name')

      if (error) throw error
      res.json({ success: true, agencies: data || [] })
    } catch (err) {
      console.error('Failed to fetch agencies:', err)
      res.status(500).json({ success: false, error: 'Failed to fetch agencies' })
    }
  })

  // POST /api/agencies — create agency
  app.post('/api/agencies', async (req, res) => {
    try {
      const { name, contact_email } = req.body

      if (!name?.trim()) {
        return res.status(400).json({ success: false, error: 'Agency name is required' })
      }

      const { data, error } = await supabase
        .from('agencies')
        .insert({ name: name.trim(), contact_email: contact_email?.trim() || null, is_active: true })
        .select()
        .single()

      if (error) {
        if (error.code === '23505') {
          return res.status(409).json({ success: false, error: 'Agency with this name already exists' })
        }
        throw error
      }

      res.json({ success: true, agency: data })
    } catch (err) {
      console.error('Failed to create agency:', err)
      res.status(500).json({ success: false, error: 'Failed to create agency' })
    }
  })

  // PUT /api/agencies — update agency
  app.put('/api/agencies', async (req, res) => {
    try {
      const { id, name, contact_email, is_active } = req.body

      if (!id) return res.status(400).json({ success: false, error: 'Agency ID is required' })

      const updates = {}
      if (name !== undefined) updates.name = name.trim()
      if (contact_email !== undefined) updates.contact_email = contact_email?.trim() || null
      if (is_active !== undefined) updates.is_active = is_active

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ success: false, error: 'No fields to update' })
      }

      const { data, error } = await supabase
        .from('agencies')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        if (error.code === '23505') {
          return res.status(409).json({ success: false, error: 'Agency with this name already exists' })
        }
        throw error
      }

      res.json({ success: true, agency: data })
    } catch (err) {
      console.error('Failed to update agency:', err)
      res.status(500).json({ success: false, error: 'Failed to update agency' })
    }
  })

  // DELETE /api/agencies — soft delete (set is_active = false)
  app.delete('/api/agencies', async (req, res) => {
    try {
      const { id } = req.body

      if (!id) return res.status(400).json({ success: false, error: 'Agency ID is required' })

      const { data, error } = await supabase
        .from('agencies')
        .update({ is_active: false })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      res.json({ success: true, agency: data })
    } catch (err) {
      console.error('Failed to deactivate agency:', err)
      res.status(500).json({ success: false, error: 'Failed to deactivate agency' })
    }
  })
}
