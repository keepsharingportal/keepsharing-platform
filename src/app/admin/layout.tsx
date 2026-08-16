import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/Sidebar'
import { AdminHeader } from '@/components/admin/AdminHeader'
import { MfaNudgeBanner } from '@/components/admin/MfaNudgeBanner'
import { getAdminContext } from '@/lib/admin/auth'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { dmMono, dmSans } from '@/lib/fonts'


/** Read the AAL claim from the current session's JWT. Returns 'aal1' for
 *  password/magic-link-only sessions, 'aal2' once the user has cleared a
 *  TOTP challenge in this browser session. */
async function readSessionAal(): Promise<'aal1' | 'aal2' | null> {
  try {
    const supabase = await createServerClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) return null
    // Decode the JWT payload (middle segment); no signature check needed
    // because the SDK already validated the session above.
    const parts = session.access_token.split('.')
    if (parts.length < 2) return null
    const payloadJson = Buffer.from(parts[1], 'base64url').toString('utf8')
    const payload = JSON.parse(payloadJson) as { aal?: string }
    return payload.aal === 'aal2' ? 'aal2' : payload.aal === 'aal1' ? 'aal1' : null
  } catch {
    return null
  }
}

// Match the Distribution Portal (portal.css) so admin pages share a
// consistent typographic feel. Only loaded on admin routes; the public
// site keeps Geist Sans.

export const metadata: Metadata = {
  title: 'KeepSharing Admin',
  description: 'KeepSharing LLC — Internal Operations Platform',
}

// Paths the MFA enforcement gate is allowed to NOT bounce away from. The user
// needs to be able to reach the Security page to enroll, the login page to
// recover, the per-session TOTP challenge to elevate AAL1→AAL2, and a few
// utility endpoints to function at all.
const MFA_GATE_EXEMPT_PATHS = [
  '/admin/login',
  '/admin/logout',
  '/admin/settings/security',
  '/admin/auth/mfa-challenge',
  '/admin/auth/recovery',
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // The proxy forwards the current path so we can branch chrome — /admin/login
  // must render bare so an unauthenticated visitor isn't staring at admin
  // navigation they can't use.
  const pathname = (await headers()).get('x-admin-pathname') ?? ''
  if (pathname.startsWith('/admin/login')) {
    return <>{children}</>
  }

  // ── 2FA enforcement gate ────────────────────────────────────────────────
  // If the user is required to have 2FA and has not enrolled, bounce them
  // to /admin/settings/security where they can complete enrollment. The
  // page itself is in the exempt list so they aren't redirected in a loop.
  //
  // Server-side self-heal (important): when the stamp is missing, we
  // double-check Supabase Auth for an existing verified TOTP factor before
  // bouncing. Users who enrolled before migration 140 introduced the stamp
  // have a verified factor in Supabase Auth but no admin_users.mfa_enabled_at.
  // We backfill the stamp here so they're never bounced again — no need to
  // rely on the client-side self-heal on /settings/security.
  const ctx = await getAdminContext()
  let stampedNow = false
  if (ctx && ctx.requiresMfa && !ctx.mfaEnabledAt) {
    try {
      const supabase = createAdminClient()
      const { data } = await supabase.auth.admin.mfa.listFactors({ userId: ctx.userId })
      const hasVerified = (data?.factors ?? []).some(f => f.status === 'verified')
      if (hasVerified) {
        await supabase
          .from('admin_users')
          .update({ mfa_enabled_at: new Date().toISOString() })
          .eq('id', ctx.adminId)
        stampedNow = true
      }
    } catch (e) {
      // Don't let an MFA-list failure black-hole the user from admin —
      // log and fall through to the regular gate logic.
      console.error('[mfa-gate] self-heal listFactors failed', e)
    }
  }

  if (
    ctx &&
    ctx.requiresMfa &&
    !ctx.mfaEnabledAt &&
    !stampedNow &&
    !MFA_GATE_EXEMPT_PATHS.some(p => pathname.startsWith(p))
  ) {
    redirect('/admin/settings/security?gate=required')
  }

  // ── AAL2 enforcement gate ──────────────────────────────────────────────
  // The MFA enrollment gate above only checks whether the user IS enrolled.
  // That's not enough: a stolen email+password could pass that gate as long
  // as the legitimate user had enrolled at some point. Real protection needs
  // to verify THIS session has actually cleared the TOTP challenge — i.e.
  // current AAL is 'aal2'. If it's 'aal1' and the user has verified factors,
  // send them through /admin/auth/mfa-challenge to elevate.
  //
  // We skip this check for users who haven't enrolled yet (they hit the
  // enrollment gate above instead) and for users on the exempt paths.
  if (
    ctx &&
    ctx.mfaEnabledAt &&                                   // user IS enrolled
    !MFA_GATE_EXEMPT_PATHS.some(p => pathname.startsWith(p))
  ) {
    try {
      const supabase = createAdminClient()
      const { data: factorsData } = await supabase.auth.admin.mfa.listFactors({ userId: ctx.userId })
      const hasVerifiedFactor = (factorsData?.factors ?? []).some(f => f.status === 'verified')
      if (hasVerifiedFactor) {
        // Read the AAL of the user's session by looking at the access token.
        // getAdminContext() already validated the session; we just need to
        // peek at the AAL claim on the JWT.
        const sessionAal = await readSessionAal()
        if (sessionAal !== 'aal2') {
          const nextParam = pathname && pathname !== '/admin'
            ? `?next=${encodeURIComponent(pathname)}`
            : ''
          redirect(`/admin/auth/mfa-challenge${nextParam}`)
        }
      }
    } catch (e) {
      // Fail-OPEN on transient errors — the enrollment gate above already
      // bounced unenrolled users, and the per-route AAL2 helpers on
      // mutations will catch sensitive actions. Hard-failing the whole
      // layout on a transient Supabase Auth read would lock everyone out.
      console.error('[mfa-gate] AAL2 check failed', e)
    }
  }

  return (
    <div className={`${dmSans.variable} ${dmMono.variable} flex h-full overflow-hidden`}>
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden bg-portal-bg font-[family-name:var(--font-dm-sans)] text-portal-text">
        <AdminHeader />
        <MfaNudgeBanner />
        {children}
      </main>
    </div>
  )
}
