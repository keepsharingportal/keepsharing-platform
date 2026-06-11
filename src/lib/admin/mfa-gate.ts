// Server-side AAL2 enforcement for /api/admin/* routes that bypass the
// layout. Use on any route that mutates sensitive data — ad placements,
// users, integrations (credential setters), advertiser reports.
//
// Pattern:
//   import { requireAal2 } from '@/lib/admin/mfa-gate'
//   export async function POST(req: NextRequest) {
//     const gate = await requireAal2()
//     if (!gate.ok) return gate.response                  // 401 with reason
//     // ... proceed
//   }
//
// Failure modes:
//   - No session              → 401 with auth_required
//   - Enrolled but AAL1       → 401 with mfa_required (client redirects)
//   - Not enrolled, requires  → 401 with mfa_enroll_required
//   - All good (AAL2 or user  → ok: true
//     not required to MFA)
//
// Note: we DON'T fail-open here. API routes that mutate data must have
// hard guarantees; the layout's "fail-open on transient error" is for UX
// only.

import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAdminContext } from '@/lib/admin/auth'

type Failure = { ok: false; response: NextResponse }
type Success = { ok: true }

interface SessionInfo {
  aal: 'aal1' | 'aal2' | null
}

async function readSession(): Promise<SessionInfo> {
  try {
    const supabase = await createServerClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) return { aal: null }
    const parts = session.access_token.split('.')
    if (parts.length < 2) return { aal: null }
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')) as { aal?: string }
    return {
      aal: payload.aal === 'aal2' ? 'aal2' : payload.aal === 'aal1' ? 'aal1' : null,
    }
  } catch {
    return { aal: null }
  }
}

export async function requireAal2(): Promise<Failure | Success> {
  const ctx = await getAdminContext()
  if (!ctx) {
    return { ok: false, response: NextResponse.json({ error: 'auth_required' }, { status: 401 }) }
  }
  // If the user isn't required to MFA AND hasn't enrolled, they pass
  // (a future migration could force MFA on everyone; that's the
  // requiresMfa flag's job).
  if (!ctx.requiresMfa && !ctx.mfaEnabledAt) return { ok: true }

  // Look up the user's verified factors via the admin API.
  let hasVerifiedFactor = false
  try {
    const sr = createAdminClient()
    const { data } = await sr.auth.admin.mfa.listFactors({ userId: ctx.userId })
    hasVerifiedFactor = (data?.factors ?? []).some(f => f.status === 'verified')
  } catch {
    // If we can't read factors, fail CLOSED on sensitive routes.
    return { ok: false, response: NextResponse.json({ error: 'mfa_status_unreadable' }, { status: 401 }) }
  }

  if (!hasVerifiedFactor) {
    if (ctx.requiresMfa) {
      return { ok: false, response: NextResponse.json({ error: 'mfa_enroll_required' }, { status: 401 }) }
    }
    // User isn't required + isn't enrolled. Pass.
    return { ok: true }
  }

  // User has at least one verified factor. Require AAL2 on the session.
  const { aal } = await readSession()
  if (aal !== 'aal2') {
    return { ok: false, response: NextResponse.json({ error: 'mfa_required' }, { status: 401 }) }
  }
  return { ok: true }
}
