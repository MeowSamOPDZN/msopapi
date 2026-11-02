// Public status for the Vercel storefront, built from the public catalog.
// No uptime history exists without the gateway backend, so live models
// report operational and the rest unknown, instead of erroring.
export default async function handler(req, res) {
  try {
    const upstream = await fetch('https://apinex.bond/api/public/models', {
      headers: { accept: 'application/json' },
    })
    if (!upstream.ok) throw new Error(`Upstream catalog ${upstream.status}`)
    const data = await upstream.json()
    const models = (data.models ?? []).map((m) => ({
      id: m.id,
      name: m.name,
      provider: m.provider,
      state: m.health === 'live' ? 'operational' : 'unknown',
      uptimePct: m.health === 'live' ? 100 : null,
      hours: [],
    }))
    res.setHeader('Cache-Control', 'public, max-age=60')
    res.status(200).json({ generatedAt: new Date().toISOString(), windowHours: 24, models })
  } catch {
    res.status(502).json({ error: 'Status unavailable' })
  }
}
