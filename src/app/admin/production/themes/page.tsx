// ── /admin/production/themes ──────────────────────────────────────────────────
// Monthly themes per market. Each market can run a different theme in a given
// month. This is the seed of market-specific editorial planning.
//
// V1: static reference table of the current rolling 12 months × 6 markets, so
// publishers see at a glance what each market is doing. Editable via DB later.

import Link from 'next/link'
import { AdminSectionHeader } from '@/components/admin/AdminSectionHeader'
import { ArrowLeft, Sparkles } from 'lucide-react'

export const metadata = { title: 'Monthly Themes — Production' }
export const dynamic  = 'force-dynamic'

const PUBLICATIONS = [
  { abbrev: 'RRP', name: 'River Region Parents',      color: '#22c55e' },
  { abbrev: 'MBP', name: 'Mobile Bay Parents',        color: '#3b82f6' },
  { abbrev: 'AOP', name: 'Auburn Opelika Parents',    color: '#f97316' },
  { abbrev: 'ESP', name: 'Eastern Shore Parents',     color: '#a855f7' },
  { abbrev: 'GPP', name: 'Greater Pensacola Parents', color: '#14b8a6' },
  { abbrev: 'RRB', name: 'River Region Boom',         color: '#eab308' },
]

// Current planning grid — themes per market per month. RRP and Boom share Montgomery,
// so RRB rhythm differs intentionally. This is a placeholder grid that should later
// move to a `market_themes` table.
const THEMES: Record<string, Record<string, string>> = {
  '2026-05': { RRP: 'Summer Fun',       MBP: 'Mother\'s Day',      AOP: 'Mother\'s Day',  ESP: 'Mother\'s Day',  GPP: 'Mother\'s Day',  RRB: 'Mother\'s Day' },
  '2026-06': { RRP: 'Camp Roundup',     MBP: 'Summer Fun',         AOP: 'Summer Fun',     ESP: 'Summer Fun',     GPP: 'Summer Fun',     RRB: 'Father\'s Day' },
  '2026-07': { RRP: 'Back to School',   MBP: 'Camp Highlights',    AOP: 'Camp Highlights',ESP: 'Camp Highlights',GPP: 'Camp Highlights',RRB: 'Summer Travel' },
  '2026-08': { RRP: 'School Zone',      MBP: 'Back to School',     AOP: 'Back to School', ESP: 'Back to School', GPP: 'Back to School', RRB: 'Wellness' },
  '2026-09': { RRP: 'Healthy Kids',     MBP: 'Family Health',      AOP: 'Family Health',  ESP: 'Family Health',  GPP: 'Family Health',  RRB: 'Living Local' },
  '2026-10': { RRP: 'Fall Fun',         MBP: 'Fall Festivals',     AOP: 'Fall Festivals', ESP: 'Fall Festivals', GPP: 'Fall Festivals', RRB: 'Giving Back' },
}

function fmtMonth(ym: string) {
  return new Date(`${ym}-01T12:00:00`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

export default function ThemesPage() {
  const months = Object.keys(THEMES).sort()

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <div>
        <Link href="/admin/production" className="inline-flex items-center gap-1 text-xs text-portal-blue hover:underline mb-1">
          <ArrowLeft size={11} /> Production
        </Link>
        <h1 className="text-xl font-semibold text-portal-text">Monthly Themes</h1>
        <p className="text-sm text-portal-sub mt-0.5">Each market can run a different theme in a given month. Editorial planning starts here.</p>
      </div>

      <section>
        <AdminSectionHeader title="Theme Grid" description="Markets across · Months down" />

        <div className="rounded-xl border border-portal-border bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-portal-bg border-b border-portal-border">
                  <th className="text-left px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider text-portal-sub">Month</th>
                  {PUBLICATIONS.map(p => (
                    <th key={p.abbrev} className="text-left px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: p.color }}>
                      {p.abbrev}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {months.map(m => (
                  <tr key={m} className="border-b border-portal-border last:border-0">
                    <td className="px-3 py-3 text-sm font-semibold text-portal-text whitespace-nowrap">{fmtMonth(m)}</td>
                    {PUBLICATIONS.map(p => {
                      const theme = THEMES[m]?.[p.abbrev]
                      return (
                        <td key={p.abbrev} className="px-3 py-3 text-xs">
                          {theme ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-medium"
                              style={{ backgroundColor: p.color + '15', color: p.color }}
                            >
                              <Sparkles size={9} />
                              {theme}
                            </span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <p className="text-[11px] text-portal-muted mt-3">
          This is a planning reference. To make themes editable, move this grid into a <code className="px-1 bg-gray-100 rounded">market_themes</code> table.
        </p>
      </section>
    </div>
  )
}
