import { useEffect, useState } from 'react'

export type PublicBrand = {
  name: string
  slug: string
  siteUrl: string
  apiBaseUrl: string
  apiOrigin: string
  contactEmail: string
}

const FALLBACK: PublicBrand = {
  name: 'MsopAPI',
  slug: 'msopapi',
  siteUrl: typeof window !== 'undefined' ? window.location.origin : 'http://127.0.0.1:5173',
  apiBaseUrl: typeof window !== 'undefined' ? `${window.location.origin}/v1` : 'https://msopapi.vercel.app/v1',
  apiOrigin: typeof window !== 'undefined' ? window.location.origin : 'https://msopapi.vercel.app',
  contactEmail: 'info@msopapi.vercel.app',
}

let current: PublicBrand = FALLBACK
let inflight: Promise<PublicBrand> | null = null
const listeners = new Set<(brand: PublicBrand) => void>()

export function getBrand() {
  return current
}

export function siteName() {
  return current.name
}

export function brandSlug() {
  return current.slug
}

export function apiBase() {
  return current.apiBaseUrl
}

export function apiOrigin() {
  return current.apiOrigin
}

export function siteHost() {
  try {
    return new URL(current.siteUrl).host
  } catch {
    return typeof window !== 'undefined' ? window.location.host : 'localhost'
  }
}

export function applyDocumentBrand(brand: PublicBrand = current) {
  if (typeof document === 'undefined') return
  const suffix = document.title.includes('—') ? document.title.slice(document.title.indexOf('—')) : '— One API for every model'
  document.title = `${brand.name} ${suffix}`.replace(/\s+/g, ' ').trim()
  const site = document.querySelector('meta[property="og:site_name"]')
  if (site) site.setAttribute('content', brand.name)
}

export function loadBrand() {
  if (inflight) return inflight
  inflight = fetch('/api/public/brand')
    .then(async (res) => {
      if (!res.ok) throw new Error('brand unavailable')
      const data = (await res.json()) as Partial<PublicBrand>
      if (!data.name || !data.apiBaseUrl || !data.siteUrl) throw new Error('incomplete brand')
      current = {
        name: data.name,
        slug: data.slug || data.name.toLowerCase().replace(/[^a-z0-9]+/g, '') || 'gateway',
        siteUrl: data.siteUrl,
        apiBaseUrl: data.apiBaseUrl,
        apiOrigin: data.apiOrigin || data.apiBaseUrl.replace(/\/v1$/, ''),
        contactEmail: data.contactEmail || FALLBACK.contactEmail,
      }
      applyDocumentBrand(current)
      listeners.forEach((listener) => listener(current))
      return current
    })
    .catch(() => current)
    .finally(() => {
      inflight = null
    })
  return inflight
}

export function useBrand() {
  const [brand, setBrand] = useState(current)
  useEffect(() => {
    const listener = (next: PublicBrand) => setBrand(next)
    listeners.add(listener)
    void loadBrand()
    return () => {
      listeners.delete(listener)
    }
  }, [])
  return brand
}


