import { authUser, cors } from '../../_lib/firebase.js'
export default async function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(204).end()
  const user = await authUser(req, res)
  if (!user) return
  res.status(200).json({ referral: { enabled: false, code: '', invited: 0, rewarded: 0, earnedUsd: 0, referredByCode: null, hasReferrer: false, rewardGranted: false, minPurchaseDollars: 0, referrerRewardUsd: 0, refereeRewardUsd: 0 } })
}
