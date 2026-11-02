// Firebase backend helpers for MsopAPI serverless functions.
// ID tokens are verified against Google's public keys, no service
// account is needed. Firestore is called with the user's own token,
// so Firestore rules still enforce one-account-only access.
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

export async function verifyIdToken(token) {
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

export async function authUser(req, res) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim()
  const user = await verifyIdToken(token)
  if (!user) {
    res.status(401).json({ error: 'Not signed in' })
    return null
  }
  return user
}

export function firestoreBase() {
  return `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`
}

export function docFields(doc) {
  const out = {}
  const fields = doc.fields || {}
  for (const [k, v] of Object.entries(fields)) {
    if (v.stringValue !== undefined) out[k] = v.stringValue
    else if (v.integerValue !== undefined) out[k] = Number(v.integerValue)
    else if (v.booleanValue !== undefined) out[k] = v.booleanValue
    else if (v.doubleValue !== undefined) out[k] = v.doubleValue
  }
  return out
}

export function docId(doc) {
  return doc.name.split('/').pop()
}

export function toApiKey(doc) {
  const f = docFields(doc)
  return {
    id: docId(doc),
    name: f.name || 'Untitled key',
    prefix: f.prefix || '',
    secret: f.secret || null,
    spendLimitTokens: null,
    spentTokens: 0,
    status: f.status || 'active',
    createdAt: f.createdAt || new Date().toISOString(),
    lastUsedAt: null,
  }
}

export async function listUserKeys(uid, token) {
  const res = await fetch(`${firestoreBase()}/users/${uid}/apiKeys`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) return []
  const data = await res.json()
  return (data.documents || []).map(toApiKey)
}

export function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
}

export function freeTier() {
  return { allowed: true, mode: 'free', unlimited: false, limit: 10000, used: 0, remaining: 10000, planKey: null, planLabel: 'Free', expiresAt: null, resetsAt: new Date(Date.now() + 86400_000).toISOString() }
}
