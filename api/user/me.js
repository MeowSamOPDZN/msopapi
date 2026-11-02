import { authUser, cors } from '../_lib/firebase.js'
export default async function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(204).end()
  const user = await authUser(req, res)
  if (!user) return
  res.status(200).json({
    user: {
      id: user.uid,
      email: user.email,
      name: user.name || (user.email ? user.email.split('@')[0] : 'MsopAPI user'),
      status: 'active',
      balanceTokens: 0,
      authMethod: 'firebase',
      loginEmail: user.email || null,
      hasPassword: false,
      googleLinked: false,
      telegramId: null,
      telegramUsername: null,
      telegramVerified: false,
      level: null,
    },
    expiresAt: new Date(user.exp * 1000).toISOString(),
  })
}
