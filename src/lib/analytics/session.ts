// Lightweight client-side session helpers for first-party analytics.
//
//   getSessionId()       — opaque per-browser ID stored in localStorage.
//                          Rotates after 30 days of inactivity. Used to
//                          dedupe impressions and views.
//   getStoredAttribution() — reads first-touch UTM cookie set by the
//                            middleware on the user's first visit.
//   attachAttribution(body) — merges first-touch UTM into any POST body,
//                             for lead/inquiry forms.
//
// Designed to be safe on server (no `window` reference at module load).

const SESSION_KEY      = 'rrp_session_id'
const SESSION_TTL_MS   = 30 * 24 * 60 * 60 * 1000  // 30 days
const FIRST_TOUCH_NAME = 'rrp_first_touch'

function randomId() {
  // crypto.randomUUID is supported in all modern browsers
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export function getSessionId(): string {
  if (typeof window === 'undefined') return ''
  try {
    const raw  = window.localStorage.getItem(SESSION_KEY)
    const now  = Date.now()
    if (raw) {
      const parts = raw.split('|')
      const id    = parts[0]
      const seen  = Number(parts[1] || 0)
      if (id && now - seen < SESSION_TTL_MS) {
        // Touch the timestamp so an active visitor's session stays stable.
        window.localStorage.setItem(SESSION_KEY, `${id}|${now}`)
        return id
      }
    }
    const fresh = randomId()
    window.localStorage.setItem(SESSION_KEY, `${fresh}|${now}`)
    return fresh
  } catch {
    // localStorage can throw in private windows / quota-exceeded.
    return ''
  }
}

export interface Attribution {
  utm_source?:   string
  utm_medium?:   string
  utm_campaign?: string
  referrer?:     string
  landing_page?: string
}

export function getStoredAttribution(): Attribution {
  if (typeof document === 'undefined') return {}
  const cookies = document.cookie.split(';').map(s => s.trim())
  const raw     = cookies.find(c => c.startsWith(`${FIRST_TOUCH_NAME}=`))
  if (!raw) return {}
  try {
    return JSON.parse(decodeURIComponent(raw.slice(FIRST_TOUCH_NAME.length + 1))) as Attribution
  } catch {
    return {}
  }
}

export function attachAttribution<T extends Record<string, unknown>>(body: T): T & Attribution {
  return { ...getStoredAttribution(), ...body }
}

// Strip a URL down to its hostname for compact storage. "https://m.facebook.com/foo?x=1"
// becomes "m.facebook.com" — enough to attribute, not enough to leak query strings.
export function refererHost(): string | null {
  if (typeof document === 'undefined' || !document.referrer) return null
  try {
    const u = new URL(document.referrer)
    if (u.hostname === window.location.hostname) return null
    return u.hostname
  } catch {
    return null
  }
}
