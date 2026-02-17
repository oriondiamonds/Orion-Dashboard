/**
 * Seed script: Create the initial super_admin user
 */

import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Load .env manually (no dotenv dependency)
function loadEnv() {
  try {
    const envPath = resolve(__dirname, '..', '.env')
    const content = readFileSync(envPath, 'utf-8')
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eqIdx = trimmed.indexOf('=')
      if (eqIdx === -1) continue
      const key = trimmed.slice(0, eqIdx).trim()
      const value = trimmed.slice(eqIdx + 1).trim()
      if (!process.env[key]) process.env[key] = value
    }
  } catch {
    console.error('No .env file found. Set VITE_SUPABASE_URL and VITE_SUPABASE_SERVICE_ROLE_KEY as env vars.')
    process.exit(1)
  }
}

loadEnv()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// ---- Configure your initial admin here ----
const ADMIN_EMAIL = 'marketing@gmail.com'
const ADMIN_PASSWORD = 'market@2026'  // Change this!
const ADMIN_NAME = 'Marketing Team'
// -------------------------------------------

async function seed() {
  console.log(`Seeding super_admin: ${ADMIN_EMAIL}`)

  // Check if already exists
  const { data: existing } = await supabase
    .from('admin_users')
    .select('id')
    .eq('email', ADMIN_EMAIL)
    .single()

  if (existing) {
    console.log('Admin user already exists, skipping.')
    return
  }

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10)

  const { data, error } = await supabase
    .from('admin_users')
    .insert({
      email: ADMIN_EMAIL,
      password_hash: passwordHash,
      display_name: ADMIN_NAME,
      role: 'marketing',
      is_active: true,
    })
    .select()
    .single()

  if (error) {
    console.error('Failed to seed admin:', error.message)
    process.exit(1)
  }

  console.log('Super admin created successfully:', data.id)
  console.log(`\nLogin with:\n  Email: ${ADMIN_EMAIL}\n  Password: ${ADMIN_PASSWORD}`)
}

seed()
