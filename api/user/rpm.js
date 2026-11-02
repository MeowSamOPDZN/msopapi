import { authUser, cors } from '../../_lib/firebase.js'
export default async function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(204).end()
  const user = await authUser(req, res)
  if (!user) return
  res.status(200).json({ rpm: 15, planKey: 'free', label: 'Free', source: 'free', expiresAt: null, termLabel: null, supportUrl: '', cryptoEnabled: false, grantRpm: null, grantExpiresAt: null, plans: [{ key: 'free', rpm: 15, priceCents: 0, priceUsd: 0, enabled: true, custom: false, label: 'Free' }] })
}
