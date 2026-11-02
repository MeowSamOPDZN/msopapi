import { authUser, cors } from '../../../_lib/firebase.js'
export default async function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(204).end()
  const user = await authUser(req, res)
  if (!user) return
  res.status(200).json({ enabled: false, levels: [], budgetBaseTokens: 10000, balanceTokens: 0, spentPercent: 0, notifiedLevel: 0, telegramLinked: false, canReceive: false })
}
