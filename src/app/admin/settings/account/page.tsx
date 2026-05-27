// /admin/settings/account — the staff member's own profile + password.
//
// Three things live here:
//   1. The basic identity card — name + email + role + allowed markets,
//      read-only. Edits to role/markets happen in /admin/settings/users
//      (super/admin only), not here, because the permissions module
//      forbids self-edits to those fields.
//   2. A name edit field — the one self-edit we DO allow (the permissions
//      module explicitly permits "full_name" and "notes" on self).
//   3. A password set/change form — the whole reason this page exists.
//      Set a password to skip the email link next time you sign in.
//
// Auth: requireAdmin() — if the proxy let you through, you're a real signed-
// in admin; we don't need any further gating on this page.

import type { Metadata } from 'next'
import { requireAdmin } from '@/lib/admin/auth'
import { marketDisplayName } from '@/lib/markets'
import { AccountSettingsClient } from './AccountSettingsClient'
import { Shield, Mail, Users, KeyRound } from 'lucide-react'

export const metadata: Metadata = { title: 'Account Settings — Admin' }
export const dynamic  = 'force-dynamic'

const ROLE_LABEL: Record<string, string> = {
  super:     'Super Admin',
  admin:     'Admin',
  publisher: 'Publisher',
  editor:    'Editor',
}

export default async function AccountSettingsPage() {
  const ctx = await requireAdmin()
  // Build a human-readable market line for the identity card.
  const marketsLine = (ctx.role === 'super' || ctx.role === 'admin')
    ? 'All brands'
    : ctx.allowedMarkets.map(m => marketDisplayName(m)).join(', ') || '—'

  return (
    <div className="flex-1 overflow-y-auto bg-[#f4f5f7]">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-xl font-semibold text-gray-900 inline-flex items-center gap-2">
          <Shield size={18} className="text-primary" /> Account Settings
        </h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Your sign-in details. Role and market assignments are managed by Super Admin in <code className="px-1 py-0.5 bg-gray-100 rounded text-[10px]">/admin/settings/users</code>.
        </p>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8 space-y-5">

        {/* Identity card (read-only fields) */}
        <section className="bg-white rounded-2xl ring-1 ring-gray-200 p-6">
          <h2 className="text-sm font-bold text-gray-900 mb-4">Your account</h2>
          <dl className="space-y-3 text-sm">
            <Row icon={<Mail size={14} className="text-gray-400" />} label="Email">
              <span className="font-semibold text-gray-900">{ctx.email}</span>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Your email is locked to your auth identity. To change it, contact Super Admin.
              </p>
            </Row>
            <Row icon={<Shield size={14} className="text-gray-400" />} label="Role">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-violet-100 text-violet-800 ring-1 ring-violet-200">
                {ROLE_LABEL[ctx.role] ?? ctx.role}
              </span>
            </Row>
            <Row icon={<Users size={14} className="text-gray-400" />} label="Markets">
              <span className="font-medium text-gray-700">{marketsLine}</span>
            </Row>
          </dl>
        </section>

        {/* Editable: full name */}
        <AccountSettingsClient
          initialFullName={ctx.fullName ?? ''}
          adminId={ctx.adminId}
        />

        {/* Tip card — explains the magic-link → password upgrade path */}
        <div className="rounded-2xl bg-amber-50 ring-1 ring-amber-200 p-5 text-sm">
          <p className="font-bold text-amber-900 inline-flex items-center gap-1.5 mb-1.5">
            <KeyRound size={14} /> Daily admin? Set a password.
          </p>
          <p className="text-amber-900 leading-relaxed text-xs">
            Magic links are great for occasional sign-ins but slow when you&apos;re in the admin every day. Set a password above and you can skip the email step entirely — or use Sign in with Google for one-click access.
          </p>
        </div>
      </div>
    </div>
  )
}

function Row({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <dt className="shrink-0 w-24 flex items-center gap-1.5 text-[11px] uppercase tracking-wider font-bold text-gray-500 pt-1">
        {icon} {label}
      </dt>
      <dd className="flex-1 min-w-0">{children}</dd>
    </div>
  )
}
