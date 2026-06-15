// ── Per-column RSS feed ─────────────────────────────────────────────────────
//
// Same RSS 2.0 shape as /feed.xml but filtered to a single editorial
// column. Lets feed readers subscribe to (e.g.) Play Ball only without
// getting the firehose. Each column page advertises this feed via a
// <link rel="alternate"> in the column page head.

import { createClient } from '@supabase/supabase-js'
import { loadBrandContext } from '@/lib/brand-context'
import { getBrandSeoConfig } from '@/lib/seo/brand-seo'

export const runtime = 'nodejs'
export const revalidate = 600

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

function rfc822(iso: string): string {
  return new Date(iso).toUTCString()
}

export async function GET(_req: Request, { params }: { params: Promise<{ column: string }> }) {
  const { column } = await params
  const ctx      = await loadBrandContext()
  const seoCfg   = getBrandSeoConfig(ctx.market, ctx.publicOrigin)
  const origin   = seoCfg.url
  const supabase = getSupabase()

  const [{ data: meta }, { data: articles }] = await Promise.all([
    supabase
      .from('monthly_columns')
      .select('display_name, description')
      .eq('slug', column)
      .maybeSingle(),
    supabase
      .from('guide_articles')
      .select('column_slug, slug, title, published_at, dek, excerpt, hero_image_url, author_name')
      .eq('status', 'published')
      .eq('column_slug', column)
      .order('published_at', { ascending: false })
      .limit(50),
  ])

  const rows = (articles ?? []).filter(a => a.slug && a.title)
  const colTitle = (meta?.display_name as string | null) ?? column.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
  const colDesc  = (meta?.description as string | null) ?? `${colTitle} stories from ${seoCfg.organizationName}.`
  const lastBuild = rows[0]?.published_at ?? new Date().toISOString()

  const items = rows.map(a => {
    const link = `${origin}/columns/${column}/${a.slug}`
    const desc = (a.excerpt as string | null) ?? (a.dek as string | null) ?? ''
    const pubDate = a.published_at ? rfc822(a.published_at as string) : new Date().toUTCString()
    return `    <item>
      <title>${xmlEscape(a.title as string)}</title>
      <link>${xmlEscape(link)}</link>
      <guid isPermaLink="true">${xmlEscape(link)}</guid>
      <pubDate>${xmlEscape(pubDate)}</pubDate>
      ${a.author_name ? `<dc:creator>${xmlEscape(a.author_name as string)}</dc:creator>` : ''}
      <description>${xmlEscape(desc)}</description>
      ${a.hero_image_url ? `<enclosure url="${xmlEscape(a.hero_image_url as string)}" type="image/jpeg" />` : ''}
      <category>${xmlEscape(column)}</category>
    </item>`
  }).join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
     xmlns:atom="http://www.w3.org/2005/Atom"
     xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${xmlEscape(`${seoCfg.organizationName} — ${colTitle}`)}</title>
    <link>${xmlEscape(`${origin}/columns/${column}`)}</link>
    <atom:link href="${xmlEscape(`${origin}/columns/${column}/feed.xml`)}" rel="self" type="application/rss+xml" />
    <description>${xmlEscape(colDesc)}</description>
    <language>en-us</language>
    <lastBuildDate>${xmlEscape(rfc822(lastBuild))}</lastBuildDate>
    <generator>Next.js</generator>
${items}
  </channel>
</rss>`

  return new Response(xml, {
    status:  200,
    headers: {
      'Content-Type':  'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=300',
    },
  })
}
