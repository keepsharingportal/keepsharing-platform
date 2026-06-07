// /admin/print-layout — monthly layout sheet for the print magazine.
//
// Editor's workflow:
//   1. Open the page. Defaults to next month's issue.
//   2. Empty? Click 'Clone from <prev month>' — every committed row
//      from the previous issue carries forward (design flipped to
//      pickup, expired rows skipped).
//   3. Trim + add through the month as sponsors confirm.
//   4. When the layout team needs it: Print (browser) or Download CSV.

import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/admin/auth'
import { PrintLayoutClient, type PrintPlacement, type AdvertiserOption } from './PrintLayoutClient'

export const metadata: Metadata = { title: 'Print Layout — Admin' }
export const dynamic  = 'force-dynamic'

// Pick a sensible default: NEXT month from today. Editors usually work
// one issue ahead, so the page is the most useful pre-set to where
// they're booking sponsors right now.
function defaultIssueMonth(): string {
  const d = new Date()
  d.setDate(15)                       // mid-month so timezone roll-overs don't trip us
  d.setMonth(d.getMonth() + 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

interface Props {
  searchParams: Promise<{ issue?: string; add?: string; advertiser_id?: string }>
}

export default async function PrintLayoutPage({ searchParams }: Props) {
  await requireAdmin()
  const sp     = await searchParams
  const issue  = /^[0-9]{4}-[0-9]{2}$/.test(sp.issue ?? '')
    ? (sp.issue as string)
    : defaultIssueMonth()
  // Deep-link from the advertiser profile page: ?add=1&advertiser_id=X
  // opens the Add Placement form with X pre-selected so the editor lands
  // ready to type, not ready to scroll the dropdown.
  const initialAdd        = sp.add === '1'
  const initialAdvertiser = sp.advertiser_id?.trim() || null

  const supabase = createAdminClient()

  // Three parallel fetches:
  //   - This month's placements (the main table)
  //   - The list of advertiser_accounts so the editor can add new rows
  //     without leaving the page
  //   - The two adjacent months' counts so the page can advertise the
  //     'Clone from <prev>' button accurately
  const prevMonth = shiftMonth(issue, -1)
  const nextMonth = shiftMonth(issue, +1)
  const [placementsRes, advertisersRes, prevCountRes] = await Promise.all([
    supabase
      .from('print_ad_placements')
      .select('id, advertiser_account_id, issue_month, design, directory, size, layout, price, social_budget, layout_notes, specific_months, expires_month, notes, is_ongoing, ad_label, advertiser:advertiser_account_id (business_name)')
      .eq('issue_month', issue)
      .order('size', { ascending: false }),
    supabase
      .from('advertiser_accounts')
      .select('id, business_name')
      .order('business_name', { ascending: true })
      .limit(2000),
    supabase
      .from('print_ad_placements')
      .select('id', { count: 'exact', head: true })
      .eq('issue_month', prevMonth),
  ])

  type Raw = Omit<PrintPlacement, 'business_name'> & {
    advertiser: { business_name: string } | { business_name: string }[] | null
  }
  const rows: PrintPlacement[] = ((placementsRes.data ?? []) as Raw[]).map(r => {
    const adv = r.advertiser
    const biz = Array.isArray(adv) ? (adv[0]?.business_name ?? '') : (adv?.business_name ?? '')
    return { ...r, business_name: biz }
  })

  const advertisers = (advertisersRes.data ?? []) as AdvertiserOption[]
  const prevCount   = (prevCountRes.count ?? 0) > 0 ? (prevCountRes.count ?? 0) : 0

  const tableMissing = !!placementsRes.error
    && /relation .* does not exist/i.test(placementsRes.error.message ?? '')

  return (
    <div className="flex-1 overflow-y-auto bg-[#f4f5f7] min-h-full">
      <PrintLayoutClient
        issue={issue}
        prevMonth={prevMonth}
        nextMonth={nextMonth}
        prevMonthCount={prevCount}
        initial={rows}
        advertisers={advertisers}
        tableMissing={tableMissing}
        initialAdd={initialAdd}
        initialAdvertiserId={initialAdvertiser}
      />
    </div>
  )
}

// YYYY-MM shift by N months. Handles year roll-overs.
function shiftMonth(yyyymm: string, n: number): string {
  const [y, m] = yyyymm.split('-').map(s => parseInt(s, 10))
  const d = new Date(y, m - 1 + n, 15)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
