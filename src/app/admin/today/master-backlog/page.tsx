// ── /admin/today/master-backlog ─────────────────────────────────────────────
// Super-admin-only internal backlog. Phase notes, integration stubs, things
// the publisher tier doesn't need to see. Used to sit on /admin/today; moved
// to its own page so the Today dashboard stays focused on day-to-day ops.

import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft, ListTodo } from 'lucide-react'
import { requireAdmin } from '@/lib/admin/auth'
import { MasterTodoList } from '@/components/today/MasterTodoList'

export const metadata: Metadata = { title: 'Master Backlog — Admin' }
export const dynamic = 'force-dynamic'

export default async function MasterBacklogPage() {
  const ctx = await requireAdmin().catch(() => null)
  if (!ctx) redirect('/admin/login')
  // Server-side gate — defense in depth on top of the sidebar's superOnly
  // filter. An admin tier user typing the URL by hand gets bounced.
  if (ctx.role !== 'super') redirect('/admin/today')

  return (
    <div className="flex-1 overflow-y-auto bg-portal-bg">
      <div className="bg-white border-b border-portal-border px-6 py-4">
        <Link
          href="/admin/today"
          className="inline-flex items-center gap-1 text-xs font-semibold text-portal-sub hover:text-portal-text mb-2"
        >
          <ArrowLeft size={12} /> Today
        </Link>
        <div className="flex items-center gap-2">
          <ListTodo size={18} className="text-portal-blue" />
          <h1 className="portal-page-title">Master Backlog</h1>
        </div>
        <p className="portal-page-subtitle">
          Internal phase notes, integration stubs, and dev-tooling todos. Super-admin only.
        </p>
      </div>

      <div className="p-6 max-w-5xl">
        <MasterTodoList />
      </div>
    </div>
  )
}
