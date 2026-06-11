// /admin/directory/suggestions — review community-submitted directory entries.

import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'
import { SuggestionsClient, type SuggestionRow } from './SuggestionsClient'

export const metadata: Metadata = { title: 'Directory Suggestions — Admin' }
export const dynamic = 'force-dynamic'

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export default async function SuggestionsPage() {
  const sb = supabaseAdmin()
  const { data: sData } = await sb.from('directory_suggestions').select('*').order('submitted_at', { ascending: false }).limit(100)
  const suggestions = (sData ?? []) as SuggestionRow[]

  const { data: cData } = await sb.from('directory_categories').select('brand_slug, slug, name, emoji').eq('is_active', true)
  const categories = (cData ?? []) as Array<{ brand_slug: string; slug: string; name: string; emoji: string | null }>

  return (
    <div className="flex-1 overflow-y-auto bg-portal-bg">
      <div className="bg-white border-b border-portal-border px-6 py-4">
        <Link href="/admin/directory" className="inline-flex items-center gap-1 text-[11px] text-portal-blue hover:text-portal-blue-dk mb-1">
          <ArrowLeft size={11} /> Directory
        </Link>
        <h1 className="portal-page-title">Suggestions</h1>
        <p className="portal-page-subtitle">Community-submitted directory entries. Generate an AI draft, edit, then accept or reject.</p>
      </div>
      <div className="p-6 max-w-5xl">
        <SuggestionsClient suggestions={suggestions} categories={categories} />
      </div>
    </div>
  )
}
