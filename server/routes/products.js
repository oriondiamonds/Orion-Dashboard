import { supabase } from '../supabase.js'

function slugify(text = '') {
  return String(text)
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

async function triggerStorefrontRevalidation() {
  const orionUrl = process.env.VITE_ORION_URL
  const secret = process.env.REVALIDATE_SECRET
  if (!orionUrl || !secret) return

  try {
    await fetch(`${orionUrl}/api/revalidate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret, path: '/' }),
    })
  } catch (error) {
    console.warn('Storefront revalidation failed:', error.message)
  }
}

function normalizeSuggestionToken(value = '') {
  return String(value).trim();
}

function rankSuggestionItems(items = [], query = '') {
  const counts = new Map();
  const q = String(query || '').trim().toLowerCase();

  for (const raw of items) {
    const item = normalizeSuggestionToken(raw);
    if (!item) continue;
    if (q && !item.toLowerCase().includes(q)) continue;
    const key = item.toLowerCase();
    const entry = counts.get(key) || { value: item, count: 0 };
    entry.count += 1;
    counts.set(key, entry);
  }

  return Array.from(counts.values())
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value))
    .map((entry) => entry.value);
}

async function fetchSuggestions(field, query) {
  switch (field) {
    case 'title': {
      const { data } = await supabase.from('products').select('title').limit(400);
      return rankSuggestionItems((data || []).map((row) => row.title), query);
    }
    case 'handle': {
      const { data } = await supabase.from('products').select('handle').limit(400);
      return rankSuggestionItems((data || []).map((row) => row.handle), query);
    }
    case 'option_name': {
      const { data } = await supabase.from('product_options').select('name').limit(800);
      return rankSuggestionItems((data || []).map((row) => row.name), query);
    }
    case 'option_value': {
      const { data } = await supabase.from('product_options').select('values').limit(800);
      const values = (data || []).flatMap((row) => Array.isArray(row.values) ? row.values : []);
      return rankSuggestionItems(values, query);
    }
    case 'collection': {
      const { data } = await supabase.from('collections').select('title').limit(300);
      return rankSuggestionItems((data || []).map((row) => row.title), query);
    }
    case 'diamond_shapes':
    case 'total_diamonds':
    case 'diamond_weight': {
      const { data } = await supabase.from('product_prices').select(field).limit(500);
      const values = (data || [])
        .flatMap((row) => String(row[field] || '').split(','))
        .map((token) => token.trim());
      return rankSuggestionItems(values, query);
    }
    default:
      return [];
  }
}

export function registerProductsRoutes(app) {
  app.get('/api/products/suggestions', async (req, res) => {
    try {
      const field = String(req.query.field || '').trim();
      const query = String(req.query.q || '').trim();
      if (!field) return res.status(400).json({ error: 'field is required' });
      const items = await fetchSuggestions(field, query);
      res.json({ success: true, items: items.slice(0, 20) });
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      res.status(500).json({ success: false, items: [] });
    }
  });

  app.get('/api/products', async (req, res) => {
    try {
      const detailId = req.query.detail
      if (detailId) {
        const { data: product, error } = await supabase
          .from('products')
          .select(`
            *,
            images:product_images(*),
            options:product_options(*),
            variants:product_variants(
              *,
              selected_options:variant_selected_options(*)
            )
          `)
          .eq('id', detailId)
          .single()

        if (error) throw error

        if (product.images) product.images.sort((a, b) => a.position - b.position)
        if (product.options) product.options.sort((a, b) => a.position - b.position)

        const { data: pricing } = await supabase
          .from('product_prices')
          .select('*')
          .eq('handle', product.handle)
          .maybeSingle()
        product.pricing = pricing || null

        const { data: cpRows } = await supabase
          .from('collection_products')
          .select('collection_id')
          .eq('product_id', detailId)
        product.collection_ids = (cpRows || []).map((r) => r.collection_id)

        return res.json({ success: true, product })
      }

      let productsRes = await supabase
        .from('products')
        .select(`
          id,
          handle,
          title,
          featured_image_url,
          is_bestseller,
          is_featured,
          created_at,
          variants:product_variants(id),
          options:product_options(id)
        `)
        .order('created_at', { ascending: false })

      // Backward-compatible fallback for DBs that don't yet have flag columns
      if (productsRes.error) {
        const msg = String(productsRes.error.message || '').toLowerCase()
        const missingFlags = msg.includes('is_bestseller') || msg.includes('is_featured')
        if (missingFlags) {
          console.warn('Products flag columns missing in DB. Falling back to legacy select.')
          productsRes = await supabase
            .from('products')
            .select(`
              id,
              handle,
              title,
              featured_image_url,
              created_at,
              variants:product_variants(id),
              options:product_options(id)
            `)
            .order('created_at', { ascending: false })
        }
      }

      const [pricingRes, collectionsRes, cpRes] = await Promise.all([
        supabase.from('product_prices').select('handle'),
        supabase.from('collections').select('id, handle, title').order('title'),
        supabase.from('collection_products').select('collection_id, product_id'),
      ])

      if (productsRes.error) throw productsRes.error

      const products = productsRes.data || []
      const pricingSet = new Set((pricingRes.data || []).map((r) => r.handle))
      const collections = collectionsRes.data || []

      const collectionMap = {}
      for (const c of collections) collectionMap[c.id] = c.title

      const productCollections = {}
      for (const cp of cpRes.data || []) {
        if (!productCollections[cp.product_id]) productCollections[cp.product_id] = []
        const title = collectionMap[cp.collection_id]
        if (title) productCollections[cp.product_id].push(title)
      }

      const result = products.map((p) => ({
        id: p.id,
        handle: p.handle,
        title: p.title,
        featured_image_url: p.featured_image_url,
        is_bestseller: p.is_bestseller ?? false,
        is_featured: p.is_featured ?? false,
        created_at: p.created_at,
        variant_count: (p.variants || []).length,
        option_count: (p.options || []).length,
        has_pricing: pricingSet.has(p.handle),
        collections: productCollections[p.id] || [],
      }))

      res.json({ success: true, products: result, collections })
    } catch (error) {
      console.error('Error fetching products:', error)
      res.status(500).json({ error: 'Failed to fetch products' })
    }
  })

  app.post('/api/products', async (req, res) => {
    try {
      const { product } = req.body || {}
      if (!product?.title) return res.status(400).json({ error: 'Product title is required' })

      const handle = product.handle || slugify(product.title)
      const { data: existing } = await supabase.from('products').select('id').eq('handle', handle).maybeSingle()
      if (existing) return res.status(409).json({ error: `A product with handle "${handle}" already exists` })

      const { data: newProduct, error: productError } = await supabase
        .from('products')
        .insert({
          handle,
          title: product.title,
          description: product.description || null,
          description_html: product.description_html || null,
          featured_image_url: product.featured_image_url || null,
          featured_image_alt: product.featured_image_alt || product.title,
          is_bestseller: product.is_bestseller ?? false,
          is_featured: product.is_featured ?? false,
        })
        .select()
        .single()
      if (productError) throw productError

      const productId = newProduct.id

      if (product.images?.length > 0) {
        const imageRows = product.images.map((img, i) => ({
          product_id: productId,
          url: img.url,
          alt_text: img.alt_text || product.title,
          position: i,
        }))
        await supabase.from('product_images').insert(imageRows)
      }

      if (product.options?.length > 0) {
        const optionRows = product.options.map((opt, i) => ({
          product_id: productId,
          name: opt.name,
          values: opt.values,
          position: i,
        }))
        await supabase.from('product_options').insert(optionRows)
      }

      if (product.variants?.length > 0) {
        for (const variant of product.variants) {
          const { data: newVariant, error: varError } = await supabase
            .from('product_variants')
            .insert({
              product_id: productId,
              title: variant.title,
              sku: variant.sku || null,
              available_for_sale: variant.available_for_sale ?? true,
              price_amount: variant.price_amount || 0,
              price_currency_code: 'INR',
            })
            .select('id')
            .single()
          if (varError) continue

          if (variant.selected_options?.length > 0) {
            const soRows = variant.selected_options.map((so) => ({
              variant_id: newVariant.id,
              option_name: so.option_name,
              option_value: so.option_value,
            }))
            await supabase.from('variant_selected_options').insert(soRows)
          }
        }
      }

      if (product.pricing) {
        const pricingRow = {
          handle,
          price_10k: parseFloat(product.pricing.price_10k) || 0,
          price_14k: parseFloat(product.pricing.price_14k) || 0,
          price_18k: parseFloat(product.pricing.price_18k) || 0,
          weight_10k: parseFloat(product.pricing.weight_10k) || 0,
          weight_14k: parseFloat(product.pricing.weight_14k) || 0,
          weight_18k: parseFloat(product.pricing.weight_18k) || 0,
          diamond_shapes: product.pricing.diamond_shapes || '',
          total_diamonds: product.pricing.total_diamonds || '',
          diamond_weight: product.pricing.diamond_weight || '',
          total_diamond_weight: product.pricing.total_diamond_weight || '',
          diamond_price: parseFloat(product.pricing.diamond_price) || 0,
          gold_price_14k: parseFloat(product.pricing.gold_price_14k) || 0,
          making_charges: parseFloat(product.pricing.making_charges) || 0,
          gst: parseFloat(product.pricing.gst) || 0,
          pricing_mode: product.pricing.pricing_mode || 'live',
          source: 'admin',
          synced_at: new Date().toISOString(),
        }
        await supabase.from('product_prices').upsert(pricingRow, { onConflict: 'handle' })
      }

      if (product.collection_ids?.length > 0) {
        const cpRows = product.collection_ids.map((cid, i) => ({
          collection_id: cid,
          product_id: productId,
          position: i,
        }))
        await supabase.from('collection_products').insert(cpRows)
      }

      await triggerStorefrontRevalidation()
      res.json({ success: true, product: newProduct })
    } catch (error) {
      console.error('Error creating product:', error)
      res.status(500).json({ error: 'Failed to create product' })
    }
  })

  app.put('/api/products', async (req, res) => {
    try {
      const { id, product } = req.body || {}
      if (!id) return res.status(400).json({ error: 'Product ID is required' })

      const updates = {}
      if (product.title !== undefined) updates.title = product.title
      if (product.handle !== undefined) updates.handle = product.handle
      if (product.description !== undefined) updates.description = product.description
      if (product.description_html !== undefined) updates.description_html = product.description_html
      if (product.featured_image_url !== undefined) updates.featured_image_url = product.featured_image_url
      if (product.featured_image_alt !== undefined) updates.featured_image_alt = product.featured_image_alt
      if (product.is_bestseller !== undefined) updates.is_bestseller = !!product.is_bestseller
      if (product.is_featured !== undefined) updates.is_featured = !!product.is_featured

      if (Object.keys(updates).length > 0) {
        updates.updated_at = new Date().toISOString()
        const { error: updateError } = await supabase.from('products').update(updates).eq('id', id)
        if (updateError) throw updateError
      }

      if (product.images !== undefined) {
        await supabase.from('product_images').delete().eq('product_id', id)
        if (product.images.length > 0) {
          const imageRows = product.images.map((img, i) => ({
            product_id: id,
            url: img.url,
            alt_text: img.alt_text || product.title || '',
            position: i,
          }))
          await supabase.from('product_images').insert(imageRows)
        }
      }

      if (product.options !== undefined) {
        await supabase.from('product_options').delete().eq('product_id', id)
        if (product.options.length > 0) {
          const optionRows = product.options.map((opt, i) => ({
            product_id: id,
            name: opt.name,
            values: opt.values,
            position: i,
          }))
          await supabase.from('product_options').insert(optionRows)
        }
      }

      if (product.variants !== undefined) {
        await supabase.from('product_variants').delete().eq('product_id', id)
        for (const variant of product.variants) {
          const { data: newVariant, error: varError } = await supabase
            .from('product_variants')
            .insert({
              product_id: id,
              title: variant.title,
              sku: variant.sku || null,
              available_for_sale: variant.available_for_sale ?? true,
              price_amount: variant.price_amount || 0,
              price_currency_code: 'INR',
            })
            .select('id')
            .single()
          if (varError) continue
          if (variant.selected_options?.length > 0) {
            const soRows = variant.selected_options.map((so) => ({
              variant_id: newVariant.id,
              option_name: so.option_name,
              option_value: so.option_value,
            }))
            await supabase.from('variant_selected_options').insert(soRows)
          }
        }
      }

      if (product.pricing !== undefined) {
        const { data: currentProduct } = await supabase.from('products').select('handle').eq('id', id).single()
        if (currentProduct) {
          const pricing = product.pricing
          if (pricing && Object.values(pricing).some((v) => v)) {
            const pricingRow = {
              handle: currentProduct.handle,
              price_10k: parseFloat(pricing.price_10k) || 0,
              price_14k: parseFloat(pricing.price_14k) || 0,
              price_18k: parseFloat(pricing.price_18k) || 0,
              weight_10k: parseFloat(pricing.weight_10k) || 0,
              weight_14k: parseFloat(pricing.weight_14k) || 0,
              weight_18k: parseFloat(pricing.weight_18k) || 0,
              diamond_shapes: pricing.diamond_shapes || '',
              total_diamonds: pricing.total_diamonds || '',
              diamond_weight: pricing.diamond_weight || '',
              total_diamond_weight: pricing.total_diamond_weight || '',
              diamond_price: parseFloat(pricing.diamond_price) || 0,
              gold_price_14k: parseFloat(pricing.gold_price_14k) || 0,
              making_charges: parseFloat(pricing.making_charges) || 0,
              gst: parseFloat(pricing.gst) || 0,
              pricing_mode: pricing.pricing_mode || 'live',
              source: 'admin',
              synced_at: new Date().toISOString(),
            }
            await supabase.from('product_prices').upsert(pricingRow, { onConflict: 'handle' })
          }
        }
      }

      if (product.collection_ids !== undefined) {
        await supabase.from('collection_products').delete().eq('product_id', id)
        if (product.collection_ids.length > 0) {
          const cpRows = product.collection_ids.map((cid, i) => ({
            collection_id: cid,
            product_id: id,
            position: i,
          }))
          await supabase.from('collection_products').insert(cpRows)
        }
      }

      const { data: updated } = await supabase.from('products').select('*').eq('id', id).single()
      await triggerStorefrontRevalidation()
      res.json({ success: true, product: updated })
    } catch (error) {
      console.error('Error updating product:', error)
      res.status(500).json({ error: 'Failed to update product' })
    }
  })

  app.delete('/api/products', async (req, res) => {
    try {
      const { id } = req.body || {}
      if (!id) return res.status(400).json({ error: 'Product ID is required' })

      const { data: product } = await supabase.from('products').select('handle').eq('id', id).single()
      if (!product) return res.status(404).json({ error: 'Product not found' })

      const { error } = await supabase.from('products').delete().eq('id', id)
      if (error) throw error

      await supabase.from('product_prices').delete().eq('handle', product.handle)
      await triggerStorefrontRevalidation()
      res.json({ success: true, message: 'Product deleted' })
    } catch (error) {
      console.error('Error deleting product:', error)
      res.status(500).json({ error: 'Failed to delete product' })
    }
  })

  app.post('/api/products/collections', async (req, res) => {
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
      await triggerStorefrontRevalidation()
      res.json({ success: true, collection })
    } catch (error) {
      console.error('Error creating collection:', error)
      res.status(500).json({ error: 'Failed to create collection' })
    }
  })

  // Placeholder endpoint: dashboard currently supports URL-based product images.
  app.post('/api/products/upload', async (_req, res) => {
    res.status(501).json({ error: 'Direct upload is not enabled. Paste image URLs instead.' })
  })
}
