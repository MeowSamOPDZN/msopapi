import { authUser, cors, freeTier, listUserKeys } from '../_lib/firebase.js'
export default async function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(204).end()
  const user = await authUser(req, res)
  if (!user) return
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim()
  const keys = await listUserKeys(user.uid, token)
  res.status(200).json({
    spendMonthTokens: 0,
    requestsMonth: 0,
    requestsTotal: 0,
    activeKeys: keys.length,
    hasTopup: false,
    telegramVerified: false,
    freeTier: freeTier(),
    weekly: [],
    recent: [],
  })
}
