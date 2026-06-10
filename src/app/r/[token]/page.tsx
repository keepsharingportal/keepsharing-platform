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
    .select('advertiser_id, is_active, view_count')
    .eq('token', token)
    .maybeSingle()
  const tokenRow = tokenRes.data as { advertiser_id: string; is_active: boolean; view_count: number } | null
  if (!tokenRow || !tokenRow.is_active) notFound()

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
