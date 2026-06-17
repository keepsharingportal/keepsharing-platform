import type { Metadata } from 'next'
import Link from 'next/link'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { ArrowLeft, Lightbulb } from 'lucide-react'
import { ThemesClient } from './ThemesClient'

export const metadata: Metadata = { title: 'Trending Themes — Admin' }
export const dynamic = 'force-dynamic'

export default async function ThemesAdminPage() {
  await requireAdmin()
  const sb = createAdminClient()
  const { data } = await sb.from('birthday_themes').select('*').order('display_order')
  return (
    <div className="flex-1 overflow-y-auto bg-portal-bg">
      <div className="bg-white border-b border-portal-border px-6 py-4">
        <Link href="/admin/birthday" className="text-[11px] font-semibold text-portal-sub hover:text-portal-text inline-flex items-center gap-1 mb-1">
          <ArrowLeft size={11} /> Birthday Bash
        </Link>
        <h1 className="text-[18px] font-bold text-portal-text inline-flex items-center gap-2">
          <Lightbulb size={16} /> Trending Themes
        </h1>
        <p className="text-[12px] text-portal-sub mt-1">
          Theme gallery on /birthday-party-guide#themes. When this table is empty, the page renders 9 default themes;
          add rows to override.
        </p>
      </div>
      <div className="p-6 max-w-5xl">
        <ThemesClient initial={data ?? []} />
      </div>
    </div>
  )
}
