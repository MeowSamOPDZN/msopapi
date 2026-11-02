import { initializeApp, type FirebaseApp } from 'firebase/app'
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type Auth,
  type User,
} from 'firebase/auth'
import { getFirestore, type Firestore } from 'firebase/firestore'
import type { CustomerUser } from './userApi'

// Firebase config comes only from build-time env vars, never hardcoded.
// On Vercel these are VITE_FIREBASE_* project env vars. Locally, copy
// .env.example to .env and fill them in.
function env(key: string) {
  const value = (import.meta.env as Record<string, string | undefined>)[key]
  return typeof value === 'string' ? value.trim() : ''
}

const config = {
  apiKey: env('VITE_FIREBASE_API_KEY'),
  authDomain: env('VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: env('VITE_FIREBASE_PROJECT_ID'),
  storageBucket: env('VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: env('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: env('VITE_FIREBASE_APP_ID'),
  measurementId: env('VITE_FIREBASE_MEASUREMENT_ID') || undefined,
}

export const isFirebaseConfigured = Boolean(
  config.apiKey && config.authDomain && config.projectId && config.appId,
)

let app: FirebaseApp | null = null
let auth: Auth | null = null

export function getFirebaseAuth(): Auth | null {
  if (!isFirebaseConfigured) return null
  if (!auth) {
    app = initializeApp(config)
    auth = getAuth(app)
  }
  return auth
}

let db: Firestore | null = null

export function getFirestoreDb(): Firestore | null {
  if (!isFirebaseConfigured) return null
  if (!db) {
    const a = getFirebaseAuth()
    if (!a) return null
    db = getFirestore(a.app)
  }
  return db
}

export function firebaseUserToCustomerUser(user: User): CustomerUser {
  const email = user.email || ''
  return {
    id: user.uid,
    email,
    name: user.displayName || email.split('@')[0] || 'MsopAPI user',
    status: 'active',
    balanceTokens: 0,
    authMethod: 'firebase',
    loginEmail: email || null,
    hasPassword: false,
    googleLinked: user.providerData.some((p) => p.providerId === 'google.com'),
    telegramId: null,
    telegramUsername: null,
    telegramVerified: false,
    level: null,
  }
}

export async function firebaseSignInEmail(email: string, password: string) {
  const a = getFirebaseAuth()
  if (!a) throw new Error('Firebase auth is not configured')
  const cred = await signInWithEmailAndPassword(a, email, password)
  return firebaseUserToCustomerUser(cred.user)
}

export async function firebaseSignUpEmail(email: string, password: string) {
  const a = getFirebaseAuth()
  if (!a) throw new Error('Firebase auth is not configured')
  const cred = await createUserWithEmailAndPassword(a, email, password)
  return firebaseUserToCustomerUser(cred.user)
}

export async function firebaseSignInGoogle() {
  const a = getFirebaseAuth()
  if (!a) throw new Error('Firebase auth is not configured')
  const cred = await signInWithPopup(a, new GoogleAuthProvider())
  return firebaseUserToCustomerUser(cred.user)
}

export async function firebaseSignOut() {
  const a = getFirebaseAuth()
  if (!a) return
  await signOut(a)
}

export function onFirebaseUserChange(
  callback: (user: CustomerUser | null) => void,
) {
  const a = getFirebaseAuth()
  if (!a) {
    callback(null)
    return () => undefined
  }
  return onAuthStateChanged(a, (user) => {
    callback(user ? firebaseUserToCustomerUser(user) : null)
  })
}

export function firebaseAuthErrorMessage(raw: unknown) {
  const code =
    raw && typeof raw === 'object' && 'code' in raw
      ? String((raw as { code?: unknown }).code)
      : ''
  if (
    code === 'auth/invalid-credential' ||
    code === 'auth/user-not-found' ||
    code === 'auth/wrong-password'
  ) {
    return 'Incorrect email or password.'
  }
  if (code === 'auth/email-already-in-use') {
    return 'An account with this email already exists. Try signing in.'
  }
  if (code === 'auth/weak-password') {
    return 'Password must be at least 6 characters.'
  }
  if (code === 'auth/invalid-email') {
    return 'Enter a valid email address.'
  }
  if (code === 'auth/operation-not-allowed') {
    return 'Email sign-in is not enabled in Firebase yet.'
  }
  if (code === 'auth/unauthorized-domain') {
    return 'This domain is not authorized in Firebase yet.'
  }
  if (code === 'auth/popup-closed-by-user') {
    return 'Google sign-in was closed.'
  }
  if (code === 'auth/popup-blocked') {
    return 'The Google sign-in popup was blocked. Allow popups and try again.'
  }
  return 'Sign-in failed. Please try again.'
}
