import { cors } from '../_lib/firebase.js'
export default async function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(204).end()
  try {
    const upstream = await fetch('https://apinex.bond/api/public/models', { headers: { accept: 'application/json' } })
    const data = await upstream.json()
    const models = (data.models || []).map((m) => ({
      id: m.id, provider: m.provider, name: m.name, contextWindow: m.contextWindow || '',
      weight: m.weight || 1, dollarsPer1M: m.dollarsPer1M || 0,
      inputDollarsPer1M: m.dollarsPer1M || 0, outputDollarsPer1M: m.outputDollarsPer1M || 0,
      eventDiscountPct: null, tags: m.tags || [], health: m.health === 'live' ? 'live' : 'no_data',
    }))
    return res.status(200).json({ models })
  } catch {
    return res.status(502).json({ error: 'Model catalog unavailable' })
  }
}
