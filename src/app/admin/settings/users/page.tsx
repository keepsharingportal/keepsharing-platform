// /admin/settings/users — Admin user management.
//
// Super + Admin can view this page. Super can create/edit anyone. Admin can
// create/edit publishers + editors only. Publisher + Editor get redirected
// out by the page-level requireSettingsAccess() guard.

import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAdminContext } from '@/lib/admin/auth'
import { canViewAdminUsers } from '@/lib/admin/permissions'
import { AdminUsersClient } from './AdminUsersClient'

export const metadata: Metadata = { title: 'Admin Users — Settings' }
export const dynamic  = 'force-dynamic'

export interface AdminUserRow {
  id:              string
  user_id:         string | null
  email:           string
  full_name:       string | null
  role:            'super' | 'admin' | 'publisher' | 'editor'
  allowed_markets: string[] | null
  status:          string
  notes:           string | null
  last_login_at:   string | null
  invited_at:      string | null
  invited_by:      string | null
  created_at:      string
  requires_mfa:    boolean | null
  mfa_enabled_at:  string | null
}

export default async function AdminUsersPage() {
  const ctx = await getAdminContext()

  // Soft gate — bounce non-staff back to /admin rather than throw, so the
  // sidebar link gracefully redirects publishers/editors who clicked it
  // (the sidebar hides it for them, but defense in depth).
  if (!ctx) redirect('/admin/login')
  if (!canViewAdminUsers(ctx.role)) redirect('/admin')

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('admin_users')
    .select('id, user_id, email, full_name, role, allowed_markets, status, notes, last_login_at, invited_at, invited_by, created_at, requires_mfa, mfa_enabled_at')
    .order('role',          { ascending: true })
    .order('created_at',    { ascending: false })

  if (error) {
    console.error('[admin/settings/users] load error:', error)
  }

  const rows = (data ?? []) as AdminUserRow[]

  return (
    <div className="flex-1 overflow-y-auto">
      <AdminUsersClient
        initialRows={rows}
        currentUser={{
          id:   ctx.adminId,
          role: ctx.role,
        }}
      />
    </div>
  )
}
