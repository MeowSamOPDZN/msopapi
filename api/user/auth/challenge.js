import { cors } from '../../_lib/firebase.js'
export default async function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(204).end()
  res.status(200).json({ enabled: true, siteKey: null, emailConfigured: true, googleEnabled: true })
}
