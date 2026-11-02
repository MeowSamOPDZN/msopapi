import { authUser, cors, firestoreBase } from '../../../_lib/firebase.js'
export default async function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const user = await authUser(req, res)
  if (!user) return
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim()
  const id = req.query.id
  await fetch(`${firestoreBase()}/users/${user.uid}/apiKeys/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  return res.status(200).json({ ok: true })
}
