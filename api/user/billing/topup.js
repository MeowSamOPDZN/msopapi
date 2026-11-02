import { authUser, cors } from '../../../_lib/firebase.js'
export default async function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(204).end()
  const user = await authUser(req, res)
  if (!user) return
  res.status(400).json({ error: 'Top-ups are not available yet in the Firebase backend' })
}
