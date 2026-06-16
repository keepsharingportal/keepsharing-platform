// /admin/social/performance
//
// Reads social_performance + aggregates so the editor (and a curious
// human) can see what the strategist's auto-bias is leaning on:
//   - Top tones per source kind, per brand
//   - Best day-of-week × slot combos by engagement rate
//   - Recent worst performers (so editor can investigate)

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireSettingsAccess } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { MARKETS } from '@/lib/markets'
import { ArrowLeft, TrendingUp, TrendingDown, Sparkles } from 'lucide-react'

export const metadata: Metadata = { title: 'Social performance — Admin' }
export const dynamic = 'force-dynamic'

interface Props { searchParams: Promise<{ brand?: string }> }

export default async function PerformancePage({ searchParams }: Props) {
  await requireSettingsAccess()
  const sp = await searchParams
  const brand = sp.brand && MARKETS.find(m => m.slug === sp.brand) ? sp.brand : 'rrp'
  const sb = createAdminClient()

  const since = new Date(Date.now() - 60 * 86400000).toISOString()
  const { data: rows } = await sb
    .from('social_performance')
    .select('source_kind, tone, day_of_week, slot, platform, engagement_rate, reach, posted_at')
    .eq('brand_slug', brand)
    .gte('posted_at', since)
    .order('engagement_rate', { ascending: false })

  const items = (rows ?? []) as Array<{
    source_kind: string; tone: string | null; day_of_week: number; slot: string;
    platform: string; engagement_rate: number; reach: number; posted_at: string;
  }>

  // Aggregate by (source_kind, tone)
  const byKindTone = new Map<string, { sum: number; n: number; reach: number }>()
  for (const r of items) {
    const k = `${r.source_kind}|${r.tone ?? 'auto'}`
    const cur = byKindTone.get(k) ?? { sum: 0, n: 0, reach: 0 }
    cur.sum += Number(r.engagement_rate); cur.n += 1; cur.reach += r.reach
    byKindTone.set(k, cur)
  }
  const kindToneRows = Array.from(byKindTone.entries())
    .map(([k, v]) => ({ key: k, avgER: v.n ? v.sum / v.n : 0, n: v.n, totalReach: v.reach }))
    .sort((a, b) => b.avgER - a.avgER)

  // Aggregate by (day_of_week, slot)
  const bySlot = new Map<string, { sum: number; n: number }>()
  for (const r of items) {
    const k = `${r.day_of_week}|${r.slot}`
    const cur = bySlot.get(k) ?? { sum: 0, n: 0 }
    cur.sum += Number(r.engagement_rate); cur.n += 1
    bySlot.set(k, cur)
  }
  const slotRows = Array.from(bySlot.entries())
    .map(([k, v]) => ({ key: k, avgER: v.n ? v.sum / v.n : 0, n: v.n }))
    .sort((a, b) => b.avgER - a.avgER)

  const DAYS  = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="bg-white border-b border-portal-border px-6 py-4 shrink-0">
        <Link href="/admin/social/plan" className="text-[11px] font-semibold text-portal-sub hover:text-portal-text inline-flex items-center gap-1 mb-1">
          <ArrowLeft size={11} /> Social plan
        </Link>
        <h1 className="text-[18px] font-bold text-portal-text">
          <TrendingUp size={16} className="inline -translate-y-0.5 mr-1" /> Performance
        </h1>
        <p className="text-[12px] text-portal-sub mt-1">
          Last 60 days of engagement metrics. The strategist auto-biases next week&apos;s picks toward the
          patterns that are winning.
        </p>
      </div>
      <div className="flex-1 overflow-y-auto bg-portal-bg">
        <div className="px-6 py-6 space-y-4 max-w-5xl">

          <div className="flex items-center gap-1.5 flex-wrap">
            {MARKETS.map(m => (
              <Link key={m.slug} href={`/admin/social/performance?brand=${m.slug}`}
                className={`px-3 py-1.5 rounded-full text-[12px] font-bold border ${
                  brand === m.slug ? 'bg-portal-navy text-white border-portal-navy' : 'bg-white text-portal-text border-portal-border hover:bg-portal-bg'
                }`}
              >{m.short}</Link>
            ))}
          </div>

          {items.length === 0 ? (
            <div className="bg-white border border-portal-border rounded-lg p-6 text-center text-portal-sub">
              <Sparkles size={28} className="text-portal-blue mx-auto mb-2" />
              No performance data yet for {brand.toUpperCase()}. The Insights cron runs daily — data
              starts populating once posts have been live for a few hours.
            </div>
          ) : (
            <>
              <section className="bg-white border border-portal-border rounded-lg p-4">
                <h2 className="text-[13px] font-bold text-portal-text mb-2">What&apos;s working — by content kind + tone</h2>
                <table className="w-full text-[12px]">
                  <thead><tr className="text-left border-b border-portal-border">
                    <th className="py-1.5 text-[10px] font-bold uppercase text-portal-sub">Kind / Tone</th>
                    <th className="py-1.5 text-[10px] font-bold uppercase text-portal-sub">Avg ER</th>
                    <th className="py-1.5 text-[10px] font-bold uppercase text-portal-sub">Posts</th>
                    <th className="py-1.5 text-[10px] font-bold uppercase text-portal-sub">Total reach</th>
                  </tr></thead>
                  <tbody>
                    {kindToneRows.slice(0, 12).map((r, i) => (
                      <tr key={r.key} className="border-b border-portal-border last:border-b-0">
                        <td className="py-1.5 font-bold text-portal-text">{r.key.replace('|', ' · ')}</td>
                        <td className="py-1.5 text-portal-text">
                          {i < 3 && <TrendingUp size={11} className="inline text-portal-green mr-1" />}
                          {i >= kindToneRows.length - 3 && <TrendingDown size={11} className="inline text-portal-red mr-1" />}
                          {r.avgER.toFixed(2)}%
                        </td>
                        <td className="py-1.5 text-portal-sub">{r.n}</td>
                        <td className="py-1.5 text-portal-sub">{r.totalReach.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>

              <section className="bg-white border border-portal-border rounded-lg p-4">
                <h2 className="text-[13px] font-bold text-portal-text mb-2">Best day × slot combos</h2>
                <div className="grid grid-cols-7 gap-1 text-center">
                  {[0,1,2,3,4,5,6].map(d => (
                    <div key={d} className="text-[10px] font-bold uppercase text-portal-sub">{DAYS[d]}</div>
                  ))}
                  {['morning','midday','afternoon','evening'].map(slot => (
                    [0,1,2,3,4,5,6].map(d => {
                      const k = `${d}|${slot}`
                      const r = slotRows.find(x => x.key === k)
                      const bg = r ? (r.avgER >= 5 ? 'bg-portal-green-lt' : r.avgER >= 2 ? 'bg-portal-blue-lt' : 'bg-portal-bg') : 'bg-portal-bg'
                      return (
                        <div key={k} className={`${bg} rounded p-1.5 text-[10px]`}>
                          <div className="font-bold">{slot}</div>
                          {r ? <>
                            <div className="text-portal-text">{r.avgER.toFixed(1)}%</div>
                            <div className="text-portal-muted text-[9px]">n={r.n}</div>
                          </> : <div className="text-portal-muted">—</div>}
                        </div>
                      )
                    })
                  ))}
                </div>
              </section>
            </>
          )}

        </div>
      </div>
    </div>
  )
}
