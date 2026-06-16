// /admin/birthday — Hub for managing The Big Birthday Bash portal.
// Tile grid linking to each editor-managed table.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { ArrowLeft, Camera, Gift, FileText, Lightbulb, Quote, ArrowRight, Mail, DollarSign } from 'lucide-react'

export const metadata: Metadata = { title: 'Big Birthday Bash — Admin' }
export const dynamic = 'force-dynamic'

export default async function BirthdayAdminHub() {
  await requireAdmin()
  const sb = createAdminClient()

  const [pending, freebies, themes, tiers, printables, tips, subs] = await Promise.all([
    sb.from('birthday_real_parties').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    sb.from('birthday_freebies').select('id', { count: 'exact', head: true }).eq('is_active', true),
    sb.from('birthday_themes').select('id', { count: 'exact', head: true }).eq('is_active', true),
    sb.from('birthday_budget_tiers').select('id', { count: 'exact', head: true }).eq('is_active', true),
    sb.from('birthday_printables').select('id', { count: 'exact', head: true }).eq('is_active', true),
    sb.from('birthday_mom_tips').select('id', { count: 'exact', head: true }).eq('is_active', true),
    sb.from('birthday_planning_subscribers').select('id', { count: 'exact', head: true }).eq('is_active', true),
  ])

  const tiles = [
    { href: '/admin/birthday/real-parties', icon: Camera,    title: 'Real Parties (UGC)', count: pending.count ?? 0, hint: 'Moderate mom-submitted party photos. Pending review.', urgent: (pending.count ?? 0) > 0 },
    { href: '/admin/birthday/freebies',     icon: Gift,      title: 'Freebies',           count: freebies.count ?? 0, hint: 'Local birthday freebie offers — the SEO-darling list.' },
    { href: '/admin/birthday/themes',       icon: Lightbulb, title: 'Trending Themes',    count: themes.count ?? 0,   hint: 'Trending Themes gallery — defaults render until you customize.' },
    { href: '/admin/birthday/budget-tiers', icon: DollarSign,title: 'Budget Tiers',       count: tiers.count ?? 0,    hint: '3-tier Plan-by-Budget — the differentiator block.' },
    { href: '/admin/birthday/printables',   icon: FileText,  title: 'Printables',         count: printables.count ?? 0, hint: 'Invitations, thank-yous, banners. is_premium = email-gated.' },
    { href: '/admin/birthday/mom-tips',     icon: Quote,     title: 'Mom-to-Mom Tips',    count: tips.count ?? 0,     hint: 'Short quoted advice from local moms.' },
    { href: '/admin/birthday/subscribers',  icon: Mail,      title: 'Insider Subscribers', count: subs.count ?? 0,    hint: 'Email captures — Timeline drip + Freebies PDF + Newsletter.' },
  ]

  return (
    <div className="flex-1 overflow-y-auto bg-portal-bg">
      <div className="bg-white border-b border-portal-border px-6 py-4">
        <Link href="/admin" className="text-[11px] font-semibold text-portal-sub hover:text-portal-text inline-flex items-center gap-1 mb-1">
          <ArrowLeft size={11} /> Admin
        </Link>
        <h1 className="text-[18px] font-bold text-portal-text">🎂 The Big Birthday Bash</h1>
        <p className="text-[12px] text-portal-sub mt-1">
          Manage every editor-touchable block on the <Link href="/birthday-party-guide" target="_blank" className="text-portal-blue hover:underline">public Birthday Bash page</Link>.
        </p>
      </div>

      <div className="p-6 max-w-5xl">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {tiles.map(t => {
            const Icon = t.icon
            return (
              <Link key={t.href} href={t.href}
                className="bg-white border border-portal-border rounded-lg p-4 hover:border-portal-blue/40 transition-colors block relative">
                {t.urgent && (
                  <span className="absolute top-2 right-2 inline-flex items-center px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white bg-portal-red rounded-full">
                    {t.count} pending
                  </span>
                )}
                <div className="flex items-center justify-between mb-2">
                  <div className="w-9 h-9 rounded-lg bg-portal-bg text-portal-navy flex items-center justify-center">
                    <Icon size={16} />
                  </div>
                  {!t.urgent && <span className="text-[20px] font-black text-portal-text">{t.count}</span>}
                </div>
                <div className="flex items-center gap-1.5 text-[14px] font-bold text-portal-text mb-1">
                  {t.title} <ArrowRight size={12} className="text-portal-sub" />
                </div>
                <p className="text-[12px] text-portal-sub leading-relaxed">{t.hint}</p>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
