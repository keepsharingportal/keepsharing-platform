// POST /api/admin/seo/schema-validate
//
// Builds a representative URL sample for one brand (home, latest 8
// articles per column, /authors/* for top 4 bylines) and runs the
// schema graph validator. Returns the structured result so the UI
// can render issues per severity.
//
// Defaults to scoping by brand for publisher/editor; super/admin can
// target any brand via the body's brandSlug.

import { NextRequest, NextResponse } from 'next/server'
import { requireSettingsAccess } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { MARKETS } from '@/lib/markets'
import { getBrandSeoConfig } from '@/lib/seo/brand-seo'
import { validateSchemaGraph } from '@/lib/seo/schema-validator'

export const runtime     = 'nodejs'
export const dynamic     = 'force-dynamic'
export const maxDuration = 120

interface Body { brandSlug?: string; pageLimit?: number }

export async function POST(req: NextRequest) {
  await requireSettingsAccess()
  const body = await req.json().catch(() => ({})) as Body
  const slug = (body?.brandSlug ?? 'rrp') as string
  const market = MARKETS.find(m => m.slug === slug)
  if (!market) return NextResponse.json({ error: `Unknown brand: ${slug}` }, { status: 400 })
  const pageLimit = Math.min(60, Math.max(5, body?.pageLimit ?? 30))

  const sb = createAdminClient()
  const seo = getBrandSeoConfig(market, `https://${market.publicHost ?? 'example.com'}`)
  const origin = seo.url
  const expectedOrgId = `${origin}#organization`

  // Build the URL sample.
  const urls: string[] = []
  urls.push(`${origin}/`)

  // Latest articles per column slug, capped to pageLimit total.
  const { data: arts } = await sb
    .from('guide_articles')
    .select('slug, column_slug, author_name')
    .eq('published', true)
    .eq('brand_slug', slug)
    .order('published_at', { ascending: false })
    .limit(120)

  const byColumn = new Map<string, Array<{ slug: string; author_name: string | null }>>()
  for (const a of (arts ?? []) as Array<{ slug: string; column_slug: string | null; author_name: string | null }>) {
    if (!a.column_slug) continue
    const list = byColumn.get(a.column_slug) ?? []
    if (list.length < 4) {
      list.push({ slug: a.slug, author_name: a.author_name })
      byColumn.set(a.column_slug, list)
    }
  }
  for (const [col, list] of byColumn) {
    for (const a of list) {
      if (urls.length >= pageLimit - 4) break
      urls.push(`${origin}/columns/${col}/${a.slug}`)
    }
  }

  // Top 4 bylines → author pages.
  const tally = new Map<string, number>()
  for (const a of (arts ?? []) as Array<{ author_name: string | null }>) {
    const n = (a.author_name ?? '').trim()
    if (!n) continue
    tally.set(n, (tally.get(n) ?? 0) + 1)
  }
  const { authorNameToSlug } = await import('@/lib/seo/author-slug')
  const topAuthors = Array.from(tally.entries()).sort((a, b) => b[1] - a[1]).slice(0, 4)
  for (const [name] of topAuthors) {
    const aSlug = authorNameToSlug(name)
    if (aSlug) urls.push(`${origin}/authors/${aSlug}`)
  }

  const result = await validateSchemaGraph(urls, expectedOrgId)
  return NextResponse.json({ ok: true, brandSlug: slug, expectedOrgId, ranAt: new Date().toISOString(), ...result })
}
