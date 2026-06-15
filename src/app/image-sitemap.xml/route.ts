// ── Image sitemap ────────────────────────────────────────────────────────────
//
// Google supports a per-page image sitemap extension that surfaces
// pages alongside their images for Google Images. Eligible for image
// rich results.
//
// Format: <url> entries with one or more <image:image> children
// containing <image:loc>, <image:title>, <image:caption>. We emit
// every published article that has a hero_image_url, plus its image
// metadata.

import { createClient } from '@supabase/supabase-js'
import { loadBrandContext } from '@/lib/brand-context'

export const runtime = 'nodejs'
export const revalidate = 3600

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export async function GET() {
  const ctx      = await loadBrandContext()
  const origin   = ctx.publicOrigin.replace(/\/$/, '')
  const supabase = getSupabase()

  // Cap at 1,000 articles (Google limit for a single image sitemap).
  // When the corpus crosses that we'll shard via sitemap-index.
  const { data: articles } = await supabase
    .from('guide_articles')
    .select('column_slug, slug, title, hero_image_url, excerpt')
    .eq('published', true)
    .not('hero_image_url', 'is', null)
    .order('published_at', { ascending: false })
    .limit(1000)

  const rows = (articles ?? []).filter(a =>
    a.column_slug && a.slug && a.hero_image_url
  )

  const urlEntries = rows.map(a => {
    const pageUrl = `${origin}/columns/${a.column_slug}/${a.slug}`
    const caption = (a.excerpt as string | null) ?? ''
    return `  <url>
    <loc>${xmlEscape(pageUrl)}</loc>
    <image:image>
      <image:loc>${xmlEscape(a.hero_image_url as string)}</image:loc>
      <image:title>${xmlEscape(a.title as string)}</image:title>
      ${caption ? `<image:caption>${xmlEscape(caption)}</image:caption>` : ''}
    </image:image>
  </url>`
  }).join('\n')

  // Also include town hero images — they're high-quality landing
  // photos that Google indexes well.
  const { data: towns } = await supabase
    .from('town_profiles')
    .select('slug, name, vibe_one_line, hero_image_url')
    .eq('is_active', true)
    .not('hero_image_url', 'is', null)

  const townEntries = (towns ?? []).filter(t => t.slug && t.hero_image_url).map(t => {
    const pageUrl = `${origin}/family-resource-guide/town/${t.slug}`
    return `  <url>
    <loc>${xmlEscape(pageUrl)}</loc>
    <image:image>
      <image:loc>${xmlEscape(t.hero_image_url as string)}</image:loc>
      <image:title>${xmlEscape(t.name as string)}</image:title>
      ${t.vibe_one_line ? `<image:caption>${xmlEscape(t.vibe_one_line as string)}</image:caption>` : ''}
    </image:image>
  </url>`
  }).join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urlEntries}
${townEntries}
</urlset>`

  return new Response(xml, {
    status:  200,
    headers: {
      'Content-Type':  'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600',
    },
  })
}
