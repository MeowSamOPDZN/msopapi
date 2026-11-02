// MsopAPI Firebase backend, one catch-all function for /api/user/*.
// Vercel Hobby caps serverless functions, so all user endpoints live
// here instead of one file per endpoint. ID tokens are verified against
// Google's public keys, and Firestore is called with the user's own
// token, so Firestore rules still enforce one-account-only access.
import crypto from 'node:crypto'

const PROJECT_ID = process.env.VITE_FIREBASE_PROJECT_ID || 'msopapii'
const JWK_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'
let cachedKeys = null
let cachedAt = 0

function b64url(input) {
  return Buffer.from(input.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
}
async function getKeys() {
  if (cachedKeys && Date.now() - cachedAt < 3600_000) return cachedKeys
  const res = await fetch(JWK_URL)
  const data = await res.json()
  cachedKeys = data.keys || []
  cachedAt = Date.now()
  return cachedKeys
}
async function verifyIdToken(token) {
  if (!token) return null
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const header = JSON.parse(b64url(parts[0]))
    const payload = JSON.parse(b64url(parts[1]))
    if (payload.aud !== PROJECT_ID) return null
    if (payload.iss !== `https://securetoken.google.com/${PROJECT_ID}`) return null
    if (payload.exp * 1000 < Date.now()) return null
    const keys = await getKeys()
    const jwk = keys.find((k) => k.kid === header.kid)
    if (!jwk) return null
    const key = crypto.createPublicKey({ key: jwk, format: 'jwk' })
    const ok = crypto.createVerify('RSA-SHA256').update(`${parts[0]}.${parts[1]}`).verify(key, parts[2], 'base64url')
    if (!ok) return null
    return { uid: payload.sub, email: payload.email || '', name: payload.name || '', exp: payload.exp }
  } catch {
    return null
  }
}
function firestoreBase() {
  return `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`
}
function docFields(doc) {
  const out = {}
  for (const [k, v] of Object.entries(doc.fields || {})) {
    if (v.stringValue !== undefined) out[k] = v.stringValue
    else if (v.integerValue !== undefined) out[k] = Number(v.integerValue)
    else if (v.booleanValue !== undefined) out[k] = v.booleanValue
    else if (v.doubleValue !== undefined) out[k] = v.doubleValue
  }
  return out
}
function toApiKey(doc) {
  const f = docFields(doc)
  return { id: doc.name.split('/').pop(), name: f.name || 'Untitled key', prefix: f.prefix || '', secret: f.secret || null, spendLimitTokens: null, spentTokens: 0, status: f.status || 'active', createdAt: f.createdAt || new Date().toISOString(), lastUsedAt: null }
}
async function listUserKeys(uid, token) {
  const res = await fetch(`${firestoreBase()}/users/${uid}/apiKeys`, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) return []
  const data = await res.json()
  return (data.documents || []).map(toApiKey)
}
function freeTier() {
  return { allowed: true, mode: 'free', unlimited: false, limit: 10000, used: 0, remaining: 10000, planKey: null, planLabel: 'Free', expiresAt: null, resetsAt: new Date(Date.now() + 86400_000).toISOString() }
}
function userJson(user) {
  return { id: user.uid, email: user.email, name: user.name || (user.email ? user.email.split('@')[0] : 'MsopAPI user'), status: 'active', balanceTokens: 0, authMethod: 'firebase', loginEmail: user.email || null, hasPassword: false, googleLinked: false, telegramId: null, telegramUsername: null, telegramVerified: false, level: null }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  if (req.method === 'OPTIONS') return res.status(204).end()
  const slug = Array.isArray(req.query.slug) ? req.query.slug : [req.query.slug].filter(Boolean)
  const path = slug.join('/')

  if (path === 'auth/challenge') {
    return res.status(200).json({ enabled: true, siteKey: null, emailConfigured: true, googleEnabled: true })
  }
  if (path === 'logout') {
    return res.status(200).json({ ok: true })
  }

  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim()
  const user = await verifyIdToken(token)
  if (!user) return res.status(401).json({ error: 'Not signed in' })

  if (path === 'me') {
    return res.status(200).json({ user: userJson(user), expiresAt: new Date(user.exp * 1000).toISOString() })
  }
  if (path === 'keys' && req.method === 'GET') {
    return res.status(200).json({ keys: await listUserKeys(user.uid, token) })
  }
  if (path === 'keys' && req.method === 'POST') {
    const name = (req.body?.name || 'Untitled key').toString().trim() || 'Untitled key'
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    const bytes = crypto.randomBytes(48)
    const secret = `sk-msop-${Array.from(bytes, (b) => chars[b % chars.length]).join('')}`
    const createdAt = new Date().toISOString()
    const createRes = await fetch(`${firestoreBase()}/users/${user.uid}/apiKeys`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: { name: { stringValue: name }, prefix: { stringValue: secret.slice(0, 8) }, secret: { stringValue: secret }, ownerUid: { stringValue: user.uid }, status: { stringValue: 'active' }, createdAt: { stringValue: createdAt } } }),
    })
    if (!createRes.ok) return res.status(502).json({ error: 'Could not create key' })
    const doc = await createRes.json()
    return res.status(200).json({ key: toApiKey(doc), secret })
  }
  if (path.startsWith('keys/') && path.endsWith('/revoke') && req.method === 'POST') {
    const id = slug[1]
    await fetch(`${firestoreBase()}/users/${user.uid}/apiKeys/${encodeURIComponent(id)}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    return res.status(200).json({ ok: true })
  }
  if (path === 'stats') {
    const keys = await listUserKeys(user.uid, token)
    return res.status(200).json({ spendMonthTokens: 0, requestsMonth: 0, requestsTotal: 0, activeKeys: keys.length, hasTopup: false, telegramVerified: false, freeTier: freeTier(), weekly: [], recent: [] })
  }
  if (path === 'models') {
    try {
      const upstream = await fetch('https://apinex.bond/api/public/models', { headers: { accept: 'application/json' } })
      const data = await upstream.json()
      const models = (data.models || []).map((m) => ({ id: m.id, provider: m.provider, name: m.name, contextWindow: m.contextWindow || '', weight: m.weight || 1, dollarsPer1M: m.dollarsPer1M || 0, inputDollarsPer1M: m.dollarsPer1M || 0, outputDollarsPer1M: m.outputDollarsPer1M || 0, eventDiscountPct: null, tags: m.tags || [], health: m.health === 'live' ? 'live' : 'no_data' }))
      return res.status(200).json({ models })
    } catch {
      return res.status(502).json({ error: 'Model catalog unavailable' })
    }
  }
  if (path === 'usage') {
    return res.status(200).json({ total: 0, limit: 50, offset: 0, events: [], usage: [] })
  }
  if (path === 'billing/config') {
    return res.status(200).json({ minTopupCents: 100, presets: [500, 1000, 2000, 5000], configured: false, currency: 'USD', method: 'none', provider: null, tokensPerUsd: 1000000, promoBoost: null, card: { enabled: false } })
  }
  if (path === 'billing/payments') {
    return res.status(200).json({ payments: [] })
  }
  if (path === 'billing/topup') {
    return res.status(400).json({ error: 'Top-ups are not available yet in the Firebase backend' })
  }
  if (path === 'subscriptions') {
    return res.status(200).json({ access: freeTier(), subscription: null, freeDailyTokens: 10000, resetsAt: new Date(Date.now() + 86400_000).toISOString(), rpmFree: 15, rpmSubscription: 30, promoBoost: null, plans: [], offer: null, payMethods: [], solanaEnabled: false, cardEnabled: false, history: [] })
  }
  if (path === 'rpm') {
    return res.status(200).json({ rpm: 15, planKey: 'free', label: 'Free', source: 'free', expiresAt: null, termLabel: null, supportUrl: '', cryptoEnabled: false, grantRpm: null, grantExpiresAt: null, plans: [{ key: 'free', rpm: 15, priceCents: 0, priceUsd: 0, enabled: true, custom: false, label: 'Free' }] })
  }
  if (path === 'rewards') {
    return res.status(200).json({ referral: { enabled: false, code: '', invited: 0, rewarded: 0, earnedUsd: 0, referredByCode: null, hasReferrer: false, rewardGranted: false, minPurchaseDollars: 0, referrerRewardUsd: 0, refereeRewardUsd: 0 } })
  }
  if (path === 'level/ack') {
    return res.status(200).json({ level: null })
  }
  if (path === 'alerts/low-balance') {
    return res.status(200).json({ enabled: false, levels: [], budgetBaseTokens: 10000, balanceTokens: 0, spentPercent: 0, notifiedLevel: 0, telegramLinked: false, canReceive: false })
  }
  if (path === 'promo/redeem') {
    return res.status(400).json({ error: 'Promos are not available yet in the Firebase backend' })
  }
  return res.status(404).json({ error: 'Not found' })
}
