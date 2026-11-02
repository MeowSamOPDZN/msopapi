// MsopAPI /v1/models on Vercel, proxied to APInex server-side.
// The provider key lives only in a server env var, never in the browser.
export default async function handler(req, res) {
  const key = process.env.APINEX_API_KEY
  if (!key) return res.status(502).json({ error: { message: 'Upstream API not configured', type: 'server_error' } })
  try {
    const upstream = await fetch('https://api.apinex.bond/v1/models', {
      headers: { Authorization: `Bearer ${key}`, accept: 'application/json' },
    })
    const data = await upstream.json().catch(() => ({}))
    res.status(upstream.status).json(data)
  } catch {
    res.status(502).json({ error: { message: 'Upstream API unavailable', type: 'server_error' } })
  }
}
