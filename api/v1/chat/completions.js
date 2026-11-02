// MsopAPI /v1/chat/completions on Vercel, proxied to APInex server-side.
// Callers send their MsopAPI key in Authorization; the provider key is
// server-only and never leaves this function. Per-user billing is not
// enforced by this proxy yet, so use is bounded by the upstream plan.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: { message: 'Method not allowed', type: 'invalid_request_error' } })
  }
  const callerKey = (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim()
  if (!callerKey) {
    return res.status(401).json({ error: { message: 'Missing API key', type: 'authentication_error' } })
  }
  const key = process.env.APINEX_API_KEY
  if (!key) return res.status(502).json({ error: { message: 'Upstream API not configured', type: 'server_error' } })
  try {
    const upstream = await fetch('https://api.apinex.bond/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', accept: 'application/json, text/event-stream' },
      body: JSON.stringify(req.body ?? {}),
    })
    const contentType = upstream.headers.get('content-type') || 'application/json'
    res.status(upstream.status)
    if (contentType.includes('text/event-stream')) {
      res.setHeader('Content-Type', 'text/event-stream')
      res.setHeader('Cache-Control', 'no-cache')
      res.setHeader('Connection', 'keep-alive')
      if (!upstream.body) return res.end()
      const reader = upstream.body.getReader()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        res.write(Buffer.from(value))
      }
      return res.end()
    }
    const data = await upstream.text()
    res.setHeader('Content-Type', contentType)
    return res.send(data)
  } catch {
    return res.status(502).json({ error: { message: 'Upstream API unavailable', type: 'server_error' } })
  }
}
