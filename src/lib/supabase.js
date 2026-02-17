/**
 * API helper for making requests to the Express backend.
 * All Supabase operations go through /api/* routes — the service_role key
 * stays server-side only.
 */

export async function api(path, options = {}) {
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })

  const data = await res.json()

  if (!res.ok) {
    throw new Error(data.error || `API error: ${res.status}`)
  }

  return data
}
