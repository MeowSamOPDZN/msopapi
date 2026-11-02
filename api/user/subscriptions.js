import { authUser, cors, freeTier } from '../../_lib/firebase.js'
export default async function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(204).end()
  const user = await authUser(req, res)
  if (!user) return
  res.status(200).json({ access: freeTier(), subscription: null, freeDailyTokens: 10000, resetsAt: new Date(Date.now() + 86400_000).toISOString(), rpmFree: 15, rpmSubscription: 30, promoBoost: null, plans: [], offer: null, payMethods: [], solanaEnabled: false, cardEnabled: false, history: [] })
}
