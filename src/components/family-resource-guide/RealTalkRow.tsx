// RealTalkRow — feature articles from guest contributors surfaced on the
// Family Resource Guide hub via the cross-cutting topics tag system
// (migration 087 + content-taxonomy CONTENT_TOPICS). Lives in the FRG main
// column above Coming Up Events — the reflective beat before the calendar
// content kicks in.
//
// Each article keeps its primary home (Feature, a specific guide via
// guide_slug, etc.). This row just pulls anything tagged with at least one
// content topic.
//
// Note: the component name stays `RealTalkRow` for now — it's an internal
// label and renaming the file ripples through imports. The user-facing
// copy is what matters and that's all editorial.

import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, BookOpen } from 'lucide-react'
import { contentTopicLabel } from '@/lib/content-taxonomy'
import { getFallback } from '@/lib/image-fallbacks'
import { articleHref } from '@/lib/articles/slug'

export interface RealTalkArticle {
  id:             string
  slug:           string
  title:          string
  excerpt:        string | null
  hero_image_url: string | null
  author_name:    string | null
  published_at:   string | null
  column_slug:    string | null
  topics:         string[] | null
}

interface Props {
  articles: RealTalkArticle[]
}


export function RealTalkRow({ articles }: Props) {
  if (articles.length === 0) return null

  return (
    <section>
      <div className="mb-5">
        <div className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-primary mb-1.5">
          <BookOpen className="h-3 w-3" />
          From Our Contributors
        </div>
        <h2 className="text-2xl md:text-3xl font-black text-foreground leading-tight">
          Features worth your time
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
        {articles.map(a => {
          const img = a.hero_image_url || getFallback('family', a.id)
          // Show the first topic label as the badge — articles often carry
          // more than one but a single tag reads cleanly on the card.
          const firstTopic = a.topics?.[0]
          return (
            <Link
              key={a.id}
              href={articleHref(a)}
              className="group rounded-2xl overflow-hidden border border-border/50 bg-card hover:shadow-md hover:border-primary/30 transition-all flex flex-col"
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                <Image
                  src={img}
                  alt={a.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  style={{ objectFit: 'cover' }}
                  className="group-hover:scale-105 transition-transform duration-700"
                  unoptimized
                />
                {firstTopic && (
                  <span className="absolute top-3 left-3 text-[10px] font-bold uppercase tracking-wider bg-white/95 backdrop-blur-sm text-foreground px-2.5 py-1 rounded-full shadow-sm">
                    {contentTopicLabel(firstTopic)}
                  </span>
                )}
              </div>
              <div className="p-4 md:p-5 flex flex-col flex-1">
                <h3 className="font-bold text-base md:text-lg leading-tight text-foreground group-hover:text-primary transition-colors line-clamp-2 mb-1.5">
                  {a.title}
                </h3>
                {a.excerpt && (
                  <p className="text-sm text-muted-foreground leading-snug line-clamp-3 mb-3">
                    {a.excerpt}
                  </p>
                )}
                <div className="mt-auto flex items-center justify-between gap-2">
                  {a.author_name && (
                    <span className="text-xs text-muted-foreground truncate">
                      By {a.author_name}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-primary shrink-0 group-hover:gap-1.5 transition-all">
                    Read <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
