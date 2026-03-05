export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  return res.status(501).json({ error: 'Direct upload is not enabled. Paste image URLs instead.' })
}
