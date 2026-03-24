import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

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
}
