// /admin/social/pool — content pool hub
//
// Index page linking to the three pool admin tables: quote_bank,
// curated_videos, community_spotlights. Articles + school bits +
// events already have their own admin pages, so the strategist
// picks them up from there automatically.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireSettingsAccess } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { ArrowLeft, Quote, Video, Users, ArrowRight } from 'lucide-react'

export const metadata: Metadata = { title: 'Content pool — Admin' }
export const dynamic = 'force-dynamic'

export default async function PoolHomePage() {
  await requireSettingsAccess()
  const sb = createAdminClient()
  const [{ count: quotes }, { count: videos }, { count: spots }] = await Promise.all([
    sb.from('quote_bank').select('id', { count: 'exact', head: true }).eq('is_active', true),
    sb.from('curated_videos').select('id', { count: 'exact', head: true }).eq('is_active', true),
    sb.from('community_spotlights').select('id', { count: 'exact', head: true }).eq('is_active', true),
  ])

  const tiles = [
    { href: '/admin/social/pool/quotes',     icon: Quote, title: 'Quote bank',          count: quotes ?? 0, desc: 'Editor-curated quotes. The strategist surfaces these in evening/inspiring slots.' },
    { href: '/admin/social/pool/videos',     icon: Video, title: 'Curated videos',      count: videos ?? 0, desc: 'YouTube/Vimeo recipes, tutorials, tips. Posted as link previews.' },
    { href: '/admin/social/pool/spotlights', icon: Users, title: 'Community spotlights', count: spots  ?? 0, desc: 'Local people, businesses, students worth featuring on social.' },
  ]

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="bg-white border-b border-portal-border px-6 py-4 shrink-0">
        <Link href="/admin/social/plan" className="text-[11px] font-semibold text-portal-sub hover:text-portal-text inline-flex items-center gap-1 mb-1">
          <ArrowLeft size={11} /> Social plan
        </Link>
        <h1 className="text-[18px] font-bold text-portal-text">Content pool</h1>
        <p className="text-[12px] text-portal-sub mt-1">
          Items the strategist pulls from when composing the weekly plan. Articles, school bits, and events
          come from their own admin sections.
        </p>
      </div>
      <div className="flex-1 overflow-y-auto bg-portal-bg">
        <div className="px-6 py-6 max-w-4xl">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {tiles.map(t => {
              const Icon = t.icon
              return (
                <Link key={t.href} href={t.href}
                  className="bg-white border border-portal-border rounded-lg p-4 hover:border-portal-blue/40 transition-colors block">
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-9 h-9 rounded-lg bg-portal-bg text-portal-navy flex items-center justify-center">
                      <Icon size={16} />
                    </div>
                    <span className="text-[20px] font-black text-portal-text">{t.count}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[14px] font-bold text-portal-text mb-1">
                    {t.title} <ArrowRight size={12} className="text-portal-sub" />
                  </div>
                  <p className="text-[12px] text-portal-sub leading-relaxed">{t.desc}</p>
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
