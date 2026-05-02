import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'
import type { GuideArticle, GuideListing } from '@/components/family-guide/types'
import { FeaturedListing } from '@/components/family-guide/FeaturedListing'
import { EnhancedListing } from '@/components/family-guide/EnhancedListing'
import { InlineSubmissionWidget } from '@/components/community/InlineSubmissionWidget'
import { NewsletterSignup } from '@/components/newsletter/NewsletterSignup'
import { NewsletterPopupTrigger } from '@/components/newsletter/NewsletterPopupTrigger'

interface Props { params: Promise<{ slug: string }> }

// ── Markdown renderer (Fraunces headers, DM Sans body) ────────────────────────

function renderMarkdown(md: string): React.ReactNode[] {
  const blocks = md.split(/\n{2,}/).filter(Boolean)
  return blocks.map((block, i) => {
    const trimmed = block.trim()

    if (trimmed.startsWith('## ')) {
      return (
        <h2 key={i} style={{
          fontFamily: 'var(--font-fraunces, serif)',
          fontSize: 'clamp(20px, 3vw, 26px)',
          fontWeight: 700,
          color: 'var(--fg-navy, #1a2744)',
          marginTop: 40,
          marginBottom: 12,
          lineHeight: 1.2,
        }}>
          {trimmed.slice(3)}
        </h2>
      )
    }
    if (trimmed.startsWith('### ')) {
      return (
        <h3 key={i} style={{
          fontFamily: 'var(--font-fraunces, serif)',
          fontSize: 18,
          fontWeight: 700,
          color: 'var(--fg-navy, #1a2744)',
          marginTop: 28,
          marginBottom: 8,
        }}>
          {trimmed.slice(4)}
        </h3>
      )
    }

    // Bullet list
    if (trimmed.split('\n').every(line => line.trim().startsWith('- '))) {
      return (
        <ul key={i} style={{ display: 'flex', flexDirection: 'column', gap: 10, margin: '16px 0', listStyle: 'none', padding: 0 }}>
          {trimmed.split('\n').filter(l => l.trim().startsWith('- ')).map((line, j) => (
            <li key={j} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 17, lineHeight: 1.75, color: '#333' }}>
              <span style={{ marginTop: 10, width: 6, height: 6, borderRadius: '50%', backgroundColor: 'var(--fg-gold, #d4a843)', flexShrink: 0 }} />
              <span dangerouslySetInnerHTML={{ __html: line.replace(/^-\s+/, '').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') }} />
            </li>
          ))}
        </ul>
      )
    }

    const html = trimmed.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    return (
      <p key={i} style={{ fontSize: 17, color: '#333', lineHeight: 1.8, margin: '0 0 4px' }}
        dangerouslySetInnerHTML={{ __html: html }} />
    )
  })
}

// ── Data ──────────────────────────────────────────────────────────────────────

async function getArticle(slug: string): Promise<GuideArticle | null> {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('guide_articles')
      .select('*')
      .eq('guide_slug', 'newcomer-guide')
      .eq('slug', slug)
      .maybeSingle()
    return data as GuideArticle | null
  } catch {
    return null
  }
}

