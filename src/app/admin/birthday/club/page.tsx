// /admin/birthday/club — sponsorable monthly newsletter list.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { ArrowLeft, Building2, Download, ArrowRight } from 'lucide-react'

export const metadata: Metadata = { title: 'Birthday Club — Admin' }
export const dynamic = 'force-dynamic'

interface ClubSub {
  id: string; brand_slug: string; email: string
  parent_first_name: string | null; kid_birthdays: Array<{ name?: string; month?: number; year?: number }> | null
  is_active: boolean; created_at: string
}

export default async function BirthdayClubPage() {
  await requireAdmin()
  const sb = createAdminClient()
  const { data } = await sb.from('birthday_club_subscribers').select('*').order('created_at', { ascending: false }).limit(1000)
  const subs = (data ?? []) as ClubSub[]
  const active = subs.filter(s => s.is_active).length

  return (
    <div className="flex-1 overflow-y-auto bg-portal-bg">
      <div className="bg-white border-b border-portal-border px-6 py-4 flex items-center justify-between">
        <div>
          <Link href="/admin/birthday" className="text-[11px] font-semibold text-portal-sub hover:text-portal-text inline-flex items-center gap-1 mb-1">
            <ArrowLeft size={11} /> Birthday Bash
          </Link>
          <h1 className="text-[18px] font-bold text-portal-text inline-flex items-center gap-2">
            <Building2 size={16} /> Birthday Club
          </h1>
          <p className="text-[12px] text-portal-sub mt-1">
            The sellable monthly newsletter list. Sponsor pays per-issue; you keep the list. Separate from Birthday Insider so both can be sold.
          </p>
        </div>
        <a href="/api/admin/birthday/club/export" download
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-bold text-white bg-portal-navy rounded hover:opacity-90">
          <Download size={11} /> Export CSV
        </a>
      </div>

      <div className="p-6 max-w-6xl space-y-4">
        <Link href="/birthday-party-guide/sponsor" target="_blank"
          className="block bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-4 hover:from-amber-100 hover:to-orange-100">
          <div className="flex items-center gap-3">
            <Building2 size={18} className="text-amber-600 shrink-0" />
            <div className="flex-1">
              <div className="text-[13px] font-bold text-portal-text">Sell sponsorship on this list</div>
              <p className="text-[11px] text-portal-sub mt-0.5">
                Birthday Club email sponsorship is part of the Sponsored Category + Presenting tiers.
                Quote $250-500/issue for one-off sponsors who don&apos;t want a full package.
              </p>
            </div>
            <ArrowRight size={14} className="text-amber-600" />
          </div>
        </Link>

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white border border-portal-border rounded-lg p-3">
            <div className="text-[20px] font-black text-portal-text">{subs.length}</div>
            <div className="text-[10px] uppercase tracking-wider text-portal-sub mt-1">Total subscribers</div>
          </div>
          <div className="bg-white border border-portal-border rounded-lg p-3">
            <div className="text-[20px] font-black text-portal-green">{active}</div>
            <div className="text-[10px] uppercase tracking-wider text-portal-sub mt-1">Active</div>
          </div>
          <div className="bg-white border border-portal-border rounded-lg p-3">
            <div className="text-[20px] font-black text-portal-text">{subs.filter(s => Array.isArray(s.kid_birthdays) && s.kid_birthdays.length > 0).length}</div>
            <div className="text-[10px] uppercase tracking-wider text-portal-sub mt-1">With kid birthdays</div>
          </div>
        </div>

        <div className="bg-white border border-portal-border rounded-lg overflow-hidden">
          <table className="w-full text-[12px]">
            <thead className="bg-portal-bg border-b border-portal-border">
              <tr className="text-left">
                <th className="px-3 py-2 text-[10px] font-bold uppercase text-portal-sub">Email</th>
                <th className="px-3 py-2 text-[10px] font-bold uppercase text-portal-sub">Parent</th>
                <th className="px-3 py-2 text-[10px] font-bold uppercase text-portal-sub">Kid birthdays</th>
                <th className="px-3 py-2 text-[10px] font-bold uppercase text-portal-sub">Joined</th>
              </tr>
            </thead>
            <tbody>
              {subs.length === 0 && <tr><td colSpan={4} className="px-3 py-6 text-center text-portal-sub">No signups yet. Add the Birthday Club signup widget to the portal to start collecting.</td></tr>}
              {subs.map(s => (
                <tr key={s.id} className="border-b border-portal-border last:border-b-0 hover:bg-portal-bg">
                  <td className="px-3 py-2 text-portal-text font-mono">{s.email}</td>
                  <td className="px-3 py-2 text-portal-sub">{s.parent_first_name ?? '—'}</td>
                  <td className="px-3 py-2 text-portal-sub text-[11px]">
                    {Array.isArray(s.kid_birthdays) && s.kid_birthdays.length > 0
                      ? s.kid_birthdays.map(k => `${k.name ?? 'Kid'} (${k.month ?? '?'}/${k.year ?? '?'})`).join(', ')
                      : '—'}
                  </td>
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
