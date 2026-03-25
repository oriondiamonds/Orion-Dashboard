import bcrypt from 'bcryptjs'
import { supabase } from '../supabase.js'

const SAFE_FIELDS = 'id, email, display_name, role, is_active, custom_permissions, last_login, created_at, updated_at'

export function registerAdminUsersRoutes(app) {
  // GET /api/admin-users — list all admin users (no password_hash)
  app.get('/api/admin-users', async (req, res) => {
    try {
      const { data, error } = await supabase
        .from('admin_users')
        .select(SAFE_FIELDS)
        .order('created_at', { ascending: true })

      if (error) throw error
      res.json({ success: true, users: data || [] })
    } catch (err) {
      console.error('Failed to fetch admin users:', err)
      res.status(500).json({ success: false, error: 'Failed to fetch admin users' })
    }
  })

  // POST /api/admin-users — create new admin user
  app.post('/api/admin-users', async (req, res) => {
    try {
      const { email, display_name, role, password } = req.body

      if (!email?.trim()) return res.status(400).json({ success: false, error: 'Email is required' })
      if (!display_name?.trim()) return res.status(400).json({ success: false, error: 'Display name is required' })
      if (!role) return res.status(400).json({ success: false, error: 'Role is required' })
      if (!password || password.length < 8) {
        return res.status(400).json({ success: false, error: 'Password must be at least 8 characters' })
      }

      const password_hash = await bcrypt.hash(password, 10)

      const { data, error } = await supabase
        .from('admin_users')
        .insert({ email: email.trim().toLowerCase(), display_name: display_name.trim(), role, password_hash, is_active: true })
        .select(SAFE_FIELDS)
        .single()

      if (error) {
        if (error.code === '23505') {
          return res.status(409).json({ success: false, error: 'Email already in use' })
        }
        throw error
      }

      res.json({ success: true, user: data })
    } catch (err) {
      console.error('Failed to create admin user:', err)
      res.status(500).json({ success: false, error: 'Failed to create admin user' })
    }
  })

  // PUT /api/admin-users — update display_name, role, is_active, or reset password
  app.put('/api/admin-users', async (req, res) => {
    try {
      const { id, display_name, role, is_active, new_password, custom_permissions, requesterId } = req.body

      if (!id) return res.status(400).json({ success: false, error: 'User ID is required' })

      // Prevent self-deactivation or self-role-change
      if (requesterId && requesterId === id) {
        if (is_active === false) return res.status(400).json({ success: false, error: 'Cannot deactivate your own account' })
        if (role !== undefined) return res.status(400).json({ success: false, error: 'Cannot change your own role' })
      }

      const updates = {}
      if (display_name !== undefined) updates.display_name = display_name.trim()
      if (role !== undefined) updates.role = role
      if (is_active !== undefined) updates.is_active = is_active
      if ('custom_permissions' in req.body) {
        // null = use role defaults, {} treated as null
        const cp = custom_permissions
        updates.custom_permissions = (cp && Object.keys(cp).length > 0) ? cp : null
      }
      if (new_password) {
        if (new_password.length < 8) return res.status(400).json({ success: false, error: 'Password must be at least 8 characters' })
        updates.password_hash = await bcrypt.hash(new_password, 10)
      }

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ success: false, error: 'Nothing to update' })
      }

      const { data, error } = await supabase
        .from('admin_users')
        .update(updates)
        .eq('id', id)
        .select(SAFE_FIELDS)
        .single()

      if (error) throw error

      res.json({ success: true, user: data })
    } catch (err) {
      console.error('Failed to update admin user:', err)
      res.status(500).json({ success: false, error: 'Failed to update admin user' })
    }
  })
}
