import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
} from 'firebase/firestore'
import type { CustomerApiKey } from './userApi'
import { getFirebaseAuth, getFirestoreDb } from './firebase'

// API keys saved in Firestore, under the signed-in account only:
// users/{uid}/apiKeys/{keyId}. The firestore.rules file enforces the
// same boundary server-side, so a client can never open another
// account's keys even if it guesses the document path.
function currentUid() {
  const auth = getFirebaseAuth()
  if (!auth?.currentUser) throw new Error('Sign in first to manage API keys')
  return auth.currentUser.uid
}

export async function listFirestoreKeys(): Promise<CustomerApiKey[]> {
  const db = getFirestoreDb()
  if (!db) throw new Error('Firebase is not configured')
  const uid = currentUid()
  const snap = await getDocs(
    query(collection(db, 'users', uid, 'apiKeys'), where('ownerUid', '==', uid)),
  )
  return snap.docs.map((d) => {
    const data = d.data() as Record<string, unknown>
    return {
      id: d.id,
      name: String(data.name || 'Untitled key'),
      prefix: String(data.prefix || ''),
      secret: typeof data.secret === 'string' ? data.secret : null,
      spendLimitTokens: null,
      spentTokens: 0,
      status: 'active',
      createdAt: String(data.createdAt || new Date().toISOString()),
      lastUsedAt: null,
    } satisfies CustomerApiKey
  })
}

export async function saveFirestoreKey(
  name: string,
  secret: string,
): Promise<CustomerApiKey> {
  const db = getFirestoreDb()
  if (!db) throw new Error('Firebase is not configured')
  const uid = currentUid()
  const trimmed = secret.trim()
  if (!trimmed) throw new Error('Paste the API key secret to save it')
  const ref = await addDoc(collection(db, 'users', uid, 'apiKeys'), {
    name: name.trim() || 'Untitled key',
    prefix: trimmed.slice(0, 8),
    secret: trimmed,
    ownerUid: uid,
    status: 'active',
    createdAt: new Date().toISOString(),
  })
  return {
    id: ref.id,
    name: name.trim() || 'Untitled key',
    prefix: trimmed.slice(0, 8),
    secret: trimmed,
    spendLimitTokens: null,
    spentTokens: 0,
    status: 'active',
    createdAt: new Date().toISOString(),
    lastUsedAt: null,
  }
}

export async function deleteFirestoreKey(keyId: string) {
  const db = getFirestoreDb()
  if (!db) throw new Error('Firebase is not configured')
  const uid = currentUid()
  await deleteDoc(doc(db, 'users', uid, 'apiKeys', keyId))
}
