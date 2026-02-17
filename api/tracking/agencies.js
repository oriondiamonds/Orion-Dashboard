import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
)

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

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
}
