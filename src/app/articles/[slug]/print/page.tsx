// /articles/[slug]/print — print-friendly article view.
//
// Plain text + clean structure for designers to copy into InDesign.
// No navigation chrome, no ads, no sidebar. Includes the headline,
// deck, byline, body, pull quotes, and a footer with the article URL
// and word count so the designer can size the layout properly.

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { findArticleBySlug } from '@/lib/articles/slug'
import { loadBrandContext } from '@/lib/brand-context'
import { publicOriginForBrand } from '@/lib/markets'

export const dynamic = 'force-dynamic'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

interface Props { params: Promise<{ slug: string }> }

export const metadata: Metadata = {
  title: 'Print view',
  robots: { index: false, follow: false },
}

interface ArticleData extends Record<string, unknown> {
  id:            string
  title:         string
  subtitle:      string | null
  body:          string | null
  author_name:   string | null
  published_at:  string | null
  pull_quotes:   string[] | null
  brand_slug:    string | null
  slug:          string
  excerpt:       string | null
}

export default async function PrintArticleView({ params }: Props) {
  const { slug } = await params
  const supabase = getSupabase()

  const data = await findArticleBySlug<ArticleData>(supabase, slug, 'id, title, subtitle, body, author_name, published_at, pull_quotes, brand_slug, slug, excerpt')
  if (!data) notFound()

  const ctx = await loadBrandContext()
  const articleBrand = data.brand_slug ?? 'rrp'
  const canonicalUrl = `${publicOriginForBrand(articleBrand)}/articles/${slug}`

  // HTML body is stored as a string; strip basic tags for a clean
  // designer-friendly preview. Designers can also fetch the raw HTML
  // via the article API if they want richer formatting.
  const body = (data.body ?? '')
    .replace(/<\/?(p|div|section|article)[^>]*>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  const wordCount = body.split(/\s+/).filter(Boolean).length

  return (
    <main className="print-view">
      <style>{`
        body { background: #fff; }
        .print-view { max-width: 720px; margin: 0 auto; padding: 48px 32px; font-family: Georgia, 'Times New Roman', serif; color: #111; line-height: 1.6; }
        .print-view .meta-row { color: #555; font-size: 12px; text-transform: uppercase; letter-spacing: 0.12em; margin-bottom: 16px; }
        .print-view h1 { font-size: 36px; font-weight: 900; line-height: 1.15; margin: 0 0 12px; }
        .print-view .deck { font-size: 18px; font-style: italic; color: #444; line-height: 1.4; margin: 0 0 24px; }
        .print-view .byline { font-size: 13px; color: #666; margin-bottom: 32px; font-style: italic; }
        .print-view .body p { margin: 0 0 16px; font-size: 15px; }
        .print-view .pull-quote { border-left: 4px solid #ef6442; padding: 8px 0 8px 18px; margin: 24px 0; font-size: 20px; font-style: italic; color: #1a2744; }
        .print-view .footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid #ddd; font-size: 11px; color: #777; }
        .print-view .footer code { font-family: 'Courier New', monospace; font-size: 11px; }
        @media print {
          .print-view { padding: 0; }
          .print-view .footer { border-top: 1px solid #999; color: #444; }
        }
      `}</style>

      <div className="meta-row">
        {ctx.market.displayName} · Print proof · {data.published_at ? new Date(data.published_at).toLocaleDateString() : 'Unpublished'}
      </div>
      <h1>{data.title}</h1>
      {data.subtitle && <p className="deck">{data.subtitle}</p>}
      {data.author_name && <p className="byline">By {data.author_name}</p>}

      <div className="body">
        {body.split(/\n\n+/).map((para, i) => (
          <p key={i}>{para}</p>
        ))}
      </div>

      {data.pull_quotes && data.pull_quotes.length > 0 && (
        <div>
          <p style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#555', marginTop: 32 }}>
            Suggested pull quotes
          </p>
          {data.pull_quotes.map((q, i) => (
            <blockquote key={i} className="pull-quote">{q}</blockquote>
          ))}
        </div>
      )}

      <div className="footer">
        <p><strong>Online:</strong> <code>{canonicalUrl}</code></p>
        <p><strong>Word count:</strong> {wordCount.toLocaleString()}</p>
        <p style={{ marginTop: 8 }}>Print proof — not for online distribution.</p>
      </div>
    </main>
  )
}
