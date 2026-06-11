// ── /admin/auth/mfa-challenge ───────────────────────────────────────────────
// Per-session TOTP challenge. After a successful email+password (or magic
// link, or Google OAuth) sign-in, if the user has verified MFA factors,
// the session is at AAL1 — they MUST clear this page (which elevates to
// AAL2) before reaching anything in /admin.
//
// Without this page, the layout gate previously only checked
// `mfa_enabled_at` (a denormalized "is this user enrolled?" stamp), which
// is a weaker check than "did this session actually verify". A stolen
// password + no TOTP would have passed the layout gate. That's now fixed:
// AAL1+enrolled users are redirected here, and unenrolled users are sent
// to /admin/settings/security to enroll.

import { Suspense } from 'react'
import { MfaChallengeForm } from './MfaChallengeForm'

export const dynamic = 'force-dynamic'

export default function MfaChallengePage() {
  return (
    <div className="min-h-screen bg-[#faf8f5] flex items-center justify-center p-5">
      <div className="bg-white rounded-lg shadow-md w-full max-w-md p-10">
        <div className="text-center mb-6">
          <div className="font-serif text-xl font-bold text-[#1a2744] mb-1">
            River Region <span className="text-[#4a90d9]">Parents</span>
          </div>
          <div className="text-xs font-semibold tracking-widest uppercase text-[#c4622d]">
            Admin · Verification
          </div>
        </div>
        <Suspense fallback={null}>
          <MfaChallengeForm />
        </Suspense>
      </div>
    </div>
  )
}
