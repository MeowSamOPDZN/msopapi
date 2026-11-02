// MsopAPI /v1/balance on Vercel, proxied to APInex server-side.
// Provider account details are stripped, only the balance shape is returned.
export default async function handler(req, res) {
  const key = process.env.APINEX_API_KEY
  if (!key) return res.status(502).json({ error: { message: 'Upstream API not configured', type: 'server_error' } })
  try {
    const upstream = await fetch('https://api.apinex.bond/v1/balance', {
      headers: { Authorization: `Bearer ${key}`, accept: 'application/json' },
    })
    const data = await upstream.json().catch(() => ({}))
    res.status(upstream.status).json({
      object: 'balance',
      balance_usd: data.balance_usd ?? 0,
      reserved_usd: data.reserved_usd ?? 0,
      rpm: data.rpm ?? null,
      rpm_plan: data.rpm_plan ?? null,
    })
  } catch {
    res.status(502).json({ error: { message: 'Upstream API unavailable', type: 'server_error' } })
  }
}
