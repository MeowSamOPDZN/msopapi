import { authUser, cors } from '../../../_lib/firebase.js'
export default async function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(204).end()
  const user = await authUser(req, res)
  if (!user) return
  res.status(200).json({ minTopupCents: 100, presets: [500, 1000, 2000, 5000], configured: false, currency: 'USD', method: 'none', provider: null, tokensPerUsd: 1000000, promoBoost: null, card: { enabled: false } })
}
