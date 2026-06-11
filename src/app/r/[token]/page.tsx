// /r/[token] — public advertiser performance report.
//
// One stable URL per advertiser. No login. Token is a 256-bit random
// string; brute-force is intractable. Each visit bumps view_count + sets
// last_viewed_at so the admin can see engagement at a glance.

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { loadAdvertiserReport, parseRange } from '@/lib/advertiser-report/data'
import { ReportShell } from './ReportShell'

// Always render dynamically; data changes day-to-day and the URL is per
// advertiser so a static cache would be useless.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Your Performance Report',
  // Discourage indexing — these are private to the advertiser.
  robots: { index: false, follow: false },
}

interface PageProps {
  params:       Promise<{ token: string }>
  searchParams: Promise<{ since?: string; until?: string }>
}

export default async function AdvertiserReportPage({ params, searchParams }: PageProps) {
  const { token } = await params
  const { since, until } = parseRange(await searchParams)

  const supabase = createAdminClient()

  // Probe — graceful if migration 144 hasn't run yet.
  const probe = await supabase.from('advertiser_report_tokens').select('id').limit(1)
  if (probe.error) notFound()

  const tokenRes = await supabase
    .from('advertiser_report_tokens')
    .select('advertiser_id, is_active, view_count, expires_at')
    .eq('token', token)
    .maybeSingle()
  const tokenRow = tokenRes.data as { advertiser_id: string; is_active: boolean; view_count: number; expires_at: string | null } | null
  if (!tokenRow || !tokenRow.is_active) notFound()
  // Token expiry (migration 158). NULL = no expiry. A leaked link can't
  // outlive the configured window — by default 90 days — without a manual
  // regenerate. Don't 404; show a "link expired" message so the advertiser
  // knows to ask for a fresh one instead of assuming the URL was wrong.
  if (tokenRow.expires_at && new Date(tokenRow.expires_at).getTime() < Date.now()) {
    return <ExpiredReportPage />
  }

  // Bump counters fire-and-forget so we don't block the render. Worst case
  // (a transient Supabase error here) we lose one view count — not fatal.
  void supabase
    .from('advertiser_report_tokens')
    .update({
      view_count:     (tokenRow.view_count ?? 0) + 1,
      last_viewed_at: new Date().toISOString(),
    })
    .eq('token', token)
    .then(() => {/* ignore */}, () => {/* ignore */})

  const report = await loadAdvertiserReport(tokenRow.advertiser_id, since, until)
  if (!report) notFound()

  return <ReportShell data={report} />
}

function ExpiredReportPage() {
  return (
    <main className="min-h-screen bg-portal-bg flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        <h1 className="font-serif text-2xl font-bold text-portal-text mb-3">This link has expired.</h1>
        <p className="text-portal-sub leading-relaxed">
          We rotate these links every few months so your data stays private. Reply to the email your report came from
          and we&apos;ll send you a fresh URL.
        </p>
      </div>
    </main>
  )
}
