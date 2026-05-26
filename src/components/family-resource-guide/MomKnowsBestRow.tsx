// MomKnowsBestRow — 3 latest Mom Knows Best posts. The "real moms know"
// trust layer that connects the FRG to your actual local voices.
// Styled to match the home page's other content sections (no tinted
// background card; plain bg-card item cards inside a standard section).

import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Heart } from 'lucide-react'
import { getFallback } from '@/lib/image-fallbacks'
import { SectionHeader } from '@/components/theme'
import { articleHref } from '@/lib/articles/slug'

interface MKBPost {
  id:                string
  slug:              string
  title:             string
  excerpt:           string | null
  hero_image_url:    string | null
  profile_image_url: string | null
  author_name:       string | null
  published_at:      string | null
}

interface Props {
  posts: MKBPost[]
}

function fmtDate(iso: string | null) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function MomKnowsBestRow({ posts }: Props) {
  if (posts.length === 0) return null

  return (
    <section>
      <SectionHeader
        title="From Mom Knows Best"
        icon={Heart}
        iconColor="primary"
        action={
          <Link
            href="/mom-knows-best"
            className="text-sm font-semibold text-primary hover:text-primary/80 transition-colors hidden sm:inline-flex items-center gap-1"
          >
            All Mom Knows Best <ArrowRight className="h-4 w-4" />
          </Link>
        }
      />

      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-5">
        {posts.map(p => {
          const img = p.hero_image_url || getFallback('parenting', p.id)
          return (
            <Link
              key={p.id}
              href={articleHref({ slug: p.slug, title: p.title, column_slug: 'mom-knows-best' })}
              className="group flex flex-col bg-card rounded-2xl overflow-hidden border border-border/50 hover:border-primary/30 hover:shadow-md transition-all"
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-primary/5">
                <Image
                  src={img}
                  alt={p.title}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw"
                  style={{ objectFit: 'cover' }}
                  className="group-hover:scale-105 transition-transform duration-500"
                  unoptimized
                />
              </div>
              <div className="p-3.5 flex flex-col flex-1">
                <h3 className="font-bold text-sm leading-snug text-foreground group-hover:text-primary transition-colors line-clamp-2 mb-1.5">
                  {p.title}
                </h3>
                {p.excerpt && (
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 mb-2">
                    {p.excerpt}
                  </p>
                )}
                <div className="flex items-center justify-between gap-2 pt-2 mt-auto border-t border-border/30">
                  <span className="text-[11px] text-muted-foreground truncate">
                    {p.author_name ?? 'Mom Knows Best'}
                  </span>
                  <span className="text-[11px] text-muted-foreground shrink-0">{fmtDate(p.published_at)}</span>
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
