import bcrypt from 'bcryptjs'
import { supabase } from '../supabase.js'

/**
 * Register auth routes
 */
export function registerAuthRoutes(app) {
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' })
      }

      const { data: user, error } = await supabase
        .from('admin_users')
        .select('id, email, password_hash, display_name, role, is_active')
        .eq('email', email.toLowerCase().trim())
        .single()

      if (error || !user) {
        return res.status(401).json({ error: 'Invalid email or password' })
      }

      if (!user.is_active) {
        return res.status(403).json({ error: 'Account has been deactivated' })
      }

      const valid = await bcrypt.compare(password, user.password_hash)
      if (!valid) {
        return res.status(401).json({ error: 'Invalid email or password' })
      }

      // Update last login (fire-and-forget)
      supabase
        .from('admin_users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', user.id)
        .then()

      res.json({
        user: {
          id: user.id,
          email: user.email,
          display_name: user.display_name,
          role: user.role,
        },
      })
    } catch (err) {
      console.error('Login error:', err)
      res.status(500).json({ error: 'Internal server error' })
    }
  })
}
