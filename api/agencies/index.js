import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('agencies')
        .select('*')
        .order('name')

      if (error) throw error
      return res.json({ success: true, agencies: data || [] })
    }

    if (req.method === 'POST') {
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

      return res.json({ success: true, agency: data })
    }

    if (req.method === 'PUT') {
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

      return res.json({ success: true, agency: data })
    }

    if (req.method === 'DELETE') {
      const { id } = req.body

      if (!id) return res.status(400).json({ success: false, error: 'Agency ID is required' })

      const { error } = await supabase
        .from('agencies')
        .delete()
        .eq('id', id)

      if (error) throw error

      return res.json({ success: true, id })
    }

    res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    console.error('Agencies API error:', err)
    res.status(500).json({ success: false, error: err.message || 'Internal server error' })
  }
}
