import { authUser, cors, firestoreBase, listUserKeys, toApiKey } from '../_lib/firebase.js'
import crypto from 'node:crypto'
export default async function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(204).end()
  const user = await authUser(req, res)
  if (!user) return
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim()
  if (req.method === 'GET') {
    const keys = await listUserKeys(user.uid, token)
    return res.status(200).json({ keys })
  }
  if (req.method === 'POST') {
    const name = (req.body?.name || 'Untitled key').toString().trim() || 'Untitled key'
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    const bytes = crypto.randomBytes(48)
    const random = Array.from(bytes, (b) => chars[b % chars.length]).join('')
    const secret = `sk-msop-${random}`
    const createdAt = new Date().toISOString()
    const createRes = await fetch(`${firestoreBase()}/users/${user.uid}/apiKeys`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: {
        name: { stringValue: name },
        prefix: { stringValue: secret.slice(0, 8) },
        secret: { stringValue: secret },
        ownerUid: { stringValue: user.uid },
        status: { stringValue: 'active' },
        createdAt: { stringValue: createdAt },
      } }),
    })
    if (!createRes.ok) return res.status(502).json({ error: 'Could not create key' })
    const doc = await createRes.json()
    const key = toApiKey(doc)
    return res.status(200).json({ key, secret })
  }
  res.setHeader('Allow', 'GET, POST')
  return res.status(405).json({ error: 'Method not allowed' })
}
