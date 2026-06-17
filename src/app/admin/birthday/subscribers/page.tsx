import type { Metadata } from 'next'
import Link from 'next/link'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { ArrowLeft, Mail, Download } from 'lucide-react'

export const metadata: Metadata = { title: 'Birthday Insider Subscribers — Admin' }
export const dynamic = 'force-dynamic'

interface Sub {
  id: string; brand_slug: string; email: string
  child_first_name: string | null; party_date: string | null
  source: string; is_active: boolean; created_at: string
}

export default async function SubscribersPage() {
  await requireAdmin()
  const sb = createAdminClient()
  const { data } = await sb.from('birthday_planning_subscribers')
    .select('*').order('created_at', { ascending: false }).limit(1000)
  const subs = (data ?? []) as Sub[]

  // Group by source for at-a-glance counts
  const bySource = new Map<string, number>()
  for (const s of subs) {
    const key = s.source.startsWith('printables:') ? 'printables' : s.source
    bySource.set(key, (bySource.get(key) ?? 0) + 1)
  }

  return (
    <div className="flex-1 overflow-y-auto bg-portal-bg">
      <div className="bg-white border-b border-portal-border px-6 py-4 flex items-center justify-between">
        <div>
          <Link href="/admin/birthday" className="text-[11px] font-semibold text-portal-sub hover:text-portal-text inline-flex items-center gap-1 mb-1">
            <ArrowLeft size={11} /> Birthday Bash
          </Link>
          <h1 className="text-[18px] font-bold text-portal-text inline-flex items-center gap-2">
            <Mail size={16} /> Insider Subscribers
          </h1>
          <p className="text-[12px] text-portal-sub mt-1">
            Email captures from Timeline / Freebies / Printables / Newsletter signups. Export as CSV for ESP import.
          </p>
        </div>
        <a href="/api/admin/birthday/subscribers/export" download
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-bold text-white bg-portal-navy rounded hover:opacity-90">
          <Download size={11} /> Export CSV
        </a>
      </div>

      <div className="p-6 max-w-6xl space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from(bySource.entries()).map(([source, count]) => (
            <div key={source} className="bg-white border border-portal-border rounded-lg p-3">
              <div className="text-[20px] font-black text-portal-text">{count}</div>
              <div className="text-[10px] uppercase tracking-wider text-portal-sub mt-1">{source}</div>
            </div>
          ))}
        </div>

        <div className="bg-white border border-portal-border rounded-lg overflow-hidden">
          <table className="w-full text-[12px]">
            <thead className="bg-portal-bg border-b border-portal-border">
              <tr className="text-left">
                <th className="px-3 py-2 text-[10px] font-bold uppercase text-portal-sub">Email</th>
                <th className="px-3 py-2 text-[10px] font-bold uppercase text-portal-sub">Child</th>
                <th className="px-3 py-2 text-[10px] font-bold uppercase text-portal-sub">Party date</th>
                <th className="px-3 py-2 text-[10px] font-bold uppercase text-portal-sub">Source</th>
                <th className="px-3 py-2 text-[10px] font-bold uppercase text-portal-sub">Signed up</th>
              </tr>
            </thead>
            <tbody>
              {subs.length === 0 && <tr><td colSpan={5} className="px-3 py-6 text-center text-portal-sub">No signups yet.</td></tr>}
              {subs.map(s => (
                <tr key={s.id} className="border-b border-portal-border last:border-b-0 hover:bg-portal-bg">
                  <td className="px-3 py-2 text-portal-text font-mono">{s.email}</td>
                  <td className="px-3 py-2 text-portal-sub">{s.child_first_name ?? '—'}</td>
                  <td className="px-3 py-2 text-portal-sub">{s.party_date ?? '—'}</td>
                  <td className="px-3 py-2 text-portal-sub text-[10px] uppercase">{s.source}</td>
                  <td className="px-3 py-2 text-portal-sub text-[11px]">{new Date(s.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
