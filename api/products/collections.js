import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
)

function slugify(text = '') {
  return String(text)
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { title } = req.body || {}
    const trimmedTitle = String(title || '').trim()
    if (!trimmedTitle) return res.status(400).json({ error: 'Collection title is required' })

    const handle = slugify(trimmedTitle)
    const { data: existing } = await supabase.from('collections').select('id').eq('handle', handle).maybeSingle()
    if (existing) return res.status(409).json({ error: 'Collection already exists' })

    const { data: collection, error } = await supabase
      .from('collections')
      .insert({ title: trimmedTitle, handle })
      .select('id, title, handle')
      .single()

    if (error) throw error
    return res.status(200).json({ success: true, collection })
  } catch (error) {
    console.error('Create collection API error:', error)
    return res.status(500).json({ error: 'Failed to create collection' })
  }
}
