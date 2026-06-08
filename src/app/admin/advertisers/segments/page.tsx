import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'
import Link from 'next/link'
import { Users, TrendingUp, Clock } from 'lucide-react'

export const metadata: Metadata = { title: 'Advertiser Segments — KeepSharing' }

type Booking = {
  id: string
  business_name: string
  advertiser_email: string
  contact_first_name: string | null
  contact_last_name: string | null
  ad_size: string
  months: string[]
  total: number
  ghl_contact_id: string | null
  status: string
  created_at: string
}

async function getData() {
  try {
    const supabase = await createClient()

    // All confirmed bookings for RRP
    const { data: bookings } = await supabase
      .from('bookings')
      .select('id, business_name, advertiser_email, contact_first_name, contact_last_name, ad_size, months, total, ghl_contact_id, status, created_at')
      .eq('publication_abbrev', 'RRP')
      .eq('status', 'confirmed')
      .order('created_at', { ascending: false })

    const all = (bookings ?? []) as Booking[]

    // Newcomer Issue 2026 — booking includes month 2026-06
    const newcomerIssue = all.filter(b => b.months.includes('2026-06'))

    // Active by tier (ad_size)
    const bySize: Record<string, number> = {}
    for (const b of all) {
      bySize[b.ad_size] = (bySize[b.ad_size] ?? 0) + 1
    }

    // Expiring: last month in months[] falls within N days from today
    const today      = new Date()
    const in30       = new Date(today); in30.setDate(today.getDate() + 30)
    const in60       = new Date(today); in60.setDate(today.getDate() + 60)
    const in90       = new Date(today); in90.setDate(today.getDate() + 90)

    function lastMonthDate(months: string[]): Date | null {
      if (!months.length) return null
      const last = [...months].sort().at(-1)!
      const [y, m] = last.split('-').map(Number)
      return new Date(y, m - 1, 1)  // first of that month
    }

    const exp30 = all.filter(b => { const d = lastMonthDate(b.months); return d && d >= today && d <= in30 }).length
    const exp60 = all.filter(b => { const d = lastMonthDate(b.months); return d && d > in30  && d <= in60 }).length
    const exp90 = all.filter(b => { const d = lastMonthDate(b.months); return d && d > in60  && d <= in90 }).length

    return { all, newcomerIssue, bySize, exp30, exp60, exp90 }
  } catch {
    return { all: [], newcomerIssue: [], bySize: {}, exp30: 0, exp60: 0, exp90: 0 }
  }
}

const SIZE_LABEL: Record<string, string> = {
  full: 'Full Page', half: 'Half Page', quarter: 'Quarter Page', sixth: 'Sixth Page', web: 'Digital',
}

export default async function SegmentsPage() {
  const { all, newcomerIssue, bySize, exp30, exp60, exp90 } = await getData()

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">Advertiser Segments</h1>
        <p className="text-sm text-white/50 mt-1">Tag-based audience segments synced to GHL · River Region Parents</p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {[
          { label: 'Total Confirmed', value: all.length,              icon: Users,        color: 'text-portal-blue' },
          { label: 'Newcomer Issue',  value: newcomerIssue.length,    icon: TrendingUp,   color: 'text-portal-amber' },
          { label: 'Expiring 30d',    value: exp30,                   icon: Clock,        color: 'text-portal-red' },
          { label: 'Expiring 60-90d', value: exp60 + exp90,           icon: Clock,        color: 'text-portal-amber' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white/3 border border-white/10 rounded-lg p-4 text-center">
            <Icon size={16} className={`mx-auto mb-2 ${color}`} />
            <div className={`text-2xl font-bold ${color}`}>{value}</div>
            <div className="text-xs text-white/40 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Active by tier */}
      <div className="bg-white/3 border border-white/10 rounded-lg p-5 mb-6">
        <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <TrendingUp size={14} className="text-portal-blue" /> Active by Ad Size
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {(['full','half','quarter','sixth','web'] as const).map(size => (
            <div key={size} className="bg-white/5 rounded-lg p-3 text-center">
              <div className="text-xl font-bold text-white">{bySize[size] ?? 0}</div>
              <div className="text-xs text-white/40 mt-0.5">{SIZE_LABEL[size]}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Expiring */}
      <div className="bg-white/3 border border-white/10 rounded-lg p-5 mb-6">
        <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <Clock size={14} className="text-portal-amber" /> Expiring Bookings (by campaign end)
        </h2>
        <div className="grid grid-cols-3 gap-3 text-center">
          {[['Within 30 days', exp30, 'text-portal-red'], ['31-60 days', exp60, 'text-portal-amber'], ['61-90 days', exp90, 'text-white/60']].map(([label, count, cls]) => (
            <div key={label as string} className="bg-white/5 rounded-lg p-4">
              <div className={`text-2xl font-bold ${cls as string}`}>{count as number}</div>
              <div className="text-xs text-white/40 mt-0.5">{label as string}</div>
            </div>
          ))}
        </div>
        <p className="text-xs text-white/30 mt-3">
          Renewal outreach: contact 60 days before campaign end. Use GHL segment filter tag <code className="bg-white/8 px-1 rounded">rrp-advertiser</code>.
        </p>
      </div>

      {/* Newcomer Issue 2026 */}
      <div className="bg-white/3 border border-white/10 rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-white/8 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-portal-amber inline-block" />
              Newcomer Issue 2026 — June 2026 Advertisers
            </h2>
            <p className="text-xs text-white/40 mt-0.5">
              GHL tag: <code className="bg-white/8 px-1 rounded">newcomer-issue-2026</code> · {newcomerIssue.length} advertiser{newcomerIssue.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {newcomerIssue.length === 0 ? (
          <div className="px-5 py-10 text-center text-white/30 text-sm">
            No June 2026 bookings yet. The tag will auto-apply when a booking including June 2026 is confirmed.
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {newcomerIssue.map(b => (
              <div key={b.id} className="px-5 py-3 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-white">{b.business_name}</div>
                  <div className="text-xs text-white/40 mt-0.5">
                    {b.contact_first_name} {b.contact_last_name ?? ''} · {b.advertiser_email}
                  </div>
                </div>
                <div className="text-xs text-white/50 shrink-0 capitalize">{SIZE_LABEL[b.ad_size] ?? b.ad_size}</div>
                <div className="text-xs text-white/50 shrink-0">{b.months.length} month{b.months.length !== 1 ? 's' : ''}</div>
                {b.ghl_contact_id ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-portal-green/20 text-portal-green font-semibold shrink-0">GHL synced</span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/8 text-white/30 font-semibold shrink-0">No GHL ID</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer note */}
      <div className="mt-6 p-4 bg-white/3 border border-white/8 rounded-lg text-xs text-white/40 space-y-1">
        <p><strong className="text-white/60">GHL Segment filter:</strong> In GHL → Contacts, filter by tag to get exact lists for Facebook Lookalike audiences or automated sequences.</p>
        <p>Tags applied at booking confirmation: <code className="bg-white/8 px-1 rounded">advertiser</code>, <code className="bg-white/8 px-1 rounded">rrp-advertiser</code>, <code className="bg-white/8 px-1 rounded">[size]-advertiser</code>, <code className="bg-white/8 px-1 rounded">self-serve</code></p>
      </div>
    </div>
  )
}
