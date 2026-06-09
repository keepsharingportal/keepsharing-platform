// ── /admin/settings/security ────────────────────────────────────────────────
// Each admin's personal security page — primarily 2FA enrollment.
//
// Supabase Auth has TOTP MFA built in. The flow here:
//   1. Operator clicks "Set up authenticator app"
//   2. We call supabase.auth.mfa.enroll({factorType: 'totp'}) on the client
//   3. Supabase returns a QR code SVG + a TOTP secret
//   4. Operator scans with Google Authenticator / Authy / 1Password
//   5. They enter the first 6-digit code; we verify; factor goes 'verified'
//
// Existing factors (already verified) get listed with a Remove button.

import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { requireAdmin } from '@/lib/admin/auth'
import { SecurityClient } from './SecurityClient'

export const metadata: Metadata = { title: 'My Security — Admin' }
export const dynamic = 'force-dynamic'

export default async function SecurityPage() {
  const ctx = await requireAdmin()

  return (
    <div className="flex-1 overflow-y-auto bg-portal-bg">
      <div className="bg-white border-b border-portal-border px-6 py-4">
        <Link href="/admin/settings" className="inline-flex items-center gap-1 text-xs font-semibold text-portal-sub hover:text-portal-text mb-2">
          <ArrowLeft size={12} /> Settings
        </Link>
        <h1 className="portal-page-title">My Security</h1>
        <p className="portal-page-subtitle">Two-factor authentication for your admin sign-in. Recommended for everyone.</p>
      </div>
      <div className="p-6 max-w-2xl">
        <SecurityClient userEmail={ctx.email} />
      </div>
    </div>
  )
}
