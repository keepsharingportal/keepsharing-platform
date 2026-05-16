// FeaturedPartners — sidebar card showing 3-4 featured-tier listings
// on the FRG page. Pattern mirrors the home page's Mom Knows Best
// sidebar card (avatar-style image + name + line, stacked list inside
// a bordered Card with a divider-style list).

import Image from 'next/image'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Star, ArrowRight } from 'lucide-react'
import type { GuideListing } from '@/components/family-guide/types'

interface Props {
  listings: GuideListing[]
}

export function FeaturedPartners({ listings }: Props) {
  if (listings.length === 0) return null

  return (
    <Card className="border-border/50 shadow-sm overflow-hidden">
      <CardHeader className="border-b border-border/50 bg-muted/30 pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <Star className="h-5 w-5 text-primary fill-amber-300/60" />
          Featured Partners
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border/50">
          {listings.map(l => {
            const imgSrc = l.cover_image_url
            return (
              <Link
                key={l.id}
                href={`/business/${l.slug}`}
                className="p-4 hover:bg-muted/50 transition-colors group flex gap-3 items-start"
              >
                {imgSrc ? (
                  <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-primary/5">
                    <Image
                      src={imgSrc}
                      alt={l.business_name}
                      fill
                      sizes="64px"
                      style={{ objectFit: 'cover' }}
                      unoptimized
                    />
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 text-primary text-xl font-black">
                    {l.business_name.slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-sm text-foreground line-clamp-2 group-hover:text-primary transition-colors leading-snug">
                    {l.business_name}
                  </h4>
                  {l.editorial_blurb && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                      {l.editorial_blurb}
                    </p>
                  )}
                  {l.category && (
                    <p className="text-[10px] font-bold uppercase tracking-widest text-primary mt-1">
                      {l.category}
                    </p>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
        <div className="p-4 border-t border-border/50 bg-muted/10">
          <Button asChild variant="outline" className="w-full text-sm rounded-full">
            <Link href="#directory" className="inline-flex items-center justify-center gap-1.5">
              See Full Directory <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
