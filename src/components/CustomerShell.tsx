import { useEffect, useMemo, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { CustomerProvider } from '../auth/CustomerContext'
import { userApi, type CustomerUser } from '../auth/userApi'
import {
  firebaseSignOut,
  isFirebaseConfigured,
  onFirebaseUserChange,
} from '../auth/firebase'
import { Layout } from './Layout'
import { PublicChrome } from './PublicChrome'

/** Paths that guests may open without login (SEO + pricing). */
const PUBLIC_APP_PATHS = new Set(['/models', '/status'])

type Actions = { logout: () => Promise<void>; refresh: () => Promise<void> }

/**
 * Single shell for the whole customer app so sidebar Layout does not remount
 * when switching Overview ↔ Models ↔ Billing, etc.
 *
 * - logged in → Layout (always)
 * - guest on /models → PublicChrome
 * - guest elsewhere → /login
 */
export function CustomerShell({
  loginPath = '/login',
}: {
  loginPath?: string
}) {
  const location = useLocation()
  const [user, setUser] = useState<CustomerUser | null | undefined>(undefined)

  useEffect(() => {
    let cancelled = false
    let firebaseUnsub: (() => void) | undefined
    userApi
      .me()
      .then((data) => {
        if (!cancelled) setUser(data.user ?? null)
      })
      .catch(() => {
        // No gateway backend on Vercel yet: fall back to Firebase auth.
        if (isFirebaseConfigured) {
          firebaseUnsub = onFirebaseUserChange((fbUser) => {
            if (!cancelled) setUser(fbUser)
          })
        } else if (!cancelled) {
          setUser(null)
        }
      })
    return () => {
      cancelled = true
      firebaseUnsub?.()
    }
  }, [])

  const actions: Actions = useMemo(
    () => ({
      logout: async () => {
        try {
          await firebaseSignOut()
        } catch {
          // Firebase sign-out is best effort here.
        }
        try {
          await userApi.logout()
        } catch {
          // Local state still clears below.
        }
        setUser(null)
        window.location.href = '/'
      },
      refresh: async (patchUser?: CustomerUser) => {
        if (patchUser) {
          setUser(patchUser)
          return
        }
        try {
          const next = await userApi.me()
          setUser(next.user ?? null)
        } catch {
          // Keep a Firebase session alive when the backend is absent.
          if (!user?.authMethod || user.authMethod !== 'firebase') setUser(null)
        }
      },
    }),
    [],
  )

  const providerValue = useMemo(
    () => (user ? { user, ...actions } : null),
    [user, actions],
  )

  if (user === undefined) {
    return <div className="admin-loading" style={{ minHeight: '40vh' }}>Loading…</div>
  }

  const path = location.pathname.replace(/\/$/, '') || '/'
  const isPublicPath = PUBLIC_APP_PATHS.has(path)

  if (!user || !providerValue) {
    if (isPublicPath) {
      return (
        <PublicChrome newTab>
          <Outlet />
        </PublicChrome>
      )
    }
    return <Navigate to={loginPath} replace state={{ from: location }} />
  }

  return (
    <CustomerProvider value={providerValue}>
      <Layout />
    </CustomerProvider>
  )
}
