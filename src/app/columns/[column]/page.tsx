import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import Image from 'next/image'
import Link from 'next/link'
import { Navigation } from '@/components/Navigation'
import { PublicFooter } from '@/components/PublicFooter'
import { Badge } from '@/components/ui/badge'
import { getFallbackByContext } from '@/lib/image-fallbacks'
import type { Metadata } from 'next'

export const revalidate = 1800

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

interface PageParams {
  params: Promise<{ column: string }>
}

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { column } = await params
  const supabase = getSupabase()
  const { data } = await supabase.from('monthly_columns').select('display_name, description').eq('slug', column).maybeSingle()
  if (!data) return { title: 'Column — River Region Parents' }
  return {
    title:       `${data.display_name} — River Region Parents`,
    description: data.description ?? undefined,
  }
}

export default async function ColumnLandingPage({ params }: PageParams) {
  const { column } = await params
  const supabase = getSupabase()

  const [columnRes, articlesRes] = await Promise.all([
    supabase.from('monthly_columns').select('*').eq('slug', column).maybeSingle(),
    supabase.from('guide_articles')
      .select('id, title, slug, excerpt, hero_image_url, author_name, published_at, column_slug, issue_month, issue_year, guide_slug')
      .eq('column_slug', column)
      .eq('editorial_review_status', 'approved')
      .order('created_at', { ascending: false }),
  ])

  if (!columnRes.data) notFound()

  const columnData = columnRes.data
  const articles = articlesRes.data ?? []

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 md:py-12">
        <div className="max-w-3xl mb-10">
          <Badge className="bg-primary text-primary-foreground mb-4">Column</Badge>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4 leading-tight">
            {columnData.display_name}
          </h1>
          {columnData.description && (
            <p className="text-lg text-muted-foreground leading-relaxed">{columnData.description}</p>
          )}
          {columnData.default_author && (
            <p className="text-sm text-muted-foreground mt-3">
              By <span className="font-semibold text-foreground">{columnData.default_author}</span>
            </p>
          )}
        </div>

        {articles.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {articles.map((a) => {
              const articleUrl = `/columns/${column}/${a.slug.replace(new RegExp(`^${column}-`), '')}`
              const heroUrl = a.hero_image_url || getFallbackByContext(column, a.id)
              const dateLabel = a.published_at
                ? new Date(a.published_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                : ''

              return (
                <Link key={a.id} href={articleUrl} className="group flex flex-col gap-3">
                  <div className="relative aspect-[3/2] rounded-2xl overflow-hidden">
                    <Image
                      src={heroUrl}
                      alt={a.title}
                      fill
                      style={{ objectFit: 'cover' }}
                      className="group-hover:scale-105 transition-transform duration-500"
                      sizes="(max-width: 768px) 100vw, 33vw"
                      unoptimized
                    />
                  </div>
                  <h2 className="font-bold text-xl leading-tight group-hover:text-primary transition-colors text-foreground">
                    {a.title}
                  </h2>
                  {a.excerpt && (
                    <p className="text-sm text-muted-foreground line-clamp-3">{a.excerpt}</p>
                  )}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {a.author_name && <span className="font-medium">{a.author_name}</span>}
                    {dateLabel && <><span>·</span><span>{dateLabel}</span></>}
                  </div>
                </Link>
              )
            })}
          </div>
        ) : (
          <div className="bg-muted/50 rounded-2xl p-12 text-center text-muted-foreground">
            New {columnData.display_name.toLowerCase()} articles coming soon.
          </div>
        )}
      </main>

      <PublicFooter />
    </div>
  )
}
