/**
 * assistantSession.js — Turnstile → short-lived session for the assistant proxy.
 *
 * Why this exists: this app is a public static site, so it cannot hold a
 * credential. Anything baked into the bundle is readable by anyone who views
 * source (see the API-key incident this codebase already fixed). Instead the
 * browser proves it is a real client via Cloudflare Turnstile, and exchanges
 * that proof at POST /session for a signed, short-lived token bound to the
 * caller's IP and origin. The signing secret never leaves the worker.
 *
 * The site key below is PUBLIC by design — Turnstile site keys are meant to
 * ship in the page. The SECRET key is a worker secret and must never appear
 * here, in .env, or in any client file.
 *
 * Degradation: if Turnstile cannot load, or the worker has sessions disabled,
 * every function here resolves to null and the caller falls back to the offline
 * handout/topics answers. A blocked challenge must never hard-fail the app.
 */

const TURNSTILE_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

// Non-secret. Overridable per build/environment.
const CONFIGURED_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY
export const TURNSTILE_SITE_KEY = String(
  CONFIGURED_SITE_KEY === undefined ? '0x4AAAAAAERBEmrUHuTkPutG' : CONFIGURED_SITE_KEY,
).trim()

/** Refresh this many seconds before actual expiry, so a call never races it. */
const RENEW_MARGIN_SECONDS = 60

let cached = null          // { token, expiresAt }
let inFlight = null        // Promise, so concurrent callers share one exchange
let scriptPromise = null

function isBrowser() {
  return typeof window !== 'undefined' && typeof document !== 'undefined'
}

/** Load the Turnstile script once. Resolves false if it cannot load. */
function loadTurnstile() {
  if (!isBrowser() || !TURNSTILE_SITE_KEY) return Promise.resolve(false)
  if (window.turnstile) return Promise.resolve(true)
  if (scriptPromise) return scriptPromise

  scriptPromise = new Promise((resolve) => {
    const existing = document.querySelector(`script[src^="${TURNSTILE_SRC.split('?')[0]}"]`)
    if (existing) {
      existing.addEventListener('load', () => resolve(Boolean(window.turnstile)))
      existing.addEventListener('error', () => resolve(false))
      return
    }
    const s = document.createElement('script')
    s.src = TURNSTILE_SRC
    s.async = true
    s.defer = true
    s.onload = () => resolve(Boolean(window.turnstile))
    s.onerror = () => resolve(false)
    document.head.appendChild(s)
  })
  return scriptPromise
}

/** Run an invisible Turnstile challenge. Resolves a token, or null. */
function getTurnstileToken() {
  return new Promise((resolve) => {
    if (!window.turnstile) return resolve(null)

    let settled = false
    const finish = (v) => { if (!settled) { settled = true; resolve(v) } }

    // Never hang the assistant on a challenge that stalls.
    const timer = setTimeout(() => finish(null), 15000)

    const host = document.createElement('div')
    host.style.display = 'none'
    document.body.appendChild(host)

    const cleanup = () => {
      clearTimeout(timer)
      try { host.remove() } catch (_) {}
    }

    try {
      window.turnstile.render(host, {
        sitekey: TURNSTILE_SITE_KEY,
        size: 'invisible',
        callback: (token) => { cleanup(); finish(token || null) },
        'error-callback': () => { cleanup(); finish(null) },
        'timeout-callback': () => { cleanup(); finish(null) },
      })
    } catch (_) {
      cleanup()
      finish(null)
    }
  })
}

function stillValid(entry) {
  return Boolean(entry?.token) && entry.expiresAt - RENEW_MARGIN_SECONDS * 1000 > Date.now()
}

/**
 * Get a valid session token for the assistant proxy.
 *
 * @param {string} sessionUrl absolute URL of the worker's /session route
 * @param {{force?: boolean}} [opts] force a fresh exchange (e.g. after a 401)
 * @returns {Promise<string|null>} token, or null when unavailable
 */
export async function getAssistantSession(sessionUrl, opts = {}) {
  if (!isBrowser() || !sessionUrl) return null
  if (!opts.force && stillValid(cached)) return cached.token
  if (inFlight) return inFlight

  inFlight = (async () => {
    try {
      const loaded = await loadTurnstile()
      if (!loaded) return null

      const turnstileToken = await getTurnstileToken()
      if (!turnstileToken) return null

      const res = await fetch(sessionUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: turnstileToken }),
      })
      if (!res.ok) return null

      const data = await res.json().catch(() => null)
      if (!data?.session) return null

      const ttl = Number(data.expiresIn) > 0 ? Number(data.expiresIn) : 1800
      cached = { token: data.session, expiresAt: Date.now() + ttl * 1000 }
      return cached.token
    } catch (_) {
      return null
    } finally {
      inFlight = null
    }
  })()

  return inFlight
}

/** Drop the cached session — call after the proxy rejects one as expired. */
export function clearAssistantSession() {
  cached = null
}
