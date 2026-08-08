// ── /admin/education-matters/sponsors ─────────────────────────────────
//
// One sponsor per district for a date range. Layout picks the active
// row by article publish date; nothing here is per-article.
//
// The list shows every configured sponsorship grouped by district so
// the editor can see at a glance which districts have a sponsor for
// the current period and which don't.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireSettingsAccess } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { listSponsorships, type ColumnSponsorship } from '@/lib/education-matters/column-sponsorships'
import { EDUCATION_DISTRICTS } from '@/lib/education-matters/districts'
import { ArrowLeft, ArrowRight, Plus, CheckCircle2, AlertTriangle, CalendarDays } from 'lucide-react'

export const metadata: Metadata = { title: 'Education Matters — Sponsors — Admin' }
export const dynamic = 'force-dynamic'

const STATUS_STYLE: Record<ColumnSponsorship['status'], { label: string; bg: string; fg: string }> = {
  active:  { label: 'Active',  bg: '#DCFCE7', fg: '#166534' },
  pending: { label: 'Pending', bg: '#FEF3C7', fg: '#92400E' },
  ended:   { label: 'Ended',   bg: '#F1F5F9', fg: '#475569' },
}

export default async function SponsorsPage() {
  await requireSettingsAccess()
  const sb = createAdminClient()
  const sponsorships = await listSponsorships(sb)

  const today = new Date().toISOString().slice(0, 10)
  const byDistrict = new Map<string, ColumnSponsorship[]>()
  for (const s of sponsorships) {
    const arr = byDistrict.get(s.column_slug) ?? []
    arr.push(s)
    byDistrict.set(s.column_slug, arr)
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="bg-white border-b border-portal-border px-6 py-4 shrink-0">
        <Link href="/admin" className="text-[11px] font-semibold text-portal-sub hover:text-portal-text inline-flex items-center gap-1 mb-1">
          <ArrowLeft size={11} /> Admin
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[18px] font-bold text-portal-text">Education Matters — Sponsors</h1>
            <p className="text-[12px] text-portal-sub mt-1">
              Annual sponsor contracts per district. Every Education Matters article picks up the
              active sponsor for its district automatically based on publish date. No monthly
              re-entry.
            </p>
          </div>
          <Link
            href="/admin/education-matters/sponsors/new"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-[12px] font-semibold text-white bg-portal-navy rounded-lg hover:opacity-90"
          >
            <Plus size={12} /> New sponsorship
          </Link>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-portal-bg">
        <div className="px-6 py-6 space-y-4">
          {EDUCATION_DISTRICTS.map(district => {
            const rows = byDistrict.get(district.slug) ?? []
            const activeToday = rows.find(r => r.status === 'active' && r.start_month <= today && r.end_month >= today)
            return (
              <section key={district.slug} className="bg-white border border-portal-border rounded-lg overflow-hidden">
                <header className="flex items-center justify-between gap-3 px-4 py-3 border-b border-portal-border" style={{ backgroundColor: district.softAccent }}>
                  <div className="flex items-center gap-2.5">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: district.accent }}
                      aria-hidden
                    />
                    <div>
                      <h2 className="text-[13px] font-bold text-portal-text">{district.fullName}</h2>
                      <p className="text-[11px] text-portal-sub">
                        {activeToday
                          ? <>Currently sponsored by <strong>{activeToday.sponsor_name}</strong></>
                          : <span className="inline-flex items-center gap-1 text-portal-amber">
                              <AlertTriangle size={11} /> No active sponsor today
                            </span>}
                      </p>
                    </div>
                  </div>
                  <Link
                    href={`/admin/education-matters/sponsors/new?column=${district.slug}`}
                    className="text-[11px] font-semibold text-portal-blue hover:underline inline-flex items-center gap-1"
                  >
                    <Plus size={11} /> Add for this district
                  </Link>
                </header>

                {rows.length === 0 ? (
                  <div className="px-4 py-6 text-center text-[12px] text-portal-sub">
                    No sponsorships configured yet.
                  </div>
                ) : (
                  <table className="w-full text-[13px]">
                    <thead className="bg-portal-bg">
                      <tr className="text-left">
                        <Th>Sponsor</Th>
                        <Th>Business</Th>
                        <Th>Period</Th>
                        <Th center>Status</Th>
                        <Th center>Creative</Th>
                        <Th></Th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map(r => {
                        const style = STATUS_STYLE[r.status]
                        const hasCreative = !!(r.sponsor_logo_url || r.sponsor_image_url)
                        return (
                          <tr key={r.id} className="border-t border-portal-border">
                            <Td>
                              <div className="text-[13px] font-bold text-portal-text">{r.sponsor_name}</div>
                              {r.sponsor_tagline && (
                                <div className="text-[11px] text-portal-sub">{r.sponsor_tagline}</div>
                              )}
                            </Td>
                            <Td>
                              {r.advertiser?.business_name && r.advertiser_account_id ? (
                                <Link href={`/admin/advertisers/${r.advertiser_account_id}`} className="text-portal-blue hover:underline">
                                  {r.advertiser.business_name}
                                </Link>
                              ) : (
                                <span className="text-portal-sub italic">— not linked —</span>
                              )}
                            </Td>
                            <Td>
                              <div className="inline-flex items-center gap-1.5 text-[12px] text-portal-text">
                                <CalendarDays size={11} className="text-portal-sub" />
                                {formatMonth(r.start_month)} → {formatMonth(r.end_month)}
                              </div>
                            </Td>
                            <Td center>
                              <span
                                className="inline-block px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider"
                                style={{ backgroundColor: style.bg, color: style.fg }}
                              >
                                {style.label}
                              </span>
                            </Td>
                            <Td center>
                              {hasCreative ? <Done /> : <Gap />}
                            </Td>
                            <Td>
                              <Link
                                href={`/admin/education-matters/sponsors/${r.id}`}
                                className="text-portal-blue text-[12px] font-bold inline-flex items-center gap-1"
                              >
                                Edit <ArrowRight size={11} />
                              </Link>
                            </Td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </section>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function formatMonth(iso: string): string {
  const d = new Date(iso + 'T12:00:00Z')
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' })
}

function Th({ children, center }: { children?: React.ReactNode; center?: boolean }) {
  return (
    <th className={`px-3.5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-portal-sub ${center ? 'text-center' : 'text-left'}`}>
      {children}
    </th>
  )
}
function Td({ children, center }: { children?: React.ReactNode; center?: boolean }) {
  return <td className={`px-3.5 py-3 align-middle ${center ? 'text-center' : 'text-left'}`}>{children}</td>
}
function Done() { return <CheckCircle2 size={14} className="text-portal-green inline" /> }
function Gap()  { return <AlertTriangle size={14} className="text-portal-amber inline" /> }

