// ── Google News sitemap ──────────────────────────────────────────────────────
//
// Google News has its own sitemap format — different from the standard
// sitemap.xml. Requirements:
//   - Only articles from the last 48 HOURS (Google rejects older)
//   - Per-article: <news:publication> (publisher + language),
//                  <news:publication_date>, <news:title>,
//                  <news:keywords>
//   - Max 1,000 URLs per file
//
// Even if we're not yet approved for Google News inclusion, emitting
// this sitemap correctly is one of the prerequisites Google checks
// during their evaluation — so it's a real ranking signal long before
// formal acceptance.

import { createClient } from '@supabase/supabase-js'
import { loadBrandContext } from '@/lib/brand-context'

export const runtime = 'nodejs'
export const revalidate = 600  // refresh every 10 minutes (news cadence)

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
  const pubName  = ctx.market.displayName
  const supabase = getSupabase()

  // Last 48 hours, published only, descending by published_at.
  // Limit 1000 per Google's spec.
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
  const { data: articles } = await supabase
    .from('guide_articles')
    .select('column_slug, slug, title, published_at, dek, excerpt')
    .eq('published', true)
    .gte('published_at', cutoff)
    .order('published_at', { ascending: false })
    .limit(1000)

  const rows = (articles ?? []).filter(a => a.column_slug && a.slug && a.title && a.published_at)

  const urlEntries = rows.map(a => {
    const articleUrl = `${origin}/columns/${a.column_slug}/${a.slug}`
    const keywords   = [a.column_slug as string].filter(Boolean).join(', ')
    return `  <url>
    <loc>${xmlEscape(articleUrl)}</loc>
    <news:news>
      <news:publication>
        <news:name>${xmlEscape(pubName)}</news:name>
        <news:language>en</news:language>
      </news:publication>
      <news:publication_date>${xmlEscape(a.published_at as string)}</news:publication_date>
      <news:title>${xmlEscape(a.title as string)}</news:title>
      ${keywords ? `<news:keywords>${xmlEscape(keywords)}</news:keywords>` : ''}
    </news:news>
  </url>`
  }).join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${urlEntries}
</urlset>`

  return new Response(xml, {
    status:  200,
    headers: {
      'Content-Type':  'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=300',
    },
  })
}
