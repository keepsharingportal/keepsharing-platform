'use client'

// AdvertiserPrintPlacements — related list on the advertiser profile
// page. One row per print_ad_placements record for this business,
// sorted with the most upcoming issues first (future months descending,
// then past months descending).
//
// Edits route to /admin/print-layout?issue=<month>&edit=<id> so the
// full inline-edit experience happens on the proper page; this panel
// is read-only + 'Open in Print Layout' deep links + 'Add' button that
// goes to current-month Print Layout with the Add form pre-revealed.

import Link from 'next/link'
import { Printer, ArrowRight, Plus } from 'lucide-react'

export interface PrintPlacementSummary {
  id:           string
  issue_month:  string
  design:       string
  size:         number
  layout:       string | null
  price:        number | null
  expires_month: string | null
}

interface Props {
  advertiserId: string
  initial:      PrintPlacementSummary[]
  tableMissing: boolean
}

function fmtIssue(yyyymm: string): string {
  const [y, m] = yyyymm.split('-').map(s => parseInt(s, 10))
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
}

// Sort: upcoming + current first (future months descending so next
// month sits at the top), then past issues descending.
function sortIssues(rows: PrintPlacementSummary[], todayYM: string): PrintPlacementSummary[] {
  const future: PrintPlacementSummary[] = []
  const past:   PrintPlacementSummary[] = []
  for (const r of rows) (r.issue_month >= todayYM ? future : past).push(r)
  future.sort((a, b) => a.issue_month.localeCompare(b.issue_month))
  past.sort((a, b)   => b.issue_month.localeCompare(a.issue_month))
  return [...future, ...past]
}

export function AdvertiserPrintPlacements({ advertiserId, initial, tableMissing }: Props) {
  if (tableMissing) {
    return (
      <section className="bg-white rounded-xl ring-1 ring-gray-200 p-5 text-sm">
        <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 inline-flex items-center gap-1.5">
          <Printer size={11} /> Print Placements
        </h2>
        <p className="text-[10px] text-amber-700">
          Apply migration 129 (print_ad_placements) in Supabase to enable print booking tracking on advertiser profiles.
        </p>
      </section>
    )
  }

  const today = new Date()
  const todayYM = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
  const sorted = sortIssues(initial, todayYM)
  // Pick the issue for the 'Add' button — next future booking the
  // editor probably wants to add to, otherwise the current month.
  const addIssue = sorted.find(r => r.issue_month > todayYM)?.issue_month ?? todayYM

  return (
    <section className="bg-white rounded-xl ring-1 ring-gray-200 p-5 text-sm space-y-3">
      <header className="flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 inline-flex items-center gap-1.5">
          <Printer size={11} /> Print Placements {initial.length > 0 && <span className="text-gray-400">({initial.length})</span>}
        </h2>
        <Link
          href={`/admin/print-layout?issue=${addIssue}`}
          className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
        >
          <Plus size={11} /> Manage
        </Link>
      </header>

      {sorted.length === 0 ? (
        <div className="text-center py-3 border border-dashed border-gray-200 rounded-lg">
          <p className="text-xs text-gray-500 mb-1">No print bookings yet.</p>
          <Link
            href={`/admin/print-layout?issue=${todayYM}`}
            className="text-xs font-bold text-primary hover:underline"
          >
            Open Print Layout → add one
          </Link>
        </div>
      ) : (
        <ul className="space-y-1.5">
          {sorted.slice(0, 6).map(r => {
            const future = r.issue_month >= todayYM
            return (
              <li key={r.id} className={`flex items-center gap-2 p-2 rounded-lg border border-gray-100 ${future ? 'bg-emerald-50/40' : ''}`}>
                <span className={`text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${future ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-700'}`}>
                  {fmtIssue(r.issue_month)}
                </span>
                <div className="flex-1 min-w-0 text-xs">
                  <span className="font-semibold text-gray-900 tabular-nums">{r.size}</span>
                  <span className="text-gray-500"> · {r.design}</span>
                  {r.layout && <span className="text-gray-500"> · {r.layout}</span>}
                </div>
                {r.price != null && (
                  <span className="text-xs font-bold text-gray-900 tabular-nums">${r.price.toLocaleString()}</span>
                )}
                <Link
                  href={`/admin/print-layout?issue=${r.issue_month}`}
                  className="text-[10px] font-bold text-primary hover:underline inline-flex items-center gap-0.5"
                  title="Open in Print Layout"
                >
                  Open <ArrowRight size={9} />
                </Link>
              </li>
            )
          })}
        </ul>
      )}
      {/* advertiserId reserved for future inline-create */}
      <input type="hidden" value={advertiserId} readOnly />
    </section>
  )
}
