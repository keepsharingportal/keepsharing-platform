// ── /admin/production/issues/digital ────────────────────────────────────────
// Manage the magazine_issues table — the rows that drive the "Read Digital
// Edition" sidebar block and the "Recent Issues" carousel on the public
// homepage.
//
// Page renders server-side with the current set of issues for the admin's
// active market; the client component handles add / edit / delete /
// set-current via /api/admin/magazine-issues.
//
// Why this lives under /admin/production/issues instead of /admin/site:
// production already owns "this month's print issue" semantics — the
// digital edition is just the same issue's flipbook version. Putting it
// next to the existing Issues page keeps the mental model consistent.

import Link from 'next/link'
import { ArrowLeft, BookOpen } from 'lucide-react'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { AdminSectionHeader } from '@/components/admin/AdminSectionHeader'
import { DigitalIssuesEditor, type MagazineIssue } from './DigitalIssuesEditor'

export const metadata = { title: 'Digital Issues — Production' }
export const dynamic  = 'force-dynamic'

export default async function DigitalIssuesPage() {
  const ctx    = await requireAdmin()
  // Super/admin viewing "all" should still pick a concrete market for this
  // page — issues are per-market. Default to RRP when in aggregate mode.
  const market = ctx.viewingAll ? 'rrp' : ctx.activeMarket
  const sb     = createAdminClient()

  // Pull existing rows. Tolerate the table not existing yet so the page
  // still renders before the migration is applied.
  let issues: MagazineIssue[] = []
  try {
    const { data, error } = await sb
      .from('magazine_issues')
      .select('*')
      .eq('market', market)
      .order('issue_month', { ascending: false })
    if (!error && data) issues = data as MagazineIssue[]
  } catch { /* table missing — fall through with empty list */ }

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <div>
        <Link href="/admin/production/issues" className="inline-flex items-center gap-1 text-xs text-portal-blue hover:underline mb-1">
          <ArrowLeft size={11} /> Issues
        </Link>
        <div className="flex items-center gap-2">
          <BookOpen size={18} className="text-portal-blue" />
          <h1 className="text-xl font-semibold text-portal-text">Digital Issues</h1>
        </div>
        <p className="text-sm text-portal-sub mt-1 max-w-2xl">
          Manage the Issuu flipbook URLs and covers shown on the public homepage.
          The issue marked <span className="font-semibold text-portal-text">Current</span> drives the
          &ldquo;This Month&rsquo;s Issue&rdquo; sidebar block; the rest feed the
          &ldquo;Recent Issues&rdquo; carousel.
        </p>
      </div>

      <section>
        <AdminSectionHeader
          title="Issues"
          count={issues.length}
          description={`Market: ${market.toUpperCase()}`}
        />
        <DigitalIssuesEditor initial={issues} market={market} />
      </section>
    </div>
  )
}
