// Postgres-backed rate limiter for public endpoints.
//
//   const allowed = await checkRateLimit({ scope: 'school_bits.track', req, max: 60 })
//   if (!allowed) return new NextResponse(null, { status: 204 })
//
// 60/min is the default per-IP-per-scope cap. Adjust per endpoint. We
// silently 204 over-limit requests — never echo "rate limited" to a
// potential attacker probing the surface.
//
// Falls open on DB error: if the rate-limit check itself fails, we ALLOW
// the request through. Tracking endpoints are non-critical writes; a
// transient Supabase outage shouldn't black-hole real analytics.

import type { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

interface CheckOpts {
  /** Logical bucket — typically '<entity>.<verb>' like 'school_bits.track'. */
  scope: string
  /** The incoming request — we pull the IP from headers. */
  req:   NextRequest | Request
  /** Max events allowed per IP per minute for this scope. Default 60. */
  max?:  number
}

function ipFrom(req: NextRequest | Request): string {
  const h = req.headers
  const fwd = h.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim()
  return h.get('x-real-ip') ?? 'unknown'
}

function minuteBucket(): string {
  // Minute-resolution. Combine with scope+ip in the key so each (scope,ip)
  // gets its own counter that resets every minute.
  const d = new Date()
  return d.toISOString().slice(0, 16)  // 'YYYY-MM-DDTHH:MM'
}

export async function checkRateLimit({ scope, req, max = 60 }: CheckOpts): Promise<boolean> {
  try {
    const supabase = createAdminClient()
    const key = `${scope}:${ipFrom(req)}:${minuteBucket()}`
    const { data, error } = await supabase.rpc('bump_rate_limit', { p_key: key, p_max: max })
    if (error) {
      // Fail open — don't break analytics over a transient DB hiccup.
      console.warn('[rate-limit] rpc failed, allowing', { scope, error: error.message })
      return true
    }
    return data === true
  } catch (e) {
    console.warn('[rate-limit] unexpected, allowing', { scope, error: e })
    return true
  }
}