async function getRelatedListings(articleSlug: string): Promise<GuideListing[]> {
  const ARTICLE_TO_CATS: Record<string, string[]> = {
    'choosing-the-right-school-district': ['public-schools', 'private-schools'],
    'establishing-pediatric-care':        ['pediatricians', 'dental-ortho', 'urgent-care'],
    'where-to-find-your-people':          ['worship', 'sports-activities', 'family-activities'],
  }
  const slugs = ARTICLE_TO_CATS[articleSlug]
  if (!slugs?.length) return []

  try {
    const supabase = await createClient()
    const { data: cats } = await supabase
      .from('guide_categories')
      .select('id')
      .eq('guide_slug', 'newcomer-guide')
      .in('slug', slugs)

    if (!cats?.length) return []
    const catIds = cats.map((c: { id: string }) => c.id)

    const { data } = await supabase
      .from('guide_listings')
      .select('*')
      .in('category_id', catIds)
      .in('listing_tier', ['featured', 'enhanced'])
      .order('listing_tier')
      .order('display_order')
      .limit(6)

    return (data ?? []) as GuideListing[]
  } catch {
    return []
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const article = await getArticle(slug)
  if (!article) return {}
  return {
    title: `${article.title} — River Region Family Guide`,
    description: article.excerpt ?? undefined,
  }
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params
  const [article, related] = await Promise.all([getArticle(slug), getRelatedListings(slug)])
  if (!article) notFound()

  const featuredRelated = related.filter(l => l.listing_tier === 'featured')
  const enhancedRelated = related.filter(l => l.listing_tier === 'enhanced')
  const hasImage = !!article.hero_image_url

  return (
    <div style={{ backgroundColor: 'var(--fg-cream, #faf8f5)', minHeight: '100vh', fontFamily: 'var(--font-dm-sans, sans-serif)' }}>

      {/* Breadcrumb */}
      <div style={{ backgroundColor: 'white', borderBottom: '1px solid rgba(0,0,0,0.06)', padding: '10px 20px' }}>
        <div style={{ maxWidth: 780, margin: '0 auto' }}>
          <Link href="/newcomer-guide" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 600, color: 'var(--fg-sky, #4a90d9)', textDecoration: 'none' }}>
            <ArrowLeft size={13} /> Back to Family Resource Guide
          </Link>
        </div>
      </div>

      {/* Hero */}
      <div style={{ position: 'relative', overflow: 'hidden', minHeight: 340 }}>
        {hasImage ? (
          <>
            <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${article.hero_image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(26,39,68,0.45) 0%, rgba(26,39,68,0.92) 100%)' }} />
          </>
        ) : (
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, var(--fg-navy, #1a2744) 0%, #2a3f6f 100%)' }} />
        )}
        <div style={{ position: 'relative', maxWidth: 780, margin: '0 auto', padding: '56px 20px 52px' }}>
          <span style={{ display: 'inline-block', padding: '3px 12px', borderRadius: 4, fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', backgroundColor: 'var(--fg-terra, #c4622d)', color: 'white', marginBottom: 18 }}>
            Family Resource Guide · Article
          </span>
          <h1 style={{
            fontFamily: 'var(--font-fraunces, serif)',
            fontSize: 'clamp(28px, 5vw, 48px)',
            fontWeight: 900,
            fontStyle: 'italic',
            color: 'white',
            lineHeight: 1.1,
            letterSpacing: '-0.02em',
            marginBottom: 18,
          }}>
            {article.title}
          </h1>
          {article.excerpt && (
            <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.75)', lineHeight: 1.6, maxWidth: 580, marginBottom: 20 }}>
              {article.excerpt}
            </p>
          )}
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', display: 'flex', gap: 8, alignItems: 'center' }}>
            <span>{article.author_name}</span>
            {article.author_byline && article.author_byline !== article.author_name && (
              <>
                <span style={{ opacity: 0.4 }}>·</span>
                <span style={{ fontStyle: 'italic' }}>{article.author_byline}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Article body */}
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '48px 20px 80px' }}>
        <article style={{ display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 64, fontFamily: 'var(--font-dm-sans, sans-serif)' }}>
          {article.body ? renderMarkdown(article.body) : (
            <p style={{ color: '#aaa', fontStyle: 'italic', fontSize: 15 }}>Full article coming soon.</p>
          )}
        </article>

        {/* Newsletter CTA */}
        <div style={{
          borderRadius: 20,
          padding: '36px 32px',
          marginBottom: 56,
          background: 'linear-gradient(135deg, var(--fg-navy, #1a2744) 0%, #2a3f6f 100%)',
          textAlign: 'center',
        }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--fg-gold, #d4a843)', marginBottom: 10 }}>
            River Region Parents
          </p>
          <h3 style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 22, fontWeight: 700, color: 'white', marginBottom: 10 }}>
            Stay Connected to Your Community
          </h3>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.65)', lineHeight: 1.6, marginBottom: 24, maxWidth: 420, margin: '0 auto 24px' }}>
            Join thousands of River Region families who get local news, events, and resources delivered to their inbox.
          </p>
          <Link href="/advertise" style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '11px 24px', borderRadius: 10, fontSize: 13, fontWeight: 700,
            backgroundColor: 'var(--fg-gold, #d4a843)', color: '#3d1f17', textDecoration: 'none',
          }}>
            Subscribe free <ArrowRight size={14} />
          </Link>
        </div>

        {/* Related listings */}
        {(featuredRelated.length > 0 || enhancedRelated.length > 0) && (
          <div style={{ marginBottom: 48 }}>
            <h2 style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 22, fontWeight: 700, color: 'var(--fg-navy, #1a2744)', marginBottom: 20 }}>
              Resources in this section
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {featuredRelated.map(l => <FeaturedListing key={l.id} listing={l} />)}
              {enhancedRelated.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
                  {enhancedRelated.map(l => <EnhancedListing key={l.id} listing={l} />)}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Newsletter signup — inline after article body */}
        <NewsletterSignup
          variant="inline"
          source="article-footer"
          context={{ article_slug: article.slug }}
          headline="Want more like this?"
          subheadline="Get the best of River Region Parents in your inbox every Friday morning."
          cta_label="Send Me the Newsletter"
        />

        {/* Mom Insiders inline widget */}
        <InlineSubmissionWidget
          contextQuestion={`Tell us how YOUR family experienced what this article is about`}
          contextPlaceholder="Share your story — where you went, what helped, what you'd tell a new family..."
          source="inline-widget"
          sourceArticle={article.slug}
        />

        {/* Popup trigger — fires at 60% scroll + 30s on page */}
        <NewsletterPopupTrigger source="article-popup" context={{ article_slug: article.slug }} />

        {/* Business CTA */}
        <div style={{ marginBottom: 32, padding: '18px 20px', borderRadius: 14, backgroundColor: 'var(--fg-sky-light, #e8f2fc)', border: '1px solid rgba(74,144,217,0.2)' }}>
          <p style={{ fontSize: 13, color: '#444', lineHeight: 1.6 }}>
            Are you a local business families need to know about?{' '}
            <Link href="/advertise" style={{ color: 'var(--fg-sky, #4a90d9)', fontWeight: 700, textDecoration: 'none' }}>
              See how we partner with businesses →
            </Link>
          </p>
        </div>

        {/* Back nav */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <Link href="/newcomer-guide" style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '9px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600,
            border: '1.5px solid rgba(196,98,45,0.3)', color: 'var(--fg-terra, #c4622d)', textDecoration: 'none',
          }}>
            <ArrowLeft size={13} /> Return to Family Guide
          </Link>
          <Link href="/newcomer-guide#directory" style={{ fontSize: 13, color: 'var(--fg-sky, #4a90d9)', textDecoration: 'none', fontWeight: 500 }}>
            Browse full directory →
          </Link>
        </div>
      </div>
    </div>
  )
}
