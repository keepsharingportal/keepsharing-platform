// /admin/auth/recovery — recover 2FA access using a saved recovery code.
//
// The user reaches here from /admin/auth/mfa-challenge via the "Lost your
// device?" link. On successful code submission their MFA factors are
// reset and they're redirected to enrollment.

import { Suspense } from 'react'
import { RecoveryForm } from './RecoveryForm'

export const dynamic = 'force-dynamic'

export default function MfaRecoveryPage() {
  return (
    <div className="min-h-screen bg-[#faf8f5] flex items-center justify-center p-5">
      <div className="bg-white rounded-lg shadow-md w-full max-w-md p-10">
        <div className="text-center mb-6">
          <div className="font-serif text-xl font-bold text-[#1a2744] mb-1">
            River Region <span className="text-[#4a90d9]">Parents</span>
          </div>
          <div className="text-xs font-semibold tracking-widest uppercase text-[#ef6442]">
            Admin · 2FA Recovery
          </div>
        </div>
        <Suspense fallback={null}>
          <RecoveryForm />
        </Suspense>
      </div>
    </div>
  )
}
