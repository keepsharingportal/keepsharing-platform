// ── RSS 2.0 feed of the latest articles ──────────────────────────────────────
//
// Feed readers, content aggregators, Apple News, news monitoring
// services, and (yes) some search engines pick this up. Emitting a
// valid RSS feed is a freshness signal AND a syndication channel
// that brings traffic back to the site organically.

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

/** RSS pubDate requires RFC-822 format. Date.prototype.toUTCString
 *  already produces an RFC-822-compatible string. */
function rfc822(iso: string): string {
  return new Date(iso).toUTCString()
}

export async function GET() {
  const ctx      = await loadBrandContext()
  const seoCfg   = getBrandSeoConfig(ctx.market, ctx.publicOrigin)
  const origin   = seoCfg.url
  const supabase = getSupabase()

  // Latest 50 published articles. Date order so feed readers show
  // newest at the top.
  const { data: articles } = await supabase
    .from('guide_articles')
    .select('column_slug, slug, title, published_at, dek, excerpt, hero_image_url, author_name')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(50)

  const rows = (articles ?? []).filter(a => a.column_slug && a.slug && a.title)
  const lastBuild = rows[0]?.published_at ?? new Date().toISOString()

  const items = rows.map(a => {
    const link = `${origin}/columns/${a.column_slug}/${a.slug}`
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
      <category>${xmlEscape(a.column_slug as string)}</category>
    </item>`
  }).join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
     xmlns:atom="http://www.w3.org/2005/Atom"
     xmlns:dc="http://purl.org/dc/elements/1.1/"
     xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${xmlEscape(seoCfg.organizationName)}</title>
    <link>${xmlEscape(origin)}</link>
    <atom:link href="${xmlEscape(origin)}/feed.xml" rel="self" type="application/rss+xml" />
    <description>${xmlEscape(seoCfg.slogan)}</description>
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
