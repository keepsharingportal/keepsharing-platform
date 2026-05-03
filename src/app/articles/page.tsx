import { createClient } from '@supabase/supabase-js'
import Image from 'next/image'
import Link from 'next/link'
import { Navigation } from '@/components/Navigation'
import { PublicFooter } from '@/components/PublicFooter'
import { Badge } from '@/components/ui/badge'
import { getFallbackByContext } from '@/lib/image-fallbacks'
import type { Metadata } from 'next'

export const revalidate = 1800

export const metadata: Metadata = {
  title:       'Articles — River Region Parents',
  description: 'Local family stories, monthly columns, and parenting resources from River Region Parents.',
}

const COLUMN_LABELS: Record<string, string> = {
  'mom-to-mom':           'Mom to Mom',
  'grands-greatest':      'Grands are the Greatest',
  'teacher-of-month':     'Teacher of the Month',
  'meeting-kids':         'Meeting Kids Where They Are',
  'dave-says':            'Dave Says',
  'teens-tweens-screens': 'Teens, Tweens & Screens',
}

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

export default async function ArticlesIndexPage() {
  const supabase = getSupabase()

  const { data: articles } = await supabase
    .from('guide_articles')
    .select('id, title, slug, excerpt, hero_image_url, author_name, published_at, column_slug, guide_slug, issue_month, issue_year')
    .eq('editorial_review_status', 'approved')
    .order('created_at', { ascending: false })
    .limit(24)

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="container py-8 md:py-12">
        <div className="max-w-2xl mb-10">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4 leading-tight">All Articles</h1>
          <p className="text-lg text-muted-foreground">
            Local family stories, monthly columns, and resources from the River Region.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {(articles ?? []).map((a) => {
            const cs = a.column_slug as string | null
            const gs = a.guide_slug as string | null
            const articleUrl = cs
              ? `/columns/${cs}/${a.slug.replace(new RegExp(`^${cs}-`), '')}`
              : `/articles/${a.slug}`
            const categoryLabel = cs
              ? (COLUMN_LABELS[cs] ?? cs)
              : gs?.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) ?? 'Feature'
            const heroUrl = a.hero_image_url || getFallbackByContext(cs ?? gs ?? 'parenting', a.id)
            const dateLabel = a.published_at
              ? new Date(a.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
              : ''

            return (
              <Link key={a.id} href={articleUrl} className="group flex flex-col gap-3">
                <div className="relative aspect-[3/2] rounded-2xl overflow-hidden bg-muted">
                  <Image
                    src={heroUrl}
                    alt={a.title}
                    fill
                    style={{ objectFit: 'cover' }}
                    className="group-hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 768px) 100vw, 33vw"
                    unoptimized
                  />
                  <div className="absolute top-3 left-3">
                    <Badge variant="secondary" className="bg-background/90 text-foreground backdrop-blur text-xs">
                      {categoryLabel}
                    </Badge>
                  </div>
                </div>
                <h2 className="font-bold text-lg leading-tight group-hover:text-primary transition-colors text-foreground line-clamp-2">
                  {a.title}
                </h2>
                {a.excerpt && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{a.excerpt}</p>
                )}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {a.author_name && <span className="font-medium">{a.author_name}</span>}
                  {dateLabel && <><span>·</span><span>{dateLabel}</span></>}
                </div>
              </Link>
            )
          })}
        </div>
      </main>

      <PublicFooter />
    </div>
  )
}
