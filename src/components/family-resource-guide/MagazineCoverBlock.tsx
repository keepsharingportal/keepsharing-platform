// MagazineCoverBlock — "From the Magazine" feature card showing the
// print cover and an Issuu link. Reinforces that River Region Parents
// is a real publication. Only renders if at least one of printCoverUrl /
// issuuUrl is set on guide_configs (admin/guides/[slug]/edit).

import Image from 'next/image'
import Link from 'next/link'
import { BookOpen, ExternalLink, Newspaper } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  printCoverUrl: string | null
  issuuUrl:      string | null
  guideName:     string
  issueLabel?:   string
  blurb?:        string
}

export function MagazineCoverBlock({
  printCoverUrl,
  issuuUrl,
  guideName,
  issueLabel = 'Current Edition',
  blurb     = 'Flip through the print edition online — same content, magazine layout, share with anyone.',
}: Props) {
  if (!printCoverUrl && !issuuUrl) return null

  return (
    <section className="rounded-3xl bg-card border border-border/50 overflow-hidden shadow-sm">
      <div className="flex flex-col md:flex-row gap-0 items-stretch">

        {printCoverUrl ? (
          <div className="relative md:w-1/3 lg:w-1/4 aspect-[3/4] md:aspect-auto md:min-h-[240px] shrink-0 overflow-hidden bg-primary/5">
            <Image
              src={printCoverUrl}
              alt={`${guideName} ${issueLabel} cover`}
              fill
              sizes="(max-width: 768px) 100vw, 280px"
              style={{ objectFit: 'cover', objectPosition: 'center top' }}
              className="hover:scale-[1.02] transition-transform duration-500"
              unoptimized
            />
          </div>
        ) : (
          <div className="hidden md:flex md:w-1/3 lg:w-1/4 md:min-h-[240px] shrink-0 items-center justify-center bg-primary/5">
            <Newspaper className="h-12 w-12 text-primary/40" />
          </div>
        )}

        <div className="flex-1 p-6 md:p-8 flex flex-col justify-center">
          <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-2 inline-flex items-center gap-1.5">
            <Newspaper className="h-3 w-3" /> From the Magazine
          </p>
          <h2 className="text-xl md:text-2xl font-bold text-foreground leading-tight mb-1">
            {guideName} — {issueLabel}
          </h2>
          <p className="text-sm md:text-base text-muted-foreground leading-relaxed mb-5 max-w-xl">
            {blurb}
          </p>

          <div className="flex flex-wrap gap-2">
            {issuuUrl && (
              <Button asChild className="rounded-full">
                <Link
                  href={issuuUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5"
                >
                  <BookOpen className="h-4 w-4" /> Read the Digital Edition
                  <ExternalLink className="h-3 w-3 opacity-70" />
                </Link>
              </Button>
            )}
            <Button asChild variant="outline" className="rounded-full">
              <Link href="/local-guides">All our guides</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
