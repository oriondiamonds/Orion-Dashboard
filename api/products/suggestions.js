import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
)

function normalizeSuggestionToken(value = '') {
  return String(value).trim()
}

function rankSuggestionItems(items = [], query = '') {
  const counts = new Map()
  const q = String(query || '').trim().toLowerCase()

  for (const raw of items) {
    const item = normalizeSuggestionToken(raw)
    if (!item) continue
    if (q && !item.toLowerCase().includes(q)) continue
    const key = item.toLowerCase()
    const entry = counts.get(key) || { value: item, count: 0 }
    entry.count += 1
    counts.set(key, entry)
  }

  return Array.from(counts.values())
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value))
    .map((entry) => entry.value)
}

async function fetchSuggestions(field, query) {
  switch (field) {
    case 'title': {
      const { data } = await supabase.from('products').select('title').limit(400)
      return rankSuggestionItems((data || []).map((row) => row.title), query)
    }
    case 'handle': {
      const { data } = await supabase.from('products').select('handle').limit(400)
      return rankSuggestionItems((data || []).map((row) => row.handle), query)
    }
    case 'option_name': {
      const { data } = await supabase.from('product_options').select('name').limit(800)
      return rankSuggestionItems((data || []).map((row) => row.name), query)
    }
    case 'option_value': {
      const { data } = await supabase.from('product_options').select('values').limit(800)
      const values = (data || []).flatMap((row) => (Array.isArray(row.values) ? row.values : []))
      return rankSuggestionItems(values, query)
    }
    case 'collection': {
      const { data } = await supabase.from('collections').select('title').limit(300)
      return rankSuggestionItems((data || []).map((row) => row.title), query)
    }
    case 'diamond_shapes':
    case 'total_diamonds':
    case 'diamond_weight': {
      const { data } = await supabase.from('product_prices').select(field).limit(500)
      const values = (data || [])
        .flatMap((row) => String(row[field] || '').split(','))
        .map((token) => token.trim())
      return rankSuggestionItems(values, query)
    }
    default:
      return []
  }
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' })
    }

    const field = String(req.query?.field || '').trim()
    const query = String(req.query?.q || '').trim()
    if (!field) return res.status(400).json({ error: 'field is required' })

    const items = await fetchSuggestions(field, query)
    return res.status(200).json({ success: true, items: items.slice(0, 20) })
  } catch (error) {
    console.error('Suggestions API error:', error)
    return res.status(500).json({ success: false, items: [] })
  }
}
