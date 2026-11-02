// Public model catalog for the Vercel storefront, no backend database needed.
// Proxies APInex's public catalog server-side, so browsers never hit its
// CORS wall and never need a key for this public list.
export default async function handler(req, res) {
  try {
    const upstream = await fetch('https://apinex.bond/api/public/models', {
      headers: { accept: 'application/json' },
    })
    if (!upstream.ok) throw new Error(`Upstream catalog ${upstream.status}`)
    const data = await upstream.json()
    res.setHeader('Cache-Control', 'public, max-age=60')
    res.status(200).json({ models: data.models ?? [] })
  } catch {
    res.status(502).json({ error: 'Model catalog unavailable' })
  }
}
